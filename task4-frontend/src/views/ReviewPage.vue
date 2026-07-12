<template>
  <div class="review-page">
    <!-- 工具栏 -->
    <div class="page-toolbar glass-card glow-border animate-fade-in-up">
      <div class="toolbar-left">
        <h2 class="toolbar-title">{{ isMunicipal ? '上报审核' : '审核记录' }}</h2>
        <span class="toolbar-count" v-if="!loading && isMunicipal">{{ pendingCount }} 条待审核</span>
      </div>
      <div class="toolbar-right">
        <select v-model="auditPassFilter" class="toolbar-select" @change="loadData">
          <option value="">全部AI结果</option>
          <option value="1">✅ AI通过</option>
          <option value="2">⚠️ AI不确定</option>
          <option value="0">❌ AI驳回</option>
        </select>
        <select v-model="reviewStatusFilter" class="toolbar-select" @change="loadData">
          <option value="">全部状态</option>
          <option value="pending_review">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
          <option value="ai_rejected">AI驳回</option>
        </select>
        <button class="refresh-btn-small ripple" @click="loadData" :disabled="loading">刷新</button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="review-list glass-card glow-border animate-fade-in-up" style="animation-delay:80ms">
      <div v-if="loading && list.length === 0" class="skeleton-wrap">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton sk-id"></div><div class="skeleton sk-name"></div>
          <div class="skeleton sk-tag"></div><div class="skeleton sk-tag"></div>
          <div class="skeleton sk-time"></div>
        </div>
      </div>

      <div v-else-if="!loading && list.length === 0" class="empty-state">暂无审核记录</div>

      <div v-else class="table-wrap">
        <table class="review-table">
          <thead>
            <tr>
              <th>ID</th><th>上报人</th><th>手机号</th><th>故障路灯</th>
              <th>AI结果</th><th>审核状态</th><th>故障描述</th><th>上报时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, idx) in list" :key="log.id" class="row-anim" :style="{ animationDelay: (idx*40)+'ms' }" @click="openDetail(log)">
              <td class="td-mono">{{ log.id }}</td>
              <td>{{ log.reportName || log.reporterName || '—' }}</td>
              <td class="td-mono">{{ maskPhone(log.reportPhone || log.reporterPhone) }}</td>
              <td class="td-mono">{{ log.lampId || extractLampId(log.faultContent) || '—' }}</td>
              <td><span class="ai-tag" :class="aiClass(log.auditPass)">{{ aiLabel(log.auditPass) }}</span></td>
              <td><span class="status-tag" :class="log.reviewStatus">{{ statusLabel(log.reviewStatus) }}</span></td>
              <td class="td-desc" :title="log.faultContent">{{ truncate(log.faultContent, 30) }}</td>
              <td class="td-mono td-time">{{ fmtTime(log.createTime || log.createdAt) }}</td>
              <td><button v-if="log.reviewStatus === 'pending_review' && isMunicipal" class="action-btn" @click.stop="openDetail(log)">审核</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page <= 1" @click="page--; loadData()">上一页</button>
        <span>第 {{ page }}/{{ totalPages }} 页</span>
        <button :disabled="page >= totalPages" @click="page++; loadData()">下一页</button>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <ModalOverlay :show="detailShow" @close="detailShow = false">
      <div class="detail-card">
        <h3 class="detail-title">上报审核 — #{{ detail.id }}</h3>
        <div class="detail-grid">
          <div class="d-item"><span class="d-label">上报人</span><span class="d-value">{{ detail.reportName || detail.reporterName }}</span></div>
          <div class="d-item"><span class="d-label">手机号</span><span class="d-value">{{ maskPhone(detail.reportPhone || detail.reporterPhone) }}</span></div>
          <div class="d-item"><span class="d-label">故障路灯</span><span class="d-value td-mono">{{ detail.lampId || extractLampId(detail.faultContent) || '—' }}</span></div>
          <div class="d-item"><span class="d-label">上报时间</span><span class="d-value">{{ fmtTime(detail.createTime || detail.createdAt) }}</span></div>
        </div>
        <div class="detail-desc">
          <div class="d-label">故障描述</div>
          <p class="desc-text">{{ detail.faultContent }}</p>
        </div>
        <div class="ai-block">
          <div class="ai-header">🤖 AI 校验结果</div>
          <div class="ai-result"><span class="ai-tag large" :class="aiClass(detail.auditPass)">{{ aiLabel(detail.auditPass) }}</span></div>
          <div v-if="detail.auditReason" class="ai-reason">AI 说明：{{ detail.auditReason }}</div>
        </div>

        <!-- 待审核 + 市政人员 → 操作区 -->
        <template v-if="detail.reviewStatus === 'pending_review' && isMunicipal">
          <div class="review-action">
            <label class="d-label">审核意见（驳回时必填）</label>
            <textarea v-model="reviewNote" class="review-textarea" placeholder="请输入审核意见..." rows="3"></textarea>
          </div>
          <div class="review-btns">
            <button class="btn-reject" :disabled="submitting" @click="doReject">{{ submitting ? '提交中...' : '驳回' }}</button>
            <button class="btn-approve" :disabled="submitting" @click="doApprove">{{ submitting ? '提交中...' : '审核通过' }}</button>
          </div>
        </template>

        <!-- 已审核 → 审核历史 -->
        <template v-else>
          <div class="review-history">
            <div class="d-label">📋 审核记录</div>
            <div class="d-item"><span class="d-label">审核人</span><span class="d-value">{{ detail.reviewerName || '—' }}</span></div>
            <div class="d-item"><span class="d-label">审核时间</span><span class="d-value">{{ fmtTime(detail.reviewTime || detail.reviewedAt) }}</span></div>
            <div class="d-item"><span class="d-label">审核结果</span><span class="status-tag" :class="detail.reviewStatus">{{ statusLabel(detail.reviewStatus) }}</span></div>
            <div v-if="detail.reviewReason" class="d-item"><span class="d-label">驳回原因</span><span class="d-value">{{ detail.reviewReason }}</span></div>
          </div>
        </template>
      </div>
    </ModalOverlay>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ModalOverlay from '@/components/ModalOverlay.vue'
import { useToast } from '@/composables/useToast.js'
import { getReviewList, getReviewDetail, approveReview, rejectReview } from '@/utils/api.ts'

const { showToast } = useToast()
const role = localStorage.getItem('role') || 'admin'
const isMunicipal = role === 'municipal'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)
const pendingCount = ref(0)
const auditPassFilter = ref('')
const reviewStatusFilter = ref(isMunicipal ? '' : '')
const detailShow = ref(false)
const detail = ref({})
const reviewNote = ref('')
const submitting = ref(false)
let refreshTimer = null

const pending = computed(() => list.value.filter(l => l.reviewStatus === 'pending_review').length)

function maskPhone(phone) {
  if (!phone) return '—'
  return String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '...' : (s || '—') }
function fmtTime(t) {
  if (!t) return '—'
  const d = new Date(t); if (isNaN(d.getTime())) return String(t).slice(0, 19)
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
}
function extractLampId(content) {
  const m = (content || '').match(/lamp_\d{3}/)
  return m ? m[0] : null
}
function aiLabel(v) {
  if (v === 1 || v === '1') return '✅ AI通过'
  if (v === 2 || v === '2') return '⚠️ AI不确定'
  if (v === 0 || v === '0') return '❌ AI驳回'
  return '—'
}
function aiClass(v) {
  if (v === 1 || v === '1') return 'ai-pass'
  if (v === 2 || v === '2') return 'ai-uncertain'
  if (v === 0 || v === '0') return 'ai-reject'
  return ''
}
function statusLabel(s) {
  const map = { pending_review:'待审核', approved:'已通过', rejected:'已驳回', ai_rejected:'AI驳回' }
  return map[s] || s || '—'
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize }
    if (auditPassFilter.value) params.auditPass = Number(auditPassFilter.value)
    if (reviewStatusFilter.value) params.reviewStatus = reviewStatusFilter.value
    const res = await getReviewList(params)
    const data = res.logs || res.list || res.data?.logs || res.data?.list || []
    list.value = data
    totalPages.value = res.totalPages || res.data?.totalPages || Math.ceil(data.length / pageSize) || 1
    pendingCount.value = res.pendingCount ?? res.data?.pendingCount ?? (Array.isArray(data) ? data.filter(l => l.reviewStatus === 'pending_review').length : 0)
  } catch { list.value = [] } finally { loading.value = false }
}
async function openDetail(log) {
  try {
    const res = await getReviewDetail(log.id)
    detail.value = res.log || res.data?.log || res.data || res
  } catch { detail.value = log }
  detailShow.value = true; reviewNote.value = ''
}
async function doApprove() {
  if (submitting.value) return
  submitting.value = true
  try {
    await approveReview(detail.value.id)
    showToast('审核通过', 'success')
    detailShow.value = false
    loadData()
  } catch (e) {
    showToast(e.message || '审核操作失败', 'error')
  } finally {
    submitting.value = false
  }
}
async function doReject() {
  if (!reviewNote.value.trim()) { showToast('驳回时请填写审核意见', 'error'); return }
  if (submitting.value) return
  submitting.value = true
  try {
    await rejectReview(detail.value.id, reviewNote.value.trim())
    showToast('已驳回', 'success')
    detailShow.value = false
    loadData()
  } catch (e) {
    showToast(e.message || '驳回操作失败', 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => { loadData(); refreshTimer = setInterval(loadData, 60000) })
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
.review-page { max-width: 1400px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; min-height: calc(100vh - 64px); }

.page-toolbar { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
.toolbar-left { display: flex; align-items: baseline; gap: 12px; }
.toolbar-title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.toolbar-count { font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono); }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.toolbar-select { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--color-border-subtle); background: var(--color-bg-secondary); color: var(--color-text-secondary); font-size: 12px; outline: none; font-family: var(--font-sans); }
.refresh-btn-small { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-border-subtle); background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 12px; transition: all 150ms ease; font-family: var(--font-sans); }
.refresh-btn-small:hover:not(:disabled) { color: var(--color-brand-soft); border-color: var(--color-border-glow); background: rgba(101,138,228,0.08); }

.review-list { overflow: hidden; }
.table-wrap { overflow-x: auto; }
.review-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.review-table th { text-align: left; padding: 12px 16px; color: var(--color-text-muted); font-weight: 500; font-size: 11px; letter-spacing: 0.5px; border-bottom: 1px solid var(--color-border-subtle); white-space: nowrap; }
.review-table td { padding: 12px 16px; border-bottom: 1px solid rgba(101,138,228,0.04); }
.row-anim { opacity: 0; animation: fade-in-up 350ms cubic-bezier(0.4,0,0.2,1) forwards; cursor: pointer; }
.review-table tbody tr:hover { background: rgba(101,138,228,0.04); }
.td-mono { font-family: var(--font-mono); font-size: 12px; }
.td-desc { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-text-secondary); }
.td-time { color: var(--color-text-muted); white-space: nowrap; }

.ai-tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 8px; white-space: nowrap; font-weight: 500; }
.ai-tag.large { font-size: 13px; padding: 4px 12px; }
.ai-tag.ai-pass { color: #22c55e; background: rgba(34,197,94,0.1); }
.ai-tag.ai-uncertain { color: #f59e0b; background: rgba(245,158,11,0.1); }
.ai-tag.ai-reject { color: #ef4444; background: rgba(239,68,68,0.1); }

.status-tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 8px; white-space: nowrap; }
.status-tag.pending_review { color: #f97316; background: rgba(249,115,22,0.1); }
.status-tag.approved { color: #22c55e; background: rgba(34,197,94,0.1); }
.status-tag.rejected { color: #ef4444; background: rgba(239,68,68,0.1); }
.status-tag.ai_rejected { color: #9ca3af; background: rgba(156,163,175,0.1); }

.action-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--color-border-subtle); background: transparent; color: var(--color-brand-soft); font-size: 11px; font-family: var(--font-sans); cursor: pointer; transition: all 150ms ease; }
.action-btn:hover { background: rgba(101,138,228,0.12); border-color: var(--color-border-glow); }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px; }
.pagination button { padding: 6px 16px; border-radius: 6px; border: 1px solid var(--color-border-subtle); background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 12px; font-family: var(--font-sans); }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: 12px; color: var(--color-text-muted); }

.empty-state { padding: 60px; text-align: center; color: var(--color-text-muted); font-size: 14px; }
.skeleton-wrap { padding: 8px 0; }
.skeleton-row { display: flex; gap: 16px; padding: 14px 16px; border-bottom: 1px solid rgba(101,138,228,0.04); }
.skeleton { height: 16px; border-radius: 4px; background: linear-gradient(90deg, rgba(101,138,228,0.06) 25%, rgba(101,138,228,0.14) 50%, rgba(101,138,228,0.06) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.sk-id { width: 40px; } .sk-name { width: 80px; } .sk-tag { width: 60px; } .sk-time { width: 120px; }

/* 弹窗 */
.detail-card { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 80vh; overflow-y: auto; }
.detail-title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.d-item { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; background: rgba(101,138,228,0.04); border-radius: 8px; }
.d-label { font-size: 11px; color: var(--color-text-muted); }
.d-value { font-size: 13px; color: var(--color-text-primary); }
.detail-desc { display: flex; flex-direction: column; gap: 6px; }
.desc-text { font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; background: rgba(101,138,228,0.04); padding: 10px; border-radius: 8px; }
.ai-block { background: rgba(101,138,228,0.05); border: 1px solid var(--color-border-subtle); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.ai-header { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.ai-reason { font-size: 12px; color: var(--color-text-muted); }
.review-action { display: flex; flex-direction: column; gap: 6px; }
.review-textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border-subtle); background: var(--color-bg-secondary); color: var(--color-text-primary); font-size: 13px; resize: vertical; font-family: var(--font-sans); outline: none; }
.review-textarea:focus { border-color: var(--color-brand); }
.review-btns { display: flex; gap: 12px; justify-content: flex-end; }
.btn-approve { padding: 10px 28px; border-radius: 8px; border: none; background: #22c55e; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-sans); transition: opacity 0.15s; }
.btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reject { padding: 10px 28px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3); background: transparent; color: #ef4444; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-sans); transition: opacity 0.15s; }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.review-history { display: flex; flex-direction: column; gap: 10px; background: rgba(101,138,228,0.03); border-radius: 10px; padding: 14px; }
</style>
