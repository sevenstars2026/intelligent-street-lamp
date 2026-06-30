/**
 * 数据统计路由
 */

import { Router } from 'express';
import { DataStatisticsController } from '../controllers/data-statistics.controller';

const router = Router();

// 查询历史光照数据
router.get('/devices/:deviceId/light-history', DataStatisticsController.getLightHistory);

// 获取设备运行统计
router.get('/devices/:deviceId/statistics', DataStatisticsController.getDeviceStatistics);

// 获取所有设备统计概览
router.get('/statistics/overview', DataStatisticsController.getOverview);

export default router;
