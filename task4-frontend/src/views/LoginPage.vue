<template>
  <div class="login-bg">
    <!-- 背景装饰 -->
    <div class="bg-orb bg-orb--1"></div>
    <div class="bg-orb bg-orb--2"></div>
    <div class="bg-orb bg-orb--3"></div>
    <div class="bg-grid"></div>

    <!-- 登录卡片 -->
    <div class="login-card glass-card glow-border animate-scale-in">
      <div class="login-header">
        <svg class="login-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L4 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <h1 class="login-title">智慧路灯管理系统</h1>
        <p class="login-subtitle">Smart Street Light Management</p>
      </div>

      <form class="login-form" @submit.prevent="doLogin">
        <div class="form-group">
          <label class="form-label">账号</label>
          <input
            v-model="loginForm.username"
            type="text"
            class="form-input"
            placeholder="请输入账号"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <div class="form-group">
          <label class="form-label">角色</label>
          <div class="role-selector">
            <button
              v-for="role in roles"
              :key="role.value"
              type="button"
              class="role-btn"
              :class="{ active: loginForm.role === role.value }"
              @click="loginForm.role = role.value"
            >
              {{ role.label }}
            </button>
          </div>
        </div>

        <div class="error-msg" v-if="loginError">{{ loginError }}</div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="login-spinner"></span>
          <span v-else>登 录</span>
        </button>
      </form>

      <p class="login-hint">演示账号：admin / 123456（管理员）| manager / 123456（管理员）</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loginForm = reactive({ username: 'admin', password: '123456', role: 'municipal' })
const loading = ref(false)
const loginError = ref('')

const roles = [
  { label: '市政人员', value: 'municipal' },
  { label: '路灯管理员', value: 'admin' },
]

const validUsers = {
  municipal: { nickname: '张工', roleName: '市政人员', avatar: '张' },
  admin: { nickname: '李管理', roleName: '路灯管理员', avatar: '李' },
}

async function doLogin() {
  loginError.value = ''
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 400))

    const validCredentials = [
      { username: 'admin', password: '123456', roles: ['municipal', 'admin'] },
      { username: 'manager', password: '123456', roles: ['admin'] },
    ]
    const match = validCredentials.find(
      c => c.username === loginForm.username && c.password === loginForm.password
    )
    if (!match) throw new Error('账号或密码错误')
    if (!match.roles.includes(loginForm.role)) throw new Error('该账号无此角色权限')

    const u = validUsers[loginForm.role]
    localStorage.setItem('loggedIn', '1')
    localStorage.setItem('username', loginForm.username)
    localStorage.setItem('nickname', u.nickname)
    localStorage.setItem('role', loginForm.role)
    localStorage.setItem('avatar', u.avatar)
    window.dispatchEvent(new CustomEvent('auth-changed'))

    router.push(loginForm.role === 'admin' ? '/control' : '/dashboard')
  } catch (e) {
    loginError.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  position: relative;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.1;
}

.bg-orb--1 {
  width: 600px; height: 600px;
  background: var(--color-brand-strong);
  top: -200px; right: -150px;
  animation: orb-drift-1 20s ease-in-out infinite;
}

.bg-orb--2 {
  width: 450px; height: 450px;
  background: var(--color-brand);
  bottom: -180px; left: -120px;
  animation: orb-drift-2 25s ease-in-out infinite;
}

.bg-orb--3 {
  width: 300px; height: 300px;
  background: var(--color-accent);
  top: 40%; left: 50%; opacity: 0.05;
  animation: orb-drift-3 18s ease-in-out infinite;
}

@keyframes orb-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-40px, 30px) scale(1.05); }
  66% { transform: translate(20px, -20px) scale(0.95); }
}

@keyframes orb-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -40px) scale(1.08); }
}

@keyframes orb-drift-3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, 20px); }
}

.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(101, 138, 228, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(101, 138, 228, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

.login-card {
  position: relative; z-index: 1;
  width: 420px; max-width: 90vw;
  padding: 40px 36px 32px;
}

.login-header { text-align: center; margin-bottom: 32px; }

.login-logo {
  width: 48px; height: 48px;
  color: var(--color-brand);
  margin-bottom: 14px;
}

.login-title {
  font-size: 22px; font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 1px; margin-bottom: 4px;
}

.login-subtitle {
  font-size: 12px; color: var(--color-text-muted);
  letter-spacing: 1px;
}

.login-form { display: flex; flex-direction: column; gap: 18px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); }

.form-input {
  width: 100%; padding: 10px 14px; border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-primary);
  font-size: 14px; font-family: var(--font-sans); outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.form-input::placeholder { color: var(--color-text-muted); }

.form-input:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px rgba(101, 138, 228, 0.12);
}

.role-selector { display: flex; gap: 8px; }

.role-btn {
  flex: 1; padding: 8px; border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px; cursor: pointer;
  transition: all 150ms ease; font-family: var(--font-sans);
}

.role-btn:hover { border-color: var(--color-border-glow); color: var(--color-text-primary); }

.role-btn.active {
  border-color: var(--color-brand);
  background: rgba(101, 138, 228, 0.12);
  color: var(--color-brand-soft);
}

.error-msg {
  font-size: 12px; color: var(--color-status-offline);
  text-align: center; padding: 8px; border-radius: 6px;
  background: rgba(239, 68, 68, 0.08);
}

.login-btn {
  margin-top: 4px; width: 100%; padding: 12px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, var(--color-brand-strong), var(--color-brand));
  color: #fff; font-size: 15px; font-weight: 600; letter-spacing: 2px; cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease; font-family: var(--font-sans);
}

.login-btn:hover { opacity: 0.92; transform: translateY(-1px); }
.login-btn:active { transform: translateY(0); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.login-spinner {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.login-hint {
  margin-top: 20px; text-align: center;
  font-size: 11px; color: var(--color-text-muted);
}
</style>
