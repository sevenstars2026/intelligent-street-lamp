<template>
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="show" class="popup-overlay" @click.self="$emit('close')">
        <div class="popup-sheet">
          <div class="popup-handle"></div>
          <div class="popup-header">
            <span>📍 您在「{{ lampName }}」附近</span>
            <button class="popup-close" @click="$emit('close')">✕</button>
          </div>
          <div class="popup-body">
            <!-- 附近拍照点 -->
            <div v-if="displaySpots.length" class="popup-section">
              <div class="section-label">📸 附近拍照点</div>
              <div v-for="s in displaySpots" :key="s.id" class="mini-card" @click="$emit('selectSpot', s)">
                <span class="mini-icon">{{ s.image }}</span>
                <div class="mini-info">
                  <div class="mini-name">{{ s.name }}</div>
                  <div class="mini-desc">{{ s.description }}</div>
                  <div class="mini-time">最佳时间：{{ s.bestTime }}</div>
                </div>
              </div>
            </div>
            <!-- 附近活动 -->
            <div v-if="displayEvents.length" class="popup-section">
              <div class="section-label">🎆 附近活动</div>
              <div v-for="e in displayEvents" :key="e.id" class="mini-card" @click="$emit('selectEvent', e)">
                <span class="mini-icon" v-html="eventIcon(e.typeLabel)"></span>
                <div class="mini-info">
                  <div class="mini-name">{{ e.name }}</div>
                  <div class="mini-desc">{{ e.date }} {{ e.time }} · {{ e.location }}</div>
                  <CountdownBadge :targetDate="e.date + 'T' + e.time" />
                </div>
              </div>
            </div>
            <!-- 经过路线 -->
            <div v-if="nearbyRoutes.length" class="popup-section">
              <div class="section-label">🚶 经过的路线</div>
              <div v-for="r in nearbyRoutes" :key="r.id" class="route-chip" @click="$emit('selectRoute', r)">
                · {{ r.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import CountdownBadge from './CountdownBadge.vue'

const props = defineProps({
  show: Boolean,
  lampId: String,
  lampName: String,
  nearbyRoutes: { type: Array, default: () => [] },
})
defineEmits(['close', 'selectSpot', 'selectEvent', 'selectRoute'])

const EVENT_ICONS = {
  '音乐节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V4l10-2v13"/></svg>`,
  '美食节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><circle cx="12" cy="4" r="2"/></svg>`,
  '文化节': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/></svg>`,
  '运动会': `<svg viewBox="0 0 24 24" fill="none" stroke="#f0a050" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M10 22v-5l-4-3V9"/><path d="M14 22v-5l4-3V9"/><path d="M5 9h14"/></svg>`,
}
function eventIcon(label) { return EVENT_ICONS[label] || '' }

// 硬编码：每个路灯的推荐拍照点和活动
const ALL_SPOTS = [
  { id: 1, name: '北门银杏道', image: '🍂', description: '秋季银杏叶金黄铺地，校园最美打卡点', bestTime: '10月-11月 15:00-17:00', tips: '逆光拍摄银杏叶透光效果最佳' },
  { id: 2, name: '老门柱广场', image: '🏛', description: '重大建校时期的标志性门柱，承载校园历史记忆，暖光路灯映照下的绝佳取景地', bestTime: '17:00-19:00', tips: '利用路灯侧光突出门柱纹理和历史感' },
  { id: 3, name: '操场看台', image: '🏟', description: '夕阳下的操场全景，路灯点亮运动场', bestTime: '17:00-19:00', tips: '看台高处俯拍操场全貌' },
]
const ALL_EVENTS = [
  { id: 1, name: '草坪音乐节', type: '🎵', typeLabel: '音乐节', date: '2026-09-20', time: '18:30', location: '综合楼前草坪', description: '年度校园草坪音乐节，乐队Live演出，路灯氛围灯光配合' },
  { id: 2, name: '校园美食节', type: '🍜', typeLabel: '美食节', date: '2026-10-15', time: '11:00', location: '第一食堂', description: '各地美食汇聚，路灯夜间照明延长营业至晚9点' },
  { id: 3, name: '国际文化节', type: '🌍', typeLabel: '文化节', date: '2026-10-28', time: '14:00', location: '梅园篮球场', description: '多国文化交流展演，路灯彩光装饰营造异域氛围' },
  { id: 4, name: '秋季运动会', type: '🏃', typeLabel: '运动会', date: '2026-11-01', time: '08:00', location: '田径场', description: '全校田径运动会，智慧路灯全程照明保障' },
]

const LAMP_RECOMMEND = {
  lamp_001: { spotIds: [1], eventIds: [3, 2] },  // 国际文化节+美食节, 北门银杏道
  lamp_002: { spotIds: [3], eventIds: [4, 3] },  // 运动会+国际文化节, 操场看台
  lamp_003: { spotIds: [1], eventIds: [1, 2] },  // 草坪音乐节+美食节, 北门银杏道
}

const displaySpots = computed(() => {
  const cfg = LAMP_RECOMMEND[props.lampId]
  return cfg ? cfg.spotIds.map(id => ALL_SPOTS.find(s => s.id === id)).filter(Boolean) : []
})
const displayEvents = computed(() => {
  const cfg = LAMP_RECOMMEND[props.lampId]
  return cfg ? cfg.eventIds.map(id => ALL_EVENTS.find(e => e.id === id)).filter(Boolean) : []
})
</script>

<style scoped>
.popup-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.3); display: flex; align-items: flex-end;
}
.popup-sheet {
  width: 100%; max-height: 85vh; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: #fff; border-radius: 20px 20px 0 0;
  padding: 8px 0 16px; box-shadow: var(--shadow-popup);
}
.popup-handle { width: 36px; height: 4px; border-radius: 2px; background: #ddd; margin: 0 auto 12px; }
.popup-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px 12px; font-size: 16px; font-weight: 600;
  border-bottom: 1px solid var(--color-divider);
}
.popup-close {
  width: 28px; height: 28px; border-radius: 50%; border: none; background: #f5f0ea;
  font-size: 14px; color: var(--color-text-muted); cursor: pointer;
}
.popup-body { padding: 10px 20px; display: flex; flex-direction: column; gap: 12px; }
.popup-section { display: flex; flex-direction: column; gap: 8px; }
.section-label { font-size: 14px; font-weight: 600; color: var(--color-text); }
.mini-card {
  display: flex; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm);
  background: #fefaf6; cursor: pointer; transition: background 0.15s;
}
.mini-card:active { background: #faf0e4; }
.mini-icon { width: 36px; height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.mini-icon :deep(svg) { width: 28px; height: 28px; }
.mini-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.mini-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
.mini-desc { font-size: 12px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mini-time { font-size: 11px; color: var(--color-primary-dark); }
.route-chip { font-size: 13px; color: var(--color-primary-dark); padding: 6px 0; cursor: pointer; }

.popup-enter-active, .popup-leave-active { transition: all 0.3s ease; }
.popup-enter-from, .popup-leave-to { opacity: 0; }
.popup-enter-from .popup-sheet, .popup-leave-to .popup-sheet { transform: translateY(100%); }
.popup-enter-active .popup-sheet, .popup-leave-active .popup-sheet { transition: transform 0.3s ease; }
</style>
