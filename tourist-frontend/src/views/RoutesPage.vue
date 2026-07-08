<template>
  <div class="page">
    <div class="page-header">🚶 游览路线</div>
    <div class="list-container">
      <div v-for="(r, i) in routes" :key="r.id" class="card route-card anim-fade-up"
           :style="{ animationDelay: (i * 60) + 'ms' }"
           @click="goMapRoute(r)">
        <div class="route-header">
          <span class="route-name">{{ r.name }}</span>
          <span class="tag tag-warm">{{ r.duration }}</span>
        </div>
        <div class="route-info">
          <span>📏 {{ r.length }}</span>
          <span>💡 途经 {{ r.lampIds?.length || 0 }} 盏路灯</span>
        </div>
        <div class="route-desc">{{ r.description }}</div>
        <div class="route-tags">
          <span v-for="t in r.tags" :key="t" class="tag tag-green">{{ t }}</span>
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
const { routes, loadScenicData } = useScenic()

function goMapRoute(r) {
  router.push({ path: '/', query: { route: r.id } })
}

onMounted(() => loadScenicData())
</script>

<style scoped>
.list-container { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.route-card { padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; }
.route-header { display: flex; align-items: center; justify-content: space-between; }
.route-name { font-size: 16px; font-weight: 600; }
.route-info { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-muted); }
.route-desc { font-size: 13px; color: var(--color-text-secondary); }
.route-tags { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
