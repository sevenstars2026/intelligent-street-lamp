/**
 * 真实 MySQL 数据库服务
 * 镜像 MockDatabase 的全部接口，但使用 mysql2 连接真实数据库
 * 所有方法均为 async，返回 Promise
 */

import { getPool } from '../config/database';
import type {
  Device,
  ThresholdConfig,
  ControlLog,
  Alarm,
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
  private static pool() {
    return getPool();
  }

  // ===== 初始化 =====

  static async init(): Promise<void> {
    const pool = this.pool();
    const conn = await pool.getConnection();
    conn.release();
    console.log('✓ MySQL Database connected');
  }

  // ===== 设备操作 =====

  static async getDevice(deviceId: string): Promise<Device | null> {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, name, status, mode, current_state, last_heartbeat FROM devices WHERE id = ?',
      [deviceId]
    );
    return rows.length > 0 ? mapDevice(rows[0]) : null;
  }

  static async getAllDevices(): Promise<Device[]> {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT id, name, status, mode, current_state, last_heartbeat FROM devices'
    );
    return rows.map(mapDevice);
  }

  static async updateDeviceStatus(
    deviceId: string,
    status: 'online' | 'offline'
  ): Promise<boolean> {
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
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE devices SET mode = ? WHERE id = ?',
      [mode, deviceId]
    );
    return result.affectedRows > 0;
  }

  static async updateHeartbeat(deviceId: string): Promise<boolean> {
    const [result] = await this.pool().query<ResultSetHeader>(
      "UPDATE devices SET last_heartbeat = NOW(), status = 'online' WHERE id = ?",
      [deviceId]
    );
    return result.affectedRows > 0;
  }

  // ===== 阈值配置操作 =====

  static async getThreshold(deviceId: string): Promise<ThresholdConfig | null> {
    const [rows] = await this.pool().query<RowDataPacket[]>(
      'SELECT device_id, light_threshold_on, light_threshold_off, updated_at FROM thresholds WHERE device_id = ?',
      [deviceId]
    );
    return rows.length > 0 ? mapThreshold(rows[0]) : null;
  }

  static async setThreshold(
    config: Omit<ThresholdConfig, 'updatedAt'>
  ): Promise<ThresholdConfig> {
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
    const [result] = await this.pool().query<ResultSetHeader>(
      'UPDATE control_logs SET status = ?, result_message = ?, response_time = NOW() WHERE id = ?',
      [status, resultMessage, logId]
    );
    return result.affectedRows > 0;
  }

  // ===== 告警操作 =====

  static async addAlarm(alarm: Omit<Alarm, 'id'>): Promise<Alarm> {
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

  static async getAlarms(filters?: {
    status?: 'active' | 'resolved';
    deviceId?: string;
    alarmType?: string;
    alarmLevel?: string;
  }): Promise<Alarm[]> {
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
    const [result] = await this.pool().query<ResultSetHeader>(
      'DELETE FROM light_data WHERE timestamp < ?',
      [cutoffDate]
    );
    return result.affectedRows;
  }

  static async deleteOldAggregatedData(cutoffDate: Date): Promise<number> {
    const [result] = await this.pool().query<ResultSetHeader>(
      'DELETE FROM aggregated_data WHERE time_window < ?',
      [cutoffDate]
    );
    return result.affectedRows;
  }
}
