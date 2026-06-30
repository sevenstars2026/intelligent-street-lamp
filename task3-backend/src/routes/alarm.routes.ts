/**
 * 告警路由
 */

import { Router } from 'express';
import { AlarmController } from '../controllers/alarm.controller';

const router = Router();

// 获取告警列表
router.get('/alarms', AlarmController.getAlarms);

// 获取告警详情
router.get('/alarms/:alarmId', AlarmController.getAlarm);

// 标记告警已处理
router.put('/alarms/:alarmId/resolve', AlarmController.resolveAlarm);

export default router;
