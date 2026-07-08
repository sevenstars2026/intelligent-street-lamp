<template>
  <div class="recommend-card card">
    <div class="rc-image">{{ item.image || '📍' }}</div>
    <div class="rc-body">
      <div class="rc-name">{{ item.name }}</div>
      <div class="rc-desc" v-if="item.description">{{ item.description }}</div>
      <div class="rc-meta" v-if="item.bestTime || item.date">
        <span v-if="item.bestTime" class="tag tag-warm">🕐 {{ item.bestTime }}</span>
        <span v-if="item.date" class="tag tag-blue">📅 {{ item.date }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ item: { type: Object, default: () => ({}) } })
</script>

<style scoped>
.recommend-card { display: flex; gap: 12px; padding: 12px; transition: transform 0.15s; }
.recommend-card:active { transform: scale(0.98); }
.rc-image { width: 64px; height: 64px; border-radius: var(--radius-sm); background: #fdf5ec; display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
.rc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.rc-name { font-size: 15px; font-weight: 600; color: var(--color-text); }
.rc-desc { font-size: 13px; color: var(--color-text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rc-meta { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
