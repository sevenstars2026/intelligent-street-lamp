# 任务3（后端业务逻辑层）- API接口设计文档

## 📋 文档信息

- **版本：** v1.0
- **更新时间：** 2026-06-30
- **服务名称：** 智慧路灯业务逻辑
- **Base URL：** `http://api.example.com/api` (待确认)

---

## 📌 通用说明

### 1. 认证方式
所有接口都需要在请求头中携带JWT token：
```
Authorization: Bearer {token}
```

### 2. 统一响应格式
```json
{
  "code": 200,           // 业务状态码
  "message": "success",  // 提示信息
  "data": {...}          // 实际数据，失败时为null
}
```

### 3. 通用错误码
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或token失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用 |

### 4. 时间格式
所有时间字段使用ISO 8601格式：`2026-06-30T10:30:00Z`

---

## 1. 设备控制接口

### 1.1 控制单个路灯

**接口路径：** `POST /devices/:deviceId/control`

**功能描述：** 远程控制指定路灯的开关

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID，如 lamp_001 |

**请求体：**
```json
{
  "command": "on"  // "on"=开灯, "off"=关灯
}
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "控制成功",
  "data": {
    "deviceId": "lamp_001",
    "command": "on",
    "status": "success",
    "executedAt": "2026-06-30T10:00:00Z"
  }
}
```

**错误响应：**

404 - 设备不存在
```json
{
  "code": 404,
  "message": "设备不存在",
  "data": null
}
```

503 - 控制服务不可用（MQTT连接失败）
```json
{
  "code": 503,
  "message": "控制服务暂时不可用，请稍后重试",
  "data": null
}
```

408 - 控制超时（10秒内未收到硬件反馈）
```json
{
  "code": 408,
  "message": "控制超时，请检查设备状态",
  "data": null
}
```

**调用示例：**
```bash
curl -X POST "http://api.example.com/api/devices/lamp_001/control" \
  -H "Authorization: Bearer xxx" \
  -H "Content-Type: application/json" \
  -d '{"command": "on"}'
```

---

### 1.2 批量控制路灯

**接口路径：** `POST /devices/batch-control`

**功能描述：** 同时控制多个路灯的开关

**权限要求：** 管理员、市政人员

**请求体：**
```json
{
  "deviceIds": ["lamp_001", "lamp_002", "lamp_003"],
  "command": "on"  // "on"=开灯, "off"=关灯
}
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "批量控制完成",
  "data": {
    "results": [
      {
        "deviceId": "lamp_001",
        "status": "success",
        "message": "开灯成功"
      },
      {
        "deviceId": "lamp_002",
        "status": "success",
        "message": "开灯成功"
      },
      {
        "deviceId": "lamp_003",
        "status": "failed",
        "message": "控制超时"
      }
    ],
    "summary": {
      "total": 3,
      "success": 2,
      "failed": 1
    }
  }
}
```

**调用示例：**
```bash
curl -X POST "http://api.example.com/api/devices/batch-control" \
  -H "Authorization: Bearer xxx" \
  -H "Content-Type: application/json" \
  -d '{"deviceIds": ["lamp_001", "lamp_002"], "command": "on"}'
```

---

## 2. 阈值管理接口

### 2.1 获取设备阈值配置

**接口路径：** `GET /devices/:deviceId/threshold`

**功能描述：** 获取指定设备的光照阈值配置

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
    "lightThresholdOn": 200,   // 开灯阈值（光照低于此值触发开灯）
    "lightThresholdOff": 300,  // 关灯阈值（光照高于此值触发关灯）
    "updatedAt": "2026-06-30T10:00:00Z"
  }
}
```

**错误响应：**

404 - 设备不存在或未配置阈值
```json
{
  "code": 404,
  "message": "设备阈值配置不存在",
  "data": null
}
```

---

### 2.2 设置设备阈值配置

**接口路径：** `POST /devices/:deviceId/threshold`

**功能描述：** 设置指定设备的光照阈值

**权限要求：** 管理员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "lightThresholdOn": 200,   // 开灯阈值，整数
  "lightThresholdOff": 300   // 关灯阈值，整数
}
```

**参数校验：**
- `lightThresholdOn` 必须小于 `lightThresholdOff`
- 两个值都必须在合理范围内（待确认具体范围）

**成功响应：** 200
```json
{
  "code": 200,
  "message": "阈值设置成功",
  "data": {
    "deviceId": "lamp_001",
    "lightThresholdOn": 200,
    "lightThresholdOff": 300,
    "updatedAt": "2026-06-30T10:05:00Z"
  }
}
```

**错误响应：**

400 - 参数错误
```json
{
  "code": 400,
  "message": "开灯阈值必须小于关灯阈值",
  "data": null
}
```

---

## 3. 设备模式管理接口

### 3.1 切换设备控制模式

**接口路径：** `PUT /devices/:deviceId/mode`

**功能描述：** 切换设备的自动/手动控制模式

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "mode": "auto"  // "auto"=自动模式, "manual"=手动模式
}
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "模式切换成功",
  "data": {
    "deviceId": "lamp_001",
    "mode": "auto",
    "updatedAt": "2026-06-30T10:10:00Z"
  }
}
```

---

### 3.2 获取设备控制模式

**接口路径：** `GET /devices/:deviceId/mode`

**功能描述：** 获取设备当前的控制模式

**权限要求：** 管理员、市政人员

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "mode": "auto",  // "auto" 或 "manual"
    "updatedAt": "2026-06-30T10:10:00Z"
  }
}
```

---

## 4. 历史数据查询接口

### 4.1 查询设备历史光照数据

**接口路径：** `GET /devices/:deviceId/light-history`

**功能描述：** 查询指定设备的历史光照强度数据

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**查询参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| range | string | 否 | 快捷时间范围：24h/7d/30d |
| startTime | string | 否 | 开始时间（ISO 8601格式） |
| endTime | string | 否 | 结束时间（ISO 8601格式） |
| granularity | string | 否 | 数据粒度：raw/hourly，默认hourly |

**参数说明：**
- 如果提供 `range`，则忽略 `startTime` 和 `endTime`
- 如果不提供 `range`，则必须提供 `startTime` 和 `endTime`
- `granularity=raw`：返回原始采样数据（仅限最近24小时）
- `granularity=hourly`：返回小时级聚合数据

**成功响应：** 200

原始数据格式（granularity=raw）：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "granularity": "raw",
    "range": {
      "startTime": "2026-06-30T09:00:00Z",
      "endTime": "2026-06-30T10:00:00Z"
    },
    "records": [
      {
        "lightIntensity": 250,
        "timestamp": "2026-06-30T09:00:00Z"
      },
      {
        "lightIntensity": 245,
        "timestamp": "2026-06-30T09:05:00Z"
      }
    ],
    "total": 12
  }
}
```

聚合数据格式（granularity=hourly）：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "granularity": "hourly",
    "range": {
      "startTime": "2026-06-23T00:00:00Z",
      "endTime": "2026-06-30T00:00:00Z"
    },
    "records": [
      {
        "hourTime": "2026-06-30T09:00:00Z",
        "avgLightIntensity": 247.5,
        "maxLightIntensity": 260,
        "minLightIntensity": 235,
        "sampleCount": 12
      },
      {
        "hourTime": "2026-06-30T08:00:00Z",
        "avgLightIntensity": 220.3,
        "maxLightIntensity": 240,
        "minLightIntensity": 200,
        "sampleCount": 12
      }
    ],
    "total": 168  // 7天 × 24小时
  }
}
```

**调用示例：**
```bash
# 查询最近24小时的小时级聚合数据
curl "http://api.example.com/api/devices/lamp_001/light-history?range=24h" \
  -H "Authorization: Bearer xxx"

# 查询自定义时间范围的原始数据
curl "http://api.example.com/api/devices/lamp_001/light-history?startTime=2026-06-30T09:00:00Z&endTime=2026-06-30T10:00:00Z&granularity=raw" \
  -H "Authorization: Bearer xxx"
```

---

### 4.2 查询控制操作历史

**接口路径：** `GET /devices/:deviceId/control-logs`

**功能描述：** 查询设备的控制操作历史记录

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**查询参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20，最大100 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "logs": [
      {
        "id": 12345,
        "deviceId": "lamp_001",
        "command": "on",
        "status": "success",
        "operatorId": 100,
        "operatorName": "张三",
        "requestTime": "2026-06-30T10:00:00Z",
        "responseTime": "2026-06-30T10:00:02Z",
        "resultMessage": "开灯成功"
      },
      {
        "id": 12344,
        "deviceId": "lamp_001",
        "command": "off",
        "status": "failed",
        "operatorId": 100,
        "operatorName": "张三",
        "requestTime": "2026-06-30T09:50:00Z",
        "responseTime": "2026-06-30T09:50:10Z",
        "resultMessage": "控制超时"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

## 5. 告警管理接口

### 5.1 查询告警列表

**接口路径：** `GET /alarms`

**功能描述：** 查询告警记录列表

**权限要求：** 管理员、市政人员

**查询参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| status | string | 否 | 告警状态：active/resolved，默认all |
| alarmType | string | 否 | 告警类型：offline/control_failed/frequent_switch |
| alarmLevel | string | 否 | 告警等级：low/medium/high |
| deviceId | string | 否 | 筛选指定设备 |
| startTime | string | 否 | 开始时间 |
| endTime | string | 否 | 结束时间 |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "alarms": [
      {
        "id": 1001,
        "deviceId": "lamp_001",
        "deviceName": "路灯001",
        "alarmType": "offline",
        "alarmLevel": "high",
        "status": "active",
        "message": "设备离线超过6小时",
        "createdAt": "2026-06-30T04:00:00Z",
        "handledAt": null,
        "handlerId": null,
        "handlerName": null
      },
      {
        "id": 1000,
        "deviceId": "lamp_002",
        "deviceName": "路灯002",
        "alarmType": "control_failed",
        "alarmLevel": "medium",
        "status": "resolved",
        "message": "控制指令执行失败",
        "createdAt": "2026-06-30T09:00:00Z",
        "handledAt": "2026-06-30T09:30:00Z",
        "handlerId": 100,
        "handlerName": "张三"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3
    },
    "statistics": {
      "activeCount": 12,
      "resolvedCount": 33,
      "highLevelCount": 3,
      "mediumLevelCount": 8,
      "lowLevelCount": 1
    }
  }
}
```

---

### 5.2 查询告警详情

**接口路径：** `GET /alarms/:alarmId`

**功能描述：** 查询指定告警的详细信息

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| alarmId | number | 是 | 告警ID |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "deviceId": "lamp_001",
    "deviceName": "路灯001",
    "alarmType": "offline",
    "alarmLevel": "high",
    "status": "active",
    "message": "设备离线超过6小时",
    "createdAt": "2026-06-30T04:00:00Z",
    "handledAt": null,
    "handlerId": null,
    "handlerName": null,
    "history": [
      {
        "level": "high",
        "message": "设备离线超过6小时",
        "timestamp": "2026-06-30T10:00:00Z"
      },
      {
        "level": "medium",
        "message": "设备离线超过1小时",
        "timestamp": "2026-06-30T05:00:00Z"
      },
      {
        "level": "low",
        "message": "设备离线",
        "timestamp": "2026-06-30T04:00:00Z"
      }
    ]
  }
}
```

**错误响应：**

404 - 告警不存在
```json
{
  "code": 404,
  "message": "告警记录不存在",
  "data": null
}
```

---

### 5.3 标记告警已处理

**接口路径：** `PUT /alarms/:alarmId/resolve`

**功能描述：** 标记告警为已处理状态

**权限要求：** 管理员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| alarmId | number | 是 | 告警ID |

**请求体：**
```json
{
  "note": "已现场检修完成"  // 可选的处理备注
}
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "告警已标记为已处理",
  "data": {
    "id": 1001,
    "status": "resolved",
    "handledAt": "2026-06-30T10:30:00Z",
    "handlerId": 100,
    "handlerName": "张三"
  }
}
```

---

## 6. 数据统计接口

### 6.1 获取设备运行统计

**接口路径：** `GET /devices/:deviceId/statistics`

**功能描述：** 获取设备的运行统计数据

**权限要求：** 管理员、市政人员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**查询参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| range | string | 否 | 时间范围：7d/30d，默认7d |

**成功响应：** 200
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "deviceId": "lamp_001",
    "range": "7d",
    "statistics": {
      "onlineRate": 98.5,              // 在线率（%）
      "totalOnlineHours": 165.6,       // 在线时长（小时）
      "totalOfflineHours": 2.4,        // 离线时长（小时）
      "controlSuccessRate": 99.2,      // 控制成功率（%）
      "totalControlCount": 125,        // 总控制次数
      "avgLightIntensity": 245.8,      // 平均光照强度
      "maxLightIntensity": 850,        // 最大光照强度
      "minLightIntensity": 50          // 最小光照强度
    }
  }
}
```

---

### 6.2 导出历史数据

**接口路径：** `POST /devices/:deviceId/export`

**功能描述：** 导出设备历史数据为CSV文件

**权限要求：** 管理员

**路径参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| deviceId | string | 是 | 设备ID |

**请求体：**
```json
{
  "dataType": "light",  // "light"=光照数据, "control"=控制日志
  "startTime": "2026-06-01T00:00:00Z",
  "endTime": "2026-06-30T23:59:59Z",
  "format": "csv"  // 目前只支持csv
}
```

**成功响应：** 200
```json
{
  "code": 200,
  "message": "导出任务已创建",
  "data": {
    "taskId": "export_12345",
    "status": "processing",
    "estimatedTime": 30  // 预计完成时间（秒）
  }
}
```

**查询导出任务状态：** `GET /export-tasks/:taskId`

**下载文件：** `GET /export-tasks/:taskId/download`

---

## 7. 系统健康检查接口

### 7.1 健康检查

**接口路径：** `GET /health`

**功能描述：** 检查服务健康状态

**权限要求：** 无（公开接口）

**成功响应：** 200
```json
{
  "code": 200,
  "message": "healthy",
  "data": {
    "status": "up",
    "timestamp": "2026-06-30T10:30:00Z",
    "services": {
      "database": "up",
      "redis": "up",
      "mqtt": "up"
    }
  }
}
```

---

## 📝 附录

### A. 告警类型枚举
| 值 | 说明 |
|----|------|
| offline | 设备离线 |
| control_failed | 控制失败 |
| frequent_switch | 频繁开关 |

### B. 告警等级枚举
| 值 | 说明 |
|----|------|
| low | 低级告警 |
| medium | 中级告警 |
| high | 高级告警 |

### C. 设备控制模式枚举
| 值 | 说明 |
|----|------|
| auto | 自动模式（执行光照阈值联动） |
| manual | 手动模式（不执行自动规则） |

### D. 数据粒度枚举
| 值 | 说明 |
|----|------|
| raw | 原始采样数据 |
| hourly | 小时级聚合数据 |

---

## 🔄 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2026-06-30 | 初始版本 | 任务3团队 |

---

## 📮 反馈与建议

如有问题或建议，请联系任务3负责人。
