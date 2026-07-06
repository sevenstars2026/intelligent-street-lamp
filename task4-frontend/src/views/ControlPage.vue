<template>
  <div class="control-page">
    <!-- ===== 左侧设备列表 ===== -->
    <aside class="sidebar glass-card">
      <div class="sidebar-header">
        <h2 class="sidebar-title">设备列表</h2>
        <div class="search-box">
          <svg viewBox="0 0 20 20" fill="currentColor" class="search-icon">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索名称或ID..."
          />
        </div>
      </div>

      <!-- 加载骨架 -->
      <div class="sidebar-loading" v-if="loading">
        <div class="sidebar-skeleton-row" v-for="n in 5" :key="n">
          <div class="skeleton skeleton-dot"></div>
          <div class="skeleton skeleton-line"></div>
        </div>
      </div>

      <!-- 设备列表 -->
      <div class="device-list" v-else>
        <div
          v-for="(d, idx) in filteredDevices"
          :key="d.id"
          class="device-item"
          :class="{ selected: selectedDevice?.id === d.id }"
          :style="{ animationDelay: (idx * 60) + 'ms' }"
          @click="selectDevice(d)"
        >
          <span class="pulse-dot" :class="d.online ? 'online' : 'offline'"></span>
          <div class="device-item-info">
            <span class="device-item-id">{{ d.deviceId || d.id }}</span>
            <span class="device-item-name">{{ d.deviceName || d.name }}</span>
          </div>
          <span class="device-item-state" :class="d.currentState === 'on' ? 'state-on' : 'state-off'">
            {{ d.currentState === 'on' ? 'ON' : 'OFF' }}
          </span>
        </div>

        <div class="device-list-empty" v-if="filteredDevices.length === 0">
          没有匹配的设备
        </div>
      </div>
    </aside>

    <!-- ===== 右侧主区域 ===== -->
    <main class="main-area">
      <!-- 空状态 -->
      <div class="empty-state glass-card" v-if="!selectedDevice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" class="empty-icon">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <p class="empty-text">选择左侧设备以进行控制</p>
      </div>

      <template v-else>
        <!-- 设备详情卡片 -->
        <div class="detail-card glass-card">
          <div class="detail-header">
            <h3 class="detail-title">{{ selectedDevice.deviceName || selectedDevice.name }}</h3>
            <span class="status-badge" :class="selectedDevice.online ? 'online' : 'offline'">
              <span class="pulse-dot" :class="selectedDevice.online ? 'online' : 'offline'"></span>
              {{ selectedDevice.online ? '在线' : '离线' }}
            </span>
          </div>
          <div class="detail-body">
            <div class="detail-item">
              <span class="detail-label">设备 ID</span>
              <span class="detail-value mono">{{ selectedDevice.deviceId || selectedDevice.id }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">控制模式</span>
              <span class="detail-value">
                <span class="mode-badge" :class="selectedDevice.mode === 'auto' ? 'auto' : 'manual'">
                  {{ selectedDevice.mode === 'auto' ? '自动' : '手动' }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">开关状态</span>
              <span class="detail-value">
                <span class="state-badge" :class="selectedDevice.currentState === 'on' ? 'on' : 'off'">
                  {{ selectedDevice.currentState === 'on' ? '开灯' : '关灯' }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">最后心跳</span>
              <span class="detail-value mono">{{ formatTime(selectedDevice.lastHeartbeat) }}</span>
            </div>
          </div>
        </div>

        <!-- 控制面板 -->
        <div class="panel-card glass-card">
          <!-- 开关控制 -->
          <div class="panel-section">
            <h4 class="panel-label">开关控制</h4>
            <div class="switch-btns">
              <button
                class="switch-btn switch-btn--on ripple"
                :disabled="!selectedDevice.online || actionLoading"
                @click="handleControl('on')"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
                  <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
                </svg>
                <span>开灯</span>
              </button>
              <button
                class="switch-btn switch-btn--off ripple"
                :disabled="!selectedDevice.online || actionLoading"
                @click="handleControl('off')"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
                  <path d="M11 3a1 1 0 10-2 0v8a1 1 0 102 0V3zM4.93 5.343a1 1 0 10-1.414 1.414A7.966 7.966 0 004 10c0 4.418 3.582 8 8 8s8-3.582 8-8c0-1.208-.268-2.356-.748-3.393a1 1 0 10-1.764.944A5.976 5.976 0 0118 10c0 3.309-2.691 6-6 6s-6-2.691-6-6c0-1.022.254-1.99.702-2.842a1 1 0 00.228-.415z"/>
                </svg>
                <span>关灯</span>
              </button>
            </div>
            <Transition name="feedback">
              <p class="feedback-msg" v-if="feedbackMsg" :class="feedbackType">{{ feedbackMsg }}</p>
            </Transition>
          </div>

          <!-- 分割线 -->
          <div class="panel-divider"></div>

          <!-- 控制模式 -->
          <div class="panel-section">
            <h4 class="panel-label">控制模式</h4>
            <div class="mode-toggles">
              <button
                class="toggle-btn"
                :class="{ active: selectedDevice.mode === 'auto' }"
                :disabled="modeLoading"
                @click="handleSetMode('auto')"
              >
                自动模式
              </button>
              <button
                class="toggle-btn"
                :class="{ active: selectedDevice.mode === 'manual' }"
                :disabled="modeLoading"
                @click="handleSetMode('manual')"
              >
                手动模式
              </button>
            </div>
          </div>

          <!-- 分割线 -->
          <div class="panel-divider"></div>

          <!-- 阈值设置 -->
          <div class="panel-section">
            <h4 class="panel-label">阈值设置</h4>
            <div class="threshold-inputs">
              <div class="threshold-field">
                <label class="field-label">开灯阈值</label>
                <div class="input-with-unit">
                  <input
                    v-model.number="thresholdForm.on"
                    type="number"
                    class="field-input"
                    placeholder="300"
                    min="0"
                    max="10000"
                  />
                  <span class="input-unit">lux</span>
                </div>
              </div>
              <div class="threshold-field">
                <label class="field-label">关灯阈值</label>
                <div class="input-with-unit">
                  <input
                    v-model.number="thresholdForm.off"
                    type="number"
                    class="field-input"
                    placeholder="500"
                    min="0"
                    max="10000"
                  />
                  <span class="input-unit">lux</span>
                </div>
              </div>
            </div>
            <button
              class="save-btn ripple"
              :disabled="thresholdLoading"
              @click="handleSaveThreshold"
            >
              {{ thresholdLoading ? '保存中...' : '保存阈值' }}
            </button>
          </div>
        </div>
      </template>
    </main>

    <!-- ===== 批量控制栏 ===== -->
    <div class="batch-bar glass-card glow-border" :class="{ expanded: batchExpanded }">
      <div class="batch-header" @click="batchExpanded = !batchExpanded">
        <span class="batch-label">批量控制</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="batch-chevron"
          :class="{ rotated: batchExpanded }"
        >
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </div>

      <div class="batch-body" v-show="batchExpanded">
        <!-- 全选 / 清除 -->
        <div class="batch-actions-top">
          <button class="batch-link" @click="selectAllBatch">全选</button>
          <button class="batch-link" @click="clearBatchSelection">清除</button>
        </div>

        <!-- 复选框列表 -->
        <div class="batch-list">
          <label
            v-for="d in devices"
            :key="d.id"
            class="batch-check-item"
          >
            <input
              type="checkbox"
              :value="d.id"
              v-model="batchSelected"
              class="batch-checkbox"
            />
            <span class="pulse-dot" :class="d.online ? 'online' : 'offline'"></span>
            <span class="batch-device-name">{{ d.deviceName || d.name }}</span>
            <span class="batch-device-id">{{ d.deviceId || d.id }}</span>
          </label>
        </div>

        <!-- 批量按钮 -->
        <div class="batch-btns">
          <button
            class="switch-btn switch-btn--on ripple"
            :disabled="batchSelected.length === 0 || batchLoading"
            @click="handleBatchControl('on')"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
            </svg>
            <span>批量开灯</span>
          </button>
          <button
            class="switch-btn switch-btn--off ripple"
            :disabled="batchSelected.length === 0 || batchLoading"
            @click="handleBatchControl('off')"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
              <path d="M11 3a1 1 0 10-2 0v8a1 1 0 102 0V3zM4.93 5.343a1 1 0 10-1.414 1.414A7.966 7.966 0 004 10c0 4.418 3.582 8 8 8s8-3.582 8-8c0-1.208-.268-2.356-.748-3.393a1 1 0 10-1.764.944A5.976 5.976 0 0118 10c0 3.309-2.691 6-6 6s-6-2.691-6-6c0-1.022.254-1.99.702-2.842a1 1 0 00.228-.415z"/>
            </svg>
            <span>批量关灯</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { inject } from 'vue'
import { useDevices } from '@/composables/useDevices.js'
import { useToast } from '@/composables/useToast.js'
import { controlDevice, batchControl, setDeviceMode, setDeviceThreshold } from '@/utils/api.ts'

const theme = inject('theme', ref('dark'))
const { devices, loading, loadDevices, loadDeviceThreshold, loadDeviceMode } = useDevices()
const { showToast } = useToast()

// ---- 搜索 ----
const searchQuery = ref('')

const filteredDevices = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return devices.value
  return devices.value.filter(d => {
    const id = String(d.deviceId || d.id || '').toLowerCase()
    const name = String(d.deviceName || d.name || '').toLowerCase()
    return id.includes(q) || name.includes(q)
  })
})

// ---- 选中设备 ----
const selectedDevice = ref(null)

function selectDevice(d) {
  selectedDevice.value = d
  // 加载该设备的阈值和模式
  loadDeviceData(d.id)
}

async function loadDeviceData(deviceId) {
  // 阈值
  try {
    const threshold = await loadDeviceThreshold(deviceId)
    if (threshold) {
      thresholdForm.on = threshold.lightThresholdOn ?? threshold.on_threshold ?? threshold.onThreshold ?? 300
      thresholdForm.off = threshold.lightThresholdOff ?? threshold.off_threshold ?? threshold.offThreshold ?? 500
    }
  } catch {
    // 保持默认值
  }

  // 模式
  try {
    const mode = await loadDeviceMode(deviceId)
    if (mode && selectedDevice.value) {
      selectedDevice.value.mode = mode
    }
  } catch {
    // 保持当前值
  }
}

// ---- 开关控制 ----
const actionLoading = ref(false)
const feedbackMsg = ref('')
const feedbackType = ref('success')

async function handleControl(command) {
  if (!selectedDevice.value) return
  actionLoading.value = true
  feedbackMsg.value = ''
  try {
    await controlDevice(selectedDevice.value.id, command)
    // 更新本地状态
    if (selectedDevice.value) {
      selectedDevice.value.currentState = command
    }
    feedbackMsg.value = command === 'on' ? '设备已开灯' : '设备已关灯'
    feedbackType.value = 'success'
    showToast(`设备${command === 'on' ? '开灯' : '关灯'}成功`, 'success')
    // 重新加载设备列表以同步状态
    await loadDevices()
  } catch (e) {
    feedbackMsg.value = e.message || '操作失败'
    feedbackType.value = 'error'
    showToast(e.message || '操作失败', 'error')
  } finally {
    actionLoading.value = false
    setTimeout(() => { feedbackMsg.value = '' }, 2500)
  }
}

// ---- 模式切换 ----
const modeLoading = ref(false)

async function handleSetMode(mode) {
  if (!selectedDevice.value) return
  modeLoading.value = true
  try {
    await setDeviceMode(selectedDevice.value.id, mode)
    if (selectedDevice.value) {
      selectedDevice.value.mode = mode
    }
    showToast(`已切换为${mode === 'auto' ? '自动' : '手动'}模式`, 'success')
    await loadDevices()
  } catch (e) {
    showToast(e.message || '模式切换失败', 'error')
  } finally {
    modeLoading.value = false
  }
}

// ---- 阈值设置 ----
const thresholdLoading = ref(false)
const thresholdForm = reactive({ on: 300, off: 500 })

async function handleSaveThreshold() {
  if (!selectedDevice.value) return
  if (thresholdForm.on == null || thresholdForm.off == null) {
    showToast('请填写完整的阈值', 'warning')
    return
  }
  thresholdLoading.value = true
  try {
    await setDeviceThreshold(selectedDevice.value.id, {
      lightThresholdOn: Number(thresholdForm.on),
      lightThresholdOff: Number(thresholdForm.off),
    })
    showToast('阈值设置保存成功', 'success')
  } catch (e) {
    showToast(e.message || '阈值保存失败', 'error')
  } finally {
    thresholdLoading.value = false
  }
}

// ---- 批量控制 ----
const batchExpanded = ref(false)
const batchSelected = ref([])
const batchLoading = ref(false)

function selectAllBatch() {
  batchSelected.value = devices.value.map(d => d.id)
}

function clearBatchSelection() {
  batchSelected.value = []
}

async function handleBatchControl(command) {
  if (batchSelected.value.length === 0) return
  batchLoading.value = true
  try {
    await batchControl(batchSelected.value, command)
    showToast(`批量${command === 'on' ? '开灯' : '关灯'}成功`, 'success')
    await loadDevices()
    // 刷新当前选中设备状态
    if (selectedDevice.value) {
      const updated = devices.value.find(d => d.id === selectedDevice.value.id)
      if (updated) selectedDevice.value = updated
    }
  } catch (e) {
    showToast(e.message || '批量控制失败', 'error')
  } finally {
    batchLoading.value = false
  }
}

// ---- 工具函数 ----
function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ---- 生命周期 ----
let autoRefreshTimer = null

onMounted(async () => {
  await loadDevices()
  if (devices.value.length > 0) {
    selectDevice(devices.value[0])
  }
  // 每 30 秒自动刷新设备状态，并将 selectedDevice 同步到新数组中的对应设备
  autoRefreshTimer = setInterval(async () => {
    const currentId = selectedDevice.value?.id || selectedDevice.value?.deviceId
    await loadDevices()
    if (!currentId) return
    // 刷新期间用户可能手动切换了设备，此时不应覆盖用户的选择
    const afterRefreshId = selectedDevice.value?.id || selectedDevice.value?.deviceId
    if (afterRefreshId !== currentId) return
    const refreshed = devices.value.find(d => (d.id || d.deviceId) === currentId)
    if (refreshed) selectedDevice.value = refreshed
  }, 30000)
})

onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})
</script>

<style scoped>
.control-page {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  min-height: calc(100vh - 120px);
}

/* ===================== 左侧栏 ===================== */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 10px 8px 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text-primary);
  font-size: 12px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color 150ms ease;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-input:focus {
  border-color: var(--color-brand);
}

/* 加载骨架 */
.sidebar-loading {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-skeleton-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skeleton-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-line {
  flex: 1;
  height: 14px;
}

/* 设备列表 */
.device-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  opacity: 0;
  animation: fade-in-up 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  border: 1px solid transparent;
}

.device-item:hover {
  background: rgba(101, 138, 228, 0.06);
}

.device-item.selected {
  background: rgba(101, 138, 228, 0.1);
  border-color: var(--color-border-glow);
}

.device-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-item-id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-brand-soft);
}

.device-item-name {
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-item-state {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.device-item-state.state-on {
  color: var(--color-status-warning);
  background: rgba(245, 158, 11, 0.12);
}

.device-item-state.state-off {
  color: var(--color-text-muted);
  background: rgba(100, 116, 139, 0.1);
}

.device-list-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
}

/* ===================== 右侧主区域 ===================== */
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 16px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  color: var(--color-text-muted);
  opacity: 0.4;
}

.empty-text {
  font-size: 14px;
  color: var(--color-text-muted);
}

/* 设备详情卡片 */
.detail-card {
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.status-badge.online {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.1);
}

.status-badge.offline {
  color: var(--color-status-offline);
  background: rgba(239, 68, 68, 0.1);
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
}

.detail-value {
  font-size: 13px;
  color: var(--color-text-primary);
}

.detail-value.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 复用 mode-badge / state-badge 样式 */
.mode-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.mode-badge.auto {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.1);
}

.mode-badge.manual {
  color: var(--color-brand-soft);
  background: rgba(101, 138, 228, 0.1);
}

.state-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.state-badge.on {
  color: var(--color-status-warning);
  background: rgba(245, 158, 11, 0.12);
}

.state-badge.off {
  color: var(--color-text-muted);
  background: rgba(100, 116, 139, 0.1);
}

/* ===================== 控制面板 ===================== */
.panel-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.panel-section {
  padding: 4px 0;
}

.panel-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.panel-divider {
  height: 1px;
  background: var(--color-border-subtle);
  margin: 18px 0;
}

/* 开关按钮 */
.switch-btns {
  display: flex;
  gap: 12px;
}

.switch-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 150ms ease;
}

.switch-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.switch-btn--on {
  background: rgba(34, 197, 94, 0.14);
  color: var(--color-status-online);
  border-color: rgba(34, 197, 94, 0.25);
}

.switch-btn--on:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.22);
  border-color: rgba(34, 197, 94, 0.4);
}

.switch-btn--off {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-status-offline);
  border-color: rgba(239, 68, 68, 0.2);
}

.switch-btn--off:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.35);
}

.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.feedback-msg {
  margin-top: 10px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
}

.feedback-msg.success {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.08);
}

.feedback-msg.error {
  color: var(--color-status-offline);
  background: rgba(239, 68, 68, 0.08);
}

.feedback-enter-active {
  animation: fade-in-up 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.feedback-leave-active {
  animation: fade-in 150ms ease-in reverse;
}

/* 模式切换按钮 */
.mode-toggles {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 150ms ease;
}

.toggle-btn:hover:not(:disabled) {
  border-color: var(--color-border-glow);
  color: var(--color-text-primary);
}

.toggle-btn.active {
  border-color: var(--color-brand);
  background: rgba(101, 138, 228, 0.12);
  color: var(--color-brand-soft);
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 阈值输入 */
.threshold-inputs {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.threshold-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.input-with-unit {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 150ms ease;
}

.input-with-unit:focus-within {
  border-color: var(--color-brand);
}

.field-input {
  flex: 1;
  padding: 8px 10px;
  border: none;
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-mono);
  outline: none;
  min-width: 0;
}

.input-unit {
  padding: 0 10px;
  font-size: 11px;
  color: var(--color-text-muted);
  background: rgba(101, 138, 228, 0.06);
  line-height: 34px;
  flex-shrink: 0;
}

.save-btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(101, 138, 228, 0.1);
  color: var(--color-brand-soft);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 150ms ease;
}

.save-btn:hover:not(:disabled) {
  background: rgba(101, 138, 228, 0.18);
  border-color: var(--color-border-glow);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===================== 批量控制栏 ===================== */
.batch-bar {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 260px;
  z-index: 100;
  overflow: hidden;
  transition: box-shadow 200ms ease;
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.batch-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.batch-chevron {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
  transition: transform 200ms ease;
}

.batch-chevron.rotated {
  transform: rotate(180deg);
}

.batch-body {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-actions-top {
  display: flex;
  gap: 12px;
}

.batch-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-brand-soft);
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: color 150ms ease;
}

.batch-link:hover {
  color: var(--color-brand);
}

.batch-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.batch-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 120ms ease;
}

.batch-check-item:hover {
  background: rgba(101, 138, 228, 0.05);
}

.batch-checkbox {
  accent-color: var(--color-brand);
  cursor: pointer;
  flex-shrink: 0;
}

.batch-device-name {
  flex: 1;
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-device-id {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.batch-btns {
  display: flex;
  gap: 8px;
}

.batch-btns .switch-btn {
  font-size: 12px;
  padding: 8px 10px;
}

/* ===================== 响应式 ===================== */
@media (max-width: 900px) {
  .control-page {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    position: static;
    max-height: 360px;
  }

  .detail-body {
    grid-template-columns: 1fr;
  }

  .threshold-inputs {
    flex-direction: column;
  }

  .batch-bar {
    width: calc(100vw - 32px);
    right: 16px;
    bottom: 16px;
  }
}
</style>
