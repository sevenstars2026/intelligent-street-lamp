/**
 * Mock数据库服务
 * 模拟数据库操作，方便独立开发和测试
 * 类型定义已迁移到 src/types/database.types.ts，此处保留兼容 re-export
 */

import type { Device, ThresholdConfig, ControlLog, Alarm } from '../types/database.types';

export type { Device, ThresholdConfig, ControlLog, Alarm } from '../types/database.types';

export class MockDatabase {
  private static devices: Map<string, Device> = new Map();
  private static thresholds: Map<string, ThresholdConfig> = new Map();
  private static controlLogs: ControlLog[] = [];
  private static alarms: Alarm[] = [];
  private static logIdCounter = 1;
  private static alarmIdCounter = 1;

  // 初始化Mock数据
  static init() {
    // 创建3个测试设备
    this.devices.set('lamp_001', {
      id: 'lamp_001',
      name: '路灯001',
      status: 'online',
      mode: 'auto',
      currentState: 'off',
      lastHeartbeat: new Date()
    });

    this.devices.set('lamp_002', {
      id: 'lamp_002',
      name: '路灯002',
      status: 'online',
      mode: 'auto',
      currentState: 'on',
      lastHeartbeat: new Date()
    });

    this.devices.set('lamp_003', {
      id: 'lamp_003',
      name: '路灯003',
      status: 'offline',
      mode: 'manual',
      currentState: 'off',
      lastHeartbeat: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
    });

    // 初始化阈值配置
    this.thresholds.set('lamp_001', {
      deviceId: 'lamp_001',
      lightThresholdOn: 200,
      lightThresholdOff: 300,
      updatedAt: new Date()
    });

    this.thresholds.set('lamp_002', {
      deviceId: 'lamp_002',
      lightThresholdOn: 200,
      lightThresholdOff: 300,
      updatedAt: new Date()
    });

    console.log('MockDatabase initialized with sample data');
  }

  // ===== 设备操作 =====

  static getDevice(deviceId: string): Device | null {
    return this.devices.get(deviceId) || null;
  }

  static getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  static updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.status = status;
    return true;
  }

  static updateDeviceState(deviceId: string, state: 'on' | 'off'): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.currentState = state;
    return true;
  }

  static updateDeviceMode(deviceId: string, mode: 'auto' | 'manual'): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.mode = mode;
    return true;
  }

  static updateHeartbeat(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.lastHeartbeat = new Date();
    device.status = 'online';
    return true;
  }

  // ===== 阈值配置操作 =====

  static getThreshold(deviceId: string): ThresholdConfig | null {
    return this.thresholds.get(deviceId) || null;
  }

  static setThreshold(config: Omit<ThresholdConfig, 'updatedAt'>): ThresholdConfig {
    const threshold: ThresholdConfig = {
      ...config,
      updatedAt: new Date()
    };

    this.thresholds.set(config.deviceId, threshold);
    return threshold;
  }

  // ===== 控制日志操作 =====

  static addControlLog(log: Omit<ControlLog, 'id'>): ControlLog {
    const newLog: ControlLog = {
      ...log,
      id: this.logIdCounter++
    };

    this.controlLogs.push(newLog);
    return newLog;
  }

  static getControlLogs(deviceId: string, limit: number = 20): ControlLog[] {
    return this.controlLogs
      .filter(log => log.deviceId === deviceId)
      .sort((a, b) => b.requestTime.getTime() - a.requestTime.getTime())
      .slice(0, limit);
  }

  static updateControlLogResult(
    logId: number,
    status: 'success' | 'failed' | 'timeout',
    resultMessage: string
  ): boolean {
    const log = this.controlLogs.find(l => l.id === logId);
    if (!log) return false;

    log.status = status;
    log.resultMessage = resultMessage;
    log.responseTime = new Date();
    return true;
  }

  // ===== 告警操作 =====

  static addAlarm(alarm: Omit<Alarm, 'id'>): Alarm {
    const newAlarm: Alarm = {
      ...alarm,
      id: this.alarmIdCounter++
    };

    this.alarms.push(newAlarm);
    return newAlarm;
  }

  static getAlarms(filters?: {
    status?: 'active' | 'resolved';
    deviceId?: string;
    alarmType?: string;
    alarmLevel?: string;
  }): Alarm[] {
    let result = [...this.alarms];

    if (filters) {
      if (filters.status) {
        result = result.filter(a => a.status === filters.status);
      }
      if (filters.deviceId) {
        result = result.filter(a => a.deviceId === filters.deviceId);
      }
      if (filters.alarmType) {
        result = result.filter(a => a.alarmType === filters.alarmType);
      }
      if (filters.alarmLevel) {
        result = result.filter(a => a.alarmLevel === filters.alarmLevel);
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static getAlarm(alarmId: number): Alarm | null {
    return this.alarms.find(a => a.id === alarmId) || null;
  }

  static updateAlarmLevel(alarmId: number, level: 'low' | 'medium' | 'high', message: string): boolean {
    const alarm = this.alarms.find(a => a.id === alarmId);
    if (!alarm) return false;

    alarm.alarmLevel = level;
    alarm.message = message;
    return true;
  }

  static resolveAlarm(alarmId: number, handlerId: number, handlerName: string): boolean {
    const alarm = this.alarms.find(a => a.id === alarmId);
    if (!alarm) return false;

    alarm.status = 'resolved';
    alarm.handledAt = new Date();
    alarm.handlerId = handlerId;
    alarm.handlerName = handlerName;
    return true;
  }

  // ===== 光照数据管理 =====

  private static lightData: Array<{
    id: number;
    deviceId: string;
    lightIntensity: number;
    timestamp: Date;
  }> = [];
  private static lightDataIdCounter = 1;

  private static aggregatedData: Array<{
    id: number;
    deviceId: string;
    timeWindow: Date;
    avgLightIntensity: number;
    maxLightIntensity: number;
    minLightIntensity: number;
    sampleCount: number;
  }> = [];
  private static aggregatedDataIdCounter = 1;

  static addLightData(data: {
    deviceId: string;
    lightIntensity: number;
    timestamp: Date;
  }) {
    const record = {
      ...data,
      id: this.lightDataIdCounter++
    };
    this.lightData.push(record);
    return record;
  }

  static getLightData(deviceId: string, startTime: Date, endTime: Date) {
    return this.lightData.filter(d =>
      d.deviceId === deviceId &&
      d.timestamp >= startTime &&
      d.timestamp <= endTime
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  static saveAggregatedData(data: {
    deviceId: string;
    timeWindow: Date;
    avgLightIntensity: number;
    maxLightIntensity: number;
    minLightIntensity: number;
    sampleCount: number;
  }) {
    const record = {
      ...data,
      id: this.aggregatedDataIdCounter++
    };
    this.aggregatedData.push(record);
    return record;
  }

  static deleteOldLightData(cutoffDate: Date): number {
    const initialLength = this.lightData.length;
    this.lightData = this.lightData.filter(d => d.timestamp >= cutoffDate);
    return initialLength - this.lightData.length;
  }

  static deleteOldAggregatedData(cutoffDate: Date): number {
    const initialLength = this.aggregatedData.length;
    this.aggregatedData = this.aggregatedData.filter(d => d.timeWindow >= cutoffDate);
    return initialLength - this.aggregatedData.length;
  }

  // ===== 工具方法 =====

  static reset() {
    this.devices.clear();
    this.thresholds.clear();
    this.controlLogs = [];
    this.alarms = [];
    this.lightData = [];
    this.aggregatedData = [];
    this.logIdCounter = 1;
    this.alarmIdCounter = 1;
    this.lightDataIdCounter = 1;
    this.aggregatedDataIdCounter = 1;
  }
}
