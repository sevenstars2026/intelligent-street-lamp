<template>
  <div class="stat-card glass-card glow-border">
    <div class="stat-header">
      <span class="stat-label">{{ label }}</span>
      <span class="stat-icon" :style="{ color: iconColor }">
        <slot name="icon" />
      </span>
    </div>
    <div class="stat-body">
      <span class="stat-number" :style="{ color: valueColor }">{{ displayValue }}</span>
      <span class="stat-unit" v-if="unit">{{ unit }}</span>
    </div>
    <div class="stat-footer" v-if="subtitle">
      <span class="stat-subtitle">{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  label: String,
  value: [String, Number],
  unit: String,
  subtitle: String,
  iconColor: { type: String, default: 'var(--color-brand-soft)' },
  valueColor: { type: String, default: 'var(--color-text-primary)' },
  animate: { type: Boolean, default: true },
})

const displayValue = ref(0)

function animateValue(target) {
  const num = Number(target)
  if (isNaN(num)) {
    displayValue.value = target
    return
  }
  const start = displayValue.value
  const diff = num - start
  const duration = 800
  const startTime = performance.now()

  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.round(start + diff * eased)
    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (props.animate) {
    displayValue.value = 0
    animateValue(props.value)
  } else {
    displayValue.value = props.value
  }
})

watch(() => props.value, (val) => {
  if (props.animate) {
    animateValue(val)
  } else {
    displayValue.value = val
  }
})
</script>

<style scoped>
.stat-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.stat-icon {
  width: 20px;
  height: 20px;
  opacity: 0.85;
}

.stat-body {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-number {
  font-size: 32px;
  line-height: 1;
  font-family: var(--font-mono);
  font-weight: 700;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat-footer {
  border-top: 1px solid var(--color-border-subtle);
  padding-top: 8px;
}

.stat-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
}
</style>
