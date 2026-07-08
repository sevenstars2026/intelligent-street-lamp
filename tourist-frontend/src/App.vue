<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <!-- Toast -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" :class="['toast-item', 'toast-' + t.type]">
        {{ t.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast'
const { toasts } = useToast()
</script>

<style scoped>
.app-shell { min-height: 100vh; background: var(--color-bg); }
</style>
