<template>
  <div class="app-shell">
    <TopNav
      v-if="!isLoginPage"
      :last-update="lastUpdate"
      :theme="theme"
      :current-user="currentUser"
      @refresh="handleRefresh"
      @toggle-theme="toggleTheme"
      @logout="handleLogout"
    />
    <main class="main-content" :class="{ 'no-nav': isLoginPage }">
      <router-view v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
    <ToastMessage />
  </div>
</template>

<script setup>
import { ref, computed, provide, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import { useTheme } from '@/composables/useTheme.js'

const route = useRoute()
const router = useRouter()

const isLoginPage = computed(() => route.name === 'Login')

// ===== 主题 =====
const { theme, toggleTheme } = useTheme()
provide('theme', theme)

// ===== 用户状态 =====
const currentUser = reactive({
  username: localStorage.getItem('username') || '',
  nickname: localStorage.getItem('nickname') || '管理员',
  role: localStorage.getItem('role') || 'admin',
  avatar: localStorage.getItem('avatar') || '管',
  roleName: localStorage.getItem('role') === 'municipal' ? '市政人员' : '路灯管理员',
})

function syncCurrentUser() {
  const role = localStorage.getItem('role') || 'admin'
  currentUser.username = localStorage.getItem('username') || ''
  currentUser.nickname = localStorage.getItem('nickname') || '管理员'
  currentUser.role = role
  currentUser.avatar = localStorage.getItem('avatar') || '管'
  currentUser.roleName = role === 'municipal' ? '市政人员' : '路灯管理员'
}

// ===== 刷新 =====
const lastUpdate = ref('')

function handleRefresh() {
  lastUpdate.value = new Date().toLocaleTimeString('zh-CN')
  window.dispatchEvent(new CustomEvent('global-refresh'))
}

// ===== 退出登录 =====
function handleLogout() {
  localStorage.removeItem('loggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('nickname')
  localStorage.removeItem('role')
  localStorage.removeItem('avatar')
  syncCurrentUser()
  router.push('/login')
}

onMounted(() => {
  window.addEventListener('auth-changed', syncCurrentUser)
  window.addEventListener('storage', syncCurrentUser)
})

onUnmounted(() => {
  window.removeEventListener('auth-changed', syncCurrentUser)
  window.removeEventListener('storage', syncCurrentUser)
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.main-content {
  padding-top: 64px;
  min-height: 100vh;
}

.main-content.no-nav {
  padding-top: 0;
}
</style>
