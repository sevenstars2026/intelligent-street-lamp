/**
 * 设备控制服务
 * 处理路灯的开关控制逻辑
 */

import { DatabaseService } from './database.service';
import { AlarmService } from './alarm.service';
import { mockMqttClient } from '../mock/mock-mqtt';
import { v4 as uuidv4 } from 'uuid';

export interface ControlRequest {
  deviceId: string;
  command: 'on' | 'off';
  operatorId: number;
  operatorName: string;
}

export interface ControlResult {
  deviceId: string;
  command: 'on' | 'off';
  status: 'success' | 'failed' | 'timeout';
  message: string;
  executedAt: Date;
}

export interface BatchControlResult {
  results: ControlResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export class DeviceControlService {
  private static readonly CONTROL_TIMEOUT = 10000; // 10秒超时
  private pendingRequests: Map<string, {
    resolve: (result: ControlResult) => void;
    timeout: NodeJS.Timeout;
    deviceId: string;
    command: 'on' | 'off';
  }> = new Map();

  constructor() {
    this.initMqttSubscriptions();
  }

  /**
   * 初始化MQTT订阅（监听硬件反馈）
   */
  private initMqttSubscriptions(): void {
    // 订阅控制反馈，只处理 lamp_ 开头的本组设备
    mockMqttClient.subscribe('devices/+/control/response', (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      this.handleControlResponse({ ...message, deviceId });
    });

    // 订阅硬件光照数据上报 → 写入数据库
    mockMqttClient.subscribe('devices/+/data', async (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      await this.handleHardwareData(deviceId, message);
    });

    // 订阅硬件心跳 → 更新设备在线状态
    mockMqttClient.subscribe('devices/+/heartbeat', async (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      await this.handleHardwareHeartbeat(deviceId);
    });

    // 硬件启动/重连后请求最新配置
    mockMqttClient.subscribe('devices/+/config/request', async (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      await this.handleConfigRequest(deviceId, message);
    });

    // 硬件本地自动控制完成后上报动作，后端只记录结果
    mockMqttClient.subscribe('devices/+/auto-action', async (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      await this.handleAutoAction(deviceId, message);
    });

    // 配置确认仅记录日志，当前版本不持久化 ack 状态
    mockMqttClient.subscribe('devices/+/config/ack', (_topic, message) => {
      const deviceId = message.device_code || message.deviceId;
      if (!deviceId || !deviceId.startsWith('lamp_')) return;
      console.log(
        `[ConfigSync] ${deviceId} ack config v${message.version} ` +
        `(accepted=${message.accepted === true})`
      );
    });
  }

  /**
   * 处理硬件上传的光照数据，写入数据库
   */
  private async handleHardwareData(deviceId: string, message: any): Promise<void> {
    try {
      const lightIntensity = message.lightIntensity
        ?? message.light_intensity
        ?? message.lux
        ?? message.value;
      const timestamp = message.timestamp
        ? new Date(message.timestamp)
        : new Date();

      if (typeof lightIntensity !== 'number' || isNaN(lightIntensity)) {
        console.warn(`[HardwareData] Invalid lightIntensity from ${deviceId}:`, message);
        return;
      }

      await DatabaseService.addLightData({
        deviceId,
        lightIntensity,
        timestamp,
      });
      console.log(`[HardwareData] 💾 Saved: ${deviceId} = ${lightIntensity} lux @ ${timestamp.toISOString()}`);
    } catch (err) {
      console.error(`[HardwareData] Failed to save data for ${deviceId}:`, err);
    }
  }

  /**
   * 推送当前设备模式和阈值配置到硬件。
   */
  async syncDeviceConfig(deviceId: string): Promise<boolean> {
    const config = await this.buildDeviceConfig(deviceId);
    if (!config) return false;

    if (!mockMqttClient.isConnectedStatus()) {
      console.warn(`[ConfigSync] ${deviceId} publish failed: MQTT not connected`);
      return false;
    }

    const published = await mockMqttClient.publish(
      `devices/${deviceId}/config`,
      {
        mode: config.mode,
        thresholdOn: config.thresholdOn,
        thresholdOff: config.thresholdOff,
        version: config.version,
        timestamp: Date.now()
      },
      { qos: 1 }
    );

    if (published) {
      console.log(
        `[ConfigSync] 📤 ${deviceId} ← config v${config.version} ` +
        `(${config.mode}, on=${config.thresholdOn}, off=${config.thresholdOff})`
      );
    } else {
      console.warn(`[ConfigSync] ${deviceId} publish failed: MQTT publish returned false`);
    }

    return published;
  }

  private async buildDeviceConfig(deviceId: string): Promise<{
    mode: 'auto' | 'manual';
    thresholdOn: number;
    thresholdOff: number;
    version: number;
  } | null> {
    const device = await DatabaseService.getDevice(deviceId);
    if (!device) {
      console.warn(`[ConfigSync] ${deviceId} publish failed: device not found`);
      return null;
    }

    const threshold = await DatabaseService.getThreshold(deviceId);
    if (!threshold) {
      console.warn(`[ConfigSync] ${deviceId} publish failed: threshold not configured`);
      return null;
    }

    const thresholdUpdatedAt = threshold.updatedAt instanceof Date
      ? threshold.updatedAt.getTime()
      : new Date(threshold.updatedAt).getTime();
    const version = Number.isFinite(thresholdUpdatedAt) ? thresholdUpdatedAt : 0;

    return {
      mode: device.mode,
      thresholdOn: threshold.lightThresholdOn,
      thresholdOff: threshold.lightThresholdOff,
      version
    };
  }

  private async handleConfigRequest(deviceId: string, message: any): Promise<void> {
    try {
      const localVersion = Number(message.localVersion) || 0;
      const config = await this.buildDeviceConfig(deviceId);
      if (!config) return;

      if (config.version > localVersion || localVersion === 0) {
        console.log(
          `[ConfigSync] 📩 ${deviceId} requested config ` +
          `(local v${localVersion}, db v${config.version}) → pushing`
        );
        await this.syncDeviceConfig(deviceId);
      } else {
        console.log(
          `[ConfigSync] 📩 ${deviceId} requested config ` +
          `(local v${localVersion}, db v${config.version}) → up-to-date`
        );
      }
    } catch (err) {
      console.error(`[ConfigSync] Failed to handle config request for ${deviceId}:`, err);
    }
  }

  private async handleAutoAction(deviceId: string, message: any): Promise<void> {
    try {
      const action = message.action;
      if (!['on', 'off'].includes(action)) {
        console.warn(`[AutoAction] Invalid action from ${deviceId}:`, message);
        return;
      }

      const lightIntensity = Number(message.lightIntensity ?? message.lux ?? message.value);
      const thresholdOn = Number(message.thresholdOn);
      const thresholdOff = Number(message.thresholdOff);
      const executedAt = message.timestamp ? new Date(message.timestamp) : new Date();

      if (!Number.isFinite(lightIntensity) || !Number.isFinite(thresholdOn) || !Number.isFinite(thresholdOff)) {
        console.warn(`[AutoAction] Invalid payload from ${deviceId}:`, message);
        return;
      }

      await DatabaseService.updateDeviceState(deviceId, action);

      const isTurnOn = action === 'on';
      const resultMessage = isTurnOn
        ? `光照 ${lightIntensity} < 阈值 ${thresholdOn}`
        : `光照 ${lightIntensity} > 阈值 ${thresholdOff}`;

      await DatabaseService.addControlLog({
        deviceId,
        command: action,
        status: 'success',
        operatorId: 0,
        operatorName: '自动控制',
        requestTime: executedAt,
        responseTime: executedAt,
        resultMessage
      });

      if (isTurnOn) {
        console.log(`[AutoAction] 💡 ${deviceId} 自动开灯（${resultMessage}）`);
      } else {
        console.log(`[AutoAction] 🌙 ${deviceId} 自动关灯（${resultMessage}）`);
      }
    } catch (err) {
      console.error(`[AutoAction] Failed to handle auto action for ${deviceId}:`, err);
      return;
    }
  }

  /**
   * 处理硬件心跳，更新设备在线状态和最后心跳时间
   */
  private async handleHardwareHeartbeat(deviceId: string): Promise<void> {
    try {
      await DatabaseService.updateHeartbeat(deviceId);
      await AlarmService.resolveOfflineAlarmsForHeartbeat(deviceId);
      console.log(`[Heartbeat] 💓 ${deviceId} heartbeat updated`);
    } catch (err) {
      console.error(`[Heartbeat] Failed to update heartbeat for ${deviceId}:`, err);
    }
  }

  /**
   * 控制单个设备
   */
  async controlDevice(request: ControlRequest): Promise<ControlResult> {
    // 1. 验证设备是否存在
    const device = await DatabaseService.getDevice(request.deviceId);
    if (!device) {
      return {
        deviceId: request.deviceId,
        command: request.command,
        status: 'failed',
        message: '设备不存在',
        executedAt: new Date()
      };
    }

    // 2. 检查MQTT连接
    if (!mockMqttClient.isConnectedStatus()) {
      return {
        deviceId: request.deviceId,
        command: request.command,
        status: 'failed',
        message: '控制服务暂时不可用，请稍后重试',
        executedAt: new Date()
      };
    }

    // 3. 记录控制日志
    const log = await DatabaseService.addControlLog({
      deviceId: request.deviceId,
      command: request.command,
      status: 'success', // 先设为success，后续根据结果更新
      operatorId: request.operatorId,
      operatorName: request.operatorName,
      requestTime: new Date(),
      responseTime: null,
      resultMessage: '等待硬件响应'
    });

    // 4. 生成请求ID
    const requestId = uuidv4();

    // 5. 发送MQTT控制指令
    const mqttMessage = {
      cmd: 'switch',
      value: request.command,
      requestId,
      timestamp: Date.now()
    };

    const published = await mockMqttClient.publish(
      `devices/${request.deviceId}/control`,
      mqttMessage
    );

    if (!published) {
      await DatabaseService.updateControlLogResult(log.id, 'failed', 'MQTT发送失败');
      await AlarmService.createControlFailedAlarm(request.deviceId, device.name ?? request.deviceId, 'MQTT发送失败');
      await AlarmService.checkFrequentSwitch(request.deviceId, device.name ?? request.deviceId);
      return {
        deviceId: request.deviceId,
        command: request.command,
        status: 'failed',
        message: '控制服务暂时不可用，请稍后重试',
        executedAt: new Date()
      };
    }

    // 6. 等待硬件反馈（10秒超时）
    const result = await this.waitForResponse(requestId, request.deviceId, request.command);

    // 7. 更新控制日志
    await DatabaseService.updateControlLogResult(log.id, result.status, result.message);

    if (result.status === 'failed' || result.status === 'timeout') {
      await AlarmService.createControlFailedAlarm(request.deviceId, device.name ?? request.deviceId, result.message);
    }

    if (result.status === 'success') {
      await DatabaseService.updateDeviceState(request.deviceId, request.command);
      await AlarmService.checkFrequentSwitch(request.deviceId, device.name ?? request.deviceId);

      if (device.mode === 'auto') {
        await DatabaseService.updateDeviceMode(request.deviceId, 'manual');
        await DatabaseService.touchThresholdUpdatedAt(request.deviceId);
        await this.syncDeviceConfig(request.deviceId);
        console.log(
          `[ControlService] ${request.deviceId} mode auto → manual (triggered by manual control)`
        );
      }
    }

    return result;
  }

  /**
   * 批量控制设备
   */
  async batchControl(
    deviceIds: string[],
    command: 'on' | 'off',
    operatorId: number,
    operatorName: string
  ): Promise<BatchControlResult> {
    // 并发控制所有设备
    const promises = deviceIds.map(deviceId =>
      this.controlDevice({
        deviceId,
        command,
        operatorId,
        operatorName
      })
    );

    const results = await Promise.all(promises);

    // 统计结果
    const summary = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length
    };

    return { results, summary };
  }

  /**
   * 等待硬件响应
   */
  private waitForResponse(
    requestId: string,
    deviceId: string,
    command: 'on' | 'off'
  ): Promise<ControlResult> {
    return new Promise((resolve) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({
          deviceId,
          command,
          status: 'timeout',
          message: '控制超时，请检查设备状态',
          executedAt: new Date()
        });
      }, DeviceControlService.CONTROL_TIMEOUT);

      // 保存待处理请求
      this.pendingRequests.set(requestId, {
        resolve,
        timeout,
        deviceId,
        command
      });
    });
  }

  /**
   * 处理硬件控制反馈
   */
  private handleControlResponse(message: any): void {
    const { requestId, status, result, message: resultMessage } = message;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return; // 请求已超时或不存在
    }

    // 清除超时定时器
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    const success = status === 'success' || message.success === true;

    const controlResult: ControlResult = {
      deviceId: message.deviceId || pending.deviceId,
      command: (result || message.value || pending.command) as 'on' | 'off',
      status: success ? 'success' : 'failed',
      message: resultMessage || message.message || (success ? '控制成功' : '控制失败'),
      executedAt: new Date()
    };

    pending.resolve(controlResult);
  }

  /**
   * 获取设备当前状态
   */
  async getDeviceState(deviceId: string): Promise<'on' | 'off' | null> {
    const device = await DatabaseService.getDevice(deviceId);
    return device ? device.currentState : null;
  }

  /**
   * 获取设备控制历史
   */
  async getControlHistory(deviceId: string, limit: number = 20) {
    return DatabaseService.getControlLogs(deviceId, limit);
  }

  /**
   * 获取所有设备列表
   */
  async getAllDevices() {
    return DatabaseService.getAllDevices();
  }

  /**
   * 获取单个设备详情
   */
  async getDeviceById(deviceId: string) {
    return DatabaseService.getDevice(deviceId);
  }

  /**
   * 获取设备光照历史数据
   */
  async getLightHistory(deviceId: string, startTime: Date, endTime: Date) {
    return DatabaseService.getLightData(deviceId, startTime, endTime);
  }
}
