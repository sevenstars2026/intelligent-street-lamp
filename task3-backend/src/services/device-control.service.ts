/**
 * 设备控制服务
 * 处理路灯的开关控制逻辑
 */

import { MockDatabase } from '../mock/mock-database';
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
  }> = new Map();

  constructor() {
    this.initMqttSubscriptions();
  }

  /**
   * 初始化MQTT订阅（监听硬件反馈）
   */
  private initMqttSubscriptions(): void {
    // 订阅所有设备的控制反馈
    mockMqttClient.subscribe('devices/+/control/response', (topic, message) => {
      this.handleControlResponse(message);
    });
  }

  /**
   * 控制单个设备
   */
  async controlDevice(request: ControlRequest): Promise<ControlResult> {
    // 1. 验证设备是否存在
    const device = MockDatabase.getDevice(request.deviceId);
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
    const log = MockDatabase.addControlLog({
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
      MockDatabase.updateControlLogResult(log.id, 'failed', 'MQTT发送失败');
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
    MockDatabase.updateControlLogResult(log.id, result.status, result.message);

    // 8. 如果控制成功，更新设备状态
    if (result.status === 'success') {
      MockDatabase.updateDeviceState(request.deviceId, request.command);
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
        timeout
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

    // 解析设备ID和命令（从result中获取）
    const controlResult: ControlResult = {
      deviceId: message.deviceId || 'unknown',
      command: result as 'on' | 'off',
      status: status === 'success' ? 'success' : 'failed',
      message: resultMessage || (status === 'success' ? '控制成功' : '控制失败'),
      executedAt: new Date()
    };

    pending.resolve(controlResult);
  }

  /**
   * 获取设备当前状态
   */
  getDeviceState(deviceId: string): 'on' | 'off' | null {
    const device = MockDatabase.getDevice(deviceId);
    return device ? device.currentState : null;
  }

  /**
   * 获取设备控制历史
   */
  getControlHistory(deviceId: string, limit: number = 20) {
    return MockDatabase.getControlLogs(deviceId, limit);
  }
}
