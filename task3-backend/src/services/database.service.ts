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
          alarm_type ENUM('offline', 'control_failed', 'frequent_switch', 'fault_report') NOT NULL,
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
      await conn.query(`
        ALTER TABLE alarms
        MODIFY alarm_type ENUM('offline', 'control_failed', 'frequent_switch', 'fault_report') NOT NULL
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS fault_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          alarm_id INT NOT NULL,
          reporter_name VARCHAR(100) NOT NULL,
          reporter_phone VARCHAR(30) NOT NULL,
          lamp_id VARCHAR(64) NOT NULL,
          description TEXT NOT NULL,
          photo_urls JSON NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_fault_reports_alarm_id (alarm_id),
          INDEX idx_fault_reports_lamp_created (lamp_id, created_at)
        )
      `);
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
      this.useMock = false;
      console.log('✓ MySQL Database connected');
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
      `INSERT INTO fault_reports (alarm_id, reporter_name, reporter_phone, lamp_id, description, photo_urls, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    return { ...report, id: result.insertId };
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
}
