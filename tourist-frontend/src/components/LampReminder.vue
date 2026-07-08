<template>
  <div v-if="show" class="lamp-reminder" :class="{ warning, critical }">
    <span class="reminder-icon">🕐</span>
    <div class="reminder-text">
      <div class="reminder-title">距离熄灯还有 {{ minutesLeft }} 分钟</div>
      <div class="reminder-sub">请合理安排游览时间</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean, minutesLeft: Number, warning: Boolean, critical: Boolean,
})
</script>

<style scoped>
.lamp-reminder {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; margin: 0 16px;
  background: #fef5e8; border-radius: var(--radius-sm);
  border: 1px solid rgba(240, 160, 80, 0.2);
  transition: all 0.3s;
}
.lamp-reminder.warning { background: #fff3e0; border-color: rgba(240, 160, 80, 0.4); }
.lamp-reminder.critical { background: #ffebee; border-color: rgba(224, 85, 85, 0.3); }
.reminder-icon { font-size: 28px; flex-shrink: 0; }
.reminder-title { font-size: 14px; font-weight: 600; color: var(--color-text); }
.reminder-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.critical .reminder-title { color: var(--color-danger); }
</style>
