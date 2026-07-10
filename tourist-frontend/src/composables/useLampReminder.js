import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useLampReminder() {
  const minutesLeft = ref(0)
  const warning = computed(() => minutesLeft.value <= 30)
  const critical = computed(() => minutesLeft.value <= 10)
  const show = computed(() => minutesLeft.value > 0)
  let timer = null

  const hours = computed(() => Math.floor(minutesLeft.value / 60))
  const mins = computed(() => minutesLeft.value % 60)
  const timeText = computed(() => {
    const h = hours.value, m = mins.value
    if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`
    if (h > 0) return `${h} 小时`
    return `${m} 分钟`
  })
  const offTimeStr = '22:00'

  function calc() {
    const now = new Date()
    const offTime = new Date(now)
    offTime.setHours(22, 0, 0, 0)
    if (now > offTime) offTime.setDate(offTime.getDate() + 1)
    minutesLeft.value = Math.max(0, Math.floor((offTime - now) / 60000))
  }

  onMounted(() => { calc(); timer = setInterval(calc, 30000) })
  onUnmounted(() => { if (timer) clearInterval(timer) })

  return { minutesLeft, hours, mins, timeText, offTimeStr, warning, critical, show }
}
