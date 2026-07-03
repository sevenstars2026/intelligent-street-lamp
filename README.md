# 智慧路灯管理系统

**项目状态：** MVP 运行中 | **最后更新：** 2026-07-03

基于 Vue 3 + Express + MySQL + MQTT 的智能路灯 IoT 管理平台，支持远程开关控制、光照数据采集、设备监控和 AI 智能问答。

---

## 系统架构

```
┌──────────────────────┐     ┌──────────────────────┐
│   Vue 3 前端 (:5173)  │────▶│  Express 后端 (:3000)  │
│   Vite + ECharts      │     │  TypeScript           │
│   Axios + 响应拦截     │     │  Mock JWT 认证         │
└──────────────────────┘     └──────────┬───────────┘
                                        │
                           ┌────────────┼────────────┐
                           ▼            ▼            ▼
                      ┌─────────┐ ┌─────────┐ ┌─────────┐
                      │  MySQL  │ │  MQTT   │ │ MaxKB AI│
                      │ 远程DB  │ │ Broker  │ │ :8080   │
                      └─────────┘ └────┬────┘ └─────────┘
                                       │
                                  ┌────▼────┐
                                  │ 硬件设备  │
                                  │ lamp_xxx │
                                  └─────────┘
```

---

## 功能概览

| 页面 | 功能 | 状态 |
|------|------|------|
| 数据总览 | 设备状态卡片、7天光照趋势图、设备列表 | ✅ |
| 设备控制 | 单灯开关、批量控制、阈值/模式设置 | ✅ |
| 设备管理 | 设备只读列表、独立阈值和模式弹窗 | ✅ |
| 告警日志 | 占位（后续版本开放） | ⏳ |
| 控制日志 | 按设备查询控制指令历史 | ✅ |
| 历史数据 | 按时间范围查询光照数据曲线 | ✅ |
| 统计概览 | 设备统计（总数/在线/模式/亮灯） | ✅ |
| AI 问答 | MaxKB 浮窗对话（全局右下角 💬 按钮） | ✅ |

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- 可访问远程 MySQL（47.108.58.107）和 MQTT Broker

### 1. 启动后端

```bash
cd task3-backend
cp .env.example .env   # 编辑 .env 配置数据库和MQTT
npm install
npm run dev             # → http://localhost:3000
```

### 2. 启动前端

```bash
cd task4-frontend
npm install
npm run dev             # → http://localhost:5173
```

前端通过 Vite proxy 将 `/api` 请求代理到 `localhost:3000`。

### 3. 登录

| 账号 | 密码 | 可选角色 |
|------|------|----------|
| `admin` | `123456` | 市政人员 / 管理员 |
| `manager` | `123456` | 仅管理员 |

---

## API 接口（11 个 MVP）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/devices` | 获取所有设备 |
| GET | `/api/devices/:id` | 获取单个设备详情 |
| POST | `/api/devices/:id/control` | 控制单灯开关 |
| POST | `/api/devices/batch-control` | 批量控制 |
| GET | `/api/devices/:id/control-logs` | 控制日志 |
| GET | `/api/devices/:id/light-history` | 光照历史数据 |
| GET | `/api/devices/:id/threshold` | 获取阈值 |
| POST | `/api/devices/:id/threshold` | 设置阈值 |
| GET | `/api/devices/:id/mode` | 获取控制模式 |
| PUT | `/api/devices/:id/mode` | 切换自动/手动模式 |

详见 [任务3_API接口设计文档.md](任务3_API接口设计文档.md)

---

## 项目结构

```
intelligent-street-lamp/
├── README.md                        # 本文件
├── 任务3_API接口设计文档.md          # API 接口文档（11 个 MVP）
├── 测试报告.md                       # 测试结果
│
├── task4-frontend/                  # Vue 3 前端
│   ├── src/
│   │   ├── App.vue                  # 主组件（全部页面）
│   │   ├── main.js                  # 入口
│   │   └── utils/api.ts            # Axios API 封装（11 个函数）
│   ├── vite.config.js              # Vite + API 代理配置
│   └── package.json
│
└── task3-backend/                   # Express 后端
    ├── src/
    │   ├── index.ts                 # 主入口，Express 启动
    │   ├── config/database.ts       # MySQL 连接池
    │   ├── types/database.types.ts  # TypeScript 数据模型
    │   ├── controllers/             # 请求处理
    │   ├── services/                # 业务逻辑 + MQTT 订阅
    │   ├── routes/                  # 路由定义
    │   └── mock/mock-mqtt.ts        # MQTT 客户端
    ├── .env                         # 环境配置（不入库）
    ├── .env.example                 # 环境配置模板
    └── package.json
```

---

## 数据流

```
硬件 ──MQTT──▶ devices/{id}/data      → light_data 表（光照记录）
硬件 ──MQTT──▶ devices/{id}/heartbeat  → devices 表（在线状态+心跳）
前端 ──HTTP──▶ POST /devices/{id}/control
              → 后端 ──MQTT──▶ devices/{id}/control → 硬件执行
              → 后端 ◀──MQTT── devices/{id}/control/response
              → control_logs 表（操作记录）
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (Composition API) |
| 构建工具 | Vite 5 |
| UI 图表 | ECharts 5 |
| HTTP 客户端 | Axios |
| 后端框架 | Express 4 + TypeScript |
| 数据库 | MySQL (mysql2/promise) |
| 消息协议 | MQTT (mqtt.js) |
| AI 对话 | MaxKB (iframe 嵌入) |

---

## 文档导航

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目总览 |
| [task4-frontend/README.md](task4-frontend/README.md) | 前端开发/使用完整指南 |
| [任务3_API接口设计文档.md](任务3_API接口设计文档.md) | 11 个 MVP API 完整规范 |
| [测试报告.md](测试报告.md) | 接口测试结果 |
| [task3-backend/README.md](task3-backend/README.md) | 后端代码说明 |
