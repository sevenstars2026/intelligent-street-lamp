import { Request, Response } from 'express';
import { AlarmService } from '../services/alarm.service';

export class AlarmController {
  static async getAlarms(req: Request, res: Response): Promise<void> {
    try {
      const { status, deviceId, alarmType, alarmLevel, page = '1', pageSize = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));

      const result = await AlarmService.getAlarms(
        { status: status as any, deviceId: deviceId as string, alarmType: alarmType as string, alarmLevel: alarmLevel as string },
        pageNum,
        size
      );

      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      console.error('[AlarmController] getAlarms error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getAlarm(req: Request, res: Response): Promise<void> {
    try {
      const alarmId = parseInt(req.params.alarmId, 10);
      if (Number.isNaN(alarmId)) {
        res.status(400).json({ code: 400, message: '告警ID无效', data: null });
        return;
      }

      const alarm = await AlarmService.getAlarm(alarmId);
      if (!alarm) {
        res.status(404).json({ code: 404, message: '告警不存在', data: null });
        return;
      }

      res.json({ code: 200, message: 'success', data: alarm });
    } catch (error) {
      console.error('[AlarmController] getAlarm error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async resolveAlarm(req: Request, res: Response): Promise<void> {
    try {
      const alarmId = parseInt(req.params.alarmId, 10);
      if (Number.isNaN(alarmId)) {
        res.status(400).json({ code: 400, message: '告警ID无效', data: null });
        return;
      }

      const user = (req as any).user;
      const { note } = req.body;
      const result = await AlarmService.resolveAlarm(alarmId, user?.id || 1, user?.name || '测试用户', note);

      res.json({ code: 200, message: '告警已处理', data: result });
    } catch (error: any) {
      if (error.message === 'ALARM_NOT_FOUND') {
        res.status(404).json({ code: 404, message: '告警不存在', data: null });
        return;
      }
      if (error.message === 'ALARM_ALREADY_RESOLVED') {
        res.status(400).json({ code: 400, message: '该告警已处理', data: null });
        return;
      }
      console.error('[AlarmController] resolveAlarm error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }
}
