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
            <div v-if="nearbySpots.length" class="popup-section">
              <div class="section-label">📸 附近拍照点</div>
              <div v-for="s in nearbySpots" :key="s.id" class="mini-card" @click="$emit('selectSpot', s)">
                <span class="mini-icon">{{ s.image }}</span>
                <div class="mini-info">
                  <div class="mini-name">{{ s.name }}</div>
                  <div class="mini-desc">{{ s.description }}</div>
                  <div class="mini-time">最佳时间：{{ s.bestTime }}</div>
                </div>
              </div>
            </div>
            <!-- 附近活动 -->
            <div v-if="nearbyEvents.length" class="popup-section">
              <div class="section-label">🎆 附近活动</div>
              <div v-for="e in nearbyEvents" :key="e.id" class="mini-card" @click="$emit('selectEvent', e)">
                <span class="mini-icon">{{ e.type }}</span>
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
import CountdownBadge from './CountdownBadge.vue'

defineProps({
  show: Boolean,
  lampName: String,
  nearbySpots: { type: Array, default: () => [] },
  nearbyEvents: { type: Array, default: () => [] },
  nearbyRoutes: { type: Array, default: () => [] },
})
defineEmits(['close', 'selectSpot', 'selectEvent', 'selectRoute'])
</script>

<style scoped>
.popup-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.3); display: flex; align-items: flex-end;
}
.popup-sheet {
  width: 100%; max-height: 70vh; overflow-y: auto;
  background: #fff; border-radius: 20px 20px 0 0;
  padding: 8px 0 24px; box-shadow: var(--shadow-popup);
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
.popup-body { padding: 12px 20px; display: flex; flex-direction: column; gap: 16px; }
.popup-section { display: flex; flex-direction: column; gap: 8px; }
.section-label { font-size: 14px; font-weight: 600; color: var(--color-text); }
.mini-card {
  display: flex; gap: 10px; padding: 10px; border-radius: var(--radius-sm);
  background: #fefaf6; cursor: pointer; transition: background 0.15s;
}
.mini-card:active { background: #faf0e4; }
.mini-icon { font-size: 28px; flex-shrink: 0; }
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
