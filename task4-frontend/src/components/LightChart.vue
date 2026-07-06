<template>
  <div class="chart-card glass-card glow-border">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <span class="chart-subtitle" v-if="subtitle">{{ subtitle }}</span>
    </div>
    <div class="chart-body" ref="chartBody"></div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  title: String,
  subtitle: String,
  xData: { type: Array, default: () => [] },
  yData: { type: Array, default: () => [] },
  seriesName: { type: String, default: '光照强度' },
  unit: { type: String, default: 'lux' },
})

const chartBody = ref(null)
let chart = null
let resizeObserver = null

// 主题注入
const theme = inject('theme', ref('dark'))

function chartColors() {
  const isDark = theme.value === 'dark'
  return {
    tooltipBg: isDark ? 'rgba(34, 43, 69, 0.95)' : 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: isDark ? 'rgba(101, 138, 228, 0.3)' : 'rgba(101, 138, 228, 0.18)',
    tooltipText: isDark ? '#eef2fb' : '#1e2338',
    axisLabel: isDark ? '#7888af' : '#4e5678',
    splitLine: isDark ? 'rgba(101, 138, 228, 0.05)' : 'rgba(101, 138, 228, 0.08)',
    axisLine: isDark ? 'rgba(101, 138, 228, 0.12)' : 'rgba(101, 138, 228, 0.15)',
  }
}

function buildOption() {
  const c = chartColors()
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
    },
    grid: { top: 10, right: 20, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: props.xData,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: c.axisLabel, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: props.unit,
      nameTextStyle: { color: c.axisLabel, fontSize: 11 },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.axisLabel, fontSize: 11 },
    },
    series: [{
      name: props.seriesName,
      type: 'line',
      data: props.yData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 3,
      lineStyle: { color: '#658ae4', width: 2.5 },
      itemStyle: { color: '#658ae4' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(101, 138, 228, 0.22)' },
          { offset: 1, color: 'rgba(101, 138, 228, 0.01)' },
        ]),
      },
    }],
  }
}

function initChart() {
  if (!chartBody.value) return
  chart = echarts.init(chartBody.value)
  chart.setOption(buildOption())
}

onMounted(() => {
  initChart()
  resizeObserver = new ResizeObserver(() => chart?.resize())
  if (chartBody.value) resizeObserver.observe(chartBody.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})

// 数据变化
watch([() => props.xData, () => props.yData], () => {
  if (!chart) return
  chart.setOption({
    animation: true,
    animationDuration: 600,
    xAxis: { data: props.xData },
    series: [{ data: props.yData }],
  })
}, { deep: true })

// 主题切换
watch(theme, () => {
  if (!chart) return
  const c = chartColors()
  chart.setOption({
    tooltip: {
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      textStyle: { color: c.tooltipText },
    },
    xAxis: {
      axisLine: { lineStyle: { color: c.axisLine } },
      axisLabel: { color: c.axisLabel },
    },
    yAxis: {
      nameTextStyle: { color: c.axisLabel },
      splitLine: { lineStyle: { color: c.splitLine } },
      axisLabel: { color: c.axisLabel },
    },
  })
})
</script>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chart-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 18px 20px 0;
  flex-shrink: 0;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.chart-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
}

.chart-body {
  flex: 1;
  min-height: 300px;
  margin: 0 -4px -4px -4px;
}
</style>
