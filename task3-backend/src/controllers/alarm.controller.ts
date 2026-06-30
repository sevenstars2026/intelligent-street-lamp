/**
 * 告警控制器
 * 处理告警相关的API请求
 */

import { Request, Response } from 'express';
import { AlarmService } from '../services/alarm.service';

const alarmService = new AlarmService();

export class AlarmController {
  /**
   * 获取告警列表
   * GET /api/alarms
   */
  static async getAlarms(req: Request, res: Response): Promise<void> {
    try {
      const { status, deviceId, alarmType, alarmLevel, page = 1, pageSize = 20 } = req.query;

      // 构建过滤条件
      const filters: any = {};
      if (status) filters.status = status as 'active' | 'resolved';
      if (deviceId) filters.deviceId = deviceId as string;
      if (alarmType) filters.alarmType = alarmType as string;
      if (alarmLevel) filters.alarmLevel = alarmLevel as string;

      // 获取告警列表
      const alarms = alarmService.getAlarms(filters);

      // 计算分页
      const pageNum = parseInt(page as string, 10);
      const pageSizeNum = Math.min(parseInt(pageSize as string, 10), 100);
      const start = (pageNum - 1) * pageSizeNum;
      const end = start + pageSizeNum;
      const paginatedAlarms = alarms.slice(start, end);

      // 统计
      const statistics = {
        activeCount: alarms.filter(a => a.status === 'active').length,
        resolvedCount: alarms.filter(a => a.status === 'resolved').length,
        highLevelCount: alarms.filter(a => a.alarmLevel === 'high').length,
        mediumLevelCount: alarms.filter(a => a.alarmLevel === 'medium').length,
        lowLevelCount: alarms.filter(a => a.alarmLevel === 'low').length
      };

      res.status(200).json({
        code: 200,
        message: 'success',
        data: {
          alarms: paginatedAlarms,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            total: alarms.length,
            totalPages: Math.ceil(alarms.length / pageSizeNum)
          },
          statistics
        }
      });
    } catch (error) {
      console.error('Get alarms error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取告警详情
   * GET /api/alarms/:alarmId
   */
  static async getAlarm(req: Request, res: Response): Promise<void> {
    try {
      const { alarmId } = req.params;

      const alarm = alarmService.getAlarm(parseInt(alarmId, 10));

      if (!alarm) {
        res.status(404).json({
          code: 404,
          message: '告警记录不存在',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: 'success',
        data: alarm
      });
    } catch (error) {
      console.error('Get alarm error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 标记告警已处理
   * PUT /api/alarms/:alarmId/resolve
   */
  static async resolveAlarm(req: Request, res: Response): Promise<void> {
    try {
      const { alarmId } = req.params;
      const { note } = req.body;

      // 获取当前用户信息
      const handlerId = (req as any).user?.id || 1;
      const handlerName = (req as any).user?.name || '测试用户';

      const alarm = alarmService.getAlarm(parseInt(alarmId, 10));

      if (!alarm) {
        res.status(404).json({
          code: 404,
          message: '告警记录不存在',
          data: null
        });
        return;
      }

      if (alarm.status === 'resolved') {
        res.status(400).json({
          code: 400,
          message: '告警已处理',
          data: null
        });
        return;
      }

      const success = alarmService.resolveAlarm(
        parseInt(alarmId, 10),
        handlerId,
        handlerName
      );

      if (!success) {
        res.status(500).json({
          code: 500,
          message: '处理失败',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: '告警已标记为已处理',
        data: {
          id: parseInt(alarmId, 10),
          status: 'resolved',
          handledAt: new Date(),
          handlerId,
          handlerName,
          note
        }
      });
    } catch (error) {
      console.error('Resolve alarm error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}
