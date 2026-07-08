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
      await conn.query(`
        CREATE TABLE IF NOT EXISTS fault_reports (
          id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50), phone VARCHAR(20),
          lamp_id VARCHAR(20), description TEXT, photos JSON, created_at DATETIME
        )
      `);
      // 种子景区数据
      await conn.query(`INSERT IGNORE INTO scenic_routes (id,name,duration,length,lampIds,tags,description) VALUES
        (1,'湖畔夜光步道','45分钟','1.8km','["lamp_001","lamp_003"]','["夜景","散步"]','沿湖步道，夜晚路灯暖光映射湖面'),
        (2,'花海漫步路线','30分钟','1.2km','["lamp_001","lamp_002"]','["赏花","拍照"]','穿行四季花海，路灯与花丛相映成趣'),
        (3,'森林探幽小径','60分钟','2.5km','["lamp_002","lamp_003"]','["徒步","森林"]','深入湿地森林腹地，路灯引导安全前行')
      `);
      await conn.query(`INSERT IGNORE INTO scenic_spots (id,name,lampId,image,description,bestTime,tips) VALUES
        (1,'夕阳亭','lamp_001','🌅','傍晚路灯暖光与夕阳交织，湖面倒影如画','17:30-19:00','建议使用广角镜头，站在亭子东侧取景'),
        (2,'樱花大道','lamp_002','🌸','春季樱花盛开时，路灯下花瓣飘落，浪漫至极','3月-4月 15:00-17:00','逆光拍摄花瓣透光效果最佳'),
        (3,'湖心观景台','lamp_003','🏞','湿地全景尽收眼底，路灯点缀如星落人间','18:00-20:00','等待路灯亮起时刻，冷暖光对比极佳'),
        (4,'水杉林栈道','lamp_002','🌲','高耸水杉林间栈道，路灯穿透树冠形成光柱','16:00-18:00','仰拍光柱穿透树冠的丁达尔效应')
      `);
      await conn.query(`INSERT IGNORE INTO scenic_events (id,name,type,typeLabel,date,time,location,lampId,description) VALUES
        (1,'国庆烟花盛典','🎇','烟花','2026-10-01','19:30','湖心广场','lamp_003','年度最大型烟花表演，配合路灯灯光秀'),
        (2,'中秋灯会巡游','🎭','巡游','2026-09-15','18:00','樱花大道','lamp_002','传统花灯巡游，沿途路灯配合调暗营造氛围'),
        (3,'水幕光影秀','💧','水幕','2026-07-20','20:00','湖心观景台','lamp_003','水幕投影+路灯联动变色，视觉盛宴'),
        (4,'湿地音乐节','🎵','音乐','2026-08-10','18:30','花海广场','lamp_001','户外音乐演出，路灯随音乐节奏变幻色彩')
      `);
      await conn.query(`INSERT IGNORE INTO scenic_lamps (id,name,x,y) VALUES
        ('lamp_001','夕阳亭路灯',30,35),
        ('lamp_002','花海路灯',58,52),
        ('lamp_003','湖心路灯',45,72)
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

  // ===== 故障上报 =====
  static async addFaultReport(data: { name: string; phone: string; lampId: string; description: string; photos: string[] }) {
    if (this.useMock) return MockDatabase.addFaultReport(data);
    const [result] = await this.pool().query<ResultSetHeader>(
      'INSERT INTO fault_reports (name, phone, lamp_id, description, photos, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [data.name, data.phone, data.lampId, data.description, JSON.stringify(data.photos)]
    );
    return { id: result.insertId, ...data, createdAt: new Date() };
  }
}
