/**
 * 数据库实体类型定义
 * 从 MockDatabase 提取，供 DatabaseService 和旧 MockDatabase 共用
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
  status: 'success' | 'failed' | 'timeout';
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
  alarmType: 'offline' | 'control_failed' | 'frequent_switch' | 'threshold_anomaly' | 'fault_report';
  alarmLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
  message: string;
  createdAt: Date;
  handledAt: Date | null;
  handlerId: number | null;
  handlerName: string | null;
}

export interface FaultReport {
  id: number;
  alarmId: number;
  reporterName: string;
  reporterPhone: string;
  lampId: string;
  description: string;
  photoUrls: string[];
  status: 'active' | 'resolved';
  createdAt: Date;
  resolvedAt: Date | null;
  resolveNote: string | null;
}

export interface LightDataRecord {
  id: number;
  deviceId: string;
  lightIntensity: number;
  timestamp: Date;
}

export interface AggregatedDataRecord {
  id: number;
  deviceId: string;
  timeWindow: Date;
  avgLightIntensity: number;
  maxLightIntensity: number;
  minLightIntensity: number;
  sampleCount: number;
}
