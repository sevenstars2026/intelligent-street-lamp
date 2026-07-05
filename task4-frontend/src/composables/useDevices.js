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
  return {
    time: r.timestamp || r.time,
    value: r.lightIntensity ?? r.value ?? r.lightValue ?? r.avgLightIntensity ?? 0,
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

// 构建图表数据：小桶分组（数据点密）+ 隔 N 个桶标一次标签（标签疏、不重复）
function buildChartData(records, range) {
  if (!records || records.length === 0) return { labels: [], values: [] }

  // bucketMs: 分桶粒度  labelEvery: 标签间隔(桶数)  subPoints: 每桶采点数
  // 注：桶大小必须是 label 精度单位的整数倍，确保每个桶的 fmt 输出唯一
  const cfg = {
    '24h': { bucketMs: 3600000,     labelEvery: 2, subPoints: 5, fmt: d => `${String(d.getHours()).padStart(2, '0')}:00` },
    '7d':  { bucketMs: 86400000,    labelEvery: 1, subPoints: 5, fmt: d => `${d.getMonth() + 1}/${d.getDate()}` },
    '30d': { bucketMs: 86400000,    labelEvery: 5, subPoints: 6, fmt: d => `${d.getMonth() + 1}/${d.getDate()}` },
  }
  const { bucketMs, labelEvery, subPoints, fmt } = cfg[range] || cfg['7d']

  // 1. 按时间段分桶
  const buckets = new Map()
  for (const r of records) {
    const t = new Date(r.time).getTime()
    if (isNaN(t)) continue
    const key = Math.floor(t / bucketMs) * bucketMs
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(r.value)
  }

  // 2. 按时间排序
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0])

  // 桶总数少时不跳标签
  const effectiveEvery = sorted.length <= labelEvery ? 1 : labelEvery

  // 3. 每个桶采点，按 effectiveEvery 间隔标标签
  const labels = []
  const values = []
  for (let bi = 0; bi < sorted.length; bi++) {
    const [bucketKey, vals] = sorted[bi]
    const showLabel = bi % effectiveEvery === 0
    const label = showLabel ? fmt(new Date(bucketKey)) : ''

    // 桶内采点
    let pts
    if (vals.length <= subPoints) {
      pts = vals
    } else {
      pts = []
      for (let i = 0; i < subPoints; i++) {
        const s = Math.floor(i * vals.length / subPoints)
        const e = Math.floor((i + 1) * vals.length / subPoints)
        pts.push(Math.round(vals.slice(s, e).reduce((a, v) => a + v, 0) / (e - s)))
      }
    }

    const labelIdx = Math.floor(pts.length / 2)
    for (let i = 0; i < pts.length; i++) {
      labels.push(i === labelIdx ? label : '')
      values.push(pts[i])
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
