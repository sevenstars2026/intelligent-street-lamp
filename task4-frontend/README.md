# 智慧路灯管理系统 — 前端使用指南

Vue 3 智慧路灯管理平台完整使用文档，涵盖环境搭建、页面功能、API 对接和常见问题。

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

### 1.3 代理配置

`vite.config.js` 中将 `/api` 请求代理到后端：

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

| 层 | 技术 | 用途 |
|----|------|------|
| 框架 | Vue 3 (Composition API) | 组件逻辑 |
| 构建 | Vite 5 | 开发/打包 |
| 图表 | ECharts 5 | 光照趋势可视化 |
| HTTP | Axios | API 调用，响应拦截 |
| AI | MaxKB iframe | 浮窗智能问答 |

### 文件结构

```
task4-frontend/
├── index.html
├── vite.config.js          # Vite + 代理
├── package.json
└── src/
    ├── main.js             # Vue 挂载入口
    ├── App.vue             # 主组件（全部页面、样式）
    └── utils/
        └── api.ts          # Axios 封装（11 个 API 函数）
```

---

## 3. 登录

系统使用本地 Mock 认证，不依赖后端登录接口。

| 账号 | 密码 | 可选角色 |
|------|------|----------|
| `admin` | `123456` | 市政人员 / 管理员 |
| `manager` | `123456` | 仅管理员 |

### 角色差异

| 菜单项 | 市政人员 | 管理员 |
|--------|:--------:|:------:|
| 数据总览 | ✅ | ✅ |
| 设备控制 | ✅ | ✅ |
| 设备管理 | — | ✅ |
| 告警日志 | — | ✅ |
| 控制日志 | ✅ | ✅ |
| 历史数据 | ✅ | ✅ |
| 统计概览 | ✅ | ✅ |

右下角 AI 浮窗对话 💬 所有角色通用。

---

## 4. 页面说明

### 4.1 数据总览（Dashboard）

- **统计卡片**：亮灯设备数、在线设备数、离线告警数、控制模式
- **7天光照趋势图**：从 `getDeviceLightHistory()` 获取真实数据，无数据时 fallback 随机模拟
- **设备状态列表**：显示所有设备的 ID、名称、在线状态、开关状态、最后心跳

页面加载时自动调用 `getDevices()` 获取设备列表，并通过 `normalizeDevice()` 做数据标准化（补充 `deviceId`、`deviceName`、`online` 等模板需要的字段）。

### 4.2 设备控制（Control）

- **单灯控制**：选择设备 → 点击「开灯」/「关灯」→ 后端通过 MQTT 下发指令 → 等待硬件响应（10秒超时）
- **批量控制**：勾选多个设备 → 点击「批量开灯」/「批量关灯」→ 并发下发
- **全局阈值/模式**：设置当前选中设备的阈值和自动/手动模式

### 4.3 设备管理（Devices）— 仅管理员

- 设备列表（只读）：ID、名称、在线状态、当前状态、模式、最后心跳
- 「阈值」按钮：打开弹窗，先 `getThreshold` 查询，再 `setThreshold` 保存
- 「模式」按钮：弹出模式切换弹窗（auto / manual）

> 新增/解绑设备功能暂不可用，后端未提供对应接口。

### 4.4 告警日志（Alerts）— 仅管理员

暂时显示占位页面：「告警功能将在后续版本中开放」。

### 4.5 控制日志（Logs）

- 按设备查询控制指令历史
- 表格字段：序号、设备、指令（开灯/关灯）、状态（成功/超时/失败）、操作人、请求时间、响应时间
- 支持分页（上一页/下一页）

### 4.6 历史数据（History）

- 选择设备和时间范围（24小时/7天/30天）
- 调用 `getDeviceLightHistory(deviceId, { startTime, endTime })` 获取数据
- ECharts 折线图展示光照强度变化曲线

### 4.7 统计概览（Statistics）

- 从 `devices` 列表本地计算：设备总数、在线数、自动模式数、亮灯数
- 设备状态一览表

### 4.8 AI 浮窗对话（MaxKB）

- 右下角蓝色 💬 按钮，点击弹出对话窗口
- iframe 嵌入 MaxKB 知识库（`192.168.20.119:8080`）
- 支持麦克风输入
- 移动端自动全屏
- 仅登录后显示

---

## 5. API 对接指南

### 5.1 API 封装（`api.ts`）

所有 API 函数定义在 `task4-frontend/src/utils/api.ts`，共 11 个：

```typescript
import { getDevices, getDeviceById,
         controlDevice, batchControl,
         getDeviceThreshold, setDeviceThreshold,
         getDeviceMode, setDeviceMode,
         getControlLogs, getDeviceLightHistory } from './utils/api.ts'
```

### 5.2 响应拦截器

Axios 实例配置了响应拦截器：

- `code === 200`：返回 `res`（包含 `{ code, message, data }`）
- `code !== 200`：抛出 `Error(res.message)`
- 网络错误：提取 `error.response?.data?.message`

### 5.3 11 个 API 对应表

| 函数 | 方法 | 路径 | 说明 |
|------|------|------|------|
| `getDevices()` | GET | `/devices` | 获取所有设备 |
| `getDeviceById(id)` | GET | `/devices/:id` | 单个设备详情 |
| `controlDevice(id, cmd)` | POST | `/devices/:id/control` | 开关灯，body: `{ command }` |
| `batchControl(ids, cmd)` | POST | `/devices/batch-control` | 批量控制 |
| `getDeviceThreshold(id)` | GET | `/devices/:id/threshold` | 获取阈值 |
| `setDeviceThreshold(id, {...})` | POST | `/devices/:id/threshold` | 设置阈值 |
| `getDeviceMode(id)` | GET | `/devices/:id/mode` | 获取模式 |
| `setDeviceMode(id, mode)` | PUT | `/devices/:id/mode` | 切换模式 |
| `getControlLogs(id, params)` | GET | `/devices/:id/control-logs` | 控制日志 |
| `getDeviceLightHistory(id, {...})` | GET | `/devices/:id/light-history` | 光照历史 |
| `getHealth()` | GET | `/health` | 健康检查 |

### 5.4 在 Vue 组件中调用

```javascript
// 获取设备列表
try {
  const res = await getDevices()
  devices.value = (res.data || []).map(normalizeDevice)
} catch (e) {
  console.error('获取设备失败:', e.message)
}

// 控制开关灯
try {
  await controlDevice('lamp_001', 'on')
  showToast('开灯指令已发送', 'success')
} catch (e) {
  showToast(e.message || '控制失败', 'error')
}

// 获取7天光照历史
const end = new Date()
const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
const res = await getDeviceLightHistory('lamp_001', {
  startTime: start.toISOString(),
  endTime: end.toISOString()
})
const records = res.data?.records || []
```

### 5.5 数据标准化

后端返回的 Device 字段（camelCase）与模板中使用的字段（snake_case / 别名）有差异，通过 `normalizeDevice()` 统一：

```javascript
function normalizeDevice(d) {
  return {
    ...d,
    deviceId: d.id,           // 别名
    deviceName: d.name,       // 别名
    online: d.status === 'online',  // 类型转换
    device_id: d.id,          // snake_case 兼容
    device_name: d.name,      // snake_case 兼容
    location: '—',            // 默认值
    // ...
  }
}
```

---

## 6. 统一响应格式

所有 API 返回统一结构：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

---

## 7. 常见问题

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

### Q5: 图表无数据

历史数据图表从 `light_data` 表读取。确认硬件正在上报光照数据（观察后端日志 `[HardwareData] 💾 Saved`）。

### Q6: 跨域问题

开发环境下 Vite proxy 已处理 `/api` 代理，不跨域。生产环境需配置 Nginx 反向代理或后端 CORS。

### Q7: 如何修改 MaxKB 对话地址

编辑 `App.vue` 中 iframe 的 `src` 属性：

```html
<iframe src="http://YOUR_MAXKB_HOST:8080/chat/YOUR_TOKEN" ...>
```

---

## 8. 相关文档

| 文档 | 内容 |
|------|------|
| [README.md](README.md) | 项目总览 |
| [任务3_API接口设计文档.md](任务3_API接口设计文档.md) | 11 个 MVP API 详细规范 |
| [task3-backend/README.md](task3-backend/README.md) | 后端代码说明 |
