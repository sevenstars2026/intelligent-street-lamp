import { DatabaseService } from './database.service';
import { evaluateAlarmUpgrade, type AlarmLevel } from '../utils/alarm-upgrade-algorithm';
import type { Alarm } from '../types/database.types';

export class AlarmService {
  static async getAlarms(
    filters: { status?: string; deviceId?: string; alarmType?: string; alarmLevel?: string } = {},
    page = 1,
    pageSize = 20
  ): Promise<{ alarms: Alarm[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const allAlarms = await DatabaseService.getAlarms(filters as any);
    const total = allAlarms.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const alarms = allAlarms.slice(startIndex, startIndex + pageSize);

    return {
      alarms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  static async getAlarm(alarmId: number): Promise<Alarm | null> {
    return DatabaseService.getAlarm(alarmId);
  }

  static async resolveAlarm(alarmId: number, handlerId: number, handlerName: string, note?: string): Promise<any> {
    const alarm = await DatabaseService.getAlarm(alarmId);
    if (!alarm) {
      throw new Error('ALARM_NOT_FOUND');
    }
    if (alarm.status === 'resolved') {
      throw new Error('ALARM_ALREADY_RESOLVED');
    }

    const updated = await DatabaseService.resolveAlarm(alarmId, handlerId, handlerName);
    if (!updated) {
      throw new Error('ALARM_RESOLVE_FAILED');
    }

    return {
      alarmId,
      handledAt: new Date().toISOString(),
      handlerName,
      note: note || null,
    };
  }

  /**
   * 检查离线设备：超过 HEARTBEAT_TIMEOUT_SECONDS 没有心跳 → 标记为离线 + 创建告警
   */
  static async checkOfflineDevices(): Promise<void> {
    const heartbeatTimeoutSec = this.getHeartbeatTimeoutSeconds();
    const devices = await DatabaseService.getAllDevices();

    for (const device of devices) {
      const lastHeartbeat = device.lastHeartbeat instanceof Date ? device.lastHeartbeat : new Date(device.lastHeartbeat);
      const offlineDurationSec = (Date.now() - lastHeartbeat.getTime()) / 1000;

      // 未超过心跳超时时间 → 设备仍在线
      if (offlineDurationSec < heartbeatTimeoutSec) {
        continue;
      }

      // 1. 先更新设备状态为离线（与告警去重解耦，确保状态始终被更新）
      if (device.status !== 'offline') {
        const updated = await DatabaseService.updateDeviceStatus(device.id, 'offline');
        if (updated) {
          console.log(`[AlarmService] 🔴 ${device.id} status → offline (${Math.round(offlineDurationSec)}s since last heartbeat)`);
        }
      }

      // 2. 去重：如果已存在活跃的离线告警，不再重复创建
      const existingActiveAlarms = await DatabaseService.getAlarms({
        status: 'active',
        deviceId: device.id,
        alarmType: 'offline',
      });
      if (existingActiveAlarms.length > 0) {
        continue;
      }

      await DatabaseService.addAlarm({
        deviceId: device.id,
        deviceName: device.name,
        alarmType: 'offline',
        alarmLevel: 'high',
        status: 'active',
        message: `设备 ${device.name}(${device.id}) 已离线超过${heartbeatTimeoutSec}秒，最后心跳时间 ${lastHeartbeat.toLocaleString('zh-CN')}`,
        createdAt: new Date(),
        handledAt: null,
        handlerId: null,
        handlerName: null,
      });

      console.log(`[AlarmService] 🚨 offline alarm created for ${device.id}`);
    }
  }

  /** 从环境变量读取心跳超时秒数 */
  private static getHeartbeatTimeoutSeconds(): number {
    const fromEnv = parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS || '', 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
    return 30; // 默认 30 秒
  }

  static async createControlFailedAlarm(deviceId: string, deviceName: string, reason: string): Promise<void> {
    try {
      const existingActiveAlarms = await DatabaseService.getAlarms({
        status: 'active',
        deviceId,
        alarmType: 'control_failed',
      });
      if (existingActiveAlarms.length > 0) {
        return;
      }

      await DatabaseService.addAlarm({
        deviceId,
        deviceName,
        alarmType: 'control_failed',
        alarmLevel: 'medium',
        status: 'active',
        message: `设备 ${deviceName}(${deviceId}) 控制失败：${reason}`,
        createdAt: new Date(),
        handledAt: null,
        handlerId: null,
        handlerName: null,
      });
    } catch (error) {
      console.error('[AlarmService] createControlFailedAlarm error:', error);
    }
  }

  static async checkFrequentSwitch(deviceId: string, deviceName: string): Promise<void> {
    try {
      const controlLogs = await DatabaseService.getControlLogs(deviceId, 20);
      const recentCount = controlLogs.filter((log) => {
        const requestTime = log.requestTime instanceof Date ? log.requestTime : new Date(log.requestTime);
        return requestTime.getTime() > Date.now() - 10 * 60 * 1000;
      }).length;

      if (recentCount < 5) {
        return;
      }

      const existingActiveAlarms = await DatabaseService.getAlarms({
        status: 'active',
        deviceId,
        alarmType: 'frequent_switch',
      });
      if (existingActiveAlarms.length > 0) {
        return;
      }

      await DatabaseService.addAlarm({
        deviceId,
        deviceName,
        alarmType: 'frequent_switch',
        alarmLevel: 'low',
        status: 'active',
        message: `设备 ${deviceName}(${deviceId}) 近10分钟内开关操作达${recentCount}次，触发频繁开关告警`,
        createdAt: new Date(),
        handledAt: null,
        handlerId: null,
        handlerName: null,
      });
    } catch (error) {
      console.error('[AlarmService] checkFrequentSwitch error:', error);
    }
  }

  static async upgradeAlarms(): Promise<void> {
    const activeAlarms = await DatabaseService.getAlarms({ status: 'active' });
    const now = new Date();

    for (const alarm of activeAlarms) {
      const result = evaluateAlarmUpgrade({
        alarmLevel: alarm.alarmLevel as AlarmLevel,
        createdAt: alarm.createdAt,
      }, now);

      if (!result.shouldUpgrade || !result.nextLevel) {
        continue;
      }

      const message = `[自动升级] ${alarm.message}；已持续${Math.floor(result.hoursSinceCreation)}小时未处理，级别由 ${alarm.alarmLevel} 升至 ${result.nextLevel}`;
      await DatabaseService.updateAlarmLevel(alarm.id, result.nextLevel as any, message);
      console.log(`[AlarmUpgrade] ⬆️ alarm #${alarm.id} ${alarm.alarmLevel} → ${result.nextLevel}`);
    }
  }

  private static offlineCheckTimer: ReturnType<typeof setInterval> | null = null;
  private static alarmUpgradeTimer: ReturnType<typeof setInterval> | null = null;
  private static offlineCheckRunning = false;

  static startScheduler(): void {
    // 读取检查间隔（秒），默认 30 秒
    const checkIntervalSec = Math.max(
      10,
      parseInt(process.env.OFFLINE_CHECK_INTERVAL || '30', 10) || 30
    );

    // 立即执行一次
    this.offlineCheckRunning = true;
    this.checkOfflineDevices().catch((error) => {
      console.error('[AlarmScheduler] initial checkOfflineDevices error:', error);
    }).finally(() => {
      this.offlineCheckRunning = false;
    });

    // 定时轮询离线设备（支持 < 1 分钟粒度，带防重入保护）
    this.offlineCheckTimer = setInterval(async () => {
      if (this.offlineCheckRunning) {
        console.warn('[AlarmScheduler] skipping check: previous run still in progress');
        return;
      }
      this.offlineCheckRunning = true;
      try {
        await this.checkOfflineDevices();
      } catch (error) {
        console.error('[AlarmScheduler] checkOfflineDevices error:', error);
      } finally {
        this.offlineCheckRunning = false;
      }
    }, checkIntervalSec * 1000);

    // 告警升级检查（每小时）
    this.alarmUpgradeTimer = setInterval(async () => {
      try {
        await this.upgradeAlarms();
      } catch (error) {
        console.error('[AlarmScheduler] upgradeAlarms error:', error);
      }
    }, 60 * 60 * 1000);

    console.log(`[AlarmScheduler] started (offline check every ${checkIntervalSec}s, alarm upgrade every 1h)`);
  }

  /** 停止所有定时任务，用于优雅关闭 */
  static stopScheduler(): void {
    if (this.offlineCheckTimer) {
      clearInterval(this.offlineCheckTimer);
      this.offlineCheckTimer = null;
    }
    if (this.alarmUpgradeTimer) {
      clearInterval(this.alarmUpgradeTimer);
      this.alarmUpgradeTimer = null;
    }
    console.log('[AlarmScheduler] stopped');
  }
}
