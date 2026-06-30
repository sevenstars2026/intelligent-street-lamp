# 任务3：后端业务逻辑层

智慧路灯系统 - 任务3后端业务逻辑服务

## 📋 项目概述

本项目实现了智慧路灯系统的核心业务逻辑，包括：
- ✅ 设备控制服务（单个/批量）
- ✅ 阈值管理
- ✅ 设备模式管理（自动/手动）
- ✅ 控制历史查询
- ⏳ 告警服务（待完成）
- ⏳ 数据统计服务（待完成）

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务将运行在 `http://localhost:3000`

### 4. 测试API

健康检查：
```bash
curl http://localhost:3000/api/health
```

控制路灯：
```bash
curl -X POST http://localhost:3000/api/devices/lamp_001/control \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'
```

## 📁 项目结构

```
task3-backend/
├── src/
│   ├── controllers/         # 控制器层
│   │   └── device-control.controller.ts
│   ├── services/           # 业务逻辑层
│   │   └── device-control.service.ts
│   ├── routes/             # 路由配置
│   │   └── device-control.routes.ts
│   ├── utils/              # 工具类和算法
│   │   ├── threshold-algorithm.ts        # 光照阈值判定算法
│   │   ├── alarm-upgrade-algorithm.ts    # 告警升级算法
│   │   └── data-aggregation-algorithm.ts # 数据聚合算法
│   ├── mock/               # Mock服务（用于独立开发）
│   │   ├── mock-database.ts    # Mock数据库
│   │   ├── mock-mqtt.ts        # Mock MQTT客户端
│   │   └── mock-redis.ts       # Mock Redis
│   ├── models/             # 数据模型（待添加）
│   ├── middlewares/        # 中间件（待添加）
│   ├── config/             # 配置文件（待添加）
│   └── index.ts            # 主入口文件
├── dist/                   # 编译输出目录
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 核心模块说明

### 1. 业务算法模块 (utils/)

#### 光照阈值判定算法
```typescript
import { ThresholdAlgorithm, LightSample } from './utils/threshold-algorithm';

const samples: LightSample[] = [
  { lightIntensity: 180, timestamp: new Date() },
  { lightIntensity: 190, timestamp: new Date() },
  { lightIntensity: 185, timestamp: new Date() },
  { lightIntensity: 175, timestamp: new Date() },
  { lightIntensity: 170, timestamp: new Date() }
];

const shouldTurnOn = ThresholdAlgorithm.shouldTurnOn(samples, 200);
// true: 5次采样中有4次低于阈值200
```

**逻辑：** 最近5次采样中有4次满足条件才触发，避免频繁开关

#### 告警升级算法
```typescript
import { AlarmUpgradeAlgorithm, AlarmLevel } from './utils/alarm-upgrade-algorithm';

const offlineStartTime = new Date('2026-06-30T10:00:00Z');
const currentTime = new Date('2026-06-30T17:00:00Z'); // 7小时后

const level = AlarmUpgradeAlgorithm.calculateLevel(offlineStartTime, currentTime);
// AlarmLevel.HIGH (离线超过6小时)
```

**逻辑：** 
- 离线 < 1小时：低级告警
- 离线 1-6小时：中级告警
- 离线 > 6小时：高级告警

#### 数据聚合算法
```typescript
import { DataAggregationAlgorithm } from './utils/data-aggregation-algorithm';

const data = [
  { lightIntensity: 250, timestamp: new Date() },
  { lightIntensity: 245, timestamp: new Date() },
  { lightIntensity: 260, timestamp: new Date() }
];

const result = DataAggregationAlgorithm.aggregate(data);
// {
//   avgLightIntensity: 251.7,
//   maxLightIntensity: 260,
//   minLightIntensity: 245,
//   sampleCount: 3
// }
```

### 2. Mock服务层 (mock/)

由于任务2（后端基础服务层）尚未完成，使用Mock服务独立开发：

- **MockDatabase**: 模拟数据库操作
- **MockMqttClient**: 模拟MQTT通信（自动生成硬件反馈）
- **MockRedis**: 模拟Redis缓存

**优点：**
- 不依赖外部服务，可独立开发和测试
- Mock层设计清晰，后期替换为真实实现非常容易
- 可以模拟各种场景（成功、失败、超时）

### 3. 设备控制服务 (services/)

```typescript
import { DeviceControlService } from './services/device-control.service';

const service = new DeviceControlService();

// 控制单个设备
const result = await service.controlDevice({
  deviceId: 'lamp_001',
  command: 'on',
  operatorId: 1,
  operatorName: '张三'
});

// 批量控制
const batchResult = await service.batchControl(
  ['lamp_001', 'lamp_002', 'lamp_003'],
  'on',
  1,
  '张三'
);
```

**特性：**
- 10秒控制超时机制
- MQTT指令发送
- 等待硬件反馈
- 自动记录控制日志
- 90%成功率模拟（Mock模式）

## 📡 API接口

详细的API文档请参考：[任务3_API接口设计文档.md](../任务3_API接口设计文档.md)

### 已实现的接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/devices/:deviceId/control` | 控制单个路灯 |
| POST | `/api/devices/batch-control` | 批量控制路灯 |
| GET | `/api/devices/:deviceId/control-logs` | 获取控制历史 |
| GET | `/api/devices/:deviceId/threshold` | 获取阈值配置 |
| POST | `/api/devices/:deviceId/threshold` | 设置阈值配置 |
| GET | `/api/devices/:deviceId/mode` | 获取控制模式 |
| PUT | `/api/devices/:deviceId/mode` | 切换控制模式 |
| GET | `/api/health` | 健康检查 |

### 接口示例

#### 1. 控制路灯

```bash
curl -X POST http://localhost:3000/api/devices/lamp_001/control \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'
```

响应：
```json
{
  "code": 200,
  "message": "控制成功",
  "data": {
    "deviceId": "lamp_001",
    "command": "on",
    "status": "success",
    "executedAt": "2026-06-30T10:00:00.000Z"
  }
}
```

#### 2. 批量控制

```bash
curl -X POST http://localhost:3000/api/devices/batch-control \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["lamp_001", "lamp_002"],
    "command": "on"
  }'
```

#### 3. 设置阈值

```bash
curl -X POST http://localhost:3000/api/devices/lamp_001/threshold \
  -H "Content-Type: application/json" \
  -d '{
    "lightThresholdOn": 200,
    "lightThresholdOff": 300
  }'
```

#### 4. 切换模式

```bash
curl -X PUT http://localhost:3000/api/devices/lamp_001/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "manual"}'
```

## 🔄 与任务2的集成

当任务2（后端基础服务层）完成后，需要替换Mock服务：

### 1. 数据库集成

替换 `mock/mock-database.ts` 为真实的数据库操作：

```typescript
// 将来替换为真实的数据库操作
import { DatabaseService } from '../services/database.service';

// MockDatabase.getDevice(deviceId)
// 替换为:
await DatabaseService.query('SELECT * FROM devices WHERE id = ?', [deviceId]);
```

### 2. MQTT集成

替换 `mock/mock-mqtt.ts` 为真实的MQTT客户端：

```typescript
// 将来替换为真实的MQTT客户端
import mqtt from 'mqtt';

const client = mqtt.connect(process.env.MQTT_BROKER_URL);
```

### 3. Redis集成

替换 `mock/mock-redis.ts` 为真实的Redis客户端：

```typescript
// 将来替换为真实的Redis
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379')
});
```

**替换步骤：**
1. 保持业务逻辑层代码不变
2. 只修改Mock导入为真实服务导入
3. 调整初始化代码
4. 测试验证

## 🧪 测试

### 单元测试（待实现）

```bash
npm test
```

### 手动测试

1. 启动服务：`npm run dev`
2. 使用Postman或curl测试API
3. Mock服务已包含3个测试设备：`lamp_001`, `lamp_002`, `lamp_003`

## 📦 构建和部署

### 构建生产版本

```bash
npm run build
```

### 启动生产服务

```bash
npm start
```

## 🔮 待实现功能

- [ ] 告警服务完整实现
- [ ] 数据统计和聚合服务
- [ ] 自动化规则引擎（光照阈值联动）
- [ ] 定时任务调度
- [ ] 数据导出功能
- [ ] 完整的用户认证集成
- [ ] 单元测试
- [ ] 集成测试

## 📚 相关文档

- [任务3_API接口设计文档.md](../任务3_API接口设计文档.md) - 完整的API接口文档
- [任务3_实现细节确认.md](../任务3_实现细节确认.md) - 实现细节确认记录
- [各任务交付清单.md](../各任务交付清单.md) - 任务依赖和交付清单

## 🤝 贡献

任务3团队

## 📄 License

MIT
