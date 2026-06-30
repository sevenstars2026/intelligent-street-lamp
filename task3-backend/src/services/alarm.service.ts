/**
 * 告警服务
 * 处理设备离线检测、告警升级、告警通知等
 */

import { MockDatabase, Alarm } from '../mock/mock-database';
import { mockRedis } from '../mock/mock-redis';
import { AlarmUpgradeAlgorithm, AlarmLevel } from '../utils/alarm-upgrade-algorithm';

export interface OfflineDevice {
  deviceId: string;
  deviceName: string;
  lastHeartbeat: Date;
  offlineDuration: number; // 秒
}

export class AlarmService {
  private static readonly HEARTBEAT_KEY_PREFIX = 'device:heartbeat:';
  private static readonly ALARM_KEY_PREFIX = 'device:alarm:';

  /**
   * 检查设备离线（定时任务调用）
   * 返回新发现的离线设备列表
   */
  async checkOfflineDevices(): Promise<OfflineDevice[]> {
    const devices = MockDatabase.getAllDevices();
    const offlineDevices: OfflineDevice[] = [];

    for (const device of devices) {
      const isOffline = await this.isDeviceOffline(device.id);

      if (isOffline && device.status !== 'offline') {
        // 设备刚离线
        const offlineDuration = this.getOfflineDuration(device.lastHeartbeat);

        offlineDevices.push({
          deviceId: device.id,
          deviceName: device.name,
          lastHeartbeat: device.lastHeartbeat,
          offlineDuration
        });

        // 更新设备状态为离线
        MockDatabase.updateDeviceStatus(device.id, 'offline');

        // 创建离线告警
        await this.createOfflineAlarm(device.id, device.name);
      }
    }

    return offlineDevices;
  }

  /**
   * 判断设备是否离线
   * 规则：心跳key不存在或已过期
   */
  private async isDeviceOffline(deviceId: string): Promise<boolean> {
    const heartbeatKey = `${AlarmService.HEARTBEAT_KEY_PREFIX}${deviceId}`;
    const exists = await mockRedis.exists(heartbeatKey);
    return exists === 0;
  }

  /**
   * 计算设备离线时长（秒）
   */
  private getOfflineDuration(lastHeartbeat: Date): number {
    const now = new Date();
    return Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000);
  }

  /**
   * 创建离线告警
   */
  private async createOfflineAlarm(deviceId: string, deviceName: string): Promise<Alarm> {
    const level = AlarmLevel.LOW;
    const message = AlarmUpgradeAlgorithm.calculateLevel(new Date()) === AlarmLevel.LOW
      ? '设备离线'
      : '设备离线超过1小时';

    const alarm = MockDatabase.addAlarm({
      deviceId,
      deviceName,
      alarmType: 'offline',
      alarmLevel: level,
      status: 'active',
      message,
      createdAt: new Date(),
      handledAt: null,
      handlerId: null,
      handlerName: null
    });

    // 在Redis中标记该设备已告警
    const alarmKey = `${AlarmService.ALARM_KEY_PREFIX}${deviceId}`;
    await mockRedis.set(alarmKey, alarm.id.toString());

    // 发送告警通知
    await this.sendAlarmNotification(alarm);

    return alarm;
  }

  /**
   * 检查并升级告警（定时任务调用）
   */
  async checkAlarmUpgrade(): Promise<void> {
    const activeAlarms = MockDatabase.getAlarms({ status: 'active', alarmType: 'offline' });

    for (const alarm of activeAlarms) {
      const device = MockDatabase.getDevice(alarm.deviceId);
      if (!device) continue;

      // 计算新的告警等级
      const upgradeResult = AlarmUpgradeAlgorithm.checkUpgrade(
        device.lastHeartbeat,
        alarm.alarmLevel as AlarmLevel
      );

      if (upgradeResult.shouldNotify) {
        // 需要升级告警
        MockDatabase.updateAlarmLevel(alarm.id, upgradeResult.level, upgradeResult.message);

        // 发送升级通知
        await this.sendAlarmUpgradeNotification(alarm, upgradeResult.level, upgradeResult.message);

        console.log(`[AlarmService] Alarm ${alarm.id} upgraded to ${upgradeResult.level}`);
      }
    }
  }

  /**
   * 检查设备恢复（设备上线时调用）
   */
  async checkDeviceRecovery(deviceId: string): Promise<void> {
    const alarmKey = `${AlarmService.ALARM_KEY_PREFIX}${deviceId}`;
    const alarmId = await mockRedis.get(alarmKey);

    if (alarmId) {
      const alarm = MockDatabase.getAlarm(parseInt(alarmId));

      if (alarm && alarm.status === 'active') {
        // 自动解决告警
        MockDatabase.resolveAlarm(alarm.id, 0, 'System');

        // 删除Redis中的告警标记
        await mockRedis.del(alarmKey);

        // 发送恢复通知
        await this.sendRecoveryNotification(alarm);

        console.log(`[AlarmService] Device ${deviceId} recovered, alarm ${alarm.id} resolved`);
      }
    }
  }

  /**
   * 更新设备心跳
   */
  async updateHeartbeat(deviceId: string, ttl: number = 90): Promise<void> {
    const heartbeatKey = `${AlarmService.HEARTBEAT_KEY_PREFIX}${deviceId}`;
    await mockRedis.set(heartbeatKey, Date.now().toString(), ttl);

    // 更新数据库中的心跳时间
    MockDatabase.updateHeartbeat(deviceId);

    // 检查设备是否刚恢复
    await this.checkDeviceRecovery(deviceId);
  }

  /**
   * 获取告警列表
   */
  getAlarms(filters?: {
    status?: 'active' | 'resolved';
    deviceId?: string;
    alarmType?: string;
    alarmLevel?: string;
  }) {
    return MockDatabase.getAlarms(filters);
  }

  /**
   * 获取告警详情
   */
  getAlarm(alarmId: number) {
    return MockDatabase.getAlarm(alarmId);
  }

  /**
   * 标记告警已处理
   */
  resolveAlarm(alarmId: number, handlerId: number, handlerName: string): boolean {
    return MockDatabase.resolveAlarm(alarmId, handlerId, handlerName);
  }

  /**
   * 发送告警通知
   */
  private async sendAlarmNotification(alarm: Alarm): Promise<void> {
    console.log(`[AlarmService] 🚨 Sending alarm notification:`, {
      alarmId: alarm.id,
      deviceId: alarm.deviceId,
      deviceName: alarm.deviceName,
      level: alarm.alarmLevel,
      message: alarm.message
    });

    // TODO: 实现实际的通知逻辑
    // - 站内消息通知
    // - 邮件通知
  }

  /**
   * 发送告警升级通知
   */
  private async sendAlarmUpgradeNotification(
    alarm: Alarm,
    newLevel: AlarmLevel,
    message: string
  ): Promise<void> {
    console.log(`[AlarmService] ⚠️ Sending alarm upgrade notification:`, {
      alarmId: alarm.id,
      deviceId: alarm.deviceId,
      oldLevel: alarm.alarmLevel,
      newLevel,
      message
    });

    // TODO: 实现实际的通知逻辑
  }

  /**
   * 发送恢复通知
   */
  private async sendRecoveryNotification(alarm: Alarm): Promise<void> {
    console.log(`[AlarmService] ✅ Sending recovery notification:`, {
      alarmId: alarm.id,
      deviceId: alarm.deviceId,
      deviceName: alarm.deviceName,
      message: '设备已恢复在线'
    });

    // TODO: 实现实际的通知逻辑
  }

  /**
   * 创建控制失败告警
   */
  async createControlFailureAlarm(deviceId: string, deviceName: string, reason: string): Promise<Alarm> {
    const alarm = MockDatabase.addAlarm({
      deviceId,
      deviceName,
      alarmType: 'control_failed',
      alarmLevel: 'medium',
      status: 'active',
      message: `控制失败：${reason}`,
      createdAt: new Date(),
      handledAt: null,
      handlerId: null,
      handlerName: null
    });

    await this.sendAlarmNotification(alarm);

    return alarm;
  }
}
