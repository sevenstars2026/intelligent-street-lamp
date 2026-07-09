<template>
  <div class="page">
    <div class="page-header">🎆 表演活动</div>
    <div class="list-container">
      <div v-for="(e, i) in events" :key="e.id" class="card event-card anim-fade-up"
           :style="{ animationDelay: (i * 60) + 'ms' }"
           @click="goDetail(e)">
        <div class="event-type-icon" v-html="eventIcon(e.typeLabel)"></div>
        <div class="event-body">
          <div class="event-name">{{ e.name }}</div>
          <div class="event-meta">
            <span class="tag tag-blue">📅 {{ e.date }} {{ e.time }}</span>
            <span class="tag tag-warm">📍 {{ e.location }}</span>
          </div>
          <div class="event-desc">{{ e.description }}</div>
          <CountdownBadge :targetDate="e.date + 'T' + e.time" />
        </div>
      </div>
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useScenic } from '@/composables/useScenic'
import CountdownBadge from '@/components/CountdownBadge.vue'
import BottomNav from '@/components/BottomNav.vue'

const router = useRouter()
const { events, loadScenicData } = useScenic()

function goDetail(e) { router.push(`/events/${e.id}`) }

const ICON_MAP = {
  '音乐节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V4l10-2v13"/></svg>`,
  '美食节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><circle cx="12" cy="4" r="2"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  '文化节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>`,
  '运动会': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M10 22v-5l-4-3V9"/><path d="M14 22v-5l4-3V9"/><path d="M5 9h14"/><line x1="8" y1="9" x2="8" y2="12"/><line x1="16" y1="9" x2="16" y2="12"/></svg>`,
}
function eventIcon(label) { return ICON_MAP[label] || '' }

onMounted(() => loadScenicData())
</script>

<style scoped>
.list-container { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.event-card { display: flex; gap: 12px; padding: 16px; cursor: pointer; }
.event-type-icon { flex-shrink: 0; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #fdf5ec; border-radius: var(--radius-sm); }
.event-type-icon :deep(svg) { width: 30px; height: 30px; }
.event-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.event-name { font-size: 15px; font-weight: 600; }
.event-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.event-desc { font-size: 13px; color: var(--color-text-secondary); }
</style>
