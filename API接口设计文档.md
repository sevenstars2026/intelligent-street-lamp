# 智慧路灯系统 - API 接口设计文档

## 📋 文档信息

- **版本：** v3.0（MVP 精简版）
- **更新时间：** 2026-07-02
- **服务名称：** 智慧路灯业务逻辑层（Task3 Backend）
- **Base URL：** `http://localhost:3000/api`
- **接口总数：** 11 个

> **版本说明：** v3.0 为 MVP 精简版，删除了告警管理、数据统计、全局配置等非核心接口，聚焦于设备控制、阈值管理、模式切换、控制日志和光照历史数据查询。v2.0 完整版（14 个接口）备份见 `完整架构备份.md`。

---

## 📌 通用说明

### 1. 认证方式

**当前阶段（MVP）：** Mock 认证，所有请求自动通过。后端中间件为每个请求注入硬编码用户信息：
```json
{ "id": 1, "name": "测试用户", "role": "admin" }
```
无需在请求头中携带 token。生产环境将替换为真实 JWT 认证。

### 2. 统一响应格式

```json
{
  "code": 200,           // 业务状态码
  "message": "success",  // 提示信息
  "data": { ... }        // 实际数据，失败时为 null
}
```

### 3. 通用错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 408 | 控制超时 |
| 500 | 服务器内部错误 |
| 503 | MQTT 控制服务不可用 |

### 4. 设备 ID 规范

设备 ID 格式为 `lamp_` 前缀加三位数字编号，例如：`lamp_001`、`lamp_002`、`lamp_003`。MQTT 消息处理会过滤非 `lamp_` 前缀的设备。

### 5. 时间格式

所有时间字段返回 ISO 8601 格式：`2026-07-02T10:30:00.000Z`

---

## 📡 接口列表总览

| # | 方法 | 路径 | 功能 |
|---|------|------|------|
| 1 | GET | `/api/health` | 健康检查 |
| 2 | GET | `/api/devices` | 获取所有设备 |
| 3 | GET | `/api/devices/:deviceId` | 获取单个设备 |
| 4 | POST | `/api/devices/:deviceId/control` | 控制单个路灯 |
| 5 | POST | `/api/devices/batch-control` | 批量控制路灯 |
| 6 | GET | `/api/devices/:deviceId/control-logs` | 查询控制日志 |
| 7 | GET | `/api/devices/:deviceId/threshold` | 获取设备阈值 |
| 8 | POST | `/api/devices/:deviceId/threshold` | 设置设备阈值 |
| 9 | GET | `/api/devices/:deviceId/mode` | 获取设备模式 |
| 10 | PUT | `/api/devices/:deviceId/mode` | 切换设备模式 |
| 11 | GET | `/api/devices/:deviceId/light-history` | 查询光照历史数据 |

---

## 1. 系统接口

### 1.1 健康检查

**接口路径：** `GET /api/health`

**功能描述：** 检查服务运行状态及依赖服务连接状态

**权限要求：** 无

**请求参数：** 无

**成功响应：** 200
```json
{
  "code": 200,
  "message": "healthy",
  "data": {
    "status": "up",
    "timestamp": "2026-07-02T10:00:00.000Z",
    "services": {
      "database": "up",
      "mqtt": "up"
    }
  }
}
```

---

## 2. 设备管理接口

### 2.1 获取所有设备

**接口路径：** `GET /api/devices`

**功能描述：** 获取所有路灯设备列表及其当前状态

**权限要求：** 管理员、市政人员

**请求参数：** 无

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "lamp_001",
      "name": "路灯001",
      "status": "online",
      "mode": "auto",
      "currentState": "on",
      "lastHeartbeat": "2026-07-02T09:55:00.000Z"
    }
  ]
}
```

**返回字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 设备唯一标识 |
| name | string | 设备名称 |
| status | 'online' \| 'offline' | 在线/离线状态 |
| mode | 'auto' \| 'manual' | 控制模式 |
| currentState | 'on' \| 'off' | 当前开关状态 |
| lastHeartbeat | datetime | 最后心跳时间 |

---

### 2.2 获取单个设备

**接口路径：** `GET /api/devices/:deviceId`

**功能描述：** 获取指定设备的详细信息

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID，如 lamp_001 |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "lamp_001",
    "name": "路灯001",
    "status": "online",
    "mode": "auto",
    "currentState": "on",
    "lastHeartbeat": "2026-07-02T09:55:00.000Z"
  }
}
```

**错误响应：** 404
```json
{
  "code": 404,
  "message": "设备不存在",
  "data": null
}
```

---

## 3. 设备控制接口

### 3.1 控制单个路灯

**接口路径：** `POST /api/devices/:deviceId/control`

**功能描述：** 远程控制指定路灯的开关。命令通过 MQTT 下发到硬件设备，等待硬件响应（超时时间 10 秒）。

**权限要求：** 管理员、市政人员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "command": "on"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| command | string | 是 | 控制命令，`"on"` 开灯 / `"off"` 关灯 |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "控制成功",
  "data": {
    "deviceId": "lamp_001",
    "command": "on",
    "status": "success",
    "executedAt": "2026-07-02T10:00:00.000Z"
  }
}
```

**错误响应示例：**

400 - 无效命令：
```json
{
  "code": 400,
  "message": "无效的控制命令，必须是on或off",
  "data": null
}
```

408 - 控制超时：
```json
{
  "code": 408,
  "message": "控制超时，请检查设备状态",
  "data": null
}
```

503 - MQTT 不可用：
```json
{
  "code": 503,
  "message": "控制服务暂时不可用，请稍后重试",
  "data": null
}
```

> **控制流程说明：** 后端收到请求 → 验证设备存在 → 验证 MQTT 连接 → 写入控制日志 → 发布 MQTT 命令到 `devices/{deviceId}/control` → 等待硬件响应（超时 10s）→ 收到响应后更新日志和设备状态。

---

### 3.2 批量控制路灯

**接口路径：** `POST /api/devices/batch-control`

**功能描述：** 同时控制多个路灯的开关。所有设备并发执行，互不影响。

**权限要求：** 管理员、市政人员

**注意：** 此路由在 `:deviceId` 参数路由之前匹配，避免 `batch-control` 被当作设备 ID。

**请求体：**
```json
{
  "deviceIds": ["lamp_001", "lamp_002", "lamp_003"],
  "command": "off"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deviceIds | string[] | 是 | 设备ID数组，不能为空 |
| command | string | 是 | 控制命令，`"on"` / `"off"` |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "批量控制完成",
  "data": {
    "results": [
      {
        "deviceId": "lamp_001",
        "command": "off",
        "status": "success",
        "message": "控制成功",
        "executedAt": "2026-07-02T10:00:00.000Z"
      },
      {
        "deviceId": "lamp_002",
        "command": "off",
        "status": "timeout",
        "message": "控制超时",
        "executedAt": "2026-07-02T10:00:10.000Z"
      }
    ],
    "summary": {
      "total": 2,
      "success": 1,
      "failed": 1
    }
  }
}
```

**错误响应：** 400
```json
{
  "code": 400,
  "message": "deviceIds必须是非空数组",
  "data": null
}
```

---

## 4. 控制日志接口

### 4.1 查询控制日志

**接口路径：** `GET /api/devices/:deviceId/control-logs`

**功能描述：** 查询指定设备的控制操作历史记录

**权限要求：** 管理员、市政人员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**查询参数：**

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页条数（最大100） |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "logs": [
      {
        "id": 1,
        "deviceId": "lamp_001",
        "command": "on",
        "status": "success",
        "operatorId": 1,
        "operatorName": "测试用户",
        "requestTime": "2026-07-02T09:50:00.000Z",
        "responseTime": "2026-07-02T09:50:02.000Z",
        "resultMessage": "控制成功"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**ControlLog 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 日志ID |
| deviceId | string | 设备ID |
| command | 'on' \| 'off' | 控制命令 |
| status | 'success' \| 'failed' \| 'timeout' | 执行结果 |
| operatorId | number | 操作人ID |
| operatorName | string | 操作人名称 |
| requestTime | datetime | 请求时间 |
| responseTime | datetime \| null | 响应时间（未响应时为 null） |
| resultMessage | string | 结果描述 |

---

## 5. 阈值管理接口

### 5.1 获取设备阈值

**接口路径：** `GET /api/devices/:deviceId/threshold`

**功能描述：** 获取设备的开关灯光照阈值配置

**权限要求：** 管理员、市政人员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "lightThresholdOn": 200,
    "lightThresholdOff": 300,
    "updatedAt": "2026-07-01T18:00:00.000Z"
  }
}
```

**ThresholdConfig 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| deviceId | string | 设备ID |
| lightThresholdOn | number | 开灯阈值（lux），光照低于此值自动开灯 |
| lightThresholdOff | number | 关灯阈值（lux），光照高于此值自动关灯 |
| updatedAt | datetime | 最后更新时间 |

**错误响应：** 404
```json
{
  "code": 404,
  "message": "设备阈值配置不存在",
  "data": null
}
```

---

### 5.2 设置设备阈值

**接口路径：** `POST /api/devices/:deviceId/threshold`

**功能描述：** 设置设备的开关灯光照阈值。使用 MySQL `INSERT ... ON DUPLICATE KEY UPDATE` 实现 upsert，首次设置即创建记录。

**权限要求：** 管理员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "lightThresholdOn": 200,
  "lightThresholdOff": 300
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lightThresholdOn | number | 是 | 开灯阈值（lux） |
| lightThresholdOff | number | 是 | 关灯阈值（lux） |

**校验规则：** `lightThresholdOn` 必须小于 `lightThresholdOff`

**成功响应：** 200
```json
{
  "code": 200,
  "message": "阈值设置成功",
  "data": {
    "deviceId": "lamp_001",
    "lightThresholdOn": 200,
    "lightThresholdOff": 300,
    "updatedAt": "2026-07-02T10:15:00.000Z"
  }
}
```

**错误响应：** 400
```json
{
  "code": 400,
  "message": "开灯阈值必须小于关灯阈值",
  "data": null
}
```

---

## 6. 模式管理接口

### 6.1 获取设备模式

**接口路径：** `GET /api/devices/:deviceId/mode`

**功能描述：** 获取设备当前的控制模式（自动或手动）

**权限要求：** 管理员、市政人员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "mode": "auto",
    "updatedAt": "2026-07-01T12:00:00.000Z"
  }
}
```

**错误响应：** 404
```json
{
  "code": 404,
  "message": "设备不存在",
  "data": null
}
```

---

### 6.2 切换设备模式

**接口路径：** `PUT /api/devices/:deviceId/mode`

**功能描述：** 切换设备的控制模式

| 模式 | 含义 |
|------|------|
| `auto` | 自动模式，根据光照阈值自动开关灯 |
| `manual` | 手动模式，仅响应手动控制指令 |

**权限要求：** 管理员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "mode": "manual"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mode | string | 是 | `"auto"` 或 `"manual"` |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "模式切换成功",
  "data": {
    "deviceId": "lamp_001",
    "mode": "manual",
    "updatedAt": "2026-07-02T10:20:00.000Z"
  }
}
```

**错误响应：** 400
```json
{
  "code": 400,
  "message": "无效的模式，必须是auto或manual",
  "data": null
}
```

---

## 7. 历史数据接口

### 7.1 查询光照历史数据

**接口路径：** `GET /api/devices/:deviceId/light-history`

**功能描述：** 查询指定设备在特定时间段内的光照强度数据

**权限要求：** 管理员、市政人员

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startTime | string | 是 | 开始时间（ISO 8601 格式） |
| endTime | string | 是 | 结束时间（ISO 8601 格式） |

**请求示例：**
```
GET /api/devices/lamp_001/light-history?startTime=2026-06-25T00:00:00.000Z&endTime=2026-07-02T00:00:00.000Z
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "startTime": "2026-06-25T00:00:00.000Z",
    "endTime": "2026-07-02T00:00:00.000Z",
    "aggregation": "raw",
    "count": 168,
    "records": [
      {
        "id": 1,
        "deviceId": "lamp_001",
        "lightIntensity": 350,
        "timestamp": "2026-07-02T09:00:00.000Z"
      }
    ]
  }
}
```

**LightDataRecord 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 记录ID |
| deviceId | string | 设备ID |
| lightIntensity | number | 光照强度（lux） |
| timestamp | datetime | 记录时间 |

**错误响应：** 400
```json
{
  "code": 400,
  "message": "startTime和endTime参数必填",
  "data": null
}
```

---

## 📊 数据模型总览

### Device（设备）
```typescript
interface Device {
  id: string              // 设备ID，如 "lamp_001"
  name: string            // 设备名称
  status: 'online' | 'offline'
  mode: 'auto' | 'manual'
  currentState: 'on' | 'off'
  lastHeartbeat: Date
}
```

### ThresholdConfig（阈值配置）
```typescript
interface ThresholdConfig {
  deviceId: string
  lightThresholdOn: number   // 开灯阈值
  lightThresholdOff: number  // 关灯阈值
  updatedAt: Date
}
```

### ControlLog（控制日志）
```typescript
interface ControlLog {
  id: number
  deviceId: string
  command: 'on' | 'off'
  status: 'success' | 'failed' | 'timeout'
  operatorId: number
  operatorName: string
  requestTime: Date
  responseTime: Date | null
  resultMessage: string
}
```

### LightDataRecord（光照数据）
```typescript
interface LightDataRecord {
  id: number
  deviceId: string
  lightIntensity: number
  timestamp: Date
}
```

---

## 🔌 MQTT 通信协议

### 控制命令下发

- **Topic:** `devices/{deviceId}/control`
- **Payload:**
```json
{
  "cmd": "switch",
  "value": "on",
  "requestId": "uuid-v4",
  "timestamp": 1751436000000
}
```

### 硬件响应

- **Topic:** `devices/{deviceId}/control/response`
- **监听通配符:** `devices/+/control/response`
- **设备过滤:** 仅处理 `lamp_` 前缀的设备
- **Payload:**
```json
{
  "requestId": "uuid-v4",
  "success": true,
  "message": "执行成功"
}
```

### 硬件模拟模式

设置环境变量 `MQTT_SIMULATE_HARDWARE=true` 后，后端会模拟硬件响应：
- 成功率：90%
- 响应延迟：1~3 秒随机

---

## 📝 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v3.0 | 2026-07-02 | MVP 精简版：删除告警管理、数据统计、全局配置接口，保留 11 个核心接口 |
| v2.0 | 2026-06-30 | 完整版：14 个接口，含告警、统计、配置等全部功能 |
| v1.0 | 2026-06-28 | 初始版本 |
