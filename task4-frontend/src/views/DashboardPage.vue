<template>
  <div class="dashboard-page">
    <!-- ========== 左侧面板 ========== -->
    <div class="panel panel-left">
      <!-- 卡片1：设备状态列表 -->
      <div class="panel-card glass-card glow-border">
        <div class="card-header">
          <span class="card-title">设备状态列表</span>
          <span class="card-badge">{{ displayDevices.length }} 台</span>
        </div>
        <div class="card-body compact-table">
          <DeviceTable :devices="displayDevices" :showActions="false" />
        </div>
      </div>

      <!-- 卡片2：7天光照趋势 -->
      <div class="panel-card glass-card glow-border">
        <div class="card-header">
          <span class="card-title">近7天光照趋势</span>
          <span class="card-subtitle">6/30 — 7/6</span>
        </div>
        <div class="card-body chart-wrap">
          <div v-if="chartLoading" class="chart-skeleton skeleton"></div>
          <div v-else ref="lightChartRef" class="light-chart-inner"></div>
        </div>
      </div>
    </div>

    <!-- ========== 中间面板：路灯示意图 ========== -->
    <div class="panel panel-center">
      <LampIllustration
        @nav-lighting="goControl"
        @nav-weather="goHistory"
        @show-alarm="openAlarmDialog"
      />
    </div>

    <!-- ========== 右侧面板 ========== -->
    <div class="panel panel-right">
      <!-- 卡片1：点位一览饼图 -->
      <PieChart
        title="点位一览"
        :data="pointOverviewData"
        centerLabel="总点位"
        :centerValue="displayDevices.length"
      />

      <!-- 告警统计 -->
      <div class="panel-card glass-card glow-border alarm-header-card">
        <div class="card-header alarm-header">
          <svg viewBox="0 0 20 20" fill="currentColor" class="alarm-bell-icon">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
            <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
          <span class="card-title">告警统计</span>
          <span class="alarm-count-badge" v-if="offlineDevices.length > 0">{{ offlineDevices.length }} 条告警</span>
        </div>
      </div>

      <!-- 离线告警详情 -->
      <div class="panel-card glass-card glow-border" v-if="offlineDevices.length > 0">
        <div class="card-header">
          <span class="card-title" style="color: #f87171;">离线告警</span>
        </div>
        <div class="card-body">
          <div
            v-for="d in offlineDevices"
            :key="d.deviceId"
            class="alarm-item"
          >
            <div class="alarm-item-header">
              <span class="pulse-dot offline"></span>
              <span class="alarm-device-id">{{ d.deviceId }}</span>
              <span class="alarm-level-tag critical">严重</span>
            </div>
            <div class="alarm-item-body">
              <div class="alarm-row">
                <span class="alarm-label">设备名称</span>
                <span class="alarm-value">{{ d.deviceName }}</span>
              </div>
              <div class="alarm-row">
                <span class="alarm-label">最后心跳</span>
                <span class="alarm-value mono">{{ formatTime(d.lastHeartbeat) }}</span>
              </div>
              <div class="alarm-row">
                <span class="alarm-label">离线时长</span>
                <span class="alarm-value mono" style="color:#f87171;">{{ offlineDuration(d.lastHeartbeat) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 全部在线状态 -->
      <div class="panel-card glass-card glow-border" v-else>
        <div class="card-body all-online">
          <span class="pulse-dot online" style="width:12px;height:12px;"></span>
          <span class="all-online-text">全部设备运行正常</span>
        </div>
      </div>

    </div>

    <!-- ===== 通讯报警弹窗 ===== -->
    <el-dialog
      v-model="showAlarmDialog"
      title="通讯报警详情"
      width="520px"
      :close-on-click-modal="false"
      class="alarm-dialog"
    >
      <template #header>
        <div class="dialog-header-custom">
          <svg viewBox="0 0 20 20" fill="currentColor" class="dialog-alarm-icon">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
            <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
          <span>通讯报警详情</span>
        </div>
      </template>

      <div v-if="offlineDevices.length > 0" class="dialog-body">
        <div class="dialog-summary">
          <span class="summary-text">当前共有 <strong>{{ offlineDevices.length }}</strong> 台设备离线</span>
        </div>
        <div
          v-for="d in offlineDevices"
          :key="d.deviceId"
          class="dialog-alarm-item"
        >
          <div class="dialog-item-top">
            <span class="pulse-dot offline"></span>
            <span class="dialog-device-id">{{ d.deviceId }}</span>
            <el-tag type="danger" size="small" effect="dark">离线</el-tag>
          </div>
          <div class="dialog-item-info">
            <div class="dialog-info-row">
              <span class="info-label">设备名称</span>
              <span class="info-value">{{ d.deviceName }}</span>
            </div>
            <div class="dialog-info-row">
              <span class="info-label">最后心跳</span>
              <span class="info-value mono">{{ formatTime(d.lastHeartbeat) }}</span>
            </div>
            <div class="dialog-info-row">
              <span class="info-label">离线时长</span>
              <span class="info-value mono" style="color:#f87171;">{{ offlineDuration(d.lastHeartbeat) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="dialog-body dialog-all-ok">
        <span class="pulse-dot online" style="width:12px;height:12px;"></span>
        <span class="all-ok-text">全部设备运行正常，无离线告警</span>
      </div>

      <template #footer>
        <el-button @click="showAlarmDialog = false">关闭</el-button>
        <el-button type="primary" @click="goAlarms">查看告警日志</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import PieChart from '@/components/PieChart.vue'
import LampIllustration from '@/components/LampIllustration.vue'
import DeviceTable from '@/components/DeviceTable.vue'
import { useDevices } from '@/composables/useDevices.js'

const router = useRouter()

const {
  devices, loading,
  loadDevices, loadLightHistory, generateMockLightData, normalizeLightRecord, buildChartData,
} = useDevices()

const theme = inject('theme', ref('dark'))

// ===== Mock 固定数据（API 不可用时的降级） =====
const MOCK_DEVICES = [
  { id: 'lamp_001', deviceId: 'lamp_001', name: '智慧路灯001', deviceName: '智慧路灯001', online: true,  status: 'online',  currentState: 'on',  mode: 'auto',   lastHeartbeat: new Date().toISOString() },
  { id: 'lamp_002', deviceId: 'lamp_002', name: '智慧路灯002', deviceName: '智慧路灯002', online: true,  status: 'online',  currentState: 'off', mode: 'auto',   lastHeartbeat: new Date().toISOString() },
  { id: 'lamp_003', deviceId: 'lamp_003', name: '智慧路灯003', deviceName: '智慧路灯003', online: false, status: 'offline', currentState: 'off', mode: 'manual', lastHeartbeat: new Date(Date.now() - 75 * 60000).toISOString() },
]

// 显示用的设备数据（API 数据优先，无数据时用 mock）
const displayDevices = computed(() => {
  if (devices.value.length > 0) return devices.value
  return MOCK_DEVICES
})

// 离线设备
const offlineDevices = computed(() => {
  return displayDevices.value.filter(d => !d.online)
})

// ===== 点位一览饼图数据 =====
const pointOverviewData = computed(() => {
  const online = displayDevices.value.filter(d => d.online).length
  const offline = displayDevices.value.filter(d => !d.online).length
  return [
    { name: '在线设备', value: online },
    { name: '离线设备', value: offline },
  ]
})

// ===== 弹窗 & 跳转 =====
const showAlarmDialog = ref(false)

function goControl() {
  router.push('/control')
}

function goHistory() {
  router.push('/history')
}

function openAlarmDialog() {
  showAlarmDialog.value = true
}

function goAlarms() {
  showAlarmDialog.value = false
  router.push('/alarms')
}

// ===== 离线时长计算 =====
function offlineDuration(lastHeartbeat) {
  if (!lastHeartbeat) return '—'
  const diff = Date.now() - new Date(lastHeartbeat).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时 ${minutes % 60} 分`
  const days = Math.floor(hours / 24)
  return `${days} 天 ${hours % 24} 小时`
}

// ===== 时间格式化 =====
function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ===== 光照趋势 ECharts（内联渲染） =====
const lightChartRef = ref(null)
const chartLoading = ref(true)
let lightChart = null
let lightResizeObserver = null

// 固定 7 天 mock 数据 (6/30 - 7/6)
const FIXED_LIGHT_LABELS = ['6/30', '7/1', '7/2', '7/3', '7/4', '7/5', '7/6']
const FIXED_LIGHT_VALUES = [420, 450, 380, 510, 470, 430, 490]

const lightXData = ref([...FIXED_LIGHT_LABELS])
const lightYData = ref([...FIXED_LIGHT_VALUES])

function lightChartColors() {
  const isDark = theme.value === 'dark'
  return {
    tooltipBg: isDark ? 'rgba(34, 43, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: isDark ? 'rgba(101, 138, 228, 0.3)' : 'rgba(101, 138, 228, 0.18)',
    tooltipText: isDark ? '#eef2fb' : '#1e2338',
    axisLabel: isDark ? '#7888af' : '#4e5678',
    splitLine: isDark ? 'rgba(101, 138, 228, 0.06)' : 'rgba(101, 138, 228, 0.08)',
    axisLine: isDark ? 'rgba(101, 138, 228, 0.12)' : 'rgba(101, 138, 228, 0.15)',
    areaTop: 'rgba(101, 138, 228, 0.25)',
    areaBottom: 'rgba(101, 138, 228, 0.01)',
  }
}

function buildLightChartOption() {
  const c = lightChartColors()
  return {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText, fontSize: 12 },
      formatter: (params) => {
        const p = params[0]
        return `<span style="color:${c.tooltipText}">${p.axisValue}</span><br/>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#658ae4;margin-right:6px;"></span>
          <span style="color:${c.tooltipText}">光照强度 </span>
          <span style="font-size:16px;font-weight:700;color:#87a5ed;">${p.value}</span>
          <span style="color:${c.tooltipText}"> lux</span>`
      },
    },
    grid: { top: 15, right: 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: lightXData.value,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: c.axisLabel, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'lux',
      nameTextStyle: { color: c.axisLabel, fontSize: 10 },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.axisLabel, fontSize: 10 },
    },
    series: [{
      name: '光照强度',
      type: 'line',
      data: lightYData.value,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#658ae4', width: 2.5 },
      itemStyle: {
        color: '#658ae4',
        borderColor: 'rgba(161,254,239,0.6)',
        borderWidth: 1.5,
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: c.areaTop },
          { offset: 1, color: c.areaBottom },
        ]),
      },
    }],
  }
}

function initLightChart() {
  if (!lightChartRef.value) return
  lightChart = echarts.init(lightChartRef.value)
  lightChart.setOption(buildLightChartOption())
}

async function loadLightData() {
  chartLoading.value = true
  try {
    if (displayDevices.value.length > 0) {
      const firstOnline = displayDevices.value.find(d => d.online)
      const deviceId = firstOnline ? firstOnline.id || firstOnline.deviceId : displayDevices.value[0].id
      const raw = await loadLightHistory(deviceId, '7d')
      if (raw && raw.length > 0) {
        const list = raw.map(normalizeLightRecord)
        const result = buildChartData(list, '7d')
        if (result.labels.length > 0) {
          lightXData.value = result.labels
          lightYData.value = result.values
        }
      }
    }
  } catch {
    // 使用固定 mock 数据
  } finally {
    chartLoading.value = false
    // 下一帧初始化图表，确保 DOM 已渲染
    setTimeout(() => initLightChart(), 50)
  }
}

// ===== 生命周期 =====
let refreshHandler = null
let autoRefreshTimer = null

onMounted(() => {
  loadDevices().then(() => loadLightData())
  refreshHandler = () => {
    loadDevices().then(() => {
      loadLightData()
      // 重新加载已存在图表
      setTimeout(() => {
        if (lightChart) {
          lightChart.setOption(buildLightChartOption())
        }
      }, 100)
    })
  }
  window.addEventListener('global-refresh', refreshHandler)

  autoRefreshTimer = setInterval(() => {
    loadDevices()
  }, 30000)

  // ResizeObserver for light chart
  if (lightChartRef.value) {
    lightResizeObserver = new ResizeObserver(() => lightChart?.resize())
    lightResizeObserver.observe(lightChartRef.value)
  }
})

onUnmounted(() => {
  if (refreshHandler) window.removeEventListener('global-refresh', refreshHandler)
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  lightResizeObserver?.disconnect()
  lightChart?.dispose()
})

// 主题切换时更新图表
watch(theme, () => {
  if (lightChart) lightChart.setOption(buildLightChartOption())
})

// 设备数据变化时更新图表
watch(displayDevices, () => {
  if (lightChart) {
    setTimeout(() => lightChart.setOption(buildLightChartOption()), 100)
  }
}, { deep: true })
</script>

<style scoped>
/* ===== 三栏大屏布局 ===== */
.dashboard-page {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 16px;
  min-height: calc(100vh - 80px);
  padding: 12px 16px 24px;
  min-width: 1200px;
}

/* ===== 面板通用 ===== */
.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel::-webkit-scrollbar {
  width: 3px;
}

.panel::-webkit-scrollbar-thumb {
  background: rgba(101, 138, 228, 0.15);
  border-radius: 2px;
}

.panel-center {
  justify-content: center;
}

/* ===== 卡片通用 ===== */
.panel-card {
  padding: 0;
  overflow: hidden;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
}

.card-badge {
  font-size: 11px;
  color: var(--color-brand-soft);
  background: rgba(101, 138, 228, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

.card-body {
  padding: 12px 16px 16px;
}

.compact-table {
  padding: 0;
}

.compact-table :deep(.device-table th),
.compact-table :deep(.device-table td) {
  padding: 8px 12px;
  font-size: 11px;
}

.compact-table :deep(.device-table th) {
  font-size: 10px;
}

/* ===== 图表区域 ===== */
.chart-wrap {
  min-height: 220px;
  padding: 0;
}

.chart-skeleton {
  width: 100%;
  height: 220px;
  border-radius: 8px;
}

.light-chart-inner {
  width: 100%;
  height: 220px;
}

/* ===== 告警头部卡片 ===== */
.alarm-header-card {
  background: rgba(248, 113, 113, 0.06);
  border-color: rgba(248, 113, 113, 0.15);
}

.alarm-header {
  border-bottom-color: rgba(248, 113, 113, 0.1);
}

.alarm-bell-icon {
  width: 16px;
  height: 16px;
  color: #f87171;
  animation: bell-shake 3s ease-in-out infinite;
}

@keyframes bell-shake {
  0%, 100% { transform: rotate(0); }
  5%, 15% { transform: rotate(8deg); }
  10%, 20% { transform: rotate(-8deg); }
}

.alarm-count-badge {
  font-size: 11px;
  color: #f87171;
  background: rgba(248, 113, 113, 0.12);
  padding: 2px 10px;
  border-radius: 10px;
}

/* ===== 告警列表项 ===== */
.alarm-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.alarm-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.alarm-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.alarm-device-id {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.alarm-level-tag {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  font-weight: 500;
}

.alarm-level-tag.critical {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.alarm-item-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 20px;
}

.alarm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alarm-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.alarm-value {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.alarm-value.mono {
  font-family: var(--font-mono);
  font-size: 10px;
}

/* ===== 全部在线状态 ===== */
.all-online {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px;
}

.all-online-text {
  font-size: 13px;
  color: var(--color-status-online);
  font-weight: 500;
}

/* ===== 告警弹窗 ===== */
.dialog-header-custom {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #f87171;
}

.dialog-alarm-icon {
  width: 20px;
  height: 20px;
  color: #f87171;
}

.dialog-body {
  padding: 4px 0;
}

.dialog-summary {
  padding: 10px 14px;
  margin-bottom: 14px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 8px;
}

.summary-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.summary-text strong {
  color: #f87171;
  font-size: 16px;
}

.dialog-alarm-item {
  padding: 14px;
  margin-bottom: 10px;
  background: rgba(248, 113, 113, 0.04);
  border: 1px solid rgba(248, 113, 113, 0.1);
  border-radius: 10px;
}

.dialog-alarm-item:last-child {
  margin-bottom: 0;
}

.dialog-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.dialog-device-id {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.dialog-item-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 20px;
}

.dialog-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.info-value.mono {
  font-family: var(--font-mono);
  font-size: 11px;
}

.dialog-all-ok {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px 0;
}

.all-ok-text {
  font-size: 14px;
  color: var(--color-status-online);
}

/* Element Plus dialog dark override */
:deep(.alarm-dialog) {
  --el-dialog-bg-color: var(--color-bg-secondary);
  --el-dialog-border-radius: 14px;
  --el-dialog-title-font-size: 16px;
}

:deep(.alarm-dialog .el-dialog) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-subtle);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

:deep(.alarm-dialog .el-dialog__header) {
  border-bottom: 1px solid rgba(248, 113, 113, 0.1);
  padding: 18px 24px;
  margin: 0;
}

:deep(.alarm-dialog .el-dialog__body) {
  padding: 20px 24px;
}

:deep(.alarm-dialog .el-dialog__footer) {
  border-top: 1px solid var(--color-border-subtle);
  padding: 14px 24px;
}

/* ===== 响应式 ===== */
@media (max-width: 1400px) {
  .dashboard-page {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    padding: 10px 12px;
  }
}

@media (max-width: 1100px) {
  .dashboard-page {
    grid-template-columns: 1fr 1fr;
    height: auto;
    min-width: 0;
    overflow: auto;
  }

  .panel-center {
    display: none;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    grid-template-columns: 1fr;
    height: auto;
    overflow: auto;
  }
}
</style>
