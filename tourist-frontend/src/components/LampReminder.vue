<template>
  <div v-if="show" class="lamp-reminder" :class="{ warning, critical }">
    <span class="reminder-icon">🕐</span>
    <div class="reminder-text">
      <div class="reminder-title">每日 {{ offTimeStr }} 熄灯 · 还剩 {{ timeText }}</div>
      <div class="reminder-sub">请合理安排游览时间</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean, minutesLeft: Number, warning: Boolean, critical: Boolean,
  timeText: String, offTimeStr: String,
})
</script>

<style scoped>
.lamp-reminder {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px 20px; margin: 0;
  background: #fef5e8; border-radius: 0;
  border-top: 1px solid rgba(240, 160, 80, 0.2);
  transition: all 0.3s;
}
.lamp-reminder.warning { background: #fff3e0; border-color: rgba(240, 160, 80, 0.4); }
.lamp-reminder.critical { background: #ffebee; border-color: rgba(224, 85, 85, 0.4); animation: remind-pulse 1.5s ease-in-out infinite; }
.reminder-icon { font-size: 32px; flex-shrink: 0; }
.reminder-title { font-size: 16px; font-weight: 700; color: var(--color-text); }
.reminder-sub { font-size: 14px; color: var(--color-text-muted); margin-top: 2px; }
.critical .reminder-title { color: var(--color-danger); }
.critical .reminder-icon { animation: icon-shake 1.5s ease-in-out infinite; }

@keyframes remind-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}
@keyframes icon-shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-8deg); }
  75% { transform: rotate(8deg); }
}
</style>
