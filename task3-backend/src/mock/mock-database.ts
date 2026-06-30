/**
 * Mock数据库服务
 * 模拟数据库操作，方便独立开发和测试
 */

export interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline';
  mode: 'auto' | 'manual';
  currentState: 'on' | 'off';
  lastHeartbeat: Date;
}

export interface ThresholdConfig {
  deviceId: string;
  lightThresholdOn: number;
  lightThresholdOff: number;
  updatedAt: Date;
}

export interface ControlLog {
  id: number;
  deviceId: string;
  command: 'on' | 'off';
  status: 'success' | 'failed';
  operatorId: number;
  operatorName: string;
  requestTime: Date;
  responseTime: Date | null;
  resultMessage: string;
}

export interface Alarm {
  id: number;
  deviceId: string;
  deviceName: string;
  alarmType: 'offline' | 'control_failed' | 'frequent_switch';
  alarmLevel: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
  message: string;
  createdAt: Date;
  handledAt: Date | null;
  handlerId: number | null;
  handlerName: string | null;
}

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
    status: 'success' | 'failed',
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

  // ===== 工具方法 =====

  static reset() {
    this.devices.clear();
    this.thresholds.clear();
    this.controlLogs = [];
    this.alarms = [];
    this.logIdCounter = 1;
    this.alarmIdCounter = 1;
  }
}
