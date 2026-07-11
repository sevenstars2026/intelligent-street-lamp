/**
 * 真实 MySQL 数据库服务
 * 镜像 MockDatabase 的全部接口，但使用 mysql2 连接真实数据库
 * 所有方法均为 async，返回 Promise
 */

import { getPool } from '../config/database';
import { MockDatabase } from '../mock/mock-database';
import type {
  Device,
  ThresholdConfig,
  ControlLog,
  Alarm,
  FaultReport,
  LightDataRecord,
  AggregatedDataRecord,
  ReportAuditLog,
} from '../types/database.types';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ====== 行映射工具函数 ======

function mapDevice(row: RowDataPacket): Device {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    mode: row.mode,
    currentState: row.current_state,
    lastHeartbeat: new Date(row.last_heartbeat),
  };
}

function mapThreshold(row: RowDataPacket): ThresholdConfig {
  return {
    deviceId: row.device_id,
    lightThresholdOn: row.light_threshold_on,
    lightThresholdOff: row.light_threshold_off,
    updatedAt: new Date(row.updated_at),
  };
}

function mapControlLog(row: RowDataPacket): ControlLog {
  return {
    id: row.id,
    deviceId: row.device_id,
    command: row.command,
    status: row.status,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    requestTime: new Date(row.request_time),
    responseTime: row.response_time ? new Date(row.response_time) : null,
    resultMessage: row.result_message || '',
  };
}

function mapAlarm(row: RowDataPacket): Alarm {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    alarmType: row.alarm_type,
    alarmLevel: row.alarm_level,
    status: row.status,
    message: row.message || '',
    createdAt: new Date(row.created_at),
    handledAt: row.handled_at ? new Date(row.handled_at) : null,
    handlerId: row.handler_id ?? null,
    handlerName: row.handler_name ?? null,
  };
}

function mapLightData(row: RowDataPacket): LightDataRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    lightIntensity: row.light_intensity,
    timestamp: new Date(row.timestamp),
  };
}

function mapAggregatedData(row: RowDataPacket): AggregatedDataRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    timeWindow: new Date(row.time_window),
    avgLightIntensity: row.avg_light_intensity,
    maxLightIntensity: row.max_light_intensity,
    minLightIntensity: row.min_light_intensity,
    sampleCount: row.sample_count,
  };
}

function mapFaultReport(row: RowDataPacket): FaultReport {
  return {
    id: row.id,
    alarmId: row.alarm_id,
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    lampId: row.lamp_id,
    description: row.description,
    photoUrls: typeof row.photo_urls === 'string' ? JSON.parse(row.photo_urls) : (row.photo_urls || []),
    status: row.status || 'active',
    createdAt: new Date(row.created_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    resolveNote: row.resolve_note || null,
  };
}

function parsePhotoUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapReportAuditLog(row: RowDataPacket): ReportAuditLog {
  return {
    id: Number(row.id),
    reportName: row.report_name,
    reportPhone: row.report_phone,
    lampId: row.lamp_id,
    faultContent: row.fault_content,
    photoUrls: parsePhotoUrls(row.photo_urls),
    auditPass: row.audit_pass,
    auditReason: row.audit_reason,
    aiResponse: row.ai_response ?? null,
    reviewStatus: row.review_status,
    reviewerId: row.reviewer_id ?? null,
    reviewer: row.reviewer ?? null,
    reviewTime: row.review_time ? new Date(row.review_time) : null,
    reviewAction: row.review_action ?? null,
    reviewReason: row.review_reason ?? null,
    faultReportId: row.fault_report_id ?? null,
    alarmId: row.alarm_id ?? null,
    createTime: new Date(row.create_time),
  };
}

// ====== DatabaseService 类 ======

export class DatabaseService {
  private static useMock = false;

  private static pool() {
    return getPool();
  }

  // ===== 初始化 =====

  static async init(): Promise<void> {
    let conn;
    try {
      const pool = this.pool();
      conn = await pool.getConnection();
      console.log('[DB] Connected, initializing tables...');
      await conn.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          status ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
          mode ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
          current_state ENUM('on', 'off') NOT NULL DEFAULT 'off',
          last_heartbeat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_devices_status (status)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS thresholds (
          device_id VARCHAR(64) PRIMARY KEY,
          light_threshold_on INT NOT NULL,
          light_threshold_off INT NOT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_thresholds_updated_at (updated_at)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS control_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(64) NOT NULL,
          command ENUM('on', 'off') NOT NULL,
          status ENUM('success', 'failed', 'timeout') NOT NULL,
          operator_id INT NOT NULL,
          operator_name VARCHAR(100) NOT NULL,
          request_time DATETIME NOT NULL,
          response_time DATETIME NULL,
          result_message TEXT,
          INDEX idx_control_logs_device_time (device_id, request_time)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS light_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(64) NOT NULL,
          light_intensity INT NOT NULL,
          timestamp DATETIME NOT NULL,
          INDEX idx_light_data_device_time (device_id, timestamp)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS aggregated_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(64) NOT NULL,
          time_window DATETIME NOT NULL,
          avg_light_intensity DECIMAL(10,2) NOT NULL,
          max_light_intensity INT NOT NULL,
          min_light_intensity INT NOT NULL,
          sample_count INT NOT NULL,
          INDEX idx_aggregated_data_device_window (device_id, time_window)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS alarms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(64) NOT NULL,
          device_name VARCHAR(100) NOT NULL,
          alarm_type ENUM('offline', 'control_failed', 'frequent_switch', 'threshold_anomaly') NOT NULL,
          alarm_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
          status ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
          message TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          handled_at DATETIME NULL,
          handler_id INT NULL,
          handler_name VARCHAR(100) NULL,
          INDEX idx_alarms_status_created (status, created_at),
          INDEX idx_alarms_device_type_status (device_id, alarm_type, status)
        )
      `);
      try {
        await conn.query(`
          ALTER TABLE alarms
          MODIFY alarm_type ENUM('offline', 'control_failed', 'frequent_switch', 'threshold_anomaly', 'fault_report') NOT NULL
        `);
      } catch {}
      // 检测旧表结构：如果表存在但缺少 alarm_id 列，说明是旧 schema → 删掉重建
      try {
        await conn.query('SELECT alarm_id FROM fault_reports LIMIT 0');
      } catch (_e: any) {
        if (_e.code === 'ER_BAD_FIELD_ERROR') {
          console.log('[DB] fault_reports has old schema, dropping...');
          await conn.query('DROP TABLE IF EXISTS fault_reports');
        }
      }
      await conn.query(`
        CREATE TABLE IF NOT EXISTS fault_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          alarm_id INT NOT NULL,
          reporter_name VARCHAR(100) NOT NULL,
          reporter_phone VARCHAR(30) NOT NULL,
          lamp_id VARCHAR(64) NOT NULL,
          description TEXT NOT NULL,
          photo_urls JSON NULL,
          status ENUM('active', 'resolved') NOT NULL DEFAULT 'active',
          resolved_at DATETIME NULL,
          resolve_note TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_fault_reports_alarm_id (alarm_id),
          INDEX idx_fault_reports_lamp_created (lamp_id, created_at),
          INDEX idx_fault_reports_status (status)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS report_audit_log (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          report_name VARCHAR(100) NOT NULL,
          report_phone VARCHAR(30) NOT NULL,
          lamp_id VARCHAR(64) NOT NULL,
          fault_content TEXT NOT NULL,
          photo_urls JSON NULL,
          audit_pass TINYINT NOT NULL,
          audit_reason TEXT NOT NULL,
          ai_response LONGTEXT NULL,
          review_status ENUM('ai_rejected','pending_review','approved','rejected') NOT NULL,
          reviewer_id INT NULL,
          reviewer VARCHAR(100) NULL,
          review_time DATETIME NULL,
          review_action ENUM('approved','rejected') NULL,
          review_reason TEXT NULL,
          fault_report_id INT NULL,
          alarm_id INT NULL,
          create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_status_time (review_status, create_time),
          INDEX idx_audit_pass (audit_pass),
          INDEX idx_audit_duplicate (report_phone, lamp_id, create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // 兼容旧表：maxkb_response → ai_response 重命名
      try { await conn.query(`ALTER TABLE report_audit_log CHANGE COLUMN maxkb_response ai_response LONGTEXT NULL`); } catch (_e: any) {}
      // 兼容旧表：补充可能缺失的列
      try { await conn.query(`ALTER TABLE fault_reports ADD COLUMN alarm_id INT NOT NULL DEFAULT 0`); } catch (_e: any) {}
      try { await conn.query(`ALTER TABLE fault_reports ADD COLUMN status ENUM('active', 'resolved') NOT NULL DEFAULT 'active'`); } catch (_e: any) {}
      try { await conn.query(`ALTER TABLE fault_reports ADD COLUMN resolved_at DATETIME NULL`); } catch (_e: any) {}
      try { await conn.query(`ALTER TABLE fault_reports ADD COLUMN resolve_note TEXT NULL`); } catch (_e: any) {}
      await conn.query(`
        INSERT IGNORE INTO devices (id, name, status, mode, current_state, last_heartbeat)
        VALUES
          ('lamp_001', '路灯001', 'online', 'auto', 'off', NOW()),
          ('lamp_002', '路灯002', 'online', 'auto', 'on', NOW()),
          ('lamp_003', '路灯003', 'offline', 'manual', 'off', DATE_SUB(NOW(), INTERVAL 2 HOUR))
      `);
      await conn.query(`
        INSERT IGNORE INTO thresholds (device_id, light_threshold_on, light_threshold_off, updated_at)
        VALUES
          ('lamp_001', 200, 600, NOW()),
          ('lamp_002', 200, 600, NOW()),
          ('lamp_003', 200, 600, NOW())
      `);
      // 种子告警数据（仅当 alarms 表为空时插入 8 条样本）
      await conn.query(`
        INSERT IGNORE INTO alarms (id, device_id, device_name, alarm_type, alarm_level, status, message, created_at, handled_at, handler_id, handler_name)
        VALUES
          (1, 'lamp_001', '路灯001', 'offline',       'high',     'active',   '设备 路灯001(lamp_001) 已离线超过30秒，最后心跳时间 2026-07-06 08:31:26', '2026-07-06 10:31:56', NULL, NULL, NULL),
          (2, 'lamp_002', '路灯002', 'offline',       'high',     'active',   '设备 路灯002(lamp_002) 已离线超过30秒，最后心跳时间 2026-07-06 08:31:26', '2026-07-06 10:31:56', NULL, NULL, NULL),
          (3, 'lamp_003', '路灯003', 'offline',       'critical', 'active',   '设备 路灯003(lamp_003) 已离线超过2小时，最后心跳时间 2026-07-06 08:31:26', '2026-07-06 08:31:26', NULL, NULL, NULL),
          (4, 'lamp_001', '路灯001', 'control_failed','medium',   'resolved', '设备 路灯001(lamp_001) 控制失败：设备无响应',                       '2026-07-05 18:20:00', '2026-07-05 19:00:00', 1, '管理员'),
          (5, 'lamp_002', '路灯002', 'control_failed','medium',   'active',   '设备 路灯002(lamp_002) 控制失败：超时未确认',                       '2026-07-06 08:45:00', NULL, NULL, NULL),
          (6, 'lamp_001', '路灯001', 'frequent_switch','low',     'active',   '设备 路灯001(lamp_001) 近10分钟内开关操作达7次，触发频繁开关告警',      '2026-07-06 09:15:00', NULL, NULL, NULL),
          (7, 'lamp_003', '路灯003', 'threshold_anomaly','medium','resolved', '设备 路灯003(lamp_003) 光照传感器读数异常，连续3次超过阈值范围',        '2026-07-04 14:30:00', '2026-07-04 16:00:00', 1, '管理员'),
          (8, 'lamp_002', '路灯002', 'frequent_switch','low',     'resolved', '设备 路灯002(lamp_002) 近10分钟内开关操作达5次，触发频繁开关告警',      '2026-07-05 22:10:00', '2026-07-05 23:00:00', 1, '管理员')
      `);
      // 景区表
      await conn.query(`
        CREATE TABLE IF NOT EXISTS scenic_routes (
          id INT PRIMARY KEY, name VARCHAR(100), duration VARCHAR(20), length VARCHAR(20),
          lampIds JSON, tags JSON, description TEXT
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS scenic_spots (
          id INT PRIMARY KEY, name VARCHAR(100), lampId VARCHAR(20), image VARCHAR(10),
          description TEXT, bestTime VARCHAR(50), tips VARCHAR(200)
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS scenic_events (
          id INT PRIMARY KEY, name VARCHAR(100), type VARCHAR(10), typeLabel VARCHAR(20),
          date VARCHAR(20), time VARCHAR(10), location VARCHAR(100), lampId VARCHAR(20), description TEXT
        )
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS scenic_lamps (
          id VARCHAR(20) PRIMARY KEY, name VARCHAR(100), x INT, y INT
        )
      `);
      // 种子景区数据（逐条容错，不影响核心功能）
      try { await conn.query(`REPLACE INTO scenic_routes (id,name,duration,length,lampIds,tags,description) VALUES
        (1,'校园主干道','15分钟','0.8km','["lamp_001","lamp_003"]','["主干道","教学楼"]','从西门经教学楼到操场，贯穿校园核心区'),
        (2,'食堂直通线','8分钟','0.5km','["lamp_001","lamp_002"]','["食堂","生活区"]','西门直达一食堂，沿途经过图书馆和银杏大道'),
        (3,'操场环形道','12分钟','0.6km','["lamp_002","lamp_003"]','["运动","环形"]','一食堂经图书馆到操场，饭后散步首选路线')
      `); } catch (e: any) { console.error('[DB] scenic_routes seed failed:', e.message); }
      try {
        await conn.query(`DELETE FROM scenic_spots WHERE id > 3`);
        await conn.query(`REPLACE INTO scenic_spots (id,name,lampId,image,description,bestTime,tips) VALUES
        (1,'北门银杏道','lamp_001','🍂','秋季银杏叶金黄铺地，校园最美打卡点','10月-11月 15:00-17:00','逆光拍摄银杏叶透光效果最佳'),
        (2,'老门柱广场','lamp_002','🏛','重大建校时期的标志性门柱，承载校园历史记忆，暖光路灯映照下的绝佳取景地','17:00-19:00','利用路灯侧光突出门柱纹理和历史感'),
        (3,'操场看台','lamp_003','🏟','夕阳下的操场全景，路灯点亮运动场','17:00-19:00','看台高处俯拍操场全貌')
        `);
      } catch (e: any) { console.error('[DB] scenic_spots seed failed:', e.message); }
      try { await conn.query(`REPLACE INTO scenic_events (id,name,type,typeLabel,date,time,location,lampId,description) VALUES
        (1,'草坪音乐节','音乐','音乐节','2026-09-20','18:30','综合楼前草坪','lamp_001','年度校园草坪音乐节，乐队Live演出，路灯氛围灯光配合'),
        (2,'校园美食节','美食','美食节','2026-10-15','11:00','第一食堂','lamp_002','各地美食汇聚，路灯夜间照明延长营业至晚9点'),
        (3,'国际文化节','文化','文化节','2026-10-28','14:00','梅园篮球场','lamp_003','多国文化交流展演，路灯彩光装饰营造异域氛围'),
        (4,'秋季运动会','运动','运动会','2026-11-01','08:00','田径场','lamp_003','全校田径运动会，智慧路灯全程照明保障')
      `); } catch (e: any) { console.error('[DB] scenic_events seed failed:', e.message); }
      try { await conn.query(`REPLACE INTO scenic_lamps (id,name,x,y) VALUES
        ('lamp_001','北门路灯',25,35),
        ('lamp_002','操场路灯',60,45),
        ('lamp_003','一食堂路灯',55,75)
      `); } catch (e: any) { console.error('[DB] scenic_lamps seed failed:', e.message); }

      this.useMock = false;
      console.log('[DB] ✓ All init queries passed, MySQL connected');
    } catch (error: any) {
      this.useMock = true;
      MockDatabase.reset();
      MockDatabase.init();
      console.warn(`[Database] MySQL unavailable, using MockDatabase fallback: ${error.message}`);
    } finally {
      if (conn) conn.release();
    }
  }

  static async ping(): Promise<boolean> {
    if (this.useMock) return false;
    await this.pool().query('SELECT 1');
    return true;
  }

  // ===== 设备操作 =====

  static async getDevice(deviceId: string): Promise<Device | null> {
    if (this.useMock) return MockDatabase.getDevice(deviceId);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, name, status, mode, current_state, last_heartbeat FROM devices WHERE id = ?',
      [deviceId]
    );
    return rows.length > 0 ? mapDevice(rows[0]) : null;
  }

  static async getAllDevices(): Promise<Device[]> {
    if (this.useMock) return MockDatabase.getAllDevices();
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, name, status, mode, current_state, last_heartbeat FROM devices'
    );
    return rows.map(mapDevice);
  }

  static async updateDeviceStatus(
    deviceId: string,
    status: 'online' | 'offline'
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateDeviceStatus(deviceId, status);
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE devices SET status = ? WHERE id = ?',
      [status, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async updateDeviceState(
    deviceId: string,
    state: 'on' | 'off'
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateDeviceState(deviceId, state);
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE devices SET current_state = ? WHERE id = ?',
      [state, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async updateDeviceMode(
    deviceId: string,
    mode: 'auto' | 'manual'
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateDeviceMode(deviceId, mode);
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE devices SET mode = ? WHERE id = ?',
      [mode, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async updateHeartbeat(deviceId: string): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateHeartbeat(deviceId);
    const [result] = await this.pool().query<ResultSetHeader>(
      "UPDATE devices SET last_heartbeat = NOW(), status = 'online' WHERE id = ?",
      [deviceId]
    );
    return result.affectedRows > 0;
  }

  // ===== 阈值配置操作 =====

  static async getThreshold(deviceId: string): Promise<ThresholdConfig | null> {
    if (this.useMock) return MockDatabase.getThreshold(deviceId);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT device_id, light_threshold_on, light_threshold_off, updated_at FROM thresholds WHERE device_id = ?',
      [deviceId]
    );
    return rows.length > 0 ? mapThreshold(rows[0]) : null;
  }

  static async setThreshold(
    config: Omit<ThresholdConfig, 'updatedAt'>
  ): Promise<ThresholdConfig> {
    if (this.useMock) return MockDatabase.setThreshold(config);
    await this.pool().query(
      `INSERT INTO thresholds (device_id, light_threshold_on, light_threshold_off, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         light_threshold_on = VALUES(light_threshold_on),
         light_threshold_off = VALUES(light_threshold_off),
         updated_at = NOW()`,
      [config.deviceId, config.lightThresholdOn, config.lightThresholdOff]
    );
    // 查询回最新记录
    const updated = await this.getThreshold(config.deviceId);
    if (!updated) {
      throw new Error(`Failed to load threshold after upsert for device_id=${config.deviceId}`);
    }
    return updated;
  }

  static async touchThresholdUpdatedAt(deviceId: string): Promise<boolean> {
    if (this.useMock) {
      const threshold = MockDatabase.getThreshold(deviceId);
      if (!threshold) return false;
      MockDatabase.setThreshold({
        deviceId,
        lightThresholdOn: threshold.lightThresholdOn,
        lightThresholdOff: threshold.lightThresholdOff,
      });
      return true;
    }
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE thresholds SET updated_at = NOW() WHERE device_id = ?',
      [deviceId]
    );
    return result.affectedRows > 0;
  }

  // ===== 控制日志操作 =====

  static async addControlLog(
    log: Omit<ControlLog, 'id'>
  ): Promise<ControlLog> {
    if (this.useMock) return MockDatabase.addControlLog(log);
    const [result] = await this.pool().query<ResultSetHeader>(
      `INSERT INTO control_logs (device_id, command, status, operator_id, operator_name, request_time, response_time, result_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.deviceId,
        log.command,
        log.status,
        log.operatorId,
        log.operatorName,
        log.requestTime,
        log.responseTime,
        log.resultMessage || '',
      ]
    );
    return { ...log, id: result.insertId };
  }

  static async getControlLogs(
    deviceId: string,
    limit?: number
  ): Promise<ControlLog[]> {
    if (this.useMock) return MockDatabase.getControlLogs(deviceId, limit);
    let sql =
      'SELECT id, device_id, command, status, operator_id, operator_name, request_time, response_time, result_message FROM control_logs WHERE device_id = ? ORDER BY request_time DESC';
    const params: (string | number)[] = [deviceId];

    if (limit !== undefined && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const [rows] = await this.pool().query<RowDataPacket[]>(sql, params);
    return rows.map(mapControlLog);
  }

  static async updateControlLogResult(
    logId: number,
    status: 'success' | 'failed' | 'timeout',
    resultMessage: string
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateControlLogResult(logId, status, resultMessage);
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE control_logs SET status = ?, result_message = ?, response_time = NOW() WHERE id = ?',
      [status, resultMessage, logId]
    );
    return result.affectedRows > 0;
  }

  // ===== 告警操作 =====

  static async addAlarm(alarm: Omit<Alarm, 'id'>): Promise<Alarm> {
    if (this.useMock) return MockDatabase.addAlarm(alarm);
    const [result] = await this.pool().query<ResultSetHeader>(
      `INSERT INTO alarms (device_id, device_name, alarm_type, alarm_level, status, message, created_at, handled_at, handler_id, handler_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alarm.deviceId,
        alarm.deviceName,
        alarm.alarmType,
        alarm.alarmLevel,
        alarm.status,
        alarm.message,
        alarm.createdAt,
        alarm.handledAt ?? null,
        alarm.handlerId ?? null,
        alarm.handlerName ?? null,
      ]
    );
    return { ...alarm, id: result.insertId };
  }

  static async addFaultReport(report: Omit<FaultReport, 'id'>): Promise<FaultReport> {
    if (this.useMock) return MockDatabase.addFaultReport(report);
    const [result] = await this.pool().query<ResultSetHeader>(
      `INSERT INTO fault_reports (alarm_id, reporter_name, reporter_phone, lamp_id, description, photo_urls, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        report.alarmId,
        report.reporterName,
        report.reporterPhone,
        report.lampId,
        report.description,
        JSON.stringify(report.photoUrls),
        report.createdAt,
      ]
    );
    return { ...report, id: result.insertId, status: 'active', resolvedAt: null, resolveNote: null };
  }

  static async getFaultReports(filters?: { status?: string; lampId?: string }): Promise<FaultReport[]> {
    if (this.useMock) return MockDatabase.getFaultReports(filters);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.lampId) {
      conditions.push('lamp_id = ?');
      params.push(filters.lampId);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT id, alarm_id, reporter_name, reporter_phone, lamp_id, description, photo_urls, status, resolved_at, resolve_note, created_at FROM fault_reports ${where} ORDER BY created_at DESC`;

    const [rows] = await this.pool().query<RowDataPacket[]>(sql, params);
    let reports = rows.map(mapFaultReport);
    // status 过滤（SQL 也可以做，这里保留内存过滤作为兜底）
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    return reports;
  }

  static async getFaultReport(id: number): Promise<FaultReport | null> {
    if (this.useMock) return MockDatabase.getFaultReport(id);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, alarm_id, reporter_name, reporter_phone, lamp_id, description, photo_urls, status, resolved_at, resolve_note, created_at FROM fault_reports WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapFaultReport(rows[0]) : null;
  }

  static async resolveFaultReport(id: number, note: string | null): Promise<boolean> {
    if (this.useMock) return MockDatabase.resolveFaultReport(id, note);
    // 先尝试更新 status/resolved_at/resolve_note（新表）
    try {
      const [result] = await this.pool().query<ResultSetHeader>(
        "UPDATE fault_reports SET status = 'resolved', resolved_at = NOW(), resolve_note = ? WHERE id = ? AND status = 'active'",
        [note, id]
      );
      return result.affectedRows > 0;
    } catch (_e) {
      // 旧表无 status 列：仅确认记录存在即算成功
      const report = await this.getFaultReport(id);
      return report !== null;
    }
  }

  // ===== 上报审核操作 =====

  static async addReportAuditLog(log: Omit<ReportAuditLog, 'id'>): Promise<ReportAuditLog> {
    if (this.useMock) return MockDatabase.addReportAuditLog(log);
    const [result] = await this.pool().query<ResultSetHeader>(
      `INSERT INTO report_audit_log
       (report_name, report_phone, lamp_id, fault_content, photo_urls, audit_pass, audit_reason,
        ai_response, review_status, reviewer_id, reviewer, review_time, review_action,
        review_reason, fault_report_id, alarm_id, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.reportName, log.reportPhone, log.lampId, log.faultContent,
        JSON.stringify(log.photoUrls), log.auditPass, log.auditReason, log.aiResponse,
        log.reviewStatus, log.reviewerId, log.reviewer, log.reviewTime, log.reviewAction,
        log.reviewReason, log.faultReportId, log.alarmId, log.createTime,
      ]
    );
    return { ...log, id: result.insertId };
  }

  static async getReportAuditLogs(
    filters: { reviewStatus?: string; auditPass?: number } = {},
    page = 1,
    pageSize = 20
  ): Promise<{ logs: ReportAuditLog[]; total: number }> {
    if (this.useMock) {
      const all = MockDatabase.getReportAuditLogs(filters);
      return { logs: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
    }
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (filters.reviewStatus) {
      conditions.push('review_status = ?');
      params.push(filters.reviewStatus);
    }
    if (filters.auditPass !== undefined) {
      conditions.push('audit_pass = ?');
      params.push(filters.auditPass);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await this.pool().query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM report_audit_log ${where}`,
      params
    );
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT * FROM report_audit_log ${where} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    return { logs: rows.map(mapReportAuditLog), total: Number(countRows[0].total) };
  }

  static async getReportAuditLog(id: number): Promise<ReportAuditLog | null> {
    if (this.useMock) return MockDatabase.getReportAuditLog(id);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT * FROM report_audit_log WHERE id = ?', [id]
    );
    return rows.length ? mapReportAuditLog(rows[0]) : null;
  }

  static async findDuplicateAuditLog(
    phone: string, lampId: string, description: string, since: Date
  ): Promise<ReportAuditLog | null> {
    if (this.useMock) return MockDatabase.findDuplicateAuditLog(phone, lampId, description, since);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      `SELECT * FROM report_audit_log
       WHERE report_phone = ? AND lamp_id = ? AND TRIM(fault_content) = ?
         AND create_time >= ? AND review_status <> 'rejected'
       ORDER BY create_time DESC LIMIT 1`,
      [phone, lampId, description.trim(), since]
    );
    return rows.length ? mapReportAuditLog(rows[0]) : null;
  }

  static async approveReportAudit(id: number, reviewerId: number, reviewer: string) {
    if (this.useMock) return MockDatabase.approveReportAudit(id, reviewerId, reviewer);
    const conn = await this.pool().getConnection();
    try {
      await conn.beginTransaction();
      const [auditRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM report_audit_log WHERE id = ? FOR UPDATE', [id]
      );
      if (!auditRows.length) throw new Error('AUDIT_NOT_FOUND');
      const auditLog = mapReportAuditLog(auditRows[0]);
      if (auditLog.reviewStatus !== 'pending_review') throw new Error('AUDIT_ALREADY_REVIEWED');

      const [deviceRows] = await conn.query<RowDataPacket[]>('SELECT name FROM devices WHERE id = ?', [auditLog.lampId]);
      const deviceName = deviceRows[0]?.name || auditLog.lampId;
      const now = new Date();
      const [alarmResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO alarms (device_id, device_name, alarm_type, alarm_level, status, message, created_at)
         VALUES (?, ?, 'fault_report', 'medium', 'active', ?, ?)`,
        [auditLog.lampId, deviceName, `游客上报故障：${auditLog.faultContent}`, now]
      );
      const [reportResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO fault_reports
         (alarm_id, reporter_name, reporter_phone, lamp_id, description, photo_urls, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        [alarmResult.insertId, auditLog.reportName, auditLog.reportPhone, auditLog.lampId,
          auditLog.faultContent, JSON.stringify(auditLog.photoUrls), auditLog.createTime]
      );
      await conn.query(
        `UPDATE report_audit_log SET review_status='approved', reviewer_id=?, reviewer=?,
         review_time=?, review_action='approved', fault_report_id=?, alarm_id=? WHERE id=?`,
        [reviewerId, reviewer, now, reportResult.insertId, alarmResult.insertId, id]
      );
      await conn.commit();

      const alarm: Alarm = {
        id: alarmResult.insertId, deviceId: auditLog.lampId, deviceName,
        alarmType: 'fault_report', alarmLevel: 'medium', status: 'active',
        message: `游客上报故障：${auditLog.faultContent}`, createdAt: now,
        handledAt: null, handlerId: null, handlerName: null,
      };
      const report: FaultReport = {
        id: reportResult.insertId, alarmId: alarm.id, reporterName: auditLog.reportName,
        reporterPhone: auditLog.reportPhone, lampId: auditLog.lampId,
        description: auditLog.faultContent, photoUrls: auditLog.photoUrls,
        status: 'active', createdAt: auditLog.createTime, resolvedAt: null, resolveNote: null,
      };
      return {
        auditLog: { ...auditLog, reviewStatus: 'approved' as const, reviewerId, reviewer,
          reviewTime: now, reviewAction: 'approved' as const, faultReportId: report.id, alarmId: alarm.id },
        alarm, report,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async rejectReportAudit(
    id: number, reviewerId: number, reviewer: string, reviewReason: string
  ): Promise<ReportAuditLog> {
    if (this.useMock) return MockDatabase.rejectReportAudit(id, reviewerId, reviewer, reviewReason);
    const conn = await this.pool().getConnection();
    try {
      await conn.beginTransaction();
      const [auditRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM report_audit_log WHERE id = ? FOR UPDATE', [id]
      );
      if (!auditRows.length) throw new Error('AUDIT_NOT_FOUND');
      const auditLog = mapReportAuditLog(auditRows[0]);
      if (auditLog.reviewStatus !== 'pending_review') throw new Error('AUDIT_ALREADY_REVIEWED');

      const now = new Date();
      await conn.query(
        `UPDATE report_audit_log SET review_status='rejected', reviewer_id=?, reviewer=?,
         review_time=?, review_action='rejected', review_reason=? WHERE id=?`,
        [reviewerId, reviewer, now, reviewReason, id]
      );
      await conn.commit();

      return {
        ...auditLog,
        reviewStatus: 'rejected' as const,
        reviewerId, reviewer,
        reviewTime: now,
        reviewAction: 'rejected' as const,
        reviewReason,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  static async getAlarms(filters?: {
    status?: 'active' | 'resolved';
    deviceId?: string;
    alarmType?: string;
    alarmLevel?: string;
  }): Promise<Alarm[]> {
    if (this.useMock) return MockDatabase.getAlarms(filters);
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.deviceId) {
      conditions.push('device_id = ?');
      params.push(filters.deviceId);
    }
    if (filters?.alarmType) {
      conditions.push('alarm_type = ?');
      params.push(filters.alarmType);
    }
    if (filters?.alarmLevel) {
      conditions.push('alarm_level = ?');
      params.push(filters.alarmLevel);
    }

    const where =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT id, device_id, device_name, alarm_type, alarm_level, status, message, created_at, handled_at, handler_id, handler_name FROM alarms ${where} ORDER BY created_at DESC`;

    const [rows] = await this.pool().query<RowDataPacket[]>(sql, params);
    return rows.map(mapAlarm);
  }

  static async getAlarm(alarmId: number): Promise<Alarm | null> {
    if (this.useMock) return MockDatabase.getAlarm(alarmId);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, device_id, device_name, alarm_type, alarm_level, status, message, created_at, handled_at, handler_id, handler_name FROM alarms WHERE id = ?',
      [alarmId]
    );
    return rows.length > 0 ? mapAlarm(rows[0]) : null;
  }

  static async updateAlarmLevel(
    alarmId: number,
    level: 'low' | 'medium' | 'high' | 'critical',
    message: string
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.updateAlarmLevel(alarmId, level, message);
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE alarms SET alarm_level = ?, message = ? WHERE id = ?',
      [level, message, alarmId]
    );
    return result.affectedRows > 0;
  }

  static async resolveAlarm(
    alarmId: number,
    handlerId: number,
    handlerName: string
  ): Promise<boolean> {
    if (this.useMock) return MockDatabase.resolveAlarm(alarmId, handlerId, handlerName);
    const [result] = await this.pool().query<ResultSetHeader>(
      "UPDATE alarms SET status = 'resolved', handled_at = NOW(), handler_id = ?, handler_name = ? WHERE id = ?",
      [handlerId, handlerName, alarmId]
    );
    return result.affectedRows > 0;
  }

  // ===== 光照数据操作 =====

  static async addLightData(data: {
    deviceId: string;
    lightIntensity: number;
    timestamp: Date;
  }): Promise<LightDataRecord> {
    if (this.useMock) return MockDatabase.addLightData(data);
    const [result] = await this.pool().query<ResultSetHeader>(
      'INSERT INTO light_data (device_id, light_intensity, timestamp) VALUES (?, ?, ?)',
      [data.deviceId, data.lightIntensity, data.timestamp]
    );
    return { ...data, id: result.insertId };
  }

  static async getLightData(
    deviceId: string,
    startTime: Date,
    endTime: Date
  ): Promise<LightDataRecord[]> {
    if (this.useMock) return MockDatabase.getLightData(deviceId, startTime, endTime);
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, device_id, light_intensity, timestamp FROM light_data WHERE device_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [deviceId, startTime, endTime]
    );
    return rows.map(mapLightData);
  }

  // ===== 聚合数据操作 =====

  static async saveAggregatedData(
    data: Omit<AggregatedDataRecord, 'id'>
  ): Promise<AggregatedDataRecord> {
    if (this.useMock) return MockDatabase.saveAggregatedData(data);
    const [result] = await this.pool().query<ResultSetHeader>(
      `INSERT INTO aggregated_data (device_id, time_window, avg_light_intensity, max_light_intensity, min_light_intensity, sample_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.deviceId,
        data.timeWindow,
        data.avgLightIntensity,
        data.maxLightIntensity,
        data.minLightIntensity,
        data.sampleCount,
      ]
    );
    return { ...data, id: result.insertId };
  }

  static async deleteOldLightData(cutoffDate: Date): Promise<number> {
    if (this.useMock) return MockDatabase.deleteOldLightData(cutoffDate);
    const [result] = await this.pool().query<ResultSetHeader>(
      'DELETE FROM light_data WHERE timestamp < ?',
      [cutoffDate]
    );
    return result.affectedRows;
  }

  static async deleteOldAggregatedData(cutoffDate: Date): Promise<number> {
    if (this.useMock) return MockDatabase.deleteOldAggregatedData(cutoffDate);
    const [result] = await this.pool().query<ResultSetHeader>(
      'DELETE FROM aggregated_data WHERE time_window < ?',
      [cutoffDate]
    );
    return result.affectedRows;
  }

  // ===== 景区数据 =====
  static async getScenicRoutes() {
    if (this.useMock) return MockDatabase.getScenicRoutes();
    const [rows] = await this.pool().query<RowDataPacket[]>('SELECT * FROM scenic_routes ORDER BY id');
    return rows;
  }
  static async getScenicSpots() {
    if (this.useMock) return MockDatabase.getScenicSpots();
    const [rows] = await this.pool().query<RowDataPacket[]>('SELECT * FROM scenic_spots ORDER BY id');
    return rows;
  }
  static async getScenicEvents() {
    if (this.useMock) return MockDatabase.getScenicEvents();
    const [rows] = await this.pool().query<RowDataPacket[]>('SELECT * FROM scenic_events ORDER BY id');
    return rows;
  }
  static async getScenicLamps() {
    if (this.useMock) return MockDatabase.getScenicLamps();
    const [rows] = await this.pool().query<RowDataPacket[]>('SELECT * FROM scenic_lamps ORDER BY id');
    return rows;
  }
}
