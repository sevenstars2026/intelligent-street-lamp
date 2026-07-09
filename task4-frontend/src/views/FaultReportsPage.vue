<template>
  <div class="fault-reports-page">
    <!-- 页面标题栏 -->
    <div class="page-toolbar glass-card glow-border animate-fade-in-up">
      <div class="toolbar-left">
        <h2 class="toolbar-title">故障上报</h2>
        <span class="toolbar-count" v-if="!loading">{{ totalCount }} 条上报</span>
      </div>
      <div class="toolbar-right">
        <select v-model="statusFilter" class="toolbar-select" @change="handleFilterChange">
          <option value="">全部状态</option>
          <option value="active">待处理</option>
          <option value="resolved">已解决</option>
        </select>
        <button class="refresh-btn-small ripple" @click="loadData" :disabled="loading">
          <svg viewBox="0 0 20 20" fill="currentColor" class="refresh-icon-sm" :class="{ spinning: loading }">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
          </svg>
          刷新
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="report-list glass-card glow-border animate-fade-in-up" style="animation-delay: 80ms">
      <!-- 加载骨架 -->
      <div v-if="loading && reports.length === 0" class="skeleton-wrap">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton skeleton-id"></div>
          <div class="skeleton skeleton-name"></div>
          <div class="skeleton skeleton-phone"></div>
          <div class="skeleton skeleton-lamp"></div>
          <div class="skeleton skeleton-desc"></div>
          <div class="skeleton skeleton-time"></div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading && reports.length === 0" class="empty-wrap">
        <svg viewBox="0 0 20 20" fill="currentColor" class="empty-icon">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span class="empty-text">暂无故障上报</span>
      </div>

      <!-- 表格 -->
      <div v-else class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>上报人</th>
              <th>手机号</th>
              <th>故障路灯</th>
              <th>描述</th>
              <th>照片</th>
              <th>上报时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, idx) in reports" :key="r.id" class="row-anim row-clickable" :style="{ animationDelay: (idx * 40) + 'ms' }" @click="openDetail(r)">
              <td class="td-mono">{{ r.id }}</td>
              <td>{{ r.reporterName }}</td>
              <td class="td-mono">{{ maskPhone(r.reporterPhone) }}</td>
              <td class="td-mono">{{ r.lampId }}</td>
              <td class="td-desc" :title="r.description">{{ r.description }}</td>
              <td>
                <div class="photo-thumbs" v-if="r.photoUrls && r.photoUrls.length">
                  <img
                    v-for="(url, pi) in r.photoUrls"
                    :key="pi"
                    :src="'/uploads/' + url"
                    class="photo-thumb"
                    @error="onImgError"
                  />
                </div>
                <span v-else class="no-photo">—</span>
              </td>
              <td class="td-mono td-time">{{ formatTime(r.createdAt) }}</td>
              <td>
                <span class="status-tag" :class="r.status">
                  {{ r.status === 'active' ? '待处理' : '已解决' }}
                </span>
              </td>
              <td>
                <button
                  v-if="r.status === 'active'"
                  class="resolve-btn"
                  :disabled="resolvingId === r.id"
                  @click.stop="handleResolve(r)"
                >
                  {{ resolvingId === r.id ? '处理中...' : '处理' }}
                </button>
                <span v-else class="handled-text">{{ formatTime(r.resolvedAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination-bar" v-if="!loading && totalPages > 1">
        <button class="page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">上一页</button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页</button>
      </div>

      <!-- 错误 -->
      <div v-if="error" class="error-wrap">
        <span>{{ error }}</span>
        <button class="retry-btn" @click="loadData">重试</button>
      </div>
    </div>

    <!-- 照片预览弹窗（z-index 高于详情弹窗） -->
    <ModalOverlay v-if="previewUrl" :show="true" :z-index="300" @close="previewUrl = null">
      <img :src="previewUrl" class="preview-img" @error="previewUrl = null" />
    </ModalOverlay>

    <!-- 故障详情弹窗 -->
    <ModalOverlay v-if="selectedReport" :show="true" :title="'故障详情 #' + selectedReport.id" @close="selectedReport = null">
      <div class="detail-body">
        <!-- 照片区域 -->
        <div class="detail-photos" v-if="selectedReport.photoUrls && selectedReport.photoUrls.length">
          <img
            v-for="(url, pi) in selectedReport.photoUrls"
            :key="pi"
            :src="'/uploads/' + url"
            class="detail-photo"
            @click.stop="previewPhoto('/uploads/' + url)"
            @error="onImgError"
          />
        </div>
        <div class="detail-photos detail-photos-empty" v-else>
          <span class="no-photo">无现场照片</span>
        </div>

        <!-- 信息区 -->
        <div class="detail-info">
          <div class="detail-row">
            <span class="detail-label">状态</span>
            <span class="status-tag" :class="selectedReport.status">
              {{ selectedReport.status === 'active' ? '待处理' : '已解决' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">上报人</span>
            <span class="detail-value">{{ selectedReport.reporterName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">手机号</span>
            <span class="detail-value td-mono">{{ maskPhone(selectedReport.reporterPhone) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">故障路灯</span>
            <span class="detail-value td-mono">{{ selectedReport.lampId }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">上报时间</span>
            <span class="detail-value td-mono">{{ formatTime(selectedReport.createdAt) }}</span>
          </div>
          <div class="detail-row detail-row-desc">
            <span class="detail-label">故障描述</span>
            <span class="detail-value desc-text">{{ selectedReport.description }}</span>
          </div>
          <div class="detail-row" v-if="selectedReport.status === 'resolved'">
            <span class="detail-label">处理时间</span>
            <span class="detail-value td-mono">{{ formatTime(selectedReport.resolvedAt) }}</span>
          </div>
          <div class="detail-row" v-if="selectedReport.resolveNote">
            <span class="detail-label">处理备注</span>
            <span class="detail-value">{{ selectedReport.resolveNote }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="detail-close-btn" @click="selectedReport = null">关闭</button>
        <button
          v-if="selectedReport.status === 'active'"
          class="resolve-btn"
          :disabled="resolvingId === selectedReport.id"
          @click.stop="handleResolve(selectedReport)"
        >
          {{ resolvingId === selectedReport.id ? '处理中...' : '标记为已处理' }}
        </button>
      </template>
    </ModalOverlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ModalOverlay from '@/components/ModalOverlay.vue'
import { useToast } from '@/composables/useToast.js'
import { getFaultReports, resolveFaultReport } from '@/utils/api.ts'

const { showToast } = useToast()

const reports = ref([])
const loading = ref(false)
const error = ref(null)
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)
const totalPages = ref(1)
const resolvingId = ref(null)
const previewUrl = ref(null)
const selectedReport = ref(null)

let refreshTimer = null

function openDetail(report) {
  selectedReport.value = report
}

function maskPhone(phone) {
  if (!phone) return '—'
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onImgError(e) {
  e.target.style.display = 'none'
}

function previewPhoto(url) {
  previewUrl.value = url
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const res = await getFaultReports({
      status: statusFilter.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    const data = res.data || {}
    const list = data.reports || data.list || data || []
    reports.value = Array.isArray(list) ? list : []
    const pi = data.pagination || {}
    totalCount.value = pi.total ?? reports.value.length
    totalPages.value = pi.totalPages || Math.max(1, Math.ceil(totalCount.value / pageSize.value))
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  currentPage.value = 1
  loadData()
}

function goPage(page) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  loadData()
}

async function handleResolve(r) {
  if (!window.confirm(`确认处理故障上报 #${r.id}？`)) return
  resolvingId.value = r.id
  try {
    await resolveFaultReport(r.id)
    showToast('已标记为处理完成', 'success')
    await loadData()
  } catch (e) {
    showToast(e.message || '处理失败', 'error')
  } finally {
    resolvingId.value = null
  }
}

onMounted(() => {
  loadData()
  refreshTimer = setInterval(loadData, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.fault-reports-page {
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
.toolbar-left { display: flex; align-items: baseline; gap: 12px; }
.toolbar-title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.toolbar-count { font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono); }
.toolbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.toolbar-select {
  padding: 6px 28px 6px 10px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-primary); font-size: 12px;
  font-family: var(--font-sans); outline: none;
}
.toolbar-select option { color: var(--color-text-primary); background: var(--color-bg-secondary); }
.refresh-btn-small {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent; color: var(--color-text-secondary);
  cursor: pointer; font-size: 12px; font-family: var(--font-sans);
  transition: all 150ms ease;
}
.refresh-btn-small:hover:not(:disabled) {
  color: var(--color-brand-soft); border-color: var(--color-border-glow);
  background: rgba(101, 138, 228, 0.08);
}
.refresh-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-icon-sm { width: 14px; height: 14px; }
.refresh-icon-sm.spinning { animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 列表 ===== */
.report-list { overflow: hidden; }
.table-wrap { overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.report-table th {
  text-align: left; padding: 12px 16px;
  color: var(--color-text-muted); font-weight: 500;
  font-size: 11px; letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-subtle); white-space: nowrap;
}
.report-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(101, 138, 228, 0.04);
}
.row-anim { opacity: 0; animation: fade-in-up 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.report-table tbody tr:hover { background: rgba(101, 138, 228, 0.04); }
.td-mono { font-family: var(--font-mono); font-size: 12px; }
.td-desc {
  max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--color-text-secondary);
}
.td-time { color: var(--color-text-muted); white-space: nowrap; }

/* 照片缩略图 */
.photo-thumbs { display: flex; gap: 4px; }
.photo-thumb {
  width: 32px; height: 32px; border-radius: 4px; object-fit: cover;
  border: 1px solid var(--color-border-subtle); cursor: pointer;
  transition: transform 0.15s;
}
.photo-thumb:hover { transform: scale(2.2); z-index: 1; }
.no-photo { color: var(--color-text-muted); font-size: 12px; }

/* 状态 */
.status-tag { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 8px; white-space: nowrap; }
.status-tag.active { color: #f97316; background: rgba(249, 115, 22, 0.1); }
.status-tag.resolved { color: var(--color-status-online); background: rgba(34, 197, 94, 0.1); }

/* 按钮 */
.resolve-btn, .page-btn {
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(101, 138, 228, 0.1);
  color: var(--color-brand-soft);
  font-size: 12px; font-family: var(--font-sans); cursor: pointer;
}
.resolve-btn:hover:not(:disabled), .page-btn:hover:not(:disabled) {
  border-color: var(--color-border-glow);
  background: rgba(101, 138, 228, 0.16);
}
.resolve-btn:disabled, .page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.handled-text { color: var(--color-text-muted); font-size: 12px; white-space: nowrap; }

.pagination-bar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; padding: 14px 16px;
  border-top: 1px solid var(--color-border-subtle);
}
.page-info { color: var(--color-text-muted); font-size: 12px; font-family: var(--font-mono); }

/* 骨架屏 */
.skeleton-wrap { padding: 8px 0; }
.skeleton-row { display: flex; gap: 16px; padding: 14px 16px; border-bottom: 1px solid rgba(101, 138, 228, 0.04); }
.skeleton {
  height: 16px; border-radius: 4px;
  background: linear-gradient(90deg, rgba(101,138,228,0.06) 25%, rgba(101,138,228,0.14) 50%, rgba(101,138,228,0.06) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skeleton-id { width: 40px; }
.skeleton-name { width: 60px; }
.skeleton-phone { width: 80px; }
.skeleton-lamp { width: 70px; }
.skeleton-desc { width: 120px; }
.skeleton-time { width: 100px; }

/* 空状态 */
.empty-wrap { padding: 80px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty-icon { width: 48px; height: 48px; color: var(--color-text-muted); opacity: 0.3; }
.empty-text { font-size: 16px; color: var(--color-text-muted); font-weight: 500; }

/* 错误 */
.error-wrap { padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--color-status-offline); font-size: 13px; }
.retry-btn {
  padding: 6px 16px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent; color: var(--color-brand-soft);
  font-size: 12px; cursor: pointer; font-family: var(--font-sans);
}

/* 行可点击 */
.row-clickable { cursor: pointer; }
.row-clickable:hover { background: rgba(101, 138, 228, 0.06) !important; }

/* 照片预览 */
.preview-img { max-width: 90vw; max-height: 85vh; border-radius: 8px; }

/* ===== 详情弹窗 ===== */
.detail-body { display: flex; flex-direction: column; gap: 20px; }

/* 照片 */
.detail-photos {
  display: flex; gap: 10px; flex-wrap: wrap;
  padding: 16px; background: rgba(0,0,0,0.15); border-radius: 10px;
  justify-content: center;
}
.detail-photos-empty { padding: 32px 16px; }
.detail-photo {
  max-width: 100%; max-height: 260px; border-radius: 8px;
  object-fit: contain; cursor: pointer;
  border: 1px solid var(--color-border-subtle);
  transition: transform 0.15s;
}
.detail-photo:hover { transform: scale(1.03); }

/* 信息 */
.detail-info { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; align-items: flex-start; gap: 12px; }
.detail-row-desc { flex-direction: column; gap: 6px; }
.detail-label {
  font-size: 12px; color: var(--color-text-muted);
  min-width: 60px; flex-shrink: 0;
}
.detail-value { font-size: 13px; color: var(--color-text-primary); }
.desc-text { line-height: 1.7; }

.detail-close-btn {
  padding: 7px 18px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent; color: var(--color-text-secondary);
  font-size: 13px; cursor: pointer; font-family: var(--font-sans);
}
.detail-close-btn:hover { border-color: var(--color-border-glow); color: var(--color-text-primary); }

/* 详情弹窗宽度 */
:deep(.modal-card) { max-width: 560px; }

@media (max-width: 768px) {
  .fault-reports-page { padding: 16px; }
  .page-toolbar { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
