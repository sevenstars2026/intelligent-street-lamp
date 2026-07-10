<template>
  <nav class="bottom-nav">
    <router-link v-for="item in items" :key="item.to" :to="item.to" class="nav-item" active-class="nav-item--active">
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
const items = [
  { to: '/',       icon: '🏠', label: '首页' },
  { to: '/spots',  icon: '📸', label: '拍照' },
  { to: '/events', icon: '🎆', label: '活动' },
  { to: '/report', icon: '⚠️', label: '上报' },
]
</script>

<style scoped>
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  display: flex; justify-content: space-around;
  background: #fff; border-top: 1px solid var(--color-divider);
  padding: 6px 0 env(safe-area-inset-bottom, 6px) 0;
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 4px 12px; text-decoration: none; color: var(--color-text-muted);
  font-size: 11px; transition: color 0.2s;
}
.nav-item--active { color: var(--color-primary-dark); }
.nav-item--active .nav-icon { animation: nav-bounce 0.35s ease; }
.nav-icon { font-size: 22px; line-height: 1; transition: transform 0.2s; }
.nav-item:active .nav-icon { transform: scale(0.85); }
@keyframes nav-bounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.nav-label { font-weight: 500; }
</style>
