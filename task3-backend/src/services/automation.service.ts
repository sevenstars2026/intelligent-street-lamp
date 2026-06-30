/**
 * 自动化规则引擎服务
 * 监听光照数据，根据阈值自动控制路灯
 */

import { mockMqttClient } from '../mock/mock-mqtt';
import { mockRedis } from '../mock/mock-redis';
import { MockDatabase } from '../mock/mock-database';
import { ThresholdAlgorithm, LightSample } from '../utils/threshold-algorithm';
import { DeviceControlService } from './device-control.service';

export class AutomationService {
  private static readonly SAMPLES_KEY_PREFIX = 'device:samples:';
  private static readonly MAX_SAMPLES = 10; // 保留最近10次采样
  private static readonly COOLDOWN_KEY_PREFIX = 'device:cooldown:';
  private static readonly COOLDOWN_SECONDS = 300; // 5分钟冷却时间

  private deviceControlService: DeviceControlService;

  constructor() {
    this.deviceControlService = new DeviceControlService();
    this.initMqttListeners();
  }

  /**
   * 初始化MQTT监听
   */
  private initMqttListeners(): void {
    // 监听所有设备的数据上报
    mockMqttClient.subscribe('devices/+/data', (topic, message) => {
      this.handleLightData(message);
    });

    console.log('[Automation] Subscribed to light data events');
  }

  /**
   * 处理光照数据上报
   */
  private async handleLightData(message: any): Promise<void> {
    try {
      const { deviceId, lightIntensity, timestamp } = message;

      if (!deviceId || lightIntensity === undefined) {
        console.warn('[Automation] Invalid light data:', message);
        return;
      }

      console.log(`[Automation] Received light data from ${deviceId}: ${lightIntensity} lux`);

      // 检查设备是否处于自动模式
      const device = MockDatabase.getDevice(deviceId);
      if (!device) {
        console.warn(`[Automation] Device ${deviceId} not found`);
        return;
      }

      if (device.mode !== 'auto') {
        console.log(`[Automation] Device ${deviceId} is in manual mode, skipping automation`);
        return;
      }

      // 检查是否在冷却期
      if (await this.isInCooldown(deviceId)) {
        console.log(`[Automation] Device ${deviceId} is in cooldown period`);
        return;
      }

      // 添加新采样
      const sample: LightSample = {
        lightIntensity,
        timestamp: new Date(timestamp || Date.now())
      };

      await this.addSample(deviceId, sample);

      // 获取最近的采样记录
      const samples = await this.getSamples(deviceId);

      if (samples.length < 5) {
        console.log(`[Automation] Device ${deviceId} has only ${samples.length} samples, waiting for more`);
        return;
      }

      // 获取设备阈值配置
      const threshold = MockDatabase.getThreshold(deviceId);
      if (!threshold) {
        console.warn(`[Automation] No threshold config for device ${deviceId}`);
        return;
      }

      // 判断是否需要开灯
      const shouldTurnOn = ThresholdAlgorithm.shouldTurnOn(samples, threshold.lightThresholdOn);
      if (shouldTurnOn && device.currentState === 'off') {
        console.log(`[Automation] 🔆 Triggering auto turn ON for device ${deviceId}`);
        await this.autoControl(deviceId, 'on');
        return;
      }

      // 判断是否需要关灯
      const shouldTurnOff = ThresholdAlgorithm.shouldTurnOff(samples, threshold.lightThresholdOff);
      if (shouldTurnOff && device.currentState === 'on') {
        console.log(`[Automation] 🌙 Triggering auto turn OFF for device ${deviceId}`);
        await this.autoControl(deviceId, 'off');
        return;
      }

      console.log(`[Automation] Device ${deviceId} no action needed (current: ${device.currentState}, light: ${lightIntensity})`);

    } catch (error) {
      console.error('[Automation] Error handling light data:', error);
    }
  }

  /**
   * 添加采样到缓存
   */
  private async addSample(deviceId: string, sample: LightSample): Promise<void> {
    const key = `${AutomationService.SAMPLES_KEY_PREFIX}${deviceId}`;

    // 获取现有采样
    const samplesJson = await mockRedis.get(key);
    let samples: LightSample[] = samplesJson ? JSON.parse(samplesJson) : [];

    // 添加新采样
    samples = ThresholdAlgorithm.addSample(samples, sample, AutomationService.MAX_SAMPLES);

    // 保存到Redis（过期时间1小时）
    await mockRedis.set(key, JSON.stringify(samples), 3600);
  }

  /**
   * 获取设备的采样记录
   */
  private async getSamples(deviceId: string): Promise<LightSample[]> {
    const key = `${AutomationService.SAMPLES_KEY_PREFIX}${deviceId}`;
    const samplesJson = await mockRedis.get(key);

    if (!samplesJson) {
      return [];
    }

    const samples = JSON.parse(samplesJson);

    // 转换timestamp为Date对象
    return samples.map((s: any) => ({
      lightIntensity: s.lightIntensity,
      timestamp: new Date(s.timestamp)
    }));
  }

  /**
   * 执行自动控制
   */
  private async autoControl(deviceId: string, command: 'on' | 'off'): Promise<void> {
    try {
      const result = await this.deviceControlService.controlDevice({
        deviceId,
        command,
        operatorId: 0, // 系统自动控制
        operatorName: 'Auto System'
      });

      if (result.status === 'success') {
        console.log(`[Automation] ✅ Auto control ${command} succeeded for ${deviceId}`);

        // 设置冷却期，防止频繁开关
        await this.setCooldown(deviceId);
      } else {
        console.error(`[Automation] ❌ Auto control ${command} failed for ${deviceId}: ${result.message}`);
      }
    } catch (error) {
      console.error(`[Automation] Error in auto control:`, error);
    }
  }

  /**
   * 检查设备是否在冷却期
   */
  private async isInCooldown(deviceId: string): Promise<boolean> {
    const key = `${AutomationService.COOLDOWN_KEY_PREFIX}${deviceId}`;
    const exists = await mockRedis.exists(key);
    return exists === 1;
  }

  /**
   * 设置冷却期
   */
  private async setCooldown(deviceId: string): Promise<void> {
    const key = `${AutomationService.COOLDOWN_KEY_PREFIX}${deviceId}`;
    await mockRedis.set(key, Date.now().toString(), AutomationService.COOLDOWN_SECONDS);

    console.log(`[Automation] Set cooldown for device ${deviceId} (${AutomationService.COOLDOWN_SECONDS}s)`);
  }

  /**
   * 清除设备的采样记录（用于测试）
   */
  async clearSamples(deviceId: string): Promise<void> {
    const key = `${AutomationService.SAMPLES_KEY_PREFIX}${deviceId}`;
    await mockRedis.del(key);
  }

  /**
   * 手动触发模拟光照数据（用于测试）
   */
  simulateLightData(deviceId: string, lightIntensity: number): void {
    mockMqttClient.simulateDataUpload(deviceId, lightIntensity);
  }
}
