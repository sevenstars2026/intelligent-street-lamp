/**
 * 任务3后端服务主入口
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import deviceControlRoutes from './routes/device-control.routes';
import alarmRoutes from './routes/alarm.routes';
import dataStatisticsRoutes from './routes/data-statistics.routes';
import { MockDatabase } from './mock/mock-database';
import { mockMqttClient } from './mock/mock-mqtt';
import { mockRedis } from './mock/mock-redis';
import { SchedulerService } from './services/scheduler.service';
import { AutomationService } from './services/automation.service';

// 加载环境变量
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const scheduler = new SchedulerService();
const automation = new AutomationService();

// ===== 中间件配置 =====

// CORS
app.use(cors());

// JSON解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Mock JWT认证中间件（简化版）
app.use((req: Request, res: Response, next: NextFunction) => {
  // 模拟从JWT token中提取用户信息
  (req as any).user = {
    id: 1,
    name: '测试用户',
    role: 'admin'
  };
  next();
});

// ===== 路由配置 =====

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'healthy',
    data: {
      status: 'up',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
        mqtt: mockMqttClient.isConnectedStatus() ? 'up' : 'down'
      }
    }
  });
});

// 设备控制相关路由
app.use('/api', deviceControlRoutes);

// 告警相关路由
app.use('/api', alarmRoutes);

// 数据统计相关路由
app.use('/api', dataStatisticsRoutes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误',
    data: null
  });
});

// ===== 初始化和启动 =====

async function initialize() {
  try {
    console.log('Initializing services...');

    // 初始化Mock数据库
    MockDatabase.init();
    console.log('✓ Mock Database initialized');

    // 连接Mock MQTT
    await mockMqttClient.connect();
    console.log('✓ Mock MQTT connected');

    // 启动Redis过期键清理
    mockRedis.startExpirationCleanup();
    console.log('✓ Mock Redis started');

    // 启动定时任务
    scheduler.start();
    console.log('✓ Scheduler started');

    // 启动自动化规则引擎
    console.log('✓ Automation engine started');

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

async function start() {
  await initialize();

  app.listen(PORT, () => {
    console.log('\n========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
    console.log('========================================\n');
    console.log('Available endpoints:');
    console.log('  POST   /api/devices/:deviceId/control');
    console.log('  POST   /api/devices/batch-control');
    console.log('  GET    /api/devices/:deviceId/control-logs');
    console.log('  GET    /api/devices/:deviceId/threshold');
    console.log('  POST   /api/devices/:deviceId/threshold');
    console.log('  GET    /api/devices/:deviceId/mode');
    console.log('  PUT    /api/devices/:deviceId/mode');
    console.log('  GET    /api/alarms');
    console.log('  GET    /api/alarms/:alarmId');
    console.log('  PUT    /api/alarms/:alarmId/resolve');
    console.log('  GET    /api/devices/:deviceId/light-history');
    console.log('  GET    /api/devices/:deviceId/statistics');
    console.log('  GET    /api/statistics/overview');
    console.log('\n');
  });
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  scheduler.stop();
  mockMqttClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  scheduler.stop();
  mockMqttClient.disconnect();
  process.exit(0);
});

// 启动服务
start();

export default app;
