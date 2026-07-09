import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useLampReminder() {
  const minutesLeft = ref(0)
  const warning = computed(() => minutesLeft.value <= 30)
  const critical = computed(() => minutesLeft.value <= 10)
  const show = computed(() => minutesLeft.value > 0)  // 熄灯前始终显示
  let timer = null

  function calc() {
    const now = new Date()
    const offTime = new Date(now)
    offTime.setHours(22, 0, 0, 0)
    if (now > offTime) offTime.setDate(offTime.getDate() + 1)
    minutesLeft.value = Math.max(0, Math.floor((offTime - now) / 60000))
  }

  onMounted(() => { calc(); timer = setInterval(calc, 30000) })
  onUnmounted(() => { if (timer) clearInterval(timer) })

  return { minutesLeft, warning, critical, show }
}
