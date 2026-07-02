# 智慧路灯管理系统

基于 **Vue 3 + ECharts + Node.js + Express + TypeScript + MySQL** 的全栈智慧路灯管理系统。

## 项目结构

```
smart-street-light/
├── database/               # 数据库相关
│   └── init_mysql.sql      # MySQL 数据库初始化脚本
├── server/                 # 后端服务 (Node.js + Express + TypeScript)
│   ├── src/                # 源代码
│   │   ├── index.ts        # Express API 服务入口
│   │   ├── services/       # 服务层
│   │   │   ├── db.ts       # 数据库连接配置
│   │   │   └── scheduler.ts # 定时任务（离线检测、告警升级、自动控制）
│   │   └── ...
│   ├── .env                # 环境变量（本地/生产配置，不提交到仓库）
│   ├── .env.example        # 环境变量模板
│   ├── package.json        # 后端依赖配置
│   └── tsconfig.json       # TypeScript 配置
├── frontend/               # 前端应用 (Vue 3 + Vite)
│   ├── src/
│   │   ├── main.ts         # 入口文件
│   │   ├── App.vue         # 主组件（完整UI）
│   │   ├── utils/
│   │   │   └── api.ts      # Axios 封装
│   │   └── ...
│   ├── index.html          # HTML 入口
│   ├── vite.config.ts      # Vite 构建配置
│   └── package.json        # 前端依赖配置
├── deploy.py               # 自动化部署脚本（Windows/Linux 服务器）
├── 任务3_API接口设计文档.md  # API 接口设计文档
└── README.md               # 本文件
```

## 数据库设计

| 表名 | 说明 |
|------|------|
| `users` | 用户表（管理员/市政人员） |
| `devices` | 路灯设备表 |
| `light_records` | 光照数据记录表 |
| `alerts` | 告警记录表 |
| `system_config` | 系统配置表（阈值等） |
| `control_logs` | 控制操作日志表 |

详细表结构见 `database/init_mysql.sql`。

## 快速启动（本地开发）

### 前置要求

- Node.js 18+
- MySQL 5.7+ 或 MariaDB 10.3+
- npm

### 1. 安装后端依赖 & 启动服务

```bash
cd server
cp .env.example .env         # 复制环境变量模板，按需修改数据库配置
npm install
npm run build                # 编译 TypeScript
npm run migrate              # 执行数据库字段迁移（如需）
npm start                    # 启动后端API服务 (http://localhost:3000)
```

**环境变量说明**（`server/.env`）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `PORT` | 后端服务端口 | `3000` |
| `DB_HOST` | MySQL 主机地址 | `127.0.0.1` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | MySQL 用户名 | `root` |
| `DB_PASSWORD` | MySQL 密码 | `your_password` |
| `DB_NAME` | MySQL 数据库名 | `dream23-28` |
| `MQTT_BROKER` | MQTT Broker 地址（可选） | `mqtt://127.0.0.1:1883` |

注意：`server/.env` 已加入 `.gitignore`，请勿将真实密码提交到仓库。

### 2. 启动前端开发服务器（新终端）

```bash
cd frontend
npm install
npm run dev                  # 启动前端 (http://localhost:5173)
```

前端开发时，Vite 会将 `/api` 请求代理到 `http://localhost:3000`，无需额外配置。

### 3. 访问系统

打开浏览器访问：**http://localhost:5173**

- 市政人员账号：`admin / 123456`
- 管理员账号：`manager / 123456`

## 生产部署架构

- **应用服务器**：`42.194.218.141`（Windows Server）
- **数据库服务器**：`47.108.58.107:3306`（MySQL）
- **访问地址**：`http://42.194.218.141:3000`

### 手动部署步骤

部署到生产环境前，请确保 `server/.env` 中配置了正确的数据库连接信息，然后在服务器上执行：

```powershell
# 构建前端
cd C:\Users\smart-street-light\frontend
npm install
npm run build

# 构建并启动后端
cd ..\server
npm install
npm run build
npm run migrate

# 使用 pm2 守护进程
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### 自动部署

也可以使用 `deploy.py` 一键部署到生产服务器：

```bash
python deploy.py
```

## 技术栈

- **前端**：Vue 3 (Composition API) + Vite + ECharts 5 + Axios
- **后端**：Node.js + Express.js + TypeScript
- **数据库**：MySQL (mysql2)
- **通信**：RESTful API (JSON)
- **进程管理**：pm2（生产环境）
- **定时任务**：node-cron

## 功能模块

1. **用户登录** - 角色区分（市政人员/路灯管理员）
2. **数据总览** - 实时光照、设备状态、7天光照趋势图(ECharts)
3. **设备控制** - 手动开关灯、批量控制、阈值设置、模式切换
4. **设备管理** - 设备列表、新增设备、解绑设备（CRUD操作）
5. **告警日志** - 分页查询、标记已处理、告警等级升级
6. **智能问答** - RAG知识库模拟

## API 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 用户登录 |
| GET | `/api/devices` | 获取设备列表 |
| POST | `/api/devices` | 新增设备 |
| DELETE | `/api/devices/:deviceId` | 解绑设备 |
| POST | `/api/devices/batch-control` | 批量控制设备 |
| GET | `/api/devices/:deviceId/threshold` | 获取设备阈值 |
| POST | `/api/devices/:deviceId/threshold` | 设置设备阈值 |
| GET | `/api/devices/:deviceId/mode` | 获取设备模式 |
| PUT | `/api/devices/:deviceId/mode` | 设置设备模式 |
| GET | `/api/devices/:deviceId/control-logs` | 单设备控制日志 |
| GET | `/api/devices/:deviceId/light-history` | 单设备历史光照 |
| GET | `/api/devices/:deviceId/statistics` | 单设备运行统计 |
| POST | `/api/devices/:deviceId/heartbeat` | 设备心跳上报 |
| GET | `/api/light/current` | 当前光照值 |
| GET | `/api/light/history` | 7天光照历史 |
| POST | `/api/light/record` | 记录光照数据 |
| GET | `/api/alerts` | 告警分页查询 |
| PUT | `/api/alerts/:id/handle` | 处理告警 |
| GET | `/api/config` | 获取系统配置 |
| PUT | `/api/config` | 更新系统配置 |
| POST | `/api/control/:deviceId/:action` | 设备控制(开/关) |
| GET | `/api/dashboard/stats` | 首页统计面板 |
| GET | `/api/statistics/overview` | 全量统计概览 |
| GET | `/api/health` | 健康检查 |

详细接口定义见 `任务3_API接口设计文档.md`。

## 数据库初始化与迁移

### 首次初始化

后端启动时会自动创建数据库和表（如果尚不存在），并导入默认账号、设备、配置等数据。确保 MySQL 服务已启动且 `.env` 配置正确即可。

### 字段迁移

如果后续数据库表结构更新，执行：

```bash
cd server
npm run migrate
```

当前迁移脚本：
- `migrate-alert-level.cjs`：为 `alerts` 表添加 `alert_level` 字段

## 团队成员协作指南

### 开发环境准备

1. 克隆仓库
2. 复制环境变量：
   ```bash
   cd server
   cp .env.example .env
   # 修改 .env 为你的本地数据库配置
   ```
3. 安装依赖并启动：
   ```bash
   cd server && npm install && npm run build && npm start
   cd ../frontend && npm install && npm run dev
   ```

### 提交规范

- 不要在代码中硬编码数据库密码、服务器 IP 等敏感信息
- `.env` 文件已加入 `.gitignore`，请勿强制提交
- 提交信息建议格式：`feat: 添加xxx功能`、`fix: 修复xxx问题`、`docs: 更新xxx文档`

### 分支策略

- `main`：生产环境代码，受保护，需通过 PR 合并
- `dev`：开发分支，日常开发在此分支进行
- `feature/*`：功能分支，单个功能开发完成后合并到 `dev`

## 关键特性

- ✅ 所有数据从 MySQL 数据库读取/写入
- ✅ 通过 Axios 与后端 RESTful API 交互
- ✅ 使用 ECharts 渲染 7 天光照趋势图
- ✅ 实时数据模拟（定时从数据库获取并记录）
- ✅ 完整的 CRUD 操作（设备增删、告警处理、配置更新）
- ✅ 角色权限控制（不同角色看到不同菜单）
- ✅ 环境变量配置，便于多环境部署与团队协作

## 注意事项

1. 生产环境建议关闭数据库 root 远程访问，创建专用数据库账号
2. 建议为生产服务器配置 HTTPS 和域名
3. MQTT 为可选功能，未配置时不影响核心业务
4. 部署后请检查安全组/防火墙是否放行对应端口
