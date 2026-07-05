import { Router } from 'express';
import { AlarmController } from '../controllers/alarm.controller';

const router = Router();

router.get('/alarms', AlarmController.getAlarms);
router.get('/alarms/:alarmId', AlarmController.getAlarm);
router.put('/alarms/:alarmId/resolve', AlarmController.resolveAlarm);

export default router;
