# 任务3（后端业务逻辑层）- API接口设计文档

## 文档信息

- **版本：** v4.0
- **更新时间：** 2026-07-01
- **服务名称：** 智慧路灯业务逻辑
- **Base URL（本地开发）：** `http://localhost:3000/api`
- **Base URL（生产环境）：** `http://42.194.218.141:3000/api`
- **技术栈：** Node.js + Express.js + TypeScript + MySQL

---

## 通用说明

### 1. 认证方式

**当前阶段：** 用户名密码认证（登录接口返回用户信息）。后续接口调用暂无需额外 Token 鉴权。

### 2. 统一响应格式

```json
{
  "code": 200,           // 业务状态码
  "message": "success",  // 提示信息
  "data": {...}          // 实际数据，失败时为 null
}
```

### 3. 通用错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 账号或密码错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 4. 数据库表结构

系统共使用以下 6 张表：

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| users | 用户表 | id, username, password, nickname, role, avatar, created_at |
| devices | 设备表 | id, device_id, device_name, location, online, last_heartbeat, bind_time, light_status, mode, threshold_on, threshold_off, current_state |
| light_records | 光照记录表 | id, device_id, light_value, record_time |
| alerts | 告警表 | id, device_id, device_name, alert_type, alert_content, status, alert_level, handler_id, handler_name, create_time, handle_time |
| system_config | 系统配置表 | id, config_key, config_value, description, updated_at |
| control_logs | 控制日志表 | id, device_id, device_name, action, mode, operator, result, create_time |

---

## 1. 用户认证接口

### 1.1 用户登录

**接口路径：** `POST /api/login`

**功能描述：** 用户账号密码登录验证。

**请求体：**

```json
{
  "username": "admin",
  "password": "123456"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "张工",
    "role": "municipal",
    "avatar": "张",
    "created_at": "2026-06-01T09:00:00",
    "onlineDevices": 4
  },
  "message": "登录成功"
}
```

**错误响应：**

401 - 账号或密码错误

```json
{
  "code": 401,
  "message": "账号或密码错误"
}
```

500 - 服务器错误

```json
{
  "code": 500,
  "message": "服务器错误: ..."
}
```

---

## 2. 设备管理接口

### 2.1 获取设备列表

**接口路径：** `GET /api/devices`

**功能描述：** 获取所有路灯设备列表（按 ID 升序）。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "device_id": "light-001",
      "device_name": "1号路灯",
      "location": "滨江路A段",
      "online": true,
      "last_heartbeat": "2026-07-01T14:30:00",
      "bind_time": "2026-06-01T09:00:00",
      "light_status": "off",
      "mode": "auto",
      "threshold_on": 100,
      "threshold_off": 800,
      "current_state": "off"
    }
  ]
}
```

---

### 2.2 添加设备

**接口路径：** `POST /api/devices`

**功能描述：** 添加新的路灯设备绑定。

**请求体：**

```json
{
  "deviceId": "light-006",
  "deviceName": "6号路灯",
  "location": "人民路F段"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备唯一标识（不可重复） |
| deviceName | string | 是 | 设备名称 |
| location | string | 否 | 设备安装位置 |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "添加成功"
}
```

**错误响应：**

400 - 参数不完整

```json
{
  "code": 400,
  "message": "请填写完整信息"
}
```

500 - 设备 ID 已存在

```json
{
  "code": 500,
  "message": "设备ID已存在"
}
```

---

### 2.3 解绑设备

**接口路径：** `DELETE /api/devices/:deviceId`

**功能描述：** 删除指定设备绑定。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "解绑成功"
}
```

---

## 3. 光照数据接口

### 3.1 获取当前光照值

**接口路径：** `GET /api/light/current`

**功能描述：** 获取最新一条光照记录的光照值；若无记录则返回随机值。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "value": 320
  }
}
```

---

### 3.2 获取 7 天光照趋势

**接口路径：** `GET /api/light/history`

**功能描述：** 获取最近 7 天每天平均光照值，按日期升序返回。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": [
    {
      "date": "6/25",
      "value": 245.8
    },
    {
      "date": "6/26",
      "value": 310.5
    }
  ]
}
```

---

### 3.3 记录光照数据

**接口路径：** `POST /api/light/record`

**功能描述：** 传感器上报光照数据。若设备处于 `auto` 模式，系统会自动根据阈值触发开灯/关灯，并记录控制日志。

**请求体：**

```json
{
  "deviceId": "light-001",
  "value": 450
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 否 | 设备 ID，默认 `light-001` |
| value | number | 是 | 光照值 |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "记录成功"
}
```

---

## 4. 告警管理接口

### 4.1 获取告警列表

**接口路径：** `GET /api/alerts`

**功能描述：** 分页获取告警记录列表。

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "device_id": "light-003",
        "device_name": "3号路灯",
        "alert_type": "设备离线",
        "alert_content": "设备心跳中断超过5分钟，判断为离线",
        "status": 0,
        "alert_level": "low",
        "handler_id": null,
        "handler_name": null,
        "create_time": "2026-06-30T13:05:42",
        "handle_time": null,
        "createTime": "2026-06-30T13:05:42",
        "handleTime": null
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 4.2 处理告警

**接口路径：** `PUT /api/alerts/:id/handle`

**功能描述：** 将告警状态标记为已处理。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 告警 ID |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "已标记处理"
}
```

> 注：前端工具函数中还声明了 `resolveAlert(id, note?)`，对应接口 `PUT /api/alerts/:id/resolve`，当前后端尚未实现，如需使用请同步补充后端逻辑。

---

## 5. 系统配置接口

### 5.1 获取系统配置

**接口路径：** `GET /api/config`

**功能描述：** 获取系统配置项（光照阈值、控制模式等）。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "threshold_low": "100",
    "threshold_high": "800",
    "control_mode": "auto"
  }
}
```

---

### 5.2 更新系统配置

**接口路径：** `PUT /api/config`

**功能描述：** 更新系统配置项。

**请求体：**

```json
{
  "threshold_low": 100,
  "threshold_high": 800,
  "control_mode": "auto"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| threshold_low | number/string | 否 | 光照下限阈值（lux） |
| threshold_high | number/string | 否 | 光照上限阈值（lux） |
| control_mode | string | 否 | 控制模式：`auto` / `manual` |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "配置已更新"
}
```

---

## 6. 设备控制接口

### 6.1 控制单个路灯

**接口路径：** `POST /api/control/:deviceId/:action`

**功能描述：** 远程控制指定路灯的开关，并记录控制日志。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |
| action | string | 是 | 动作：`on`（开灯） / `off`（关灯） |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "开灯指令已下发",
  "data": {
    "deviceId": "light-001",
    "action": "on",
    "mode": "auto"
  }
}
```

---

### 6.2 批量控制路灯

**接口路径：** `POST /api/devices/batch-control`

**功能描述：** 对多个路灯执行统一开关控制，并逐条记录控制日志。

**请求体：**

```json
{
  "deviceIds": ["light-001", "light-002"],
  "command": "on"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceIds | string[] | 是 | 待控制的设备 ID 列表 |
| command | string | 是 | 控制命令：`on` / `off` |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "批量控制完成",
  "data": {
    "results": [
      {
        "deviceId": "light-001",
        "status": "success",
        "message": "开灯成功"
      },
      {
        "deviceId": "light-002",
        "status": "success",
        "message": "开灯成功"
      }
    ],
    "summary": {
      "total": 2,
      "success": 2,
      "failed": 0
    }
  }
}
```

---

## 7. 数据统计接口

### 7.1 获取首页统计面板

**接口路径：** `GET /api/dashboard/stats`

**功能描述：** 获取首页统计面板数据，包括在线设备数、总设备数、未处理告警、当前光照值、阈值等。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "onlineDevices": 4,
    "totalDevices": 5,
    "pendingAlerts": 2,
    "currentLight": 320,
    "thresholdLow": 100,
    "thresholdHigh": 800
  }
}
```

---

### 7.2 获取全量统计概览

**接口路径：** `GET /api/statistics/overview`

**功能描述：** 获取系统级统计概览，包括设备总数、在线数、离线数、活跃告警数、平均光照值。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "totalDevices": 5,
    "onlineDevices": 4,
    "activeAlerts": 2,
    "avgLight": 320.5,
    "offlineDevices": 1
  }
}
```

---

### 7.3 获取单设备运行统计

**接口路径：** `GET /api/devices/:deviceId/statistics`

**功能描述：** 获取指定设备在指定时间范围内的光照统计、在线率、自动/手动控制次数。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| range | string | 否 | 时间范围：`7d`（默认） / `30d` |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "deviceId": "light-001",
    "range": "7d",
    "dataPoints": 100,
    "avgLight": 315.2,
    "maxLight": 800.0,
    "minLight": 50.0,
    "onlineRate": 95,
    "autoControlCount": 12,
    "manualControlCount": 3
  }
}
```

---

### 7.4 获取单设备历史光照

**接口路径：** `GET /api/devices/:deviceId/light-history`

**功能描述：** 按天聚合指定设备的历史光照数据，返回日期、平均值、最大值、最小值及记录条数。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| range | string | 否 | 时间范围：`24h` / `7d`（默认） / `30d` |

**成功响应：** 200

```json
{
  "code": 200,
  "data": [
    {
      "date": "2026-06-25",
      "value": 245.8,
      "max": 500.0,
      "min": 120.0,
      "count": 10
    }
  ]
}
```

---

### 7.5 获取单设备控制日志

**接口路径：** `GET /api/devices/:deviceId/control-logs`

**功能描述：** 分页获取指定设备的控制日志。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "device_id": "light-001",
        "device_name": "1号路灯",
        "action": "on",
        "mode": "auto",
        "operator": "system",
        "result": "success",
        "create_time": "2026-06-30T13:05:42"
      }
    ],
    "total": 20,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 8. 设备阈值与模式接口

### 8.1 获取设备阈值

**接口路径：** `GET /api/devices/:deviceId/threshold`

**功能描述：** 获取指定设备的自动光照阈值。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "deviceId": "light-001",
    "lightThresholdOn": 100,
    "lightThresholdOff": 800
  }
}
```

**错误响应：**

404 - 设备不存在

```json
{
  "code": 404,
  "message": "设备不存在"
}
```

---

### 8.2 设置设备阈值

**接口路径：** `POST /api/devices/:deviceId/threshold`

**功能描述：** 设置指定设备的自动光照阈值。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求体：**

```json
{
  "lightThresholdOn": 100,
  "lightThresholdOff": 800
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| lightThresholdOn | number | 是 | 开灯阈值（lux），对应数据库 `threshold_on` |
| lightThresholdOff | number | 是 | 关灯阈值（lux），对应数据库 `threshold_off` |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "阈值设置成功"
}
```

**错误响应：**

400 - 阈值逻辑错误

```json
{
  "code": 400,
  "message": "开灯阈值必须小于关灯阈值"
}
```

---

### 8.3 获取设备模式

**接口路径：** `GET /api/devices/:deviceId/mode`

**功能描述：** 获取指定设备的控制模式。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**成功响应：** 200

```json
{
  "code": 200,
  "data": {
    "deviceId": "light-001",
    "mode": "auto"
  }
}
```

**错误响应：**

404 - 设备不存在

```json
{
  "code": 404,
  "message": "设备不存在"
}
```

---

### 8.4 设置设备模式

**接口路径：** `PUT /api/devices/:deviceId/mode`

**功能描述：** 切换指定设备的控制模式。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**请求体：**

```json
{
  "mode": "manual"
}
```

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mode | string | 是 | 控制模式：`auto` / `manual` |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "模式切换成功"
}
```

---

## 9. 系统服务接口

### 9.1 健康检查

**接口路径：** `GET /api/health`

**功能描述：** 检查服务运行状态及数据库、MQTT 连接状态。

**请求参数：** 无

**成功响应：** 200

```json
{
  "code": 200,
  "message": "healthy",
  "data": {
    "status": "up",
    "timestamp": "2026-07-01T16:48:00.000Z",
    "services": {
      "database": "up",
      "mqtt": "up"
    }
  }
}
```

---

### 9.2 设备心跳上报

**接口路径：** `POST /api/devices/:deviceId/heartbeat`

**功能描述：** 设备端上报心跳，服务端更新设备在线状态、最后心跳时间，并自动恢复该设备的离线告警。

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备 ID |

**成功响应：** 200

```json
{
  "code": 200,
  "message": "心跳已更新"
}
```

---

## 附录

### A. 默认账号

| 用户名 | 密码 | 昵称 | 角色 |
|--------|------|------|------|
| admin | 123456 | 张工 | municipal |
| manager | 123456 | 李管理 | admin |

### B. 默认设备

| 设备 ID | 设备名称 | 位置 | 在线状态 | 模式 |
|--------|------|------|------|------|
| light-001 | 1号路灯 | 滨江路A段 | 在线 | auto |
| light-002 | 2号路灯 | 滨江路B段 | 在线 | auto |
| light-003 | 3号路灯 | 中山路C段 | 离线 | manual |
| light-004 | 4号路灯 | 中山路D段 | 在线 | auto |
| light-005 | 5号路灯 | 人民路E段 | 在线 | auto |

### C. 默认系统配置

| 配置项 | 默认值 | 说明 |
|--------|------|------|
| threshold_low | 100 | 光照下限阈值（lux） |
| threshold_high | 800 | 光照上限阈值（lux） |
| control_mode | auto | 当前控制模式 |

### D. 字段映射说明

| API 字段 | 数据库字段 | 说明 |
|----------|------------|------|
| lightThresholdOn | threshold_on | 低于该值自动开灯 |
| lightThresholdOff | threshold_off | 高于该值自动关灯 |
| light_status | light_status | 当前灯的开关状态 |
| current_state | current_state | 当前受控状态 |
| mode | mode | 控制模式：`auto` / `manual` |

---

## 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2026-06-30 | 初始版本 | 任务3团队 |
| v2.0 | 2026-06-30 | 更新 Base URL 为 localhost:3000；添加 Mock 认证说明；统一接口路径添加 /api 前缀；添加统计概览接口；删除未实现的导出接口；更新数据粒度枚举 | 任务3团队 |
| v3.0 | 2026-07-01 | 根据实际项目 `server.js` 重写全部接口；补充数据库表结构、默认账号、默认设备、默认配置等附录 | 任务3团队 |
| v4.0 | 2026-07-01 | 根据当前后端 `server/src/index.ts` 与前端 `frontend/src/utils/api.ts` 全面校准接口；新增批量控制、设备阈值、设备模式、单设备控制日志、单设备历史光照、单设备运行统计、全量统计概览、健康检查、心跳上报等接口；补充数据库字段、字段映射说明及未实现接口提示 | 任务3团队 |

---

## 反馈与建议

如有问题或建议，请联系任务3负责人。
