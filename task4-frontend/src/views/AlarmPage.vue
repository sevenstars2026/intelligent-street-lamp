<template>
  <div class="alarm-page">
    <!-- 页面标题栏 -->
    <div class="page-toolbar glass-card glow-border animate-fade-in-up">
      <div class="toolbar-left">
        <h2 class="toolbar-title">告警日志</h2>
        <span class="toolbar-count" v-if="!loading">{{ totalCount }} 条告警</span>
      </div>
      <div class="toolbar-right">
        <select v-model="statusFilter" class="toolbar-select" @change="handleFilterChange">
          <option value="">全部状态</option>
          <option value="active">待处理</option>
          <option value="resolved">已解决</option>
        </select>
        <select v-model="levelFilter" class="toolbar-select" @change="handleFilterChange">
          <option value="">全部等级</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <button class="refresh-btn-small ripple" @click="loadAlarmData" :disabled="loading">
          <svg viewBox="0 0 20 20" fill="currentColor" class="refresh-icon-sm" :class="{ spinning: loading }">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          刷新
        </button>
      </div>
    </div>

    <!-- 告警列表 -->
    <div class="alarm-list glass-card glow-border animate-fade-in-up" style="animation-delay: 80ms">
      <!-- 加载骨架 -->
      <div v-if="loading && alarms.length === 0" class="alarm-skeleton">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton skeleton-id"></div>
          <div class="skeleton skeleton-name"></div>
          <div class="skeleton skeleton-tag"></div>
          <div class="skeleton skeleton-tag"></div>
          <div class="skeleton skeleton-time"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && alarms.length === 0" class="alarm-empty">
        <svg viewBox="0 0 20 20" fill="currentColor" class="empty-icon">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span class="empty-text">暂无告警</span>
        <span class="empty-sub">所有设备运行正常</span>
      </div>

      <!-- 告警表格 -->
      <div v-else class="table-wrap">
        <table class="alarm-table">
          <thead>
            <tr>
              <th>告警 ID</th>
              <th>关联设备</th>
              <th>等级</th>
              <th>类型</th>
              <th>状态</th>
              <th>告警描述</th>
              <th>发生时间</th>
              <th>处理人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(a, idx) in alarms"
              :key="a.alarmId"
              class="alarm-row-anim"
              :style="{ animationDelay: (idx * 40) + 'ms' }"
            >
              <td class="td-mono">{{ a.alarmId }}</td>
              <td>{{ a.deviceName }}</td>
              <td>
                <span class="level-tag" :style="{ color: getLevelConfig(a.level).color, background: getLevelConfig(a.level).bg }">
                  {{ getLevelConfig(a.level).label }}
                </span>
              </td>
              <td>
                <span class="type-tag">{{ typeLabel(a.type) }}</span>
              </td>
              <td>
                <span class="status-tag" :class="a.status">
                  {{ a.status === 'active' ? '待处理' : '已解决' }}
                </span>
              </td>
              <td class="td-msg">{{ a.message || '—' }}</td>
              <td class="td-mono td-time">{{ formatTime(a.createdAt) }}</td>
              <td>{{ a.handlerName || '—' }}</td>
              <td>
                <button
                  v-if="a.status === 'active' && isAdmin && a.type !== 'fault_report'"
                  class="resolve-btn"
                  :disabled="resolvingId === a.alarmId"
                  @click="handleResolve(a)"
                >
                  {{ resolvingId === a.alarmId ? '处理中...' : '处理' }}
                </button>
                <span v-else-if="a.status === 'active' && a.type === 'fault_report'" class="handled-text hint-text">在故障上报页处理</span>
                <span v-else-if="a.status !== 'active'" class="handled-text">{{ formatTime(a.handledAt) }}</span>
                <span v-else class="handled-text">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-bar" v-if="!loading && totalPages > 1">
        <button class="page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">上一页</button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页</button>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="alarm-error">
        <span>{{ error }}</span>
        <button class="retry-btn" @click="loadAlarmData">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAlarms } from '@/composables/useAlarms.js'
import { useToast } from '@/composables/useToast.js'

const { alarms, loading, error, pagination, loadAlarms, resolveAlarm, getLevelConfig } = useAlarms()
const { showToast } = useToast()

const role = localStorage.getItem('role') || 'admin'
const isAdmin = role === 'admin'

let refreshTimer = null
let refreshHandler = null

const statusFilter = ref('')
const levelFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const resolvingId = ref(null)

const totalCount = computed(() => pagination.value.total || alarms.value.length)
const totalPages = computed(() => Math.max(1, pagination.value.totalPages || 1))

function typeLabel(type) {
  const map = {
    offline: '设备离线',
    control_failed: '控制失败',
    frequent_switch: '频繁开关',
    fault_report: '游客上报',
    threshold_anomaly: '阈值异常',
  }
  return map[type] || type || '—'
}

function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadAlarmData() {
  await loadAlarms({
    status: statusFilter.value || undefined,
    level: levelFilter.value || undefined,
    page: currentPage.value,
    pageSize: pageSize.value,
  })
}

function handleFilterChange() {
  currentPage.value = 1
  loadAlarmData()
}

function goPage(page) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  loadAlarmData()
}

async function handleResolve(alarm) {
  if (!alarm?.alarmId || !window.confirm(`确认处理告警 ${alarm.alarmId}？`)) return
  resolvingId.value = alarm.alarmId
  try {
    await resolveAlarm(alarm.alarmId, '前端确认处理')
    showToast('告警已处理', 'success')
    await loadAlarmData()
  } catch (e) {
    showToast(e.message || '处理告警失败', 'error')
  } finally {
    resolvingId.value = null
  }
}

onMounted(() => {
  loadAlarmData()
  refreshHandler = () => loadAlarmData()
  window.addEventListener('global-refresh', refreshHandler)
  // 每60秒自动刷新
  refreshTimer = setInterval(loadAlarmData, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (refreshHandler) window.removeEventListener('global-refresh', refreshHandler)
})
</script>

<style scoped>
.alarm-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 64px);
}

/* ===== 工具栏 ===== */
.page-toolbar {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.toolbar-count {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toolbar-select {
  padding: 6px 28px 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-primary);
  font-size: 12px;
  font-family: var(--font-sans);
  outline: none;
}

.toolbar-select option {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.refresh-btn-small {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: all 150ms ease;
  font-family: var(--font-sans);
}

.refresh-btn-small:hover:not(:disabled) {
  color: var(--color-brand-soft);
  border-color: var(--color-border-glow);
  background: rgba(101, 138, 228, 0.08);
}

.refresh-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }

.refresh-icon-sm { width: 14px; height: 14px; }

.refresh-icon-sm.spinning { animation: spin 800ms linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 告警列表 ===== */
.alarm-list { overflow: hidden; }

.table-wrap { overflow-x: auto; }

.alarm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.alarm-table th {
  text-align: left;
  padding: 12px 16px;
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-subtle);
  white-space: nowrap;
}

.alarm-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(101, 138, 228, 0.04);
}

.alarm-row-anim {
  opacity: 0;
  animation: fade-in-up 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.alarm-table tbody tr:hover {
  background: rgba(101, 138, 228, 0.04);
}

.td-mono {
  font-family: var(--font-mono);
  font-size: 12px;
}

.td-msg {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
}

.td-time {
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ===== 等级标签 ===== */
.level-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 8px;
  white-space: nowrap;
}

.type-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  background: rgba(100, 116, 139, 0.1);
  white-space: nowrap;
}

/* ===== 状态标签 ===== */
.status-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 8px;
  white-space: nowrap;
}

.status-tag.active {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.status-tag.resolved {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.1);
}

.resolve-btn,
.page-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(101, 138, 228, 0.1);
  color: var(--color-brand-soft);
  font-size: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
}

.resolve-btn:hover:not(:disabled),
.page-btn:hover:not(:disabled) {
  border-color: var(--color-border-glow);
  background: rgba(101, 138, 228, 0.16);
}

.resolve-btn:disabled,
.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.handled-text {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
}
.hint-text {
  color: var(--color-brand-soft);
  font-style: italic;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--color-border-subtle);
}

.page-info {
  color: var(--color-text-muted);
  font-size: 12px;
  font-family: var(--font-mono);
}

/* ===== 骨架屏 ===== */
.alarm-skeleton { padding: 8px 0; }

.skeleton-row {
  display: flex; gap: 16px; padding: 14px 16px;
  border-bottom: 1px solid rgba(101, 138, 228, 0.04);
}

.skeleton {
  height: 16px; border-radius: 4px;
  background: linear-gradient(90deg,
    rgba(101, 138, 228, 0.06) 25%,
    rgba(101, 138, 228, 0.14) 50%,
    rgba(101, 138, 228, 0.06) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-id { width: 80px; }
.skeleton-name { width: 100px; }
.skeleton-tag { width: 50px; }
.skeleton-time { width: 130px; }

/* ===== 空状态 ===== */
.alarm-empty {
  padding: 80px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon {
  width: 48px; height: 48px;
  color: var(--color-text-muted); opacity: 0.3;
}

.empty-text {
  font-size: 16px; color: var(--color-text-muted); font-weight: 500;
}

.empty-sub {
  font-size: 12px; color: var(--color-text-muted); opacity: 0.6;
}

/* ===== 错误 ===== */
.alarm-error {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-status-offline);
  font-size: 13px;
}

.retry-btn {
  padding: 6px 16px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent; color: var(--color-brand-soft);
  font-size: 12px; cursor: pointer; font-family: var(--font-sans);
  transition: all 150ms ease;
}

.retry-btn:hover { background: rgba(101, 138, 228, 0.1); }

@media (max-width: 768px) {
  .alarm-page { padding: 16px; }
  .page-toolbar { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
