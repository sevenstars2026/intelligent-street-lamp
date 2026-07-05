# 任务3：后端业务逻辑层

智慧路灯系统 Express + TypeScript 后端服务，连接真实 MySQL 和 MQTT Broker，提供 11 个 MVP REST API。

---

## 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Express 4
- **数据库**: MySQL 8（mysql2/promise 连接池）
- **消息协议**: MQTT（mqtt.js 真实 Broker）
- **开发工具**: ts-node-dev（热重载）

---

## 快速开始

### 1. 安装

```bash
npm install
```

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3000
DB_HOST=47.108.58.107
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dream20
MQTT_BROKER_URL=mqtt://47.108.58.107:1883
MQTT_SIMULATE_HARDWARE=false   # 使用真实硬件（不模拟）
```

### 3. 启动

```bash
npm run dev
```

启动后输出：

```
✓ MySQL Database connected
✓ MQTT ✅ Connected to broker
[MQTT] Subscribed to topic: devices/+/control/response
[MQTT] Subscribed to topic: devices/+/data
[MQTT] Subscribed to topic: devices/+/heartbeat
[MQTT] Subscribed to topic: devices/+/config/request
[MQTT] Subscribed to topic: devices/+/auto-action
[MQTT] Subscribed to topic: devices/+/config/ack
🚀 Server running on port 3000
```

### 4. 验证

```bash
curl http://localhost:3000/api/health
# → {"code":200,"message":"healthy","data":{"status":"up",...}}
```

---

## 项目结构

```
src/
├── index.ts                          # 主入口（Express + 中间件 + 启动）
├── config/
│   └── database.ts                   # MySQL 连接池配置
├── types/
│   └── database.types.ts             # 全部 TypeScript 数据模型
├── controllers/
│   ├── device-control.controller.ts  # 设备 HTTP 请求处理、参数校验
│   └── alarm.controller.ts           # 告警查询与处理
├── services/
│   ├── device-control.service.ts     # 设备控制业务 + MQTT 订阅
│   ├── alarm.service.ts              # 告警检测、升级和处理
│   └── database.service.ts           # 全部数据库 CRUD 操作
├── routes/
│   ├── device-control.routes.ts      # 设备接口路由
│   └── alarm.routes.ts               # 告警接口路由
└── mock/
    └── mock-mqtt.ts                  # MQTT 客户端（连接真实 Broker）
```

---

## API 接口（主要 MVP 接口）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/devices` | 获取所有设备 |
| GET | `/api/devices/:deviceId` | 获取单个设备 |
| POST | `/api/devices/:deviceId/control` | 控制开关灯 |
| POST | `/api/devices/batch-control` | 批量控制 |
| GET | `/api/devices/:deviceId/control-logs` | 控制日志 |
| GET | `/api/devices/:deviceId/light-history` | 光照历史 |
| GET | `/api/devices/:deviceId/threshold` | 获取阈值 |
| POST | `/api/devices/:deviceId/threshold` | 设置阈值 |
| GET | `/api/devices/:deviceId/mode` | 获取控制模式 |
| PUT | `/api/devices/:deviceId/mode` | 切换模式 |
| GET | `/api/alarms` | 查询告警列表 |
| GET | `/api/alarms/:alarmId` | 查询单条告警 |
| PUT | `/api/alarms/:alarmId/resolve` | 处理告警 |

所有接口返回统一格式 `{ code, message, data }`。

---

## MQTT 消息架构

| Topic | 方向 | 处理 |
|-------|------|------|
| `devices/{id}/config` | 后端→硬件 | 下发模式和阈值配置 |
| `devices/{id}/config/request` | 硬件→后端 | 硬件启动/重连后请求最新配置 |
| `devices/{id}/config/ack` | 硬件→后端 | 硬件确认配置已应用，当前仅记录日志 |
| `devices/{id}/auto-action` | 硬件→后端 | 硬件本地自动开关灯事件，更新状态并写控制日志 |
| `devices/{id}/control` | 后端→硬件 | 下发手动开/关灯指令 |
| `devices/{id}/control/response` | 硬件→后端 | 手动控制结果反馈，更新 control_logs 和设备状态 |
| `devices/{id}/data` | 硬件→后端 | 光照数据上报 → 写入 `light_data` 表，不触发后端自动控制 |
| `devices/{id}/heartbeat` | 硬件→后端 | 心跳上报 → 更新 `devices.last_heartbeat` 和在线状态 |

### 配置下发

用户通过 REST API 修改阈值或模式后，后端写入 MySQL，并立即推送：

```json
{"mode":"auto","thresholdOn":200,"thresholdOff":600,"version":1751436000000,"timestamp":1751436000000}
```

硬件也可以发布 `devices/{id}/config/request` 主动拉取配置：

```json
{"deviceId":"lamp_001","localVersion":0,"timestamp":1751436000000}
```

### 自动控制事件

自动开关灯由硬件本地判断和执行。硬件执行后上报：

```json
{"deviceId":"lamp_001","action":"on","trigger":"light_below_threshold","lightIntensity":180,"thresholdOn":200,"thresholdOff":600,"timestamp":1751436000000}
```

后端收到后更新 `devices.current_state`，并写入 `control_logs`：

- `operator_id = 0`
- `operator_name = 自动控制`
- `status = success`
- `result_message = 光照 {lightIntensity} < 阈值 {thresholdOn}` 或 `光照 {lightIntensity} > 阈值 {thresholdOff}`

### 手动控制

控制指令格式：
```json
{"cmd": "switch", "value": "on|off", "requestId": "uuid", "timestamp": 123456789}
```

硬件响应兼容以下格式：

```json
{"deviceId":"lamp_001","requestId":"uuid","success":true,"message":"执行成功","timestamp":1751436000000}
```

硬件数据上报支持 `lightIntensity` / `lux` / `value` 多种字段名。

---

## 数据库表

| 表名 | 用途 |
|------|------|
| `devices` | 设备信息（ID、名称、状态、模式、心跳） |
| `thresholds` | 光照阈值配置 |
| `control_logs` | 控制指令操作记录 |
| `light_data` | 光照数据原始记录 |
| `alarms` | 告警记录（离线、控制失败、频繁开关、升级和处理） |
| `aggregated_data` | 聚合统计数据（表结构就绪） |

---

## 接口示例

### 控制开灯

```bash
curl -X POST http://localhost:3000/api/devices/lamp_001/control \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'
```

响应：
```json
{"code":200,"message":"控制成功","data":{"deviceId":"lamp_001","command":"on","status":"success"}}
```

### 查询光照历史

```bash
curl "http://localhost:3000/api/devices/lamp_001/light-history?startTime=2026-07-01T00:00:00Z&endTime=2026-07-02T00:00:00Z"
```

### 设置阈值

```bash
curl -X POST http://localhost:3000/api/devices/lamp_001/threshold \
  -H "Content-Type: application/json" \
  -d '{"lightThresholdOn": 150, "lightThresholdOff": 600}'
```

---

## 认证

当前使用 Mock JWT 中间件，所有请求自动注入 `req.user = { id: 1, name: '测试用户', role: 'admin' }`，无需真实 token。

---

## 相关文档

- [../README.md](../README.md) — 项目总览
- [../task4-frontend/README.md](../task4-frontend/README.md) — 前端完整使用文档
- [../任务3_API接口设计文档.md](../任务3_API接口设计文档.md) — API 详细规范
