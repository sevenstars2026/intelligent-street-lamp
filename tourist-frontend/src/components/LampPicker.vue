<template>
  <Teleport to="body">
    <Transition name="picker">
      <div v-if="show" class="picker-overlay" @click.self="$emit('close')">
        <div class="picker-panel">
          <div class="picker-handle"></div>
          <div class="picker-title">选择故障路灯</div>
          <div class="picker-list">
            <button
              v-for="lamp in lamps"
              :key="lamp.id"
              class="picker-item"
              :class="{ 'picker-item--selected': modelValue === lamp.id }"
              @click="select(lamp.id)"
            >
              <div class="picker-item-info">
                <span class="picker-item-name">{{ lamp.name }}</span>
                <span class="picker-item-id">{{ lamp.id }}</span>
              </div>
              <svg v-if="modelValue === lamp.id" class="picker-check" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <button class="picker-cancel" @click="$emit('close')">取消</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  modelValue: String,
  lamps: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'close', 'select'])

function select(id) {
  emit('update:modelValue', id)
  emit('select', id)
  // 短暂延迟让用户看到选中反馈后再关闭
  setTimeout(() => emit('close'), 180)
}
</script>

<style scoped>
.picker-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.35); display: flex; align-items: flex-end;
}
.picker-panel {
  width: 100%; max-height: 60vh; background: #fff;
  border-radius: 20px 20px 0 0; padding: 8px 20px 28px;
  box-shadow: var(--shadow-popup);
  display: flex; flex-direction: column; gap: 12px;
}
.picker-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: #ddd; margin: 0 auto; flex-shrink: 0;
}
.picker-title {
  font-size: 16px; font-weight: 600; text-align: center;
  color: var(--color-text); padding: 4px 0; flex-shrink: 0;
}
.picker-list {
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto; flex: 1;
}
.picker-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-radius: 12px;
  border: 1.5px solid var(--color-divider);
  background: #fefaf6; cursor: pointer; text-align: left;
  transition: all 0.15s; font-family: var(--font-sans); width: 100%;
}
.picker-item:active { background: #faf0e4; transform: scale(0.98); }
.picker-item--selected {
  border-color: var(--color-primary);
  background: rgba(240, 160, 80, 0.06);
  animation: picker-pop 0.25s ease;
}
@keyframes picker-pop {
  0% { transform: scale(1); }
  50% { transform: scale(0.96); }
  100% { transform: scale(1); }
}
.picker-item-info { display: flex; flex-direction: column; gap: 2px; }
.picker-item-name { font-size: 15px; font-weight: 600; color: var(--color-text); }
.picker-item-id { font-size: 12px; color: var(--color-text-muted); font-family: var(--font-mono, monospace); }
.picker-check { width: 20px; height: 20px; color: var(--color-primary); flex-shrink: 0; }
.picker-cancel {
  width: 100%; padding: 12px; border: none; background: #f5f0ea;
  border-radius: 12px; font-size: 15px; color: var(--color-text-secondary);
  cursor: pointer; font-family: var(--font-sans); flex-shrink: 0;
}

.picker-enter-active, .picker-leave-active { transition: all 0.25s ease; }
.picker-enter-from, .picker-leave-to { opacity: 0; }
.picker-enter-from .picker-panel, .picker-leave-to .picker-panel { transform: translateY(100%); }
.picker-enter-active .picker-panel, .picker-leave-active .picker-panel { transition: transform 0.25s ease; }
</style>
