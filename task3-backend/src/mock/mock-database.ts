/**
 * Mock数据库服务
 * 模拟数据库操作，方便独立开发和测试
 * 类型定义已迁移到 src/types/database.types.ts，此处保留兼容 re-export
 */

import type { Device, ThresholdConfig, ControlLog, Alarm, FaultReport, ReportAuditLog } from '../types/database.types';

export type { Device, ThresholdConfig, ControlLog, Alarm, FaultReport, ReportAuditLog } from '../types/database.types';

export class MockDatabase {
  private static devices: Map<string, Device> = new Map();
  private static thresholds: Map<string, ThresholdConfig> = new Map();
  private static controlLogs: ControlLog[] = [];
  private static alarms: Alarm[] = [];
  private static faultReports: FaultReport[] = [];
  private static reportAuditLogs: ReportAuditLog[] = [];
  private static logIdCounter = 1;
  private static alarmIdCounter = 1;
  private static faultReportIdCounter = 1;
  private static reportAuditIdCounter = 1;

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

    // 种子 8 条告警样本数据
    this.alarms = [
      { id: 1, deviceId: 'lamp_001', deviceName: '路灯001', alarmType: 'offline',        alarmLevel: 'high',     status: 'active',   message: '设备 路灯001(lamp_001) 已离线超过30秒，最后心跳时间 2026-07-06 08:31:26', createdAt: new Date('2026-07-06T10:31:56'), handledAt: null, handlerId: null, handlerName: null },
      { id: 2, deviceId: 'lamp_002', deviceName: '路灯002', alarmType: 'offline',        alarmLevel: 'high',     status: 'active',   message: '设备 路灯002(lamp_002) 已离线超过30秒，最后心跳时间 2026-07-06 08:31:26', createdAt: new Date('2026-07-06T10:31:56'), handledAt: null, handlerId: null, handlerName: null },
      { id: 3, deviceId: 'lamp_003', deviceName: '路灯003', alarmType: 'offline',        alarmLevel: 'critical', status: 'active',   message: '设备 路灯003(lamp_003) 已离线超过2小时，最后心跳时间 2026-07-06 08:31:26', createdAt: new Date('2026-07-06T08:31:26'), handledAt: null, handlerId: null, handlerName: null },
      { id: 4, deviceId: 'lamp_001', deviceName: '路灯001', alarmType: 'control_failed', alarmLevel: 'medium',   status: 'resolved', message: '设备 路灯001(lamp_001) 控制失败：设备无响应',                       createdAt: new Date('2026-07-05T18:20:00'), handledAt: new Date('2026-07-05T19:00:00'), handlerId: 1, handlerName: '管理员' },
      { id: 5, deviceId: 'lamp_002', deviceName: '路灯002', alarmType: 'control_failed', alarmLevel: 'medium',   status: 'active',   message: '设备 路灯002(lamp_002) 控制失败：超时未确认',                       createdAt: new Date('2026-07-06T08:45:00'), handledAt: null, handlerId: null, handlerName: null },
      { id: 6, deviceId: 'lamp_001', deviceName: '路灯001', alarmType: 'frequent_switch',alarmLevel: 'low',      status: 'active',   message: '设备 路灯001(lamp_001) 近10分钟内开关操作达7次，触发频繁开关告警',      createdAt: new Date('2026-07-06T09:15:00'), handledAt: null, handlerId: null, handlerName: null },
      { id: 7, deviceId: 'lamp_003', deviceName: '路灯003', alarmType: 'threshold_anomaly',alarmLevel:'medium',  status: 'resolved', message: '设备 路灯003(lamp_003) 光照传感器读数异常，连续3次超过阈值范围',        createdAt: new Date('2026-07-04T14:30:00'), handledAt: new Date('2026-07-04T16:00:00'), handlerId: 1, handlerName: '管理员' },
      { id: 8, deviceId: 'lamp_002', deviceName: '路灯002', alarmType: 'frequent_switch',alarmLevel: 'low',      status: 'resolved', message: '设备 路灯002(lamp_002) 近10分钟内开关操作达5次，触发频繁开关告警',      createdAt: new Date('2026-07-05T22:10:00'), handledAt: new Date('2026-07-05T23:00:00'), handlerId: 1, handlerName: '管理员' },
    ];
    this.alarmIdCounter = 9;

    // 种子景区数据 — 重庆大学虎溪校区
    this.scenicRoutes = [
      { id: 1, name: '校园主干道', duration: '15分钟', length: '0.8km', lampIds: ['lamp_001','lamp_003'], tags: ['主干道','教学楼'], description: '从西门经教学楼到操场，贯穿校园核心区' },
      { id: 2, name: '食堂直通线', duration: '8分钟', length: '0.5km', lampIds: ['lamp_001','lamp_002'], tags: ['食堂','生活区'], description: '西门直达一食堂，沿途经过图书馆和银杏大道' },
      { id: 3, name: '操场环形道', duration: '12分钟', length: '0.6km', lampIds: ['lamp_002','lamp_003'], tags: ['运动','环形'], description: '一食堂经图书馆到操场，饭后散步首选路线' },
    ];
    this.scenicSpots = [
      { id: 1, name: '北门银杏道', lampId: 'lamp_001', image: '🍂', description: '秋季银杏叶金黄铺地，校园最美打卡点', bestTime: '10月-11月 15:00-17:00', tips: '逆光拍摄银杏叶透光效果最佳' },
      { id: 2, name: '老门柱广场', lampId: 'lamp_002', image: '🏛', description: '重大建校时期的标志性门柱，承载校园历史记忆，暖光路灯映照下的绝佳取景地', bestTime: '17:00-19:00', tips: '利用路灯侧光突出门柱纹理和历史感' },
      { id: 3, name: '操场看台', lampId: 'lamp_002', image: '🏟', description: '夕阳下的操场全景，路灯点亮运动场', bestTime: '17:00-19:00', tips: '看台高处俯拍操场全貌' },
    ];
    this.scenicEvents = [
      { id: 1, name: '草坪音乐节', type: '🎵', typeLabel: '音乐节', date: '2026-09-20', time: '18:30', location: '综合楼前草坪', lampId: 'lamp_001', description: '年度校园草坪音乐节，乐队Live演出，路灯氛围灯光配合' },
      { id: 2, name: '校园美食节', type: '🍜', typeLabel: '美食节', date: '2026-10-15', time: '11:00', location: '第一食堂', lampId: 'lamp_002', description: '各地美食汇聚，路灯夜间照明延长营业至晚9点' },
      { id: 3, name: '国际文化节', type: '🌍', typeLabel: '文化节', date: '2026-10-28', time: '14:00', location: '梅园篮球场', lampId: 'lamp_003', description: '多国文化交流展演，路灯彩光装饰营造异域氛围' },
      { id: 4, name: '秋季运动会', type: '🏃', typeLabel: '运动会', date: '2026-11-01', time: '08:00', location: '田径场', lampId: 'lamp_003', description: '全校田径运动会，智慧路灯全程照明保障' },
    ];
    this.scenicLamps = [
      { id: 'lamp_001', name: '北门路灯', x: 10, y: 35 },
      { id: 'lamp_002', name: '田径场路灯', x: 60, y: 45 },
      { id: 'lamp_003', name: '一食堂路灯', x: 55, y: 75 },
    ];

    console.log('MockDatabase initialized with sample data (8 alarms + scenic data)');
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

  static updateAlarmLevel(alarmId: number, level: 'low' | 'medium' | 'high' | 'critical', message: string): boolean {
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

  static addFaultReport(report: Omit<FaultReport, 'id'>): FaultReport {
    const newReport: FaultReport = {
      ...report,
      id: this.faultReportIdCounter++
    };

    this.faultReports.push(newReport);
    return newReport;
  }

  static getFaultReports(filters?: { status?: string; lampId?: string }): FaultReport[] {
    let list = [...this.faultReports];
    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }
    if (filters?.lampId) {
      list = list.filter(r => r.lampId === filters.lampId);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static getFaultReport(id: number): FaultReport | null {
    return this.faultReports.find(r => r.id === id) || null;
  }

  static resolveFaultReport(id: number, note: string | null): boolean {
    const report = this.faultReports.find(r => r.id === id);
    if (!report) return false;
    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolveNote = note;
    return true;
  }

  // ===== 人工审核 =====

  static addReportAuditLog(log: Omit<ReportAuditLog, 'id'>): ReportAuditLog {
    const created = { ...log, photoUrls: [...log.photoUrls], id: this.reportAuditIdCounter++ };
    this.reportAuditLogs.push(created);
    return { ...created, photoUrls: [...created.photoUrls] };
  }

  static getReportAuditLogs(filters?: { reviewStatus?: string; auditPass?: number }): ReportAuditLog[] {
    return this.reportAuditLogs
      .filter(log => !filters?.reviewStatus || log.reviewStatus === filters.reviewStatus)
      .filter(log => filters?.auditPass === undefined || log.auditPass === filters.auditPass)
      .sort((a, b) => b.createTime.getTime() - a.createTime.getTime())
      .map(log => ({ ...log, photoUrls: [...log.photoUrls] }));
  }

  static getReportAuditLog(id: number): ReportAuditLog | null {
    const log = this.reportAuditLogs.find(item => item.id === id);
    return log ? { ...log, photoUrls: [...log.photoUrls] } : null;
  }

  static findDuplicateAuditLog(phone: string, lampId: string, description: string, since: Date): ReportAuditLog | null {
    const log = this.reportAuditLogs
      .filter(item => item.reportPhone === phone && item.lampId === lampId)
      .filter(item => item.faultContent.trim() === description.trim())
      .filter(item => item.createTime >= since && item.reviewStatus !== 'rejected')
      .sort((a, b) => b.createTime.getTime() - a.createTime.getTime())[0];
    return log ? { ...log, photoUrls: [...log.photoUrls] } : null;
  }

  static approveReportAudit(id: number, reviewerId: number, reviewer: string) {
    const log = this.reportAuditLogs.find(item => item.id === id);
    if (!log) throw new Error('AUDIT_NOT_FOUND');
    if (log.reviewStatus !== 'pending_review') throw new Error('AUDIT_ALREADY_REVIEWED');

    const device = this.devices.get(log.lampId);
    const now = new Date();
    const alarm = this.addAlarm({
      deviceId: log.lampId,
      deviceName: device?.name || log.lampId,
      alarmType: 'fault_report',
      alarmLevel: 'medium',
      status: 'active',
      message: `游客上报故障：${log.faultContent}`,
      createdAt: now,
      handledAt: null,
      handlerId: null,
      handlerName: null,
    });
    const report = this.addFaultReport({
      alarmId: alarm.id,
      reporterName: log.reportName,
      reporterPhone: log.reportPhone,
      lampId: log.lampId,
      description: log.faultContent,
      photoUrls: [...log.photoUrls],
      status: 'active',
      createdAt: log.createTime,
      resolvedAt: null,
      resolveNote: null,
    });

    Object.assign(log, {
      reviewStatus: 'approved', reviewAction: 'approved', reviewerId, reviewer,
      reviewTime: now, alarmId: alarm.id, faultReportId: report.id,
    });
    return { auditLog: { ...log, photoUrls: [...log.photoUrls] }, alarm, report };
  }

  static rejectReportAudit(id: number, reviewerId: number, reviewer: string, reviewReason: string): ReportAuditLog {
    const log = this.reportAuditLogs.find(item => item.id === id);
    if (!log) throw new Error('AUDIT_NOT_FOUND');
    if (log.reviewStatus !== 'pending_review') throw new Error('AUDIT_ALREADY_REVIEWED');
    Object.assign(log, {
      reviewStatus: 'rejected', reviewAction: 'rejected', reviewerId, reviewer,
      reviewTime: new Date(), reviewReason,
    });
    return { ...log, photoUrls: [...log.photoUrls] };
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
    this.faultReports = [];
    this.reportAuditLogs = [];
    this.lightData = [];
    this.aggregatedData = [];
    this.scenicRoutes = [];
    this.scenicSpots = [];
    this.scenicEvents = [];
    this.scenicLamps = [];
    this.faultReports = [];
    this.logIdCounter = 1;
    this.alarmIdCounter = 1;
    this.faultReportIdCounter = 1;
    this.reportAuditIdCounter = 1;
    this.lightDataIdCounter = 1;
    this.aggregatedDataIdCounter = 1;
  }

  // ===== 景区数据存储（供 scenic-data.ts 种子填充） =====
  private static scenicRoutes: any[] = [];
  private static scenicSpots: any[] = [];
  private static scenicEvents: any[] = [];
  private static scenicLamps: any[] = [];

  static getScenicRoutes() { return this.scenicRoutes; }
  static getScenicSpots() { return this.scenicSpots; }
  static getScenicEvents() { return this.scenicEvents; }
  static getScenicLamps() { return this.scenicLamps; }
}
