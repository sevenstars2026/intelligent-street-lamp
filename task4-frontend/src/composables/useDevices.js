import { ref, computed } from 'vue'
import { getDevices, getDeviceThreshold, getDeviceMode, getDeviceLightHistory } from '@/utils/api.ts'

// 模块级单例
const devices = ref([])
const loading = ref(false)
const error = ref(null)

// 派生计算
const onlineCount = computed(() => devices.value.filter(d => d.online).length)
const offlineCount = computed(() => devices.value.filter(d => !d.online).length)
const litCount = computed(() => devices.value.filter(d => d.currentState === 'on').length)
const autoModeCount = computed(() => devices.value.filter(d => d.mode === 'auto').length)

// 数据标准化
function normalizeDevice(d) {
  return {
    ...d,
    online: d.status === 'online',
    deviceId: d.id,
    deviceName: d.name,
  }
}

async function loadDevices() {
  loading.value = true
  error.value = null
  try {
    const res = await getDevices()
    devices.value = (res.data || []).map(normalizeDevice)
  } catch (e) {
    error.value = e.message || '加载设备失败'
    console.error('loadDevices:', e)
  } finally {
    loading.value = false
  }
}

// 加载单个设备的阈值
async function loadDeviceThreshold(deviceId) {
  try {
    const res = await getDeviceThreshold(deviceId)
    return res.data || null
  } catch {
    return null
  }
}

// 加载单个设备的模式
async function loadDeviceMode(deviceId) {
  try {
    const res = await getDeviceMode(deviceId)
    return res.data?.mode || 'auto'
  } catch {
    return 'auto'
  }
}

// 加载光照历史数据
async function loadLightHistory(deviceId, range) {
  const now = new Date()
  const rangeMap = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const start = new Date(now.getTime() - (rangeMap[range] || rangeMap['7d']))
  try {
    const res = await getDeviceLightHistory(deviceId, {
      startTime: start.toISOString(),
      endTime: now.toISOString(),
    })
    // 后端返回 { data: { deviceId, records: [...], count, aggregation } }
    // records 才是 LightDataRecord[] 数组
    const list = res.data?.records || res.data || []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// 标准化一条光照记录（后端字段: lightIntensity, timestamp）
function normalizeLightRecord(r) {
  const value = Number(r.lightIntensity ?? r.value ?? r.lightValue ?? r.avgLightIntensity ?? 0)
  return {
    time: r.timestamp || r.time,
    value: Number.isFinite(value) ? value : 0,
  }
}

// 生成随机模拟数据（API 不可用时的降级）
function generateMockLightData(points) {
  const data = []
  let base = 400
  for (let i = 0; i < points; i++) {
    base += (Math.random() - 0.5) * 200
    data.push(Math.max(50, Math.min(1000, Math.round(base))))
  }
  return data
}

function startOfHour(date) {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function bucketStart(time, range) {
  const d = new Date(time)
  return range === '24h' ? startOfHour(d) : startOfDay(d)
}

function sampleBucketValues(vals, subPoints) {
  if (!vals.length) return Array.from({ length: subPoints }, () => null)

  if (vals.length < subPoints) {
    const sampled = Array.from({ length: subPoints }, () => null)
    if (vals.length === 1) {
      sampled[Math.floor(subPoints / 2)] = vals[0]
      return sampled
    }

    vals.forEach((value, index) => {
      const targetIndex = Math.round(index * (subPoints - 1) / (vals.length - 1))
      sampled[targetIndex] = value
    })
    return sampled
  }

  return Array.from({ length: subPoints }, (_, index) => {
    const start = Math.floor(index * vals.length / subPoints)
    const end = Math.floor((index + 1) * vals.length / subPoints)
    const slice = vals.slice(start, Math.max(end, start + 1))
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length)
  })
}

// 构建图表数据：固定生成完整时间窗口，空桶用 null 占位，桶内保留多个采样点
function buildChartData(records, range) {
  if (!records || records.length === 0) return { labels: [], values: [] }

  const cfg = {
    '24h': { bucketMs: 3600000, bucketCount: 24, labelEvery: 1, subPoints: 4, fmt: d => `${String(d.getHours()).padStart(2, '0')}:00` },
    '7d':  { bucketMs: 86400000, bucketCount: 7, labelEvery: 1, subPoints: 8, fmt: d => `${d.getMonth() + 1}/${d.getDate()}` },
    '30d': { bucketMs: 86400000, bucketCount: 30, labelEvery: 5, subPoints: 3, fmt: d => `${d.getMonth() + 1}/${d.getDate()}` },
  }
  const { bucketMs, bucketCount, labelEvery, subPoints, fmt } = cfg[range] || cfg['7d']
  const now = new Date()
  const endKey = range === '24h' ? startOfHour(now) : startOfDay(now)
  const startKey = endKey - (bucketCount - 1) * bucketMs
  const buckets = new Map()

  for (let i = 0; i < bucketCount; i++) {
    buckets.set(startKey + i * bucketMs, [])
  }

  for (const r of records) {
    const t = new Date(r.time).getTime()
    if (isNaN(t)) continue
    const key = bucketStart(t, range)
    if (key < startKey || key > endKey || !buckets.has(key)) continue
    buckets.get(key).push(r.value)
  }

  const labels = []
  const values = []
  for (let i = 0; i < bucketCount; i++) {
    const key = startKey + i * bucketMs
    const vals = buckets.get(key).filter(v => Number.isFinite(v))
    const samples = sampleBucketValues(vals, subPoints)
    const labelIndex = Math.floor(subPoints / 2)
    for (let j = 0; j < subPoints; j++) {
      labels.push(j === labelIndex && i % labelEvery === 0 ? fmt(new Date(key)) : '')
      values.push(samples[j])
    }
  }

  return { labels, values }
}

export function useDevices() {
  return {
    devices, loading, error,
    onlineCount, offlineCount, litCount, autoModeCount,
    loadDevices, loadDeviceThreshold, loadDeviceMode,
    loadLightHistory, generateMockLightData, normalizeLightRecord,
    buildChartData,
    normalizeDevice,
  }
}
