# 景区游客端 — 智慧路灯导览系统

重庆大学虎溪校区智慧路灯游客导览微信端/移动端，基于 Vue 3 + Leaflet + 高德地图。

---

## 1. 环境要求

- Node.js >= 18
- npm >= 9
- 后端服务运行中（`task3-backend`，默认 `http://localhost:3000`）

## 2. 快速启动

```bash
cd tourist-frontend
npm install
echo VITE_AMAP_KEY=8a1909661c151543bd2937d9603540cf > .env
npm run dev                  # → http://localhost:5174
```

## 3. 配置文件

### 3.1 `.env` — 高德地图 API Key

```env
VITE_AMAP_KEY=8a1909661c151543bd2937d9603540cf
```

注册地址：https://console.amap.com/dev/key/app → 创建应用 → 服务平台选「Web服务」

> 不配置 Key 也能运行，但路线不会显示真实道路。

### 3.2 `vite.config.js` — 端口和代理

```js
server: {
  port: 5174,                    // 默认端口（冲突时自动 +1）
  proxy: {
    '/api':    { target: 'http://localhost:3000' },    // 后端 API
    '/amap-api': { target: 'https://restapi.amap.com', changeOrigin: true, rewrite: path => path.replace(/^\/amap-api/, '') }
  }
}
```

**如果后端不在本机**，修改 `/api` 的 `target` 为实际地址。

## 4. 项目结构

```
tourist-frontend/
├── index.html                     # HTML 入口（移动端 viewport）
├── vite.config.js                 # Vite 配置（端口 5174 + 双代理）
├── .env                           # 高德 Key（不提交 Git）
├── package.json
├── public/
│   └── images/                    # 活动/拍照点图片（8 张）
└── src/
    ├── main.js                    # Vue 挂载入口
    ├── App.vue                    # 根组件（Toast 容器）
    ├── style.css                  # 暖橙金色设计系统（CSS 变量）
    ├── router/index.js            # 7 条路由（无登录守卫）
    ├── utils/api.ts               # Axios 封装（7 个 API 函数）
    ├── composables/               # 模块级单例（无 Pinia）
    │   ├── useScenic.js           # 景区数据 + 经纬度坐标
    │   ├── useReport.js           # 故障上报状态 + 校验
    │   ├── useLampReminder.js     # 熄灯倒计时
    │   └── useToast.js            # Toast 通知
    ├── components/                # 11 个共享组件
    │   ├── ScenicMap.vue          # Leaflet 地图（核心）
    │   ├── BottomNav.vue          # 底部导航栏
    │   ├── LampPopup.vue          # 路灯推荐弹窗
    │   ├── ActionSheet.vue        # 查看路线/详情选择面板
    │   ├── LampReminder.vue       # 熄灯提醒横幅
    │   ├── LampSearch.vue         # 路灯编号搜索
    │   ├── MapFilter.vue          # 全部/拍照/活动/路线筛选
    │   ├── CountdownBadge.vue     # 活动倒计时徽章
    │   ├── RecommendCard.vue      # 推荐内容卡片
    │   ├── ReportForm.vue         # 故障上报表单
    │   └── PhotoUploader.vue      # 拍照/选图组件
    └── views/                     # 7 个页面
        ├── MapPage.vue            # 地图主页（/）
        ├── RoutesPage.vue         # 游览路线（/routes）
        ├── SpotsPage.vue          # 拍照点列表（/spots）
        ├── SpotDetailPage.vue     # 拍照点详情（/spots/:id）
        ├── EventsPage.vue         # 表演活动列表（/events）
        ├── EventDetailPage.vue    # 活动详情（/events/:id）
        └── ReportPage.vue         # 故障上报（/report）
```

## 5. 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | MapPage | 地图主页（含搜索、筛选、熄灯提醒、路灯弹窗） |
| `/routes` | RoutesPage | 游览路线列表，点击跳回地图 |
| `/spots` | SpotsPage | 拍照点网格，点击进详情 |
| `/spots/:id` | SpotDetailPage | 拍照点详情（图片轮播+攻略） |
| `/events` | EventsPage | 活动列表，点击进详情 |
| `/events/:id` | EventDetailPage | 活动详情（图片轮播+参与须知） |
| `/report` | ReportPage | 故障上报表单（含图片上传） |

**无登录守卫**，所有页面公开访问。

## 6. 数据来源

```
前端 useScenic.js loadScenicData()
  ├─ 优先调用后端 API（/api/scenic/*）
  │   ├─ MySQL 可用 → 数据库数据
  │   └─ MySQL 不可用 → MockDatabase 内存数据
  └─ API 失败 → 降级 useScenic.js 内置 MOCK 数据
```

**前端 Mock 和后端种子 ID 必须一致**（1=北门银杏道, 2=老门柱广场, 3=操场看台）。

## 7. 自定义配置

### 7.1 修改地图定位

`src/components/ScenicMap.vue:31-36` — 改 `CENTER` 和 `LAMP_COORDS`：

```js
const CENTER = [纬度, 经度]                    // 地图中心
const LAMP_COORDS = {
  lamp_001: [纬度, 经度],                     // 路灯位置
  lamp_002: [纬度, 经度],
  lamp_003: [纬度, 经度],
}
```

### 7.2 修改推荐内容

`src/components/LampPopup.vue:63-88` — 改 `ALL_SPOTS`、`ALL_EVENTS`、`LAMP_RECOMMEND`：

```js
const LAMP_RECOMMEND = {
  lamp_001: { spotIds: [1], eventIds: [3, 2] },  // 改这里
  lamp_002: { spotIds: [3], eventIds: [4, 3] },
  lamp_003: { spotIds: [1], eventIds: [1, 2] },
}
```

### 7.3 修改活动列表数据

`src/composables/useScenic.js:18-29` — 改 `SPOT_MOCK` 和 `EVENT_MOCK`

### 7.4 修改活动详情

`src/views/EventDetailPage.vue:66-113` — 改 `EVENT_DATA` 对象

### 7.5 修改拍照点详情

`src/views/SpotDetailPage.vue:64-96` — 改 `SPOT_DATA` 对象

### 7.6 更换图片

替换 `public/images/` 下对应的 jpg 文件：

| 文件 | 用途 |
|------|------|
| `music1.jpg / music2.jpg` | 草坪音乐节 |
| `food1.jpg / food2.jpg` | 校园美食节 |
| `culture1.jpg / culture2.jpg` | 国际文化节 |
| `sports1.jpg / sports2.jpg` | 秋季运动会 |
| `ginkgo1.jpg / ginkgo2.jpg` | 北门银杏道 |
| `stand1.jpg / stand2.jpg` | 操场看台 |
| `gate1.jpg` | 老门柱广场 |

## 8. 手机端访问

1. 确保手机和电脑在同一网络
2. 运行 `ipconfig` 查看无线局域网 IPv4 地址（如 `172.20.10.4`）
3. 手机浏览器访问 `http://<你的IP>:5174`

**如果打不开：**
- 以管理员身份运行 PowerShell：
  ```powershell
  netsh advfirewall firewall add rule name="Vite 5174" dir=in action=allow protocol=TCP localport=5174
  ```

## 9. 适配新景区

1. 修改 `CENTER` + `LAMP_COORDS`（ScenicMap.vue）
2. 修改 `EVENT_COORDS` + `SPOT_COORDS`（ScenicMap.vue + useScenic.js）
3. 修改活动/拍照点名称和描述（useScenic.js + detail pages）
4. 替换 `public/images/` 图片
5. 更新 `index.html` 标题

## 10. 常见问题

| 问题 | 解决 |
|------|------|
| 地图底图空白 | 高德瓦片需网络，检查控制台是否有 403 |
| 路线不显示 | 确认 `.env` 文件存在于项目根目录，内容为 `VITE_AMAP_KEY=8a1909661c151543bd2937d9603540cf` |
| 弹窗推荐不对 | 修改 `LampPopup.vue` 的 `LAMP_RECOMMEND` |
| 后端数据覆盖修改 | 后端 `database.service.ts` 种子也需同步更新 |
| 手机无法访问 | 检查防火墙 + IP 是否正确 |
