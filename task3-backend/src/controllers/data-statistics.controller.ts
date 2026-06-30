/**
 * 数据统计控制器
 * 处理数据统计相关的API请求
 */

import { Request, Response } from 'express';
import { DataStatisticsService } from '../services/data-statistics.service';

const statisticsService = new DataStatisticsService();

export class DataStatisticsController {
  /**
   * 查询历史光照数据
   * GET /api/devices/:deviceId/light-history
   */
  static async getLightHistory(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { startTime, endTime, aggregation = 'raw' } = req.query;

      // 参数验证
      if (!startTime || !endTime) {
        res.status(400).json({
          code: 400,
          message: '缺少必需参数：startTime 和 endTime',
          data: null
        });
        return;
      }

      // 验证聚合类型
      if (aggregation && !['raw', 'hourly', 'daily'].includes(aggregation as string)) {
        res.status(400).json({
          code: 400,
          message: '无效的聚合类型，必须是 raw、hourly 或 daily',
          data: null
        });
        return;
      }

      // 解析时间
      const start = new Date(startTime as string);
      const end = new Date(endTime as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          code: 400,
          message: '无效的时间格式',
          data: null
        });
        return;
      }

      if (start >= end) {
        res.status(400).json({
          code: 400,
          message: 'startTime 必须小于 endTime',
          data: null
        });
        return;
      }

      // 查询数据
      const data = statisticsService.getLightHistory(
        deviceId,
        start,
        end,
        aggregation as 'raw' | 'hourly' | 'daily'
      );

      res.status(200).json({
        code: 200,
        message: 'success',
        data: {
          deviceId,
          startTime: start,
          endTime: end,
          aggregation,
          count: data.length,
          records: data
        }
      });
    } catch (error) {
      console.error('Get light history error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取设备运行统计
   * GET /api/devices/:deviceId/statistics
   */
  static async getDeviceStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { startTime, endTime } = req.query;

      let start: Date | undefined;
      let end: Date | undefined;

      if (startTime) {
        start = new Date(startTime as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            code: 400,
            message: '无效的 startTime 格式',
            data: null
          });
          return;
        }
      }

      if (endTime) {
        end = new Date(endTime as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            code: 400,
            message: '无效的 endTime 格式',
            data: null
          });
          return;
        }
      }

      const statistics = statisticsService.getDeviceStatistics(deviceId, start, end);

      if (!statistics) {
        res.status(404).json({
          code: 404,
          message: '设备不存在',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: 'success',
        data: statistics
      });
    } catch (error) {
      console.error('Get device statistics error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取所有设备统计概览
   * GET /api/statistics/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const statistics = statisticsService.getAllDevicesStatistics();

      // 计算总体统计
      const totalDevices = statistics.length;
      const onlineDevices = statistics.filter(s => s.onlineRate > 50).length;
      const totalAlarms = statistics.reduce((sum, s) => sum + s.totalAlarmCount, 0);
      const activeAlarms = statistics.reduce((sum, s) => sum + s.activeAlarmCount, 0);
      const avgControlSuccessRate = statistics.length > 0
        ? statistics.reduce((sum, s) => sum + s.controlSuccessRate, 0) / statistics.length
        : 0;

      res.status(200).json({
        code: 200,
        message: 'success',
        data: {
          summary: {
            totalDevices,
            onlineDevices,
            offlineDevices: totalDevices - onlineDevices,
            totalAlarms,
            activeAlarms,
            avgControlSuccessRate: parseFloat(avgControlSuccessRate.toFixed(2))
          },
          devices: statistics
        }
      });
    } catch (error) {
      console.error('Get overview error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}
