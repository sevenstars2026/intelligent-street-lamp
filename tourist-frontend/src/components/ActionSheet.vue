<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-overlay" @click.self="$emit('close')">
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">{{ item.image || item.type }} {{ item.name }}</div>
          <div class="sheet-actions">
            <button class="sheet-btn route-btn" @click="$emit('choose', 'route')">
              <span class="btn-icon">📍</span>
              <span class="btn-text">查看路线</span>
              <span class="btn-sub">显示从当前路灯到此处的路径</span>
            </button>
            <button class="sheet-btn detail-btn" @click="$emit('choose', 'detail')">
              <span class="btn-icon">📋</span>
              <span class="btn-text">{{ isEvent ? '活动详情' : '拍照点详情' }}</span>
              <span class="btn-sub">{{ isEvent ? '查看活动详细介绍和图片' : '查看拍摄攻略和样片' }}</span>
            </button>
          </div>
          <button class="sheet-cancel" @click="$emit('close')">取消</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  item: { type: Object, default: () => ({}) },
  isEvent: Boolean,
})
defineEmits(['close', 'choose'])
</script>

<style scoped>
.sheet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.35); display: flex; align-items: flex-end;
}
.sheet-panel {
  width: 100%; background: #fff; border-radius: 20px 20px 0 0;
  padding: 8px 20px 28px; box-shadow: var(--shadow-popup);
  display: flex; flex-direction: column; gap: 12px;
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: #ddd; margin: 0 auto; }
.sheet-title { font-size: 16px; font-weight: 600; text-align: center; color: var(--color-text); padding: 4px 0; }
.sheet-actions { display: flex; flex-direction: column; gap: 10px; }
.sheet-btn {
  display: flex; flex-direction: column; gap: 4px; padding: 14px 16px;
  border-radius: 12px; border: 1.5px solid var(--color-divider);
  background: #fefaf6; cursor: pointer; text-align: left;
  transition: all 0.15s; font-family: var(--font-sans);
}
.sheet-btn:active { background: #faf0e4; }
.route-btn { border-color: rgba(240,160,80,0.3); }
.detail-btn { border-color: rgba(91,155,213,0.3); }
.btn-icon { font-size: 20px; }
.btn-text { font-size: 15px; font-weight: 600; color: var(--color-text); }
.btn-sub { font-size: 12px; color: var(--color-text-muted); }
.sheet-cancel {
  width: 100%; padding: 12px; border: none; background: #f5f0ea;
  border-radius: 12px; font-size: 15px; color: var(--color-text-secondary);
  cursor: pointer; font-family: var(--font-sans);
}

.sheet-enter-active, .sheet-leave-active { transition: all 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel, .sheet-leave-to .sheet-panel { transform: translateY(100%); }
.sheet-enter-active .sheet-panel, .sheet-leave-active .sheet-panel { transition: transform 0.25s ease; }
</style>
