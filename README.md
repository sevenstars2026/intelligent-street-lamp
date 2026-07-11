# 智慧路灯管理系统

**项目状态：** MVP 运行中 | **最后更新：** 2026-07-10

基于 Vue 3 + Express + MySQL + MQTT 的智能路灯 IoT 管理平台，支持远程开关控制、光照数据采集、阈值/模式配置同步、硬件本地自动控制、设备监控、景区游客导览和 AI 智能问答。

---

## 系统架构

```
                        ┌─────────────────────────┐
                        │    Express 后端 :3000     │
                        │    TypeScript            │
                        │    Mock JWT 认证          │
                        └──────┬───────┬──────────┘
                               │       │
              ┌────────────────┘       └────────────────┐
              ▼                                         ▼
   ┌──────────────────┐                    ┌──────────────────┐
   │ task4-frontend   │                    │ tourist-frontend │
   │ 管理端 (PC)       │                    │ 游客端 (手机)     │
   │ :5173            │                    │ :5174            │
   │                  │                    │                  │
   │ · 设备仪表盘     │                    │ · Leaflet 地图   │
   │ · 设备控制       │                    │ · 游览路线       │
   │ · 告警管理       │                    │ · 拍照点         │
   │ · 故障上报管理   │                    │ · 表演活动       │
   │ · 数据历史       │                    │ · 故障上报       │
   └──────────────────┘                    └──────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
          ┌─────────┐    ┌─────────┐    ┌─────────┐
          │  MySQL  │    │  MQTT   │    │ MaxKB AI│
          │ 远程DB  │    │ Broker  │    │ :8080   │
          └─────────┘    └────┬────┘    └─────────┘
                              │
                         ┌────▼────┐
                         │ 硬件设备  │
                         │ lamp_xxx │
                         └─────────┘
```

**一个后端，两个前端。** 管理端（PC 浏览器）和游客端（手机扫码）通过 Vite proxy 各自代理 `/api` 到同一个后端。

---

## 功能概览

### 管理端（task4-frontend :5173）

| 页面 | 功能 | 状态 |
|------|------|------|
| 数据总览 | 设备状态卡片、7天光照趋势图、设备列表 | ✅ |
| 设备控制 | 单灯开关、批量控制、阈值/模式设置 | ✅ |
| 设备管理 | 设备只读列表、独立阈值和模式弹窗 | ✅ |
| 告警日志 | 活跃/已处理告警查询、分页、告警处理（admin+municipal） | ✅ |
| 故障上报管理 | 游客上报列表、照片预览、详情弹窗、处理（admin+municipal） | ✅ |
| 历史数据 | 按时间范围查询光照数据曲线（24h/7d/30d） | ✅ |
| 统计概览 | 设备统计（总数/在线/模式/亮灯） | ✅ |
| AI 问答 | MaxKB 浮窗对话（全局右下角 💬 按钮） | ✅ |

### 游客端（tourist-frontend :5174）

| 页面 | 功能 | 状态 |
|------|------|------|
| 地图主页 | Leaflet 地图、路灯标记、路线/拍照点/活动筛选、熄灯提醒 | ✅ |
| 游览路线 | 3 条预定义路线，三级回退路径（高德→OSRM→本地） | ✅ |
| 拍照点 | 网格展示、详情页（图片轮播+攻略） | ✅ |
| 表演活动 | 活动列表、详情页、倒计时 | ✅ |
| 故障上报 | 表单（姓名+手机+描述）+ 拍照上传（最多 3 张） | ✅ |
| QR 码定位 | 扫码自动定位路灯，弹出周边推荐 | ✅ |

---

## 自动控制说明

自动控制决策由硬件本地完成，后端不根据光照值直接开关灯。

**后端职责：**
- 管理 `devices.mode` 和 `thresholds` 阈值配置
- 用户修改模式或阈值后，通过 MQTT 推送 `devices/{id}/config`
- 响应硬件 `devices/{id}/config/request` 配置请求
- 接收硬件 `devices/{id}/auto-action`，更新设备状态并写入控制日志
- 接收 `devices/{id}/data` 光照数据，仅写入 `light_data`

**硬件职责：**
- 本地保存模式和阈值配置
- 在 `auto` 模式下本地读取光照、比对阈值并执行开关灯
- 自动开关后上报 `auto-action`，供后端记录

> ⚠️ **已知 BUG**：在 auto 模式下手动控制设备后，模式不会自动切换为 manual，导致下一个采样周期自动逻辑覆盖用户操作。详见 [docs/BUG-自动模式手动控制逻辑修复要求.md](docs/BUG-自动模式手动控制逻辑修复要求.md)。

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- 可访问远程 MySQL（47.108.58.107）和 MQTT Broker

### 1. 启动后端

```bash
cd task3-backend
cp .env.example .env   # 编辑 .env 配置数据库和 MQTT
npm install
npm run dev            # → http://localhost:3000
```

### 2. 启动管理端

```bash
cd task4-frontend
npm install
npm run dev            # → http://localhost:5173
```

### 3. 启动游客端

```bash
cd tourist-frontend
npm install
echo VITE_AMAP_KEY=8a1909661c151543bd2937d9603540cf > .env
npm run dev            # → http://localhost:5174
```

两个前端均通过 Vite proxy 将 `/api` 请求代理到 `localhost:3000`。游客端额外代理 `/uploads` 和 `/amap-api`。

### 4. 登录

| 账号 | 密码 | 可选角色 |
|------|------|----------|
| `admin` | `123456` | 市政人员 / 管理员 |
| `zhanggong` | `123456` | 市政人员（张工） |
| `manager` | `123456` | 仅管理员 |

游客端无需登录，导览功能公开访问。上报时在表单内填写姓名和手机号。

### 5. 手机端访问

```bash
# 查看本机 IP
ipconfig
# 手机浏览器访问 http://<你的IP>:5174
# 如果打不开，以管理员身份运行 PowerShell：
netsh advfirewall firewall add rule name="Vite 5174" dir=in action=allow protocol=TCP localport=5174
```

---

## API 接口（~21 个）

### 设备管理（11 个）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/devices` | 获取所有设备 |
| GET | `/api/devices/:deviceId` | 获取单个设备详情 |
| POST | `/api/devices/:deviceId/control` | 控制单灯开关 |
| POST | `/api/devices/batch-control` | 批量控制 |
| GET | `/api/devices/:deviceId/control-logs` | 控制日志 |
| GET | `/api/devices/:deviceId/light-history` | 光照历史数据 |
| GET | `/api/devices/:deviceId/threshold` | 获取阈值 |
| POST | `/api/devices/:deviceId/threshold` | 设置阈值 |
| GET | `/api/devices/:deviceId/mode` | 获取控制模式 |
| PUT | `/api/devices/:deviceId/mode` | 切换自动/手动模式 |

### 告警系统（3 个）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/alarms` | 查询告警列表（支持 level/status 筛选 + 分页） |
| GET | `/api/alarms/:alarmId` | 查询单条告警详情 |
| PUT | `/api/alarms/:alarmId/resolve` | 处理告警 |

### 景区数据（4 个）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scenic/routes` | 游览路线列表（含 lampIds、highlights） |
| GET | `/api/scenic/spots` | 拍照点列表（含 bestTime、tags） |
| GET | `/api/scenic/events` | 表演活动列表（含 countdown） |
| GET | `/api/scenic/lamps` | 路灯位置列表（含 SVG 坐标） |

### 故障上报（4 个）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/reports` | 游客提交故障上报（multipart，含图片） |
| GET | `/api/reports` | 管理员查询上报列表（筛选+分页） |
| GET | `/api/reports/:id` | 查询单条上报详情 |
| PUT | `/api/reports/:id/resolve` | 管理员处理上报 |

所有接口返回统一格式 `{ code: 200, message: 'success', data: ... }`。

---

## 项目结构

```
intelligent-street-lamp/
├── README.md                              # 本文件（项目总览）
├── 任务3_API接口设计文档.md                # API 接口文档
├── 自动控制功能接口规范.md                  # 自动控制规范
├── 测试报告.md                             # 接口测试结果
├── docs/                                  # 设计文档
│   ├── 景区游客端-计划书.md                # 游客端整体计划
│   ├── 景区游客端-后端功能设计.md           # 5 个新 API + 图片上传
│   ├── 景区游客端-前端功能设计.md           # 独立 SPA 功能设计
│   ├── 管理员端-故障上报查看-设计规划.md     # 故障上报管理页设计
│   ├── 路灯间路线显示-技术分析.md           # Leaflet + 三级回退策略
│   ├── BUG-自动模式手动控制逻辑修复要求.md   # P1 待修复 BUG
│   └── qr-codes/                          # 路灯 QR 码图片
│
├── task4-frontend/                        # Vue 3 管理端（PC）
│   ├── src/
│   │   ├── App.vue                        # 根组件（主题+路由出口+全局刷新）
│   │   ├── style.css                      # 暗色科技风设计系统
│   │   ├── router/index.js                # 5 条路由（含 /fault-reports）
│   │   ├── composables/                   # useDevices, useAlarms, useTheme, useToast
│   │   ├── components/                    # TopNav, StatCard, LightChart, DeviceTable 等
│   │   ├── views/                         # Dashboard, Control, History, Alarm, FaultReports
│   │   └── utils/api.ts                  # Axios 封装（17 个 API 函数）
│   ├── vite.config.js                     # :5173 + /api,/uploads proxy
│   └── README.md                          # 管理端完整使用文档
│
├── tourist-frontend/                      # Vue 3 游客端（手机）
│   ├── src/
│   │   ├── style.css                      # 暖橙金色设计系统
│   │   ├── router/index.js                # 7 条路由（无登录守卫）
│   │   ├── composables/                   # useScenic, useReport, useLampReminder, useToast
│   │   ├── components/                    # ScenicMap, LampPopup, BottomNav 等 11 个
│   │   ├── views/                         # Map, Routes, Spots, Events, Report 等 7 个
│   │   └── utils/api.ts                  # Axios 封装（7 个景区+上报 API）
│   ├── public/images/                     # 活动/拍照点图片
│   ├── vite.config.js                     # :5174 + /api,/uploads,/amap-api proxy
│   ├── .env                               # VITE_AMAP_KEY（不提交 Git）
│   └── README.md                          # 游客端完整使用文档
│
└── task3-backend/                         # Express 后端
    ├── src/
    │   ├── index.ts                       # 主入口（Express + 静态文件 + 中间件）
    │   ├── config/database.ts             # MySQL 连接池（utf8mb4）
    │   ├── types/                         # database.types.ts + scenic.types.ts
    │   ├── controllers/                   # device-control, alarm, scenic, report
    │   ├── services/                      # device-control, alarm, scenic, report, database
    │   ├── routes/                        # device-control, alarm, scenic, report
    │   └── mock/mock-mqtt.ts              # MQTT 客户端
    ├── uploads/                           # 图片上传目录（multer）
    ├── .env.example                       # 环境配置模板
    └── README.md                          # 后端代码说明
```

---

## 数据流

```
前端 ──HTTP──▶ POST/PUT threshold|mode
              → 后端写 MySQL
              → 后端 ──MQTT──▶ devices/{id}/config → 硬件更新本地配置

硬件 ──MQTT──▶ devices/{id}/config/request
              → 后端查询 MySQL
              → 后端 ──MQTT──▶ devices/{id}/config

硬件 ──MQTT──▶ devices/{id}/data       → light_data 表（仅记录光照）
硬件 ──MQTT──▶ devices/{id}/heartbeat  → devices 表（在线状态+心跳）
硬件 ──MQTT──▶ devices/{id}/auto-action
              → devices.current_state + control_logs（自动控制记录）

前端 ──HTTP──▶ POST /devices/{id}/control
              → 后端 ──MQTT──▶ devices/{id}/control
              → 硬件执行并回复 control/response
              → control_logs 表（手动控制记录）

游客 ──HTTP──▶ POST /api/reports (multipart)
              → fault_reports 表 + alarms 表（alarmType: fault_report）
              → 管理员在管理端查看和处理
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建工具 | Vite 5 |
| 管理端图表 | ECharts 5 |
| 游客端地图 | Leaflet v1.9 + 高德地图瓦片 |
| HTTP 客户端 | Axios |
| 后端框架 | Express 4 + TypeScript |
| 数据库 | MySQL 8 (mysql2/promise, utf8mb4) |
| 消息协议 | MQTT (mqtt.js) |
| 图片上传 | multer |
| AI 对话 | MaxKB (iframe 嵌入) |
| 路线规划 | 高德步行路径规划 API → OSRM → 本地途经点（三级回退） |

---

## 文档导航

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目总览（本文件） |
| [task4-frontend/README.md](task4-frontend/README.md) | 管理端开发/使用完整指南 |
| [tourist-frontend/README.md](tourist-frontend/README.md) | 游客端开发/使用完整指南 |
| [task3-backend/README.md](task3-backend/README.md) | 后端代码说明 |
| [任务3_API接口设计文档.md](任务3_API接口设计文档.md) | ~21 个 API 完整规范 |
| [自动控制功能接口规范.md](自动控制功能接口规范.md) | MQTT 消息架构和自动控制规范 |
| [docs/景区游客端-计划书.md](docs/景区游客端-计划书.md) | 游客端整体计划 |
| [docs/景区游客端-后端功能设计.md](docs/景区游客端-后端功能设计.md) | 后端景区 API 详细设计 |
| [docs/景区游客端-前端功能设计.md](docs/景区游客端-前端功能设计.md) | 游客端 SPA 功能设计 |
| [docs/管理员端-故障上报查看-设计规划.md](docs/管理员端-故障上报查看-设计规划.md) | 故障上报管理页设计 |
| [docs/路灯间路线显示-技术分析.md](docs/路灯间路线显示-技术分析.md) | Leaflet + 三级回退策略 |
| [docs/BUG-自动模式手动控制逻辑修复要求.md](docs/BUG-自动模式手动控制逻辑修复要求.md) | P1 待修复 BUG |
| [测试报告.md](测试报告.md) | 接口测试结果 |
