<template>
  <span class="countdown-badge" :class="{ urgent: days <= 3 && days > 0, soon: days === 0 }">
    ⏰ {{ days > 0 ? `倒计时 ${days} 天` : (hours > 0 ? `今天 ${hours} 时后` : `即将开始`) }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ targetDate: String })

const { days, hours } = computed(() => {
  const diff = new Date(props.targetDate) - Date.now()
  if (diff <= 0) return { days: 0, hours: 0 }
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000) }
}).value
</script>

<style scoped>
.countdown-badge { font-size: 11px; color: var(--color-text-secondary); }
.countdown-badge.urgent { color: var(--color-warning); font-weight: 600; }
.countdown-badge.soon { color: var(--color-danger); font-weight: 700; }
</style>
