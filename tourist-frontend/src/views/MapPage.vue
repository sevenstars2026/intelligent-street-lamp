<template>
  <div class="page">
    <div class="page-header">🏫 重庆大学虎溪校区 · 智慧路灯导览</div>
    <LampSearch @search="onSearch" />

    <!-- Leaflet 地图 -->
    <div class="map-wrapper">
    <ScenicMap ref="scenicMapRef"
      :lamps="lamps" :spots="spots" :events="events" :routes="routes"
      :activeFilter="activeFilter" :selectedLampId="selectedLampId"
      @selectLamp="onSelectLamp"
      @selectSpot="onSelectSpot"
      @selectEvent="onSelectEvent" />
    </div>

    <!-- 筛选栏（底部） -->
    <MapFilter v-model="activeFilter" />

    <!-- 熄灯提醒（最底部） -->
    <LampReminder :show="reminderShow" :minutesLeft="reminderMinutes"
      :warning="reminderWarning" :critical="reminderCritical" />

    <!-- 路灯弹窗 -->
    <LampPopup :show="popupShow" :lampId="selectedLampId" :lampName="selectedLamp?.name || ''"
      :nearbyRoutes="nearbyRoutes"
      @close="popupShow = false" @selectSpot="onSelectSpot" @selectEvent="onSelectEvent"
      @selectRoute="onSelectRoute" />

    <BottomNav />

    <!-- 操作选择面板 -->
    <ActionSheet :show="sheetShow" :item="sheetItem" :isEvent="sheetIsEvent"
      @close="sheetShow = false" @choose="onSheetChoose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScenic } from '@/composables/useScenic'
import { useLampReminder } from '@/composables/useLampReminder'
import ActionSheet from '@/components/ActionSheet.vue'
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

// 操作选择面板
const sheetShow = ref(false)
const sheetItem = ref({})
const sheetIsEvent = ref(false)

const selectedLamp = computed(() => getLampById(selectedLampId.value))
const nearbyRoutes = computed(() => selectedLampId.value ? getRoutesByLamp(selectedLampId.value) : [])

const scenicMapRef = ref(null)

function onSelectLamp(l) { scenicMapRef.value?.clearTempRoute(); selectedLampId.value = l.id; popupShow.value = true }
function onSearch(query) { const found = lamps.value.find(l => l.id === query); if (found) onSelectLamp(found) }

// 点击拍照点/活动 → 弹出选择面板
function onSelectSpot(s) { popupShow.value = false; sheetItem.value = s; sheetIsEvent.value = false; sheetShow.value = true }
function onSelectEvent(e) { popupShow.value = false; sheetItem.value = e; sheetIsEvent.value = true; sheetShow.value = true }

// 选择面板：查看路线 or 详情
function onSheetChoose(action) {
  sheetShow.value = false
  const item = sheetItem.value
  const lampCoord = LAMP_COORDS[selectedLampId.value]
  if (action === 'route') {
    const targetCoord = sheetIsEvent.value ? EVENT_COORDS[item.id] : SPOT_COORDS[item.id]
    if (lampCoord && targetCoord) scenicMapRef.value?.showTempRoute(lampCoord, targetCoord)
  } else {
    router.push(sheetIsEvent.value ? `/events/${item.id}` : `/spots/${item.id}`)
  }
}

function onSelectRoute(r) { router.push({ path: '/', query: { lamp: r.lampIds?.[0] } }) }

onMounted(async () => {
  await loadScenicData()
  const lampId = route.query.lamp
  const spotId = route.query.spot
  const eventId = route.query.event

  // 来自详情页：绘制路线
  if (lampId && spotId) {
    const lc = LAMP_COORDS[lampId]; const sc = SPOT_COORDS[spotId]
    if (lc && sc) scenicMapRef.value?.showTempRoute(lc, sc)
  } else if (lampId && eventId) {
    const lc = LAMP_COORDS[lampId]; const ec = EVENT_COORDS[eventId]
    if (lc && ec) scenicMapRef.value?.showTempRoute(lc, ec)
  } else if (lampId) {
    const found = lamps.value.find(l => l.id === lampId)
    if (found) { selectedLampId.value = found.id; popupShow.value = true }
  }
})
</script>

<style scoped>
.page { padding-bottom: 80px; }
.map-wrapper { padding: 0 12px; }
</style>
