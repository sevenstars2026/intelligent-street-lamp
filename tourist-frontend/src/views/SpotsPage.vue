<template>
  <div class="page">
    <div class="page-header">📸 拍照点</div>
    <div class="list-container">
      <div v-for="(s, i) in spots" :key="s.id" class="card spot-card anim-fade-up"
           :style="{ animationDelay: (i * 60) + 'ms' }"
           @click="goDetail(s)">
        <div class="spot-type-icon">{{ s.image }}</div>
        <div class="spot-body">
          <div class="spot-name">{{ s.name }}</div>
          <div class="spot-meta">
            <span class="tag tag-warm">🕐 {{ s.bestTime }}</span>
          </div>
          <div class="spot-desc">{{ s.description }}</div>
          <div class="spot-tip">💡 {{ s.tips }}</div>
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
import BottomNav from '@/components/BottomNav.vue'

const router = useRouter()
const { spots, loadScenicData } = useScenic()

function goDetail(s) { router.push(`/spots/${s.id}`) }

onMounted(() => loadScenicData())
</script>

<style scoped>
.list-container { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.spot-card { display: flex; gap: 12px; padding: 16px; cursor: pointer; }
.spot-type-icon { font-size: 36px; flex-shrink: 0; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #fdf5ec; border-radius: var(--radius-sm); }
.spot-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.spot-name { font-size: 15px; font-weight: 600; }
.spot-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.spot-desc { font-size: 13px; color: var(--color-text-secondary); }
.spot-tip { font-size: 12px; color: var(--color-text-muted); }
</style>
