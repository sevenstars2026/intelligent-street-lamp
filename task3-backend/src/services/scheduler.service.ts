/**
 * 定时任务调度器
 * 负责执行周期性任务
 */

import cron from 'node-cron';
import { AlarmService } from '../services/alarm.service';
import { DataStatisticsService } from '../services/data-statistics.service';

export class SchedulerService {
  private alarmService: AlarmService;
  private statisticsService: DataStatisticsService;
  private offlineCheckTask?: cron.ScheduledTask;
  private alarmUpgradeTask?: cron.ScheduledTask;
  private dataAggregationTask?: cron.ScheduledTask;
  private dataCleanupTask?: cron.ScheduledTask;

  constructor() {
    this.alarmService = new AlarmService();
    this.statisticsService = new DataStatisticsService();
  }

  /**
   * 启动所有定时任务
   */
  start(): void {
    console.log('[Scheduler] Starting scheduled tasks...');

    // 启动离线检测任务（每30秒）
    this.startOfflineCheckTask();

    // 启动告警升级检测任务（每10分钟）
    this.startAlarmUpgradeTask();

    // 启动数据聚合任务（每小时）
    this.startDataAggregationTask();

    // 启动数据清理任务（每天凌晨2点）
    this.startDataCleanupTask();

    console.log('[Scheduler] All scheduled tasks started');
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    console.log('[Scheduler] Stopping scheduled tasks...');

    if (this.offlineCheckTask) {
      this.offlineCheckTask.stop();
      console.log('[Scheduler] Offline check task stopped');
    }

    if (this.alarmUpgradeTask) {
      this.alarmUpgradeTask.stop();
      console.log('[Scheduler] Alarm upgrade task stopped');
    }

    if (this.dataAggregationTask) {
      this.dataAggregationTask.stop();
      console.log('[Scheduler] Data aggregation task stopped');
    }

    if (this.dataCleanupTask) {
      this.dataCleanupTask.stop();
      console.log('[Scheduler] Data cleanup task stopped');
    }

    console.log('[Scheduler] All scheduled tasks stopped');
  }

  /**
   * 离线检测任务（每30秒）
   */
  private startOfflineCheckTask(): void {
    this.offlineCheckTask = cron.schedule('*/30 * * * * *', async () => {
      try {
        const offlineDevices = await this.alarmService.checkOfflineDevices();

        if (offlineDevices.length > 0) {
          console.log(`[Scheduler] Found ${offlineDevices.length} offline devices:`,
            offlineDevices.map(d => d.deviceId).join(', ')
          );
        }
      } catch (error) {
        console.error('[Scheduler] Error in offline check task:', error);
      }
    });

    console.log('[Scheduler] Offline check task started (every 30 seconds)');
  }

  /**
   * 告警升级检测任务（每10分钟）
   */
  private startAlarmUpgradeTask(): void {
    this.alarmUpgradeTask = cron.schedule('*/10 * * * *', async () => {
      try {
        await this.alarmService.checkAlarmUpgrade();
        console.log('[Scheduler] Alarm upgrade check completed');
      } catch (error) {
        console.error('[Scheduler] Error in alarm upgrade task:', error);
      }
    });

    console.log('[Scheduler] Alarm upgrade task started (every 10 minutes)');
  }

  /**
   * 数据聚合任务（每小时）
   */
  private startDataAggregationTask(): void {
    this.dataAggregationTask = cron.schedule('0 * * * *', async () => {
      try {
        await this.statisticsService.aggregateData();
        console.log('[Scheduler] Data aggregation completed');
      } catch (error) {
        console.error('[Scheduler] Error in data aggregation task:', error);
      }
    });

    console.log('[Scheduler] Data aggregation task started (every hour)');
  }

  /**
   * 数据清理任务（每天凌晨2点）
   */
  private startDataCleanupTask(): void {
    this.dataCleanupTask = cron.schedule('0 2 * * *', async () => {
      try {
        await this.statisticsService.cleanupOldData();
        console.log('[Scheduler] Data cleanup completed');
      } catch (error) {
        console.error('[Scheduler] Error in data cleanup task:', error);
      }
    });

    console.log('[Scheduler] Data cleanup task started (daily at 2:00 AM)');
  }
}
