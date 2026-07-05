<template>
  <div class="history-page">
    <!-- 浮动筛选栏 -->
    <div class="filter-bar glass-card glow-border animate-fade-in-up">
      <div class="filter-left">
        <div class="filter-group">
          <label class="filter-label">设备</label>
          <select v-model="selectedDevice" class="filter-select" @change="loadData">
            <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName || d.name }}</option>
          </select>
        </div>
        <div class="filter-divider"></div>
        <div class="time-presets">
          <button
            v-for="preset in presets"
            :key="preset.value"
            class="preset-btn"
            :class="{ active: activePreset === preset.value }"
            @click="activePreset = preset.value; loadData()"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
      <div class="filter-right">
        <span class="filter-hint" v-if="dataPoints > 0">{{ dataPoints }} 条数据点</span>
        <span class="filter-hint" v-else-if="chartLoading">加载中...</span>
      </div>
    </div>

    <!-- 沉浸式图表区 -->
    <div class="chart-immersive glass-card glow-border animate-fade-in-up" style="animation-delay: 100ms">
      <div class="chart-full" ref="chartContainer"></div>
    </div>

    <!-- 统计摘要条 -->
    <div class="summary-strip glass-card animate-fade-in-up" style="animation-delay: 180ms">
      <div class="summary-item">
        <span class="summary-label">平均光照</span>
        <span class="summary-value stat-number">{{ displayAvg }} <small>lux</small></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">峰值</span>
        <span class="summary-value stat-number" style="color: var(--color-brand-soft)">{{ displayMax }} <small>lux</small></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">谷值</span>
        <span class="summary-value stat-number" style="color: var(--color-text-muted)">{{ displayMin }} <small>lux</small></span>
      </div>
      <div class="summary-item">
        <span class="summary-label">采样区间</span>
        <span class="summary-value stat-number">{{ timeRange }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useDevices } from '@/composables/useDevices.js'

const { devices, loadDevices, loadLightHistory, generateMockLightData, normalizeLightRecord, buildChartData } = useDevices()
const theme = inject('theme', ref('dark'))

const chartContainer = ref(null)
let chart = null
let resizeObserver = null

const selectedDevice = ref('lamp_001')
const activePreset = ref('7d')
const chartLoading = ref(false)

const presets = [
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
]

const chartData = ref([])
const chartLabels = ref([])
const displayAvg = ref(0)
const displayMax = ref(0)
const displayMin = ref(0)

const dataPoints = computed(() => {
  // 与 buildChartData 桶大小一致：24h=24(每小时), 7d=7(每天), 30d=30(每天)
  if (activePreset.value === '24h') return 24
  if (activePreset.value === '7d') return 7
  return 30
})

const avgLight = computed(() => {
  if (!chartData.value.length) return 0
  return Math.round(chartData.value.reduce((a, b) => a + b, 0) / chartData.value.length)
})
const maxLight = computed(() => Math.max(...chartData.value, 0))
const minLight = computed(() => Math.min(...chartData.value, 9999) === 9999 ? 0 : Math.min(...chartData.value))
const timeRange = computed(() => activePreset.value === '24h' ? '24小时' : activePreset.value === '7d' ? '7天' : '30天')

function animateNumber(refObj, target, duration = 600) {
  const start = refObj.value
  const diff = target - start
  const startTime = performance.now()
  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    refObj.value = Math.round(start + diff * eased)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function generateLabels() {
  const now = new Date()
  const n = dataPoints.value
  // 与 buildChartData 一致：24h每2h, 7d每天, 30d每5天
  const labelEvery = activePreset.value === '24h' ? 2 : activePreset.value === '7d' ? 1 : 5

  if (activePreset.value === '24h') {
    // 24个点（1小时桶），每2个标一次 → 12个标签
    return Array.from({ length: n }, (_, i) => {
      if (i % labelEvery !== 0) return ''
      const d = new Date(now.getTime() - (n - 1 - i) * 3600000)
      return `${String(d.getHours()).padStart(2, '0')}:00`
    })
  }
  // 7天 / 30天：每天一个桶，步长 1 天
  return Array.from({ length: n }, (_, i) => {
    if (i % labelEvery !== 0) return ''
    const d = new Date(now.getTime() - (n - 1 - i) * 86400000)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
}

function chartColors() {
  const isDark = theme.value === 'dark'
  return {
    tooltipBg: isDark ? 'rgba(34, 43, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: isDark ? 'rgba(101, 138, 228, 0.3)' : 'rgba(101, 138, 228, 0.18)',
    tooltipText: isDark ? '#eef2fb' : '#1e2338',
    axisLabel: isDark ? '#7888af' : '#4e5678',
    splitLine: isDark ? 'rgba(101, 138, 228, 0.06)' : 'rgba(101, 138, 228, 0.1)',
    axisLine: isDark ? 'rgba(101, 138, 228, 0.15)' : 'rgba(101, 138, 228, 0.18)',
  }
}

function initChart() {
  if (!chartContainer.value) return
  chart = echarts.init(chartContainer.value)
  updateChartOption()
}

function updateChartOption() {
  if (!chart) return
  const c = chartColors()
  chart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText, fontSize: 13 },
    },
    grid: { top: 20, right: 40, bottom: 30, left: 60 },
    xAxis: {
      type: 'category',
      data: chartLabels.value,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: c.axisLabel,
        fontSize: 11,
        interval: (_index, value) => value !== '',
      },
    },
    yAxis: {
      type: 'value',
      name: 'lux',
      nameTextStyle: { color: c.axisLabel, fontSize: 11 },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.axisLabel, fontSize: 11 },
    },
    series: [{
      name: '光照强度',
      type: 'line',
      data: chartData.value,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#658ae4', width: 2.5 },
      itemStyle: { color: '#658ae4' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(101, 138, 228, 0.28)' },
          { offset: 1, color: 'rgba(101, 138, 228, 0.01)' },
        ]),
      },
    }],
  })
}

async function loadData() {
  chartLoading.value = true
  try {
    const raw = await loadLightHistory(selectedDevice.value, activePreset.value)
    if (raw && raw.length > 0) {
      const list = raw.map(normalizeLightRecord)
      const result = buildChartData(list, activePreset.value)
      chartLabels.value = result.labels
      chartData.value = result.values
    } else {
      chartLabels.value = generateLabels()
      chartData.value = generateMockLightData(dataPoints.value)
    }
  } catch {
    chartLabels.value = generateLabels()
    chartData.value = generateMockLightData(dataPoints.value)
  } finally {
    chartLoading.value = false
    updateChartOption()
    setTimeout(() => {
      animateNumber(displayAvg, avgLight.value)
      animateNumber(displayMax, maxLight.value)
      animateNumber(displayMin, minLight.value)
    }, 300)
  }
}

// 主题切换
watch(theme, () => {
  if (!chart) return
  const c = chartColors()
  chart.setOption({
    tooltip: { backgroundColor: c.tooltipBg, borderColor: c.tooltipBorder, textStyle: { color: c.tooltipText } },
    xAxis: { data: chartLabels.value, axisLine: { lineStyle: { color: c.axisLine } }, axisLabel: { color: c.axisLabel } },
    yAxis: { nameTextStyle: { color: c.axisLabel }, splitLine: { lineStyle: { color: c.splitLine } }, axisLabel: { color: c.axisLabel } },
  })
})

onMounted(async () => {
  await loadDevices()
  if (devices.value.length > 0) {
    selectedDevice.value = devices.value[0].id
  }
  initChart()
  await loadData()

  resizeObserver = new ResizeObserver(() => chart?.resize())
  if (chartContainer.value) resizeObserver.observe(chartContainer.value)

  // 监听全局刷新
  window.addEventListener('global-refresh', loadData)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
  window.removeEventListener('global-refresh', loadData)
})
</script>

<style scoped>
.history-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 64px);
}

.filter-bar {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.filter-select {
  padding: 6px 30px 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(255,255,255,0.04);
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: border-color 150ms ease;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 20 20' fill='%237888af' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}

.filter-select:focus { border-color: var(--color-brand); }

.filter-select option {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.filter-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border-subtle);
}

.time-presets { display: flex; gap: 4px; }

.preset-btn {
  padding: 6px 14px; border-radius: 6px;
  border: 1px solid transparent; background: transparent;
  color: var(--color-text-secondary); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 150ms ease; font-family: var(--font-sans);
}

.preset-btn:hover { color: var(--color-text-primary); background: rgba(101, 138, 228, 0.08); }

.preset-btn.active {
  color: var(--color-brand-soft); background: rgba(101, 138, 228, 0.12);
  border-color: rgba(101, 138, 228, 0.2);
}

.filter-right { display: flex; align-items: center; }

.filter-hint {
  font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono);
}

.chart-immersive {
  flex: 1; display: flex; min-height: 420px; overflow: hidden; padding: 4px;
}

.chart-full {
  flex: 1; min-height: 400px; margin: -4px;
}

.summary-strip {
  padding: 16px 24px; display: flex; gap: 32px;
}

.summary-item { display: flex; flex-direction: column; gap: 4px; }

.summary-label { font-size: 11px; color: var(--color-text-muted); }

.summary-value {
  font-size: 20px; font-family: var(--font-mono); font-weight: 700; letter-spacing: -0.5px;
}

.summary-value small { font-size: 12px; font-weight: 400; color: var(--color-text-muted); }

@media (max-width: 768px) {
  .summary-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .filter-bar { flex-direction: column; align-items: flex-start; }
}
</style>
