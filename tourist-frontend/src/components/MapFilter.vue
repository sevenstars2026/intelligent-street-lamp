<template>
  <div class="map-filter">
    <button v-for="o in options" :key="o.key"
      :class="['filter-btn', { active: modelValue === o.key }]"
      @click="$emit('update:modelValue', o.key)">
      {{ o.icon }} {{ o.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({ modelValue: { type: String, default: 'all' } })
defineEmits(['update:modelValue'])

const options = [
  { key: 'all', icon: '', label: '全部' },
  { key: 'spots', icon: '📸', label: '拍照点' },
  { key: 'events', icon: '🎆', label: '活动' },
  { key: 'routes', icon: '🚶', label: '路线' },
]
</script>

<style scoped>
.map-filter {
  display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto;
}
.filter-btn {
  flex-shrink: 0; padding: 8px 16px; border-radius: 20px;
  border: 1.5px solid var(--color-divider); background: var(--color-card);
  font-size: 13px; color: var(--color-text-secondary); cursor: pointer;
  transition: all 0.2s; font-family: var(--font-sans);
}
.filter-btn.active {
  border-color: var(--color-primary); background: var(--color-primary-bg);
  color: var(--color-primary-dark); font-weight: 600;
}
</style>
