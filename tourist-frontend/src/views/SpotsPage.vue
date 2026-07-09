<template>
  <div class="page">
    <div class="page-header">📸 拍照点</div>
    <div class="spot-grid">
      <div v-for="(s, i) in spots" :key="s.id" class="card spot-card anim-fade-up"
           :style="{ animationDelay: (i * 60) + 'ms' }"
           @click="goDetail(s)">
        <div class="spot-image">{{ s.image }}</div>
        <div class="spot-body">
          <div class="spot-name">{{ s.name }}</div>
          <div class="spot-desc">{{ s.description }}</div>
          <div class="spot-meta">
            <span class="tag tag-warm">🕐 {{ s.bestTime }}</span>
          </div>
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
.spot-grid { padding: 0 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.spot-card { overflow: hidden; cursor: pointer; }
.spot-image { height: 100px; display: flex; align-items: center; justify-content: center; font-size: 48px; background: #fdf5ec; }
.spot-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.spot-name { font-size: 14px; font-weight: 600; }
.spot-desc { font-size: 12px; color: var(--color-text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.spot-meta { margin-top: 2px; }
.spot-tip { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
</style>
