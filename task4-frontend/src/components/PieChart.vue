<template>
  <div class="pie-chart-card glass-card glow-border">
    <div class="pie-header" v-if="title">
      <span class="pie-title">{{ title }}</span>
    </div>
    <div class="pie-body" ref="chartRef"></div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, default: '' },
  data: { type: Array, default: () => [] },
  centerLabel: { type: String, default: '' },
  centerValue: { type: [String, Number], default: '' },
  colors: { type: Array, default: () => ['#4ade80', '#f87171', '#658ae4', '#fbbf24'] },
})

const chartRef = ref(null)
let chart = null
let resizeObserver = null
const theme = inject('theme', ref('dark'))

function chartColors() {
  const isDark = theme.value === 'dark'
  return {
    tooltipBg: isDark ? 'rgba(34, 43, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: isDark ? 'rgba(101, 138, 228, 0.3)' : 'rgba(101, 138, 228, 0.18)',
    tooltipText: isDark ? '#eef2fb' : '#1e2338',
    labelColor: isDark ? '#b4c2e0' : '#4e5678',
    pieBorder: isDark ? 'rgba(34, 43, 69, 0.6)' : 'rgba(255, 255, 255, 0.9)',
  }
}

function buildOption() {
  const c = chartColors()
  const total = props.data.reduce((sum, d) => sum + d.value, 0)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText, fontSize: 12 },
      formatter: (p) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0
        return `<span style="color:${c.tooltipText}">${p.name}</span><br/>
          <span style="font-size:18px;font-weight:700;color:${p.color}">${p.value} 台</span>
          <span style="color:${c.tooltipText}"> (${pct}%)</span>`
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: c.pieBorder,
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'outside',
          color: c.labelColor,
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: {
          lineStyle: { color: c.labelColor },
        },
        emphasis: {
          label: { fontSize: 14, fontWeight: 'bold' },
          scaleSize: 8,
        },
        data: props.data.map((d, i) => ({
          ...d,
          itemStyle: { color: props.colors[i % props.colors.length] },
        })),
      },
    ],
    graphic: props.centerLabel ? [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: props.centerLabel,
          textAlign: 'center',
          fill: c.labelColor,
          fontSize: 11,
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '50%',
        style: {
          text: String(props.centerValue),
          textAlign: 'center',
          fill: '#eef2fb',
          fontSize: 22,
          fontWeight: 'bold',
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        },
      },
    ] : [],
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption(buildOption())
}

onMounted(() => {
  initChart()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  if (chartRef.value) resizeObserver.observe(chartRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})

watch(() => props.data, () => {
  if (!chart) return
  chart.setOption(buildOption())
}, { deep: true })

watch(theme, () => {
  if (!chart) return
  chart.setOption(buildOption())
})
</script>

<style scoped>
.pie-chart-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 300px;
}

.pie-header {
  padding: 14px 16px 0;
  flex-shrink: 0;
}

.pie-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.pie-body {
  flex: 1;
  min-height: 260px;
  margin: 0;
}
</style>
