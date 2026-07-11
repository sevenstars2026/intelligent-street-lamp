<template>
  <div class="qa-page">
    <div class="qa-container glass-card">
      <!-- 加载中遮罩 -->
      <div v-if="loading && !loadFailed" class="qa-status">
        <div class="status-spinner"></div>
        <p class="status-text">正在连接 MaxKB 知识库...</p>
      </div>

      <!-- 连接失败遮罩 -->
      <div v-if="loadFailed" class="qa-status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="status-icon error">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="13"/>
          <circle cx="12" cy="16" r="0.8" fill="currentColor"/>
        </svg>
        <p class="status-text error-text">MaxKB 知识库服务暂不可用</p>
        <p class="status-hint">请确认 MaxKB 服务器已启动（{{ maxkbUrl }}）</p>
        <button class="retry-btn" @click="retry">重新连接</button>
      </div>

      <!-- iframe 始终在 DOM 中才能触发 @load -->
      <div class="qa-iframe-wrap">
        <iframe
          :key="iframeKey"
          :src="maxkbUrl"
          class="qa-iframe"
          allow="microphone"
          frameborder="0"
          @load="onIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 走 Vite 代理以剥离 X-Frame-Options / CSP 头，避免 iframe 被浏览器拦截
const maxkbUrl = '/maxkb/chat/1a18bc3351901450'

const loading = ref(true)
const loadFailed = ref(false)
const iframeKey = ref(0)
let timeoutId = null

// 8 秒后仍未加载完成则视为失败
onMounted(() => {
  timeoutId = setTimeout(() => {
    if (loading.value) {
      loading.value = false
      loadFailed.value = true
    }
  }, 8000)
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
})

function onIframeLoad() {
  if (timeoutId) clearTimeout(timeoutId)
  loading.value = false
  loadFailed.value = false
}

function retry() {
  loading.value = true
  loadFailed.value = false
  iframeKey.value++  // 强制销毁并重建 iframe，触发重新加载
  timeoutId = setTimeout(() => {
    if (loading.value) {
      loading.value = false
      loadFailed.value = true
    }
  }, 8000)
}
</script>

<style scoped>
.qa-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.qa-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  margin: 12px 16px;
  position: relative;
}

/* ===== 加载 / 错误遮罩（绝对定位盖在 iframe 上） ===== */
.qa-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--color-bg-primary);
  z-index: 2;
}

.status-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(101, 138, 228, 0.18);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-icon {
  width: 44px;
  height: 44px;
}

.status-icon.error {
  color: var(--color-status-offline);
}

.status-text {
  font-size: 15px;
  color: var(--color-text-secondary);
}

.status-text.error-text {
  color: var(--color-status-offline);
  font-weight: 500;
}

.status-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.retry-btn {
  margin-top: 8px;
  padding: 8px 24px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(101, 138, 228, 0.1);
  color: var(--color-brand-soft);
  font-size: 13px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 150ms ease;
}

.retry-btn:hover {
  background: rgba(101, 138, 228, 0.18);
  border-color: var(--color-border-glow);
}

/* ===== iframe 填满全部空间 ===== */
.qa-iframe-wrap {
  flex: 1;
  display: flex;
}

.qa-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
