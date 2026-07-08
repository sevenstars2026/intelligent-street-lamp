<template>
  <div class="page">
    <div class="page-header">🎆 表演活动</div>
    <div class="list-container">
      <div v-for="(e, i) in events" :key="e.id" class="card event-card anim-fade-up"
           :style="{ animationDelay: (i * 60) + 'ms' }"
           @click="goMapEvent(e)">
        <div class="event-type-icon">{{ e.type }}</div>
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

function goMapEvent(e) {
  router.push({ path: '/', query: { lamp: e.lampId } })
}

onMounted(() => loadScenicData())
</script>

<style scoped>
.list-container { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.event-card { display: flex; gap: 12px; padding: 16px; cursor: pointer; }
.event-type-icon { font-size: 36px; flex-shrink: 0; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #fdf5ec; border-radius: var(--radius-sm); }
.event-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.event-name { font-size: 15px; font-weight: 600; }
.event-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.event-desc { font-size: 13px; color: var(--color-text-secondary); }
</style>
