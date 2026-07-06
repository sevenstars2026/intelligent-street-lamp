import { ref } from 'vue'
import { getAlarms, resolveAlarm as resolveAlarmApi } from '@/utils/api.ts'

// 模块级单例
const alarms = ref([])
const loading = ref(false)
const error = ref(null)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
})

async function loadAlarms(params) {
  loading.value = true
  error.value = null
  try {
    const res = await getAlarms(params)
    // 后端返回 { code, data: { alarms: [...], pagination: {...} } }
    const list = res.data?.alarms || res.data || []
    alarms.value = (Array.isArray(list) ? list : []).map(normalizeAlarm)
    const pageInfo = res.data?.pagination || {}
    pagination.value = {
      page: pageInfo.page || params?.page || 1,
      pageSize: pageInfo.pageSize || params?.pageSize || alarms.value.length || 20,
      total: pageInfo.total ?? alarms.value.length,
      totalPages: pageInfo.totalPages || Math.max(1, Math.ceil((pageInfo.total ?? alarms.value.length) / (pageInfo.pageSize || params?.pageSize || 20))),
    }
  } catch (e) {
    error.value = e.message || '加载告警失败'
    console.error('loadAlarms:', e)
  } finally {
    loading.value = false
  }
}

async function resolveAlarm(alarmId, note) {
  try {
    const res = await resolveAlarmApi(alarmId, note)
    // 更新本地列表中对应告警状态
    const idx = alarms.value.findIndex(a => a.alarmId === alarmId)
    if (idx !== -1) {
      alarms.value[idx] = { ...alarms.value[idx], status: 'resolved', ...res.data }
    }
    return res
  } catch (e) {
    console.error('resolveAlarm:', e)
    throw e
  }
}

function normalizeAlarm(a) {
  return {
    ...a,
    alarmId: a.alarmId || a.id,
    deviceName: a.deviceName || a.device_name || '—',
    // 后端字段: alarmLevel, alarmType, status='active'|'resolved'
    level: a.alarmLevel || a.level || 'low',
    type: a.alarmType || a.type || 'offline',
    status: a.status || 'active',
    message: a.message || a.description || '',
    createdAt: a.createdAt || a.created_at || a.createTime || new Date().toISOString(),
    handledAt: a.handledAt || a.resolvedAt || a.handled_at || a.resolved_at || '',
    handlerName: a.handlerName || a.handler_name || a.resolvedBy || '',
  }
}

// 等级配置
const levelConfig = {
  critical: { label: '严重', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high: { label: '高', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  medium: { label: '中', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  low: { label: '低', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
}

function getLevelConfig(level) {
  return levelConfig[level] || levelConfig.low
}

export function useAlarms() {
  return { alarms, loading, error, pagination, loadAlarms, resolveAlarm, getLevelConfig }
}
