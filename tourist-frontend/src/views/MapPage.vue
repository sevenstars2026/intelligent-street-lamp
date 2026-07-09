<template>
  <div class="page">
    <div class="page-header">🏫 重庆大学虎溪校区 · 智慧路灯导览</div>
    <LampSearch @search="onSearch" />

    <!-- Leaflet 地图 -->
    <ScenicMap ref="scenicMapRef"
      :lamps="lamps" :spots="spots" :events="events" :routes="routes"
      :activeFilter="activeFilter" :selectedLampId="selectedLampId"
      @selectLamp="onSelectLamp"
      @selectSpot="onSelectSpot"
      @selectEvent="onSelectEvent" />

    <!-- 熄灯提醒 -->
    <LampReminder :show="reminderShow" :minutesLeft="reminderMinutes"
      :warning="reminderWarning" :critical="reminderCritical" />

    <!-- 筛选栏（底部） -->
    <MapFilter v-model="activeFilter" />

    <!-- 路灯弹窗 -->
    <LampPopup :show="popupShow" :lampId="selectedLampId" :lampName="selectedLamp?.name || ''"
      :nearbyRoutes="nearbyRoutes"
      @close="popupShow = false" @selectSpot="onSelectSpot" @selectEvent="onSelectEvent"
      @selectRoute="onSelectRoute" />

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScenic } from '@/composables/useScenic'
import { useLampReminder } from '@/composables/useLampReminder'
import ScenicMap from '@/components/ScenicMap.vue'
import MapFilter from '@/components/MapFilter.vue'
import LampPopup from '@/components/LampPopup.vue'
import LampReminder from '@/components/LampReminder.vue'
import LampSearch from '@/components/LampSearch.vue'
import BottomNav from '@/components/BottomNav.vue'

const route = useRoute()
const router = useRouter()
const { routes, spots, events, lamps, loadScenicData, getLampById, getRoutesByLamp, LAMP_COORDS, SPOT_COORDS, EVENT_COORDS } = useScenic()
const { show: reminderShow, minutesLeft: reminderMinutes, warning: reminderWarning, critical: reminderCritical } = useLampReminder()

const activeFilter = ref('all')
const selectedLampId = ref('')
const popupShow = ref(false)

const selectedLamp = computed(() => getLampById(selectedLampId.value))
const nearbyRoutes = computed(() => selectedLampId.value ? getRoutesByLamp(selectedLampId.value) : [])

const scenicMapRef = ref(null)

function onSelectLamp(l) { scenicMapRef.value?.clearTempRoute(); selectedLampId.value = l.id; popupShow.value = true }
function onSearch(query) { const found = lamps.value.find(l => l.id === query); if (found) onSelectLamp(found) }

function onSelectSpot(s) {
  const lampCoord = LAMP_COORDS[selectedLampId.value]
  const spotCoord = SPOT_COORDS[s.id]
  if (lampCoord && spotCoord) scenicMapRef.value?.showTempRoute(lampCoord, spotCoord)
}
function onSelectEvent(e) {
  const lampCoord = LAMP_COORDS[selectedLampId.value]
  const eventCoord = EVENT_COORDS[e.id]
  if (lampCoord && eventCoord) scenicMapRef.value?.showTempRoute(lampCoord, eventCoord)
}
function onSelectRoute(r) { router.push({ path: '/', query: { lamp: r.lampIds?.[0] } }) }

onMounted(async () => {
  await loadScenicData()
  const lampId = route.query.lamp
  if (lampId) {
    const found = lamps.value.find(l => l.id === lampId)
    if (found) { selectedLampId.value = found.id; popupShow.value = true }
  }
})
</script>

<style scoped>
.page { padding-bottom: 80px; }
</style>
