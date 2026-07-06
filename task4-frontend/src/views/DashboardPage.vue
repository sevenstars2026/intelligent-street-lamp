<template>
  <div class="dashboard-page">
    <!-- ===== 顶部统计卡片 ===== -->
    <section class="stats-grid stagger-children">
      <!-- 亮灯设备 -->
      <StatCard
        label="亮灯设备"
        :value="litCount"
        unit="台"
        valueColor="#4ade80"
        iconColor="#4ade80"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="stat-icon-svg">
            <path d="M12 2v1"/>
            <path d="M12 15c-3.31 0-6-2.24-6-5s2.69-5 6-5 6 2.24 6 5-2.69 5-6 5z"/>
            <path d="M9 15v2c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-2"/>
            <path d="M10 20h4"/>
            <line x1="9" y1="8" x2="15" y2="8" stroke-width="0.8"/>
            <path d="M12 2c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1V3c0-.55-.45-1-1-1z"/>
          </svg>
        </template>
      </StatCard>

      <!-- 在线设备 -->
      <StatCard
        label="在线设备"
        :value="onlineCount"
        unit="台"
        :subtitle="onlineSubtitle"
        valueColor="#658ae4"
        iconColor="#658ae4"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="stat-icon-svg">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
        </template>
      </StatCard>

      <!-- 离线告警 -->
      <StatCard
        label="离线告警"
        :value="offlineAlarmCount"
        unit="台"
        :subtitle="offlineSubtitle"
        :valueColor="offlineAlarmCount > 0 ? '#ef4444' : '#4ade80'"
        :iconColor="offlineAlarmCount > 0 ? '#ef4444' : '#4ade80'"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="stat-icon-svg">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </template>
      </StatCard>

      <!-- 控制模式 -->
      <StatCard
        label="控制模式"
        :value="modeText"
        valueColor="#87a5ed"
        iconColor="#87a5ed"
        :animate="false"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="stat-icon-svg">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </template>
      </StatCard>
    </section>

    <!-- ===== 离线告警条 ===== -->
    <Transition name="alert-bar">
      <div class="alert-bar" v-if="offlineAlarmCount > 0 && !alertDismissed">
        <svg viewBox="0 0 20 20" fill="currentColor" class="alert-icon">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span class="alert-text">以下设备存在离线告警：<strong>{{ offlineAlarmDeviceNames }}</strong></span>
        <button class="alert-close" @click="alertDismissed = true" title="关闭">
          <svg viewBox="0 0 20 20" fill="currentColor" class="close-icon">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ===== 光照趋势图表 ===== -->
    <section class="chart-section">
      <div v-if="chartLoading" class="chart-skeleton skeleton"></div>
      <LightChart
        v-else
        title="近7天光照趋势"
        subtitle="默认设备光照强度"
        :xData="chartXData"
        :yData="chartYData"
      />
    </section>

    <!-- ===== 设备状态列表 ===== -->
    <section class="table-section glass-card">
      <div class="table-header">
        <h2 class="section-title">设备状态列表</h2>
        <span class="device-count">{{ devices.length }} 台设备</span>
      </div>
      <DeviceTable :devices="devices" :showActions="false" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import LightChart from '@/components/LightChart.vue'
import DeviceTable from '@/components/DeviceTable.vue'
import { useDevices } from '@/composables/useDevices.js'
import { getAlarms } from '@/utils/api.ts'

const {
  devices, loading, error,
  onlineCount, offlineCount, litCount, autoModeCount,
  loadDevices, loadLightHistory, generateMockLightData, normalizeLightRecord, buildChartData,
} = useDevices()

// ---- 告警条 ----
const alertDismissed = ref(false)
const offlineAlarmError = ref(false)
const activeOfflineAlarms = ref([])

const offlineDeviceNames = computed(() => {
  const offline = devices.value.filter(d => !d.online)
  return offline.map(d => d.deviceName || d.name || d.deviceId || d.id).join('、') || '—'
})

const offlineAlarmCount = computed(() => {
  return offlineAlarmError.value ? offlineCount.value : activeOfflineAlarms.value.length
})

const offlineAlarmDeviceNames = computed(() => {
  if (offlineAlarmError.value) return offlineDeviceNames.value
  return activeOfflineAlarms.value
    .map(a => a.deviceName || a.device_name || a.deviceId || a.device_id)
    .filter(Boolean)
    .join('、') || '—'
})

const offlineSubtitle = computed(() => {
  if (offlineAlarmError.value) return '告警接口异常，已按设备状态降级'
  if (offlineAlarmCount.value === 0) return '暂无活动告警'
  return '需要立即关注'
})

const onlineSubtitle = computed(() => {
  const total = devices.value.length
  if (total === 0) return '占设备总数'
  const pct = Math.round((onlineCount.value / total) * 100)
  return `占设备总数 ${pct}%`
})

const modeText = computed(() => {
  const manualCount = devices.value.length - autoModeCount.value
  return autoModeCount.value >= manualCount ? '自动' : '手动'
})

// ---- 图表 ----
const chartLoading = ref(true)
const chartXData = ref([])
const chartYData = ref([])

async function loadOfflineAlarms() {
  try {
    const res = await getAlarms({ status: 'active', alarmType: 'offline', pageSize: 100 })
    const list = res.data?.alarms || res.data || []
    activeOfflineAlarms.value = Array.isArray(list) ? list : []
    offlineAlarmError.value = false
  } catch {
    activeOfflineAlarms.value = []
    offlineAlarmError.value = true
  }
}

async function loadChartData() {
  chartLoading.value = true
  try {
    if (devices.value.length > 0) {
      const raw = await loadLightHistory(devices.value[0].id, '7d')
      if (raw && raw.length > 0) {
        const list = raw.map(normalizeLightRecord)
        const result = buildChartData(list, '7d')
        chartXData.value = result.labels
        chartYData.value = result.values
      } else {
        useMockData()
      }
    } else {
      useMockData()
    }
  } catch {
    useMockData()
  } finally {
    chartLoading.value = false
  }
}

function useMockData() {
  const now = new Date()
  // 7天、每天一个标签
  chartXData.value = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  chartYData.value = generateMockLightData(7)
}

// ---- 生命周期 ----
let refreshHandler = null
let autoRefreshTimer = null

onMounted(() => {
  loadDevices().then(() => {
    loadOfflineAlarms()
    loadChartData()
  })
  refreshHandler = () => {
    alertDismissed.value = false
    loadDevices().then(() => {
      loadOfflineAlarms()
      loadChartData()
    })
  }
  window.addEventListener('global-refresh', refreshHandler)

  // 每 30 秒自动刷新设备状态（不重新加载图表）
  autoRefreshTimer = setInterval(() => {
    loadDevices()
    loadOfflineAlarms()
  }, 30000)
})

onUnmounted(() => {
  if (refreshHandler) {
    window.removeEventListener('global-refresh', refreshHandler)
  }
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* ---- 统计卡片网格 ---- */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* ---- 告警条 ---- */
.alert-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.alert-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--color-status-offline);
}

.alert-text {
  flex: 1;
  min-width: 0;
}

.alert-text strong {
  color: var(--color-status-offline);
}

.alert-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 150ms ease;
}

.alert-close:hover {
  color: var(--color-text-primary);
}

.close-icon {
  width: 14px;
  height: 14px;
}

/* alert bar transition */
.alert-bar-enter-active {
  animation: fade-in-up 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.alert-bar-leave-active {
  animation: fade-in 200ms ease-in reverse;
}

/* ---- 图表区域 ---- */
.chart-section {
  min-height: 300px;
}

.chart-skeleton {
  width: 100%;
  height: 320px;
  border-radius: 12px;
}

/* ---- 设备表区域 ---- */
.table-section {
  padding: 0;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.device-count {
  font-size: 12px;
  color: var(--color-text-muted);
}

.stat-icon-svg {
  width: 18px;
  height: 18px;
}

/* ---- 响应式 ---- */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
