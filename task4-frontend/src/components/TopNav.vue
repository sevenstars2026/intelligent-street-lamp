<template>
  <header class="topnav">
    <div class="topnav-brand">
      <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2L4 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <span class="brand-text">智慧路灯管理系统</span>
    </div>

    <!-- 管理员导航：设备管理 | 智能问答 | 故障上报 | 通讯报警 -->
    <nav class="topnav-links" v-if="isAdmin">
      <router-link to="/control" class="nav-link" active-class="nav-link--active">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
          <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
        </svg>
        设备管理
      </router-link>
      <router-link to="/qa" class="nav-link" active-class="nav-link--active">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        智能问答
      </router-link>
      <router-link to="/fault-reports" class="nav-link" active-class="nav-link--active">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        故障上报
      </router-link>
      <router-link to="/alarms" class="nav-link" active-class="nav-link--active">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
          <path d="M10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
        </svg>
        通讯报警
      </router-link>
    </nav>

    <!-- 市政人员导航：仅数据总览 -->
    <nav class="topnav-links" v-else>
      <router-link to="/dashboard" class="nav-link" active-class="nav-link--active">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
        </svg>
        数据总览
      </router-link>
    </nav>

    <div class="topnav-right">
      <button class="theme-toggle-btn" @click="$emit('toggleTheme')" :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'">
        <svg v-if="theme === 'dark'" viewBox="0 0 20 20" fill="currentColor" class="theme-icon">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
        </svg>
        <svg v-else viewBox="0 0 20 20" fill="currentColor" class="theme-icon">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
        </svg>
      </button>

      <button class="refresh-btn ripple" @click="handleRefresh" title="刷新数据">
        <svg viewBox="0 0 20 20" fill="currentColor" class="refresh-icon" :class="{ spinning: isRefreshing }">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
        </svg>
        <span class="refresh-text">刷新</span>
      </button>

      <span class="update-time" v-if="lastUpdate">最后更新: {{ lastUpdate }}</span>

      <div class="user-badge">
        <span class="user-avatar">{{ userAvatar }}</span>
        <span class="user-name">{{ userName }}</span>
      </div>

      <button class="logout-btn" @click="$emit('logout')" title="退出登录">
        <svg viewBox="0 0 20 20" fill="currentColor" class="logout-icon">
          <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  lastUpdate: String,
  theme: String,
  currentUser: { type: Object, default: () => ({ nickname: '管理员', role: 'admin', avatar: '管' }) },
})
const emit = defineEmits(['refresh', 'toggleTheme', 'logout'])

const isRefreshing = ref(false)

const isAdmin = computed(() => props.currentUser?.role === 'admin')
const userName = computed(() => props.currentUser?.nickname || '管理员')
const userAvatar = computed(() => props.currentUser?.avatar || '管')

function handleRefresh() {
  isRefreshing.value = true
  emit('refresh')
  setTimeout(() => { isRefreshing.value = false }, 800)
}
</script>

<style scoped>
.topnav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 56px; display: flex; align-items: center; gap: 32px;
  padding: 0 24px; background: var(--color-bg-nav);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border-subtle);
}
.topnav-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.brand-icon { width: 24px; height: 24px; color: var(--color-brand); }
.brand-text { font-size: 15px; font-weight: 600; color: var(--color-text-primary); letter-spacing: 0.5px; white-space: nowrap; }
.topnav-links { display: flex; gap: 4px; flex: 1; }
.nav-link {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px;
  font-size: 13px; color: var(--color-text-secondary); text-decoration: none; transition: all 150ms ease;
}
.nav-link:hover { color: var(--color-text-primary); background: rgba(101,138,228,0.08); }
.nav-link--active { color: var(--color-brand-soft); background: rgba(101,138,228,0.12); }
.nav-icon { width: 16px; height: 16px; flex-shrink: 0; }
.topnav-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.theme-toggle-btn {
  display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
  border-radius: 6px; border: 1px solid var(--color-border-subtle); background: transparent;
  color: var(--color-text-secondary); cursor: pointer; transition: all 200ms ease;
}
.theme-toggle-btn:hover { color: var(--color-accent); border-color: var(--color-border-glow); background: rgba(161,254,239,0.08); }
.theme-icon { width: 16px; height: 16px; transition: transform 300ms ease; }
.theme-toggle-btn:hover .theme-icon { transform: rotate(15deg); }
.refresh-btn {
  display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px;
  border: 1px solid var(--color-border-subtle); background: transparent;
  color: var(--color-text-secondary); cursor: pointer; font-size: 12px; transition: all 150ms ease; font-family: var(--font-sans);
}
.refresh-btn:hover { color: var(--color-brand-soft); border-color: var(--color-border-glow); background: rgba(101,138,228,0.08); }
.refresh-icon { width: 14px; height: 14px; transition: transform 600ms ease; }
.refresh-icon.spinning { animation: spin 600ms ease; }
@keyframes spin { to { transform: rotate(360deg); } }
.update-time { font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono); }
.user-badge {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: 20px;
  background: rgba(101,138,228,0.1); border: 1px solid var(--color-border-subtle);
}
.user-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-brand-strong), var(--color-brand));
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff;
}
.user-name { font-size: 12px; color: var(--color-text-secondary); }
.logout-btn {
  display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;
  border-radius: 6px; border: 1px solid transparent; background: transparent;
  color: var(--color-text-muted); cursor: pointer; transition: all 150ms ease;
}
.logout-btn:hover { color: var(--color-status-offline); border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.06); }
.logout-icon { width: 16px; height: 16px; }
</style>
