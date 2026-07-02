/**
 * 任务3后端服务主入口
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import deviceControlRoutes from './routes/device-control.routes';
import { DatabaseService } from './services/database.service';
import { closePool } from './config/database';
import { mockMqttClient } from './mock/mock-mqtt';

// 加载环境变量
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

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
        mqtt: mockMqttClient.isConnectedStatus() ? 'up' : 'down'
      }
    }
  });
});

// 设备控制相关路由
app.use('/api', deviceControlRoutes);

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

    // 连接MySQL数据库
    await DatabaseService.init();

    // 连接Mock MQTT
    await mockMqttClient.connect();
    console.log('✓ Mock MQTT connected');

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
    console.log('MVP Endpoints:');
    console.log('  GET    /api/devices');
    console.log('  GET    /api/devices/:deviceId');
    console.log('  POST   /api/devices/:deviceId/control');
    console.log('  GET    /api/devices/:deviceId/light-history');
    console.log('  GET    /api/health');
    console.log('\n');
  });
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  mockMqttClient.disconnect();
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  mockMqttClient.disconnect();
  await closePool();
  process.exit(0);
});

// 启动服务
start();

export default app;
