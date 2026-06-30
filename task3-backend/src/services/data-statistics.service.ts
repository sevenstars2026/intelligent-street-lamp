/**
 * 数据统计服务
 * 处理历史数据查询、数据聚合、设备统计等
 */

import { MockDatabase } from '../mock/mock-database';
import { DataAggregationAlgorithm, AggregatedData } from '../utils/data-aggregation-algorithm';

export interface LightDataRecord {
  id: number;
  deviceId: string;
  lightIntensity: number;
  timestamp: Date;
}

export interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  totalControlCount: number;
  successControlCount: number;
  failedControlCount: number;
  controlSuccessRate: number;
  avgLightIntensity: number;
  maxLightIntensity: number;
  minLightIntensity: number;
  onlineRate: number;
  lastOnlineTime: Date;
  totalAlarmCount: number;
  activeAlarmCount: number;
}

export class DataStatisticsService {
  /**
   * 查询历史光照数据
   */
  getLightHistory(
    deviceId: string,
    startTime: Date,
    endTime: Date,
    aggregation?: 'raw' | 'hourly' | 'daily'
  ): LightDataRecord[] | AggregatedData[] {

    if (aggregation === 'hourly' || aggregation === 'daily') {
      // 返回聚合数据
      return this.getAggregatedData(deviceId, startTime, endTime, aggregation);
    }

    // 返回原始数据
    return MockDatabase.getLightData(deviceId, startTime, endTime);
  }

  /**
   * 获取聚合数据
   */
  private getAggregatedData(
    deviceId: string,
    startTime: Date,
    endTime: Date,
    aggregation: 'hourly' | 'daily'
  ): AggregatedData[] {

    // 获取原始数据
    const rawData = MockDatabase.getLightData(deviceId, startTime, endTime);

    if (rawData.length === 0) {
      return [];
    }

    // 按时间段分组
    const groups = this.groupByTime(rawData, aggregation);

    // 对每组数据进行聚合
    const aggregatedResults: AggregatedData[] = [];

    for (const [timeKey, records] of Object.entries(groups)) {
      const aggregated = DataAggregationAlgorithm.aggregate(records);
      aggregatedResults.push({
        ...aggregated,
        timeWindow: new Date(timeKey)
      });
    }

    return aggregatedResults;
  }

  /**
   * 按时间分组
   */
  private groupByTime(
    records: LightDataRecord[],
    aggregation: 'hourly' | 'daily'
  ): Record<string, LightDataRecord[]> {

    const groups: Record<string, LightDataRecord[]> = {};

    for (const record of records) {
      const key = this.getTimeKey(record.timestamp, aggregation);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(record);
    }

    return groups;
  }

  /**
   * 获取时间分组键
   */
  private getTimeKey(timestamp: Date, aggregation: 'hourly' | 'daily'): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');

    if (aggregation === 'daily') {
      return `${year}-${month}-${day}T00:00:00.000Z`;
    }

    // hourly
    const hour = String(timestamp.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:00:00.000Z`;
  }

  /**
   * 获取设备运行统计
   */
  getDeviceStatistics(deviceId: string, startTime?: Date, endTime?: Date): DeviceStatistics | null {
    const device = MockDatabase.getDevice(deviceId);

    if (!device) {
      return null;
    }

    // 设置默认时间范围（最近7天）
    if (!startTime) {
      startTime = new Date();
      startTime.setDate(startTime.getDate() - 7);
    }

    if (!endTime) {
      endTime = new Date();
    }

    // 获取控制日志
    const controlLogs = MockDatabase.getControlLogs(deviceId);
    const filteredLogs = controlLogs.filter(log => {
      const logTime = new Date(log.requestTime);
      return logTime >= startTime! && logTime <= endTime!;
    });

    const successLogs = filteredLogs.filter(log => log.status === 'success');
    const failedLogs = filteredLogs.filter(log => log.status === 'failed');

    // 获取光照数据
    const lightData = MockDatabase.getLightData(deviceId, startTime, endTime);

    let avgLight = 0;
    let maxLight = 0;
    let minLight = 0;

    if (lightData.length > 0) {
      const aggregated = DataAggregationAlgorithm.aggregate(lightData);
      avgLight = aggregated.avgLightIntensity;
      maxLight = aggregated.maxLightIntensity;
      minLight = aggregated.minLightIntensity;
    }

    // 获取告警数据
    const alarms = MockDatabase.getAlarms({ deviceId });
    const activeAlarms = alarms.filter(a => a.status === 'active');

    // 计算在线率（简化版：基于心跳间隔）
    const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const lastHeartbeat = new Date(device.lastHeartbeat);
    const hoursSinceLastHeartbeat = (endTime.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60);
    const onlineHours = Math.max(0, totalHours - hoursSinceLastHeartbeat);
    const onlineRate = totalHours > 0 ? (onlineHours / totalHours) * 100 : 0;

    return {
      deviceId: device.id,
      deviceName: device.name,
      totalControlCount: filteredLogs.length,
      successControlCount: successLogs.length,
      failedControlCount: failedLogs.length,
      controlSuccessRate: filteredLogs.length > 0
        ? (successLogs.length / filteredLogs.length) * 100
        : 0,
      avgLightIntensity: avgLight,
      maxLightIntensity: maxLight,
      minLightIntensity: minLight,
      onlineRate: Math.min(100, Math.max(0, onlineRate)),
      lastOnlineTime: lastHeartbeat,
      totalAlarmCount: alarms.length,
      activeAlarmCount: activeAlarms.length
    };
  }

  /**
   * 获取所有设备的统计概览
   */
  getAllDevicesStatistics(): DeviceStatistics[] {
    const devices = MockDatabase.getAllDevices();
    const statistics: DeviceStatistics[] = [];

    for (const device of devices) {
      const stat = this.getDeviceStatistics(device.id);
      if (stat) {
        statistics.push(stat);
      }
    }

    return statistics;
  }

  /**
   * 执行数据聚合（定时任务调用）
   */
  async aggregateData(): Promise<void> {
    console.log('[DataStatistics] Starting data aggregation...');

    const devices = MockDatabase.getAllDevices();

    // 聚合上一小时的数据
    const now = new Date();
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

    for (const device of devices) {
      const rawData = MockDatabase.getLightData(device.id, startTime, endTime);

      if (rawData.length > 0) {
        const aggregated = DataAggregationAlgorithm.aggregate(rawData);

        // 保存聚合结果到数据库
        MockDatabase.saveAggregatedData({
          deviceId: device.id,
          timeWindow: startTime,
          avgLightIntensity: aggregated.avgLightIntensity,
          maxLightIntensity: aggregated.maxLightIntensity,
          minLightIntensity: aggregated.minLightIntensity,
          sampleCount: aggregated.sampleCount
        });

        console.log(`[DataStatistics] Aggregated ${rawData.length} records for ${device.id}`);
      }
    }

    console.log('[DataStatistics] Data aggregation completed');
  }

  /**
   * 清理过期数据（定时任务调用）
   */
  async cleanupOldData(): Promise<void> {
    console.log('[DataStatistics] Starting data cleanup...');

    const now = new Date();

    // 删除超过30天的原始数据
    const rawDataCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedRawCount = MockDatabase.deleteOldLightData(rawDataCutoff);

    console.log(`[DataStatistics] Deleted ${deletedRawCount} old raw data records`);

    // 删除超过1年的聚合数据
    const aggDataCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const deletedAggCount = MockDatabase.deleteOldAggregatedData(aggDataCutoff);

    console.log(`[DataStatistics] Deleted ${deletedAggCount} old aggregated data records`);

    console.log('[DataStatistics] Data cleanup completed');
  }
}
