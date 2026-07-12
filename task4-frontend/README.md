# 智慧路灯管理系统 — 前端使用指南

Vue 3 智慧路灯管理平台完整使用文档，涵盖环境搭建、技术架构、页面功能和 API 对接。

---

## 1. 环境搭建

### 1.1 要求

- Node.js >= 18
- npm >= 9
- 后端服务运行中（默认 `http://localhost:3000`）

### 1.2 安装启动

```bash
cd task4-frontend
npm install
npm run dev
```

启动后访问 `http://localhost:5173`，Vite dev server 支持 HMR 热更新。

### 1.3 依赖

| 依赖 | 版本 | 用途 |
| ---- | ---- | ---- |
| vue | ^3.4 | 框架（Composition API + `<script setup>`） |
| vue-router | ^4.6 | 客户端路由（lazy-loaded routes） |
| echarts | ^5.5 | 光照趋势折线图 |
| axios | ^1.6 | HTTP 请求 + 响应拦截 |
| vite | ^5.1 | 开发/构建（HMR + proxy） |
| @vitejs/plugin-vue | ^5.0 | Vite Vue SFC 插件 |

### 1.4 代理配置

`vite.config.js` 将 `/api` 请求代理到后端：

```javascript
server: {
  host: '0.0.0.0',
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

**如果后端不在本机**，修改 `target` 为实际地址。

---

## 2. 技术架构

### 2.1 架构图

```
src/
├── main.js                      # Vue 挂载入口
├── App.vue                      # 壳组件（主题提供 + 路由出口 + 全局刷新）
├── style.css                    # 设计系统（CSS 自定义属性 + 深/浅主题 + 全局样式）
├── router/
│   └── index.js                 # 8 条路由（全部 lazy-loaded）+ 导航守卫
├── composables/                 # 模块级单例（无 Pinia）
│   ├── useTheme.js              # 主题切换 + localStorage 持久化
│   ├── useDevices.js            # 设备数据 + 光照历史 + 图表数据构建
│   ├── useAlarms.js             # 告警数据 + 状态管理
│   └── useToast.js              # Toast 通知队列
├── components/                  # 共享组件（7 个）
│   ├── TopNav.vue               # 顶栏导航 + 主题切换 + 用户信息
│   ├── StatCard.vue             # 统计卡片（数字滚动动画）
│   ├── LightChart.vue           # ECharts 折线图（主题感知）
│   ├── DeviceTable.vue          # 设备状态表格（可复用）
│   ├── ModalOverlay.vue         # 通用弹窗容器
│   ├── ToastMessage.vue         # Toast 通知渲染
│   └── LampIllustration.vue     # SVG 路灯示意图
├── views/                       # 页面组件（8 个）
│   ├── LoginPage.vue            # 登录页
│   ├── DashboardPage.vue        # 数据总览
│   ├── ControlPage.vue          # 设备控制
│   ├── HistoryPage.vue          # 历史数据
│   ├── AlarmPage.vue            # 告警日志
│   ├── ReviewPage.vue           # 上报审核
│   ├── FaultReportsPage.vue     # 故障上报管理
│   └── QAPage.vue               # AI 智能问答
└── utils/
    └── api.ts                   # Axios 封装（~20 个 API 函数）
```

### 2.2 设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 状态管理 | Composables（模块级 ref） | 轻量、无需额外依赖（无 Pinia） |
| 路由 | Vue Router（lazy-loaded） | 代码分割 + 路由守卫 |
| CSS 方案 | CSS 自定义属性 | 深/浅主题切换零 JS 开销 |
| 图表 | ECharts v5 `category` 轴 | 时间分桶 + 稀疏标签 |
| 数据流 | 真实 API → 降级 mock | 后端不可用时仍可展示 |

### 2.3 设计系统

完整的设计系统定义在 `src/style.css`，使用 CSS 自定义属性实现深/浅双主题：

- **Theme 根变量**：`:root`（深色主题）和 `[data-theme="light"]`（浅色主题）
- **颜色令牌**：`--color-brand`, `--color-bg-primary`, `--color-text-primary` 等
- **字体系统**：Space Grotesk（标题）+ DM Sans（正文）+ Fira Code（等宽数字）
- **动效**：`fade-in-up`, `stagger-children`, `glass-card`, `glow-border`, 涟漪, 骨架屏
- **主题切换**：点击 TopNav 切换按钮 → `toggleTheme()` → 更新 `<html data-theme="…">`

---

## 3. 路由与导航

### 3.1 路由表

| 路径 | 名称 | 组件 | 说明 |
|------|------|------|------|
| `/login` | Login | `LoginPage.vue` | 登录页（无导航栏） |
| `/dashboard` | Dashboard | `DashboardPage.vue` | 数据总览（默认首页） |
| `/control` | Control | `ControlPage.vue` | 设备控制 |
| `/history` | History | `HistoryPage.vue` | 历史数据 |
| `/alarms` | Alarms | `AlarmPage.vue` | 告警日志 |
| `/review` | Review | `ReviewPage.vue` | 上报审核（municipal 可见） |
| `/fault-reports` | FaultReports | `FaultReportsPage.vue` | 故障上报管理 |
| `/qa` | QA | `QAPage.vue` | AI 智能问答 |
| `/` | — | → 重定向到 `/dashboard` | — |

### 3.2 导航守卫

```
未登录（localStorage 无 'loggedIn'）→ 强制跳转 /login
已登录（localStorage 有 'loggedIn'）→ 正常访问
```

### 3.3 页面间通信

- `App.vue` 通过 `provide('theme', theme)` 向所有子组件注入当前主题
- 全局刷新：`App.vue` dispatch `CustomEvent('global-refresh')` → 各页面监听并重新拉取数据

---

## 4. 登录

系统使用本地 Mock 认证，不依赖后端登录接口。

| 账号 | 密码 | 可选角色 |
|------|------|----------|
| `admin` | `123456` | 市政人员 / 管理员 |
| `manager` | `123456` | 仅管理员 |

登录成功后写入 `localStorage`：`loggedIn`, `username`, `nickname`, `role`, `avatar`，然后 `router.push('/dashboard')`。

---

## 5. 页面说明

### 5.1 数据总览（DashboardPage）

- **顶部统计卡片**（`StatCard`）：亮灯设备数、在线设备数、离线告警数、控制模式 — 从 `useDevices()` 实时计算
- **离线条告警**：离线设备名称列表 + 可关闭提醒条
- **7 天光照趋势图**（`LightChart`）：
  - 调用 `loadLightHistory(deviceId, '7d')` → `buildChartData(records, '7d')`
  - 1 天/桶、每桶 5 个数据点、标签步长 1 → 满数据 7 个标签/35 个数据点
  - 无后端数据时降级为 7 个随机 mock 数据点
- **设备状态列表**（`DeviceTable`）：ID、名称、在线状态、开关状态、最后心跳

### 5.2 设备控制（ControlPage）

- **单灯控制**：选择设备 → 点击「开灯」/「关灯」→ `controlDevice()` → 后端通过 MQTT 下发指令
- **批量控制**：勾选多个设备 → `batchControl()` 并发下发
- **阈值设置**：`getDeviceThreshold()` 查询 → `setDeviceThreshold()` 保存
- **模式切换**：`getDeviceMode()` 查询 → `setDeviceMode()` 切换 auto/manual
- 弹窗使用 `ModalOverlay` 组件

### 5.3 历史数据（HistoryPage）

- **筛选栏**：设备选择器（`<select>`）+ 预置时间范围（24h / 7d / 30d）
- **ECharts 折线图**：
  - 从 `getDeviceLightHistory()` 获取后端真实数据
  - `buildChartData(records, range)` 构建时间分桶数据
  - 时间分桶策略见下方表格
  - 无数据时降级为 `generateMockLightData()` 模拟值
- **统计摘要条**：平均光照 / 峰值 / 谷值（带数字滚动动画）

#### 图表数据构建策略（`buildChartData`）

| 范围 | 桶大小 | 标签间隔 | 每桶点数 | 满数据时总点数 | 标签数 | 标签格式 |
| ---- | ------ | :---: | :---: | :---: | :---: | -------- |
| 24h | 1 小时 | 每 2 桶 | 5 | 24×5=**120** | 12 | `08:00` |
| 7d | 1 天 | 每桶 | 5 | 7×5=**35** | 7 | `7/3` |
| 30d | 1 天 | 每 5 桶 | 6 | 30×6=**180** | 6 | `7/3` |

关键特性：

- **数据点密、标签疏**：每桶 5–6 个子数据点，只有中间点显示标签
- **不补空白**：只展示有数据的桶，数据稀疏时桶少
- **标签不重复**：时间桶作为 key，每个桶一个唯一标签
- **稀疏容错**：桶数 ≤ 标签间隔时，所有桶都显示标签

### 5.4 告警日志（AlarmPage）

- **告警列表**：`alarmId`、设备名、等级（4 色标签）、类型、状态、描述、时间
- **等级标签**：critical(红) / high(橙) / medium(黄) / low(蓝)
- **状态**：待处理（橙色） / 已解决（绿色）
- **自动刷新**：每 60 秒自动拉取（`setInterval` + `onUnmounted` 清理）
- **加载中**：骨架屏；**空状态**："暂无告警，所有设备运行正常"
- **数据来源**：`useAlarms().loadAlarms()` → `getAlarms()` API

---

## 6. Composables 模块

### 6.1 useDevices

管理所有设备和光照历史数据，导出函数：

| 导出 | 类型 | 说明 |
|------|------|------|
| `devices` | `Ref<Array>` | 设备列表（模块级单例） |
| `onlineCount` / `offlineCount` | `ComputedRef<Number>` | 在线/离线统计 |
| `litCount` / `autoModeCount` | `ComputedRef<Number>` | 亮灯/自动模式统计 |
| `loadDevices()` | `Async Function` | 拉取设备列表并标准化 |
| `loadLightHistory(deviceId, range)` | `Async Function` | 拉取光照历史，自动计算 start/end |
| `normalizeLightRecord(r)` | `Function` | 标准化单条记录 → `{ time, value }` |
| `buildChartData(records, range)` | `Function` | 时间分桶 + 采点 → `{ labels, values }` |
| `generateMockLightData(points)` | `Function` | 随机模拟数据（降级用） |

### 6.2 useAlarms

管理告警数据：

| 导出 | 类型 | 说明 |
|------|------|------|
| `alarms` | `Ref<Array>` | 告警列表 |
| `loading` / `error` | `Ref` | 加载/错误状态 |
| `loadAlarms(params?)` | `Async Function` | 拉取告警列表（`getAlarms` API） |
| `resolveAlarm(alarmId)` | `Async Function` | 处理告警（`resolveAlarm` API） |

### 6.3 useTheme

```javascript
const { theme, toggleTheme } = useTheme()
// theme: Ref<'dark' | 'light'>
// toggleTheme(): 切换主题 + 写 localStorage + 监听系统 prefers-color-scheme
```

### 6.4 useToast

```javascript
const { toasts, showToast } = useToast()
// showToast(message, type) — type: 'success' | 'error' | 'info'
// 自动消失，3 秒
```

---

## 7. API 对接指南

### 7.1 Axios 封装（`api.ts`）

14 个 API 函数，统一在 `api.ts` 中定义：

```typescript
import {
  getDevices, getDeviceById,
  controlDevice, batchControl,
  getDeviceThreshold, setDeviceThreshold,
  getDeviceMode, setDeviceMode,
  getControlLogs, getDeviceLightHistory,
  getHealth,
  getAlarms, getAlarm, resolveAlarm     // 告警（v1.1+）
} from '@/utils/api'
```

### 7.2 响应拦截器

Axios 实例配置了响应拦截器：

- `code === 200`：解包返回 `res`（`{ code, message, data }`）
- `code !== 200`：抛出 `Error(res.message)`
- 网络错误：提取 `error.response?.data?.message`
- 超时：10 秒

**重要**：调用方拿到的已经是拦截后的结果，访问 `.data` 时实际是 API 返回的 `data` 字段。

### 7.3 API 对应表

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getDevices()` | GET | `/devices` | 获取所有设备 |
| `getDeviceById(id)` | GET | `/devices/:id` | 单个设备详情 |
| `controlDevice(id, cmd)` | POST | `/devices/:id/control` | 开关灯，body: `{ command }` |
| `batchControl(ids, cmd)` | POST | `/devices/batch-control` | 批量控制 |
| `getDeviceThreshold(id)` | GET | `/devices/:id/threshold` | 获取阈值 |
| `setDeviceThreshold(id, data)` | POST | `/devices/:id/threshold` | 设置阈值 |
| `getDeviceMode(id)` | GET | `/devices/:id/mode` | 获取模式 |
| `setDeviceMode(id, mode)` | PUT | `/devices/:id/mode` | 切换模式 |
| `getControlLogs(id, params)` | GET | `/devices/:id/control-logs` | 控制日志 |
| `getDeviceLightHistory(id, params)` | GET | `/devices/:id/light-history` | 光照历史 |
| `getHealth()` | GET | `/health` | 健康检查 |
| `getAlarms(params?)` | GET | `/alarms` | 告警列表（过滤: level/status） |
| `getAlarm(alarmId)` | GET | `/alarms/:alarmId` | 单个告警详情 |
| `resolveAlarm(alarmId)` | PUT | `/alarms/:alarmId/resolve` | 标记告警已解决 |

### 7.4 后端响应格式

所有 API 返回统一结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 具体数据
  }
}
```

**光照历史数据的 `data` 结构**（关键）：

```json
{
  "code": 200,
  "data": {
    "deviceId": "lamp_001",
    "records": [
      { "lightIntensity": 420, "timestamp": "2026-07-03T12:00:00.000Z" },
      ...
    ],
    "count": 150,
    "aggregation": "raw"
  }
}
```

**告警数据的 `data` 结构**：

```json
{
  "code": 200,
  "data": {
    "alarms": [
      { "alarmId": "ALM-001", "deviceName": "路灯A1", "alarmLevel": "high", "alarmType": "offline", "status": "active", "message": "...", "createdAt": "..." }
    ],
    "pagination": { ... }
  }
}
```

### 7.5 数据标准化

**设备记录**（`normalizeDevice`）：

```javascript
function normalizeDevice(d) {
  return {
    ...d,
    online: d.status === 'online',   // 类型转换
    deviceId: d.id,                   // 别名
    deviceName: d.name,              // 别名
  }
}
```

**光照记录**（`normalizeLightRecord`）：

```javascript
function normalizeLightRecord(r) {
  return {
    time: r.timestamp || r.time,                     // 后端字段: timestamp
    value: r.lightIntensity ?? r.value ?? 0,         // 后端字段: lightIntensity
  }
}
```

### 7.6 在 Vue 组件中调用

```javascript
// 获取设备列表
import { useDevices } from '@/composables/useDevices.js'
const { devices, loadDevices } = useDevices()
await loadDevices()

// 获取光照历史并构建图表数据
import { loadLightHistory, normalizeLightRecord, buildChartData } from '@/composables/useDevices.js'
const raw = await loadLightHistory('lamp_001', '7d')
const list = raw.map(normalizeLightRecord)
const { labels, values } = buildChartData(list, '7d')

// 获取告警列表
import { useAlarms } from '@/composables/useAlarms.js'
const { alarms, loading, loadAlarms } = useAlarms()
await loadAlarms()
```

---

## 8. 常见问题

### Q1: npm install 报错

确保 Node.js 版本 >= 18，删除 `node_modules` 重试：

```bash
rm -rf node_modules package-lock.json
npm install
```

### Q2: 前端启动后页面空白

检查后端是否运行：`curl http://localhost:3000/api/health`。前端所有数据依赖后端 API。

### Q3: 设备下拉框为空

后端未运行或数据库无设备数据。确认后端已启动且 MySQL 连接正常。

### Q4: 控制开关灯无响应

- 检查 MQTT Broker 连接状态（看后端日志）
- 当前 `.env` 中 `MQTT_SIMULATE_HARDWARE=false`，需要真实硬件响应
- 超时时间为 10 秒

### Q5: 图表无数据/只有模拟数据

- 历史数据从 `light_data` 表读取，确认硬件正在上报光照数据
- 打开浏览器 DevTools → Network，检查 `/api/devices/:id/light-history` 返回的 `data.records` 是否为空数组
- 数据显示但很少：数据稀疏时图表只显示有数据的时间桶，不会补空白

### Q6: 24 小时图表没有横轴时间刻度

确认 `axisLabel.interval` 函数配置正确（已在 `HistoryPage.vue` 中处理）。如果仍无效，检查 ECharts 实例初始化时机。

### Q7: 跨域问题

开发环境下 Vite proxy 已处理 `/api` 代理，不跨域。生产环境需配置 Nginx 反向代理或后端 CORS。

### Q8: 主题切换不生效

`html` 元素上的 `data-theme` 属性驱动全局 CSS 变量。确认 `useTheme.js` 中的 `watch` 正常工作，且 `localStorage` 中 `theme` 键值正确。

---

## 9. 相关文档

| 文档 | 内容 |
|------|------|
| [项目概述](../memory/project-overview.md) | 整体架构、技术栈和当前状态 |
| [API 接口设计 v3.0](../memory/api-design-v3.md) | MVP 后端 14 个 REST API 完整列表 |
| [前端 MVP 适配](../memory/frontend-adaptation.md) | 前端适配的关键决策和模式 |
| [项目计划](../memory/project-plan.md) | 完整实施计划和里程碑 |
| [../task3-backend/README.md](../task3-backend/README.md) | 后端代码说明 |
