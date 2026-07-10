<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <Transition name="route" mode="out-in">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </Transition>
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
.route-enter-active, .route-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.route-enter-from { opacity: 0; transform: translateX(12px); }
.route-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
