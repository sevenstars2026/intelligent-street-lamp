/**
 * 设备控制路由
 */

import { Router } from 'express';
import { DeviceControlController } from '../controllers/device-control.controller';

const router = Router();

// 控制单个路灯
router.post('/devices/:deviceId/control', DeviceControlController.controlDevice);

// 批量控制路灯
router.post('/devices/batch-control', DeviceControlController.batchControl);

// 获取控制历史
router.get('/devices/:deviceId/control-logs', DeviceControlController.getControlLogs);

// 获取阈值配置
router.get('/devices/:deviceId/threshold', DeviceControlController.getThreshold);

// 设置阈值配置
router.post('/devices/:deviceId/threshold', DeviceControlController.setThreshold);

// 获取设备控制模式
router.get('/devices/:deviceId/mode', DeviceControlController.getMode);

// 切换设备控制模式
router.put('/devices/:deviceId/mode', DeviceControlController.setMode);

export default router;
