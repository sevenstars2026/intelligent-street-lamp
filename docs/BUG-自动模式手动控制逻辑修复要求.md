# BUG 修复：自动模式下手动控制后自动切为手动模式

**状态：** 待修复  
**创建时间：** 2026-07-06  
**优先级：** P1（逻辑缺陷，影响用户体验和安全性）

---

## 一、问题概述

### 当前行为的缺陷

设备处于**自动模式（auto）**时，用户通过 API 手动开关灯，当前代码和规范存在一个逻辑死循环：

```
1. 设备 mode=auto，光照 150 < 阈值 200，硬件自动开灯 💡
2. 用户手动关灯 → POST /api/control { command: "off" }
3. 后端直接下发 MQTT control(off)，硬件执行关灯 ✅
4. 30~60 秒后，硬件采样周期到达
5. mode 仍是 auto，光照 150 < 200
6. 硬件自动开灯 💡  ← 🔴 用户的手动操作被自动逻辑撤销！
```

**根因：** 手动控制既不检查设备当前模式，也不改变模式。自动逻辑在下一个采样周期会立即覆盖用户的手动操作。

### 修复目标

手动控制一个处于 auto 模式的设备后，**设备自动切换为 manual 模式**，确保用户的手动操作不会被自动逻辑撤销。

---

## 二、需要修改的文件

| 序号 | 文件 | 改动类型 |
|:----:|------|:--------:|
| 1 | `task3-backend/src/services/device-control.service.ts` | 核心逻辑 |
| 2 | `task4-frontend/src/views/ControlPage.vue` | 前端联动 |
| 3 | `自动控制功能接口规范.md` | 文档修正 |

---

## 三、后端修改要求

### 文件：`task3-backend/src/services/device-control.service.ts`

#### 3.1 `controlDevice()` 方法（约第 279 行）

**当前代码：** 方法全程没有检查设备的 `mode` 字段，直接下发 MQTT 控制指令。

**要求改动：** 在控制成功后（即收到硬件 `success` 响应后），增加以下逻辑：

```typescript
// 位置：controlDevice() 方法内，约第 354 行
// 当前代码：
if (result.status === 'success') {
  await DatabaseService.updateDeviceState(request.deviceId, request.command);
  await AlarmService.checkFrequentSwitch(request.deviceId, device.name ?? request.deviceId);
}

// 改为：
if (result.status === 'success') {
  await DatabaseService.updateDeviceState(request.deviceId, request.command);
  await AlarmService.checkFrequentSwitch(request.deviceId, device.name ?? request.deviceId);

  // 【新增】手动控制成功后，若设备处于自动模式，则自动切为手动模式
  // 原因：防止自动控制逻辑在下一个采样周期撤销用户的手动操作
  if (device.mode === 'auto') {
    await DatabaseService.updateDeviceMode(request.deviceId, 'manual');
    await this.syncDeviceConfig(request.deviceId);
    console.log(
      `[ControlService] ${request.deviceId} mode auto → manual (triggered by manual control)`
    );
  }
}
```

#### 3.2 `batchControl()` 方法（约第 365 行）

批量控制会循环调用 `controlDevice()`，上述修改已经覆盖。但需要确认 `controlDevice()` 中获取的 `device` 对象包含 `mode` 字段——当前代码第 281 行 `const device = await DatabaseService.getDevice(...)` 返回的对象应该已包含 `mode` 字段，如没有则需要检查 `DatabaseService.getDevice()` 的 SQL 查询。

#### 3.3 确认 `DatabaseService` 中有以下方法可用

| 方法 | 用途 | 是否已存在 |
|------|------|:----------:|
| `getDevice(deviceId)` | 获取设备（含 mode 字段） | ✅ 已存在 |
| `updateDeviceState(deviceId, state)` | 更新 current_state | ✅ 已存在 |
| `updateDeviceMode(deviceId, mode)` | 更新 mode | ✅ 已存在（`setMode` 接口已调用） |
| `syncDeviceConfig(deviceId)` | 推送 config 到硬件 | ✅ 已存在 |

---

## 四、前端修改要求

### 文件：`task4-frontend/src/views/ControlPage.vue`

#### 4.1 手动控制成功后同步更新模式显示

当前页面有设备模式的选择/展示。手动控制成功后如果后端自动切换了模式，前端需要同步更新。

**要求：** 在 `handleControl`（或对应的控制方法）成功后，检查返回结果或重新加载设备信息，确保模式 UI 反映最新状态。

**建议做法：** 控制成功后调用 `loadDevices()` 刷新设备列表（已有 30 秒轮询兜底，但主动刷新体验更好）。

具体改动位置和方式由前端开发根据当前 `ControlPage.vue` 的实际结构自行确定，核心要求是：**控制成功后 UI 中该设备的模式显示要更新为 "manual"**。

---

## 五、文档修正要求

### 文件：`自动控制功能接口规范.md`

#### 5.1 第 4.5 节（mode 切换时的行为）

当前表格只有两行，需新增第三行：

```markdown
| 切换 | 硬件行为 |
|------|---------|
| `auto` → `manual`（用户手动切换模式） | 立即停止本地自动判断；保持当前开关状态不变；仅响应后端 control 指令 |
| `manual` → `auto`（用户手动切换模式） | 立即启用本地自动判断；从下一次光照采样开始执行阈值比对 |
| **`auto` + 收到 control 指令（手动控制触发）** | **执行 control 指令后，后端自动将 mode 切为 manual；硬件收到 config 推送后停止自动判断** |
```

#### 5.2 第 4.8 节（指令执行要求）

当前"冲突处理"行：

```markdown
| 冲突处理 | 若硬件正在执行本地自动开灯，同时收到后端手动关灯指令 → **后端指令优先**，打断本地自动动作 |
```

改为：

```markdown
| 冲突处理 | 若硬件正在执行本地自动开灯，同时收到后端手动关灯指令 → **后端指令优先**，打断本地自动动作。**控制成功后后端自动将设备模式切换为 manual，防止自动逻辑覆盖用户操作** |
```

#### 5.3 第 6.3 节（手动控制打断自动控制）

当前示例标题和内容维持不变，但在示例末尾增加注释：

```
注意：此例中 control(on) 与当前灯状态一致（"灯已亮，无需动作"）。
若 control 指令实际改变了灯状态（如自动开灯时手动关灯），
后端会在控制成功后自动将 mode 从 auto 切为 manual，并推送 config 到硬件。
```

---

## 六、验证清单

修复完成后，按以下场景逐项验证：

- [ ] **场景 1：auto 模式下关灯** — 设备 mode=auto、灯亮 → POST `/api/devices/{id}/control` `{command:"off"}` → 灯熄灭 → 设备 mode 变为 manual → 等待 60 秒，灯**不**自动重开
- [ ] **场景 2：auto 模式下开灯** — 设备 mode=auto、灯灭 → POST `/api/devices/{id}/control` `{command:"on"}` → 灯亮起 → 设备 mode 变为 manual → 等待 60 秒，灯**不**自动关闭
- [ ] **场景 3：manual 模式下控制** — 设备 mode=manual → 手动控制 → 行为不变，mode 保持 manual
- [ ] **场景 4：前端 UI 联动** — 手动控制成功后，前端模式选择器/显示同步变为 "manual"
- [ ] **场景 5：控制失败不回退** — 手动控制失败（超时/拒绝）时，mode **不**改变（仍为 auto）
- [ ] **场景 6：切回 auto** — 手动控制后设备变为 manual，用户通过 PUT `/api/devices/{id}/mode` `{mode:"auto"}` 可正常切回自动模式

---

## 七、参考信息

- 当前设备控制服务：[task3-backend/src/services/device-control.service.ts](../task3-backend/src/services/device-control.service.ts)（`controlDevice` 方法约第 279 行）
- 控制接口路由：[task3-backend/src/routes/device-control.routes.ts](../task3-backend/src/routes/device-control.routes.ts)（`POST /devices/:deviceId/control`）
- 自动控制规范：[自动控制功能接口规范.md](../自动控制功能接口规范.md)（第 4.5、4.8、6.3 节）
- 前端控制页面：[task4-frontend/src/views/ControlPage.vue](../task4-frontend/src/views/ControlPage.vue)
- 相关讨论：自动模式下手动控制的三种方案分析，选定**方案 C（手动控制后自动切为 manual）**
