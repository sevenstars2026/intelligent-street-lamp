import cron from 'node-cron';
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

  static async checkOfflineDevices(): Promise<void> {
    const devices = await DatabaseService.getAllDevices();
    for (const device of devices) {
      if (device.status !== 'online') {
        continue;
      }

      const lastHeartbeat = device.lastHeartbeat instanceof Date ? device.lastHeartbeat : new Date(device.lastHeartbeat);
      const offlineDurationMinutes = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60);
      if (offlineDurationMinutes <= 5) {
        continue;
      }

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
        message: `设备 ${device.name}(${device.id}) 已离线超过5分钟，最后心跳时间 ${lastHeartbeat.toLocaleString('zh-CN')}`,
        createdAt: new Date(),
        handledAt: null,
        handlerId: null,
        handlerName: null,
      });

      await DatabaseService.updateDeviceStatus(device.id, 'offline');
      console.log(`[AlarmService] 🚨 offline alarm created for ${device.id}`);
    }
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

  static startScheduler(): void {
    cron.schedule('* * * * *', async () => {
      await this.checkOfflineDevices();
    });

    cron.schedule('0 * * * *', async () => {
      await this.upgradeAlarms();
    });

    console.log('[AlarmScheduler] started');
  }
}
