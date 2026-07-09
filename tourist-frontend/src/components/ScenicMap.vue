<template>
  <div class="scenic-map" ref="mapContainer"></div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  lamps: { type: Array, default: () => [] },
  spots: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
  routes: { type: Array, default: () => [] },
  activeFilter: { type: String, default: 'all' },
  selectedLampId: { type: String, default: '' },
  activeRouteId: { type: [Number, null], default: null },
})
const emit = defineEmits(['selectLamp', 'selectSpot', 'selectEvent', 'selectRoute'])

const mapContainer = ref(null)
let map = null
let tileLayer = null
let markerGroups = { lamps: L.layerGroup(), spots: L.layerGroup(), events: L.layerGroup(), routes: L.layerGroup(), tempRoute: L.layerGroup() }
let tempRouteLine = null
let spotMarkers = []
let eventMarkers = []
let lampMarkers = {}
let routePolylines = []

// 重庆大学虎溪校区坐标布局
const CENTER = [29.5970, 106.3020]
const LAMP_COORDS = {
  lamp_001: [29.5980, 106.3010],  // 北门路灯
  lamp_002: [29.5970, 106.3030],  // 田径场路灯
  lamp_003: [29.5967, 106.2985],  // 一食堂路灯
}

// 虎溪校区真实道路途经点（沿高德地图道路手工采集，每条约 25 点）
const SPOT_COORDS = {
  1: [29.5967, 106.3010],  // 北门银杏道
  2: [29.5939, 106.3047],// 老门柱广场
  3: [29.5970, 106.3028],  // 操场看台
}
const EVENT_COORDS = {
  1: [29.5968, 106.2991],  // 草坪音乐节 — 综合楼前草坪
  2: [29.5975, 106.2990],  // 美食节 — 第一食堂
  3: [29.5970, 106.3016],  // 国际文化节 — 梅园篮球场
  4: [29.5970, 106.3035],  // 运动会 — 田径场
}

// 自定义图标
function lampIcon(lampId, color, glow) {
  const num = lampId.replace('lamp_', '')
  return L.divIcon({
    className: 'custom-lamp-marker',
    html: `<div class="lamp-marker-wrap" style="--glow:${glow};--color:${color}">
      <div class="lamp-glow"></div>
      <div class="lamp-pin"><div class="lamp-pin-inner"></div></div>
      <span class="lamp-num">${num}</span>
    </div>`,
    iconSize: [48, 60],
    iconAnchor: [24, 52],
  })
}
function spotIcon() {
  return L.divIcon({
    className: 'custom-spot-marker',
    html: '<div class="spot-marker-wrap">📷</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}
function eventIcon() {
  return L.divIcon({
    className: 'custom-event-marker',
    html: '<div class="event-marker-wrap">⭐</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const activeLampId = computed(() => props.selectedLampId)

function getCoord(lampId) { return LAMP_COORDS[lampId] || CENTER }

function initMap() {
  if (!mapContainer.value || map) return
  map = L.map(mapContainer.value, {
    center: CENTER,
    zoom: 16,
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    touchZoom: true,
    scrollWheelZoom: true,
  })
  tileLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    maxZoom: 18,
    subdomains: ['1', '2', '3', '4'],
  }).addTo(map)

  Object.values(markerGroups).forEach(g => g.addTo(map))
  // 初始渲染（如果父组件数据已就绪）
  if (props.lamps.length > 0) {
    renderAll()
  }
}

function renderLamps() {
  markerGroups.lamps.clearLayers()
  lampMarkers = {}
  props.lamps.forEach(l => {
    const coord = getCoord(l.id)
    const isActive = activeLampId.value === l.id
    const color = l.id === 'lamp_003' ? '#f0a050' : (l.id === 'lamp_002' ? '#b0b0b0' : '#e0d0b0')
    const glow = l.id === 'lamp_003' ? 'rgba(240,160,80,0.5)' : (l.id === 'lamp_002' ? 'rgba(180,180,180,0.35)' : 'rgba(230,210,180,0.4)')
    const marker = L.marker(coord, { icon: lampIcon(l.id, isActive ? '#f0a050' : color, isActive ? 'rgba(240,160,80,0.6)' : glow) })
    marker.bindTooltip(`${l.name || l.id}`, { direction: 'top', offset: [0, -20] })
    marker.on('click', () => emit('selectLamp', l))
    marker.addTo(markerGroups.lamps)
    lampMarkers[l.id] = marker
  })
}

function renderSpots() {
  markerGroups.spots.clearLayers()
  spotMarkers = props.spots.map(s => {
    const coord = SPOT_COORDS[s.id] || getCoord(s.lampId)
    const marker = L.marker(coord, { icon: spotIcon() })
    marker.bindTooltip(s.name, { direction: 'top' })
    marker.on('click', () => emit('selectSpot', s))
    return marker
  })
}

function renderEvents() {
  markerGroups.events.clearLayers()
  eventMarkers = props.events.map(e => {
    const coord = EVENT_COORDS[e.id] || getCoord(e.lampId)
    const marker = L.marker(coord, { icon: eventIcon() })
    marker.bindTooltip(e.name, { direction: 'top' })
    marker.on('click', () => emit('selectEvent', e))
    return marker
  })
}

const ROUTE_COLORS = ['#f0a050', '#5b9bd5', '#6aab70']

// ===== 高德地图步行路径规划 =====
// 免费注册获取 Key: https://console.amap.com/dev/key/app
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''

// 解码高德 polyline 字符串 → [lat, lng] 数组（Leaflet 格式）
// 高德 Walking API 返回格式: "lng1,lat1;lng2,lat2;lng3,lat3;..."
function decodeAmapPolyline(encoded) {
  if (!encoded) return []
  return encoded.split(';').map(pair => {
    const [lng, lat] = pair.split(',').map(Number)
    return [lat, lng]
  }).filter(c => !isNaN(c[0]) && !isNaN(c[1]))
}

async function fetchAmapRoute(start, end) {
  if (!AMAP_KEY) return null
  const [lat1, lng1] = start; const [lat2, lng2] = end
  const url = `/amap-api/v3/direction/walking?origin=${lng1},${lat1}&destination=${lng2},${lat2}&key=${AMAP_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === '1' && data.route?.paths?.[0]?.steps) {
      const allCoords = []
      data.route.paths[0].steps.forEach(step => {
        const stepCoords = decodeAmapPolyline(step.polyline)
        if (allCoords.length === 0) allCoords.push(...stepCoords)
        else allCoords.push(...stepCoords.slice(1)) // 去重衔接点
      })
      return allCoords.length >= 2 ? allCoords : null
    }
  } catch { /* fallback */ }
  return null
}

let routeCoordsCache = {}
async function loadRouteCoords(routeId, lampIds) {
  if (routeCoordsCache[routeId]) return routeCoordsCache[routeId]
  if (!lampIds || lampIds.length < 2) return null
  const start = getCoord(lampIds[0]); const end = getCoord(lampIds[lampIds.length - 1])
  // 仅使用高德真实路径
  const coords = await fetchAmapRoute(start, end)
  if (coords && coords.length >= 2) routeCoordsCache[routeId] = coords
  return (coords && coords.length >= 2) ? coords : null
}

async function renderRoutes() {
  markerGroups.routes.clearLayers()
  const polys = await Promise.all(props.routes.map(async (r, i) => {
    const coords = await loadRouteCoords(r.id, r.lampIds)
    if (!coords || coords.length < 2) return null
    const isActive = props.activeRouteId === r.id
    const poly = L.polyline(coords, {
      color: isActive ? '#f0a050' : ROUTE_COLORS[i % 3],
      weight: 4,
      opacity: 0.85,
      lineCap: 'round', lineJoin: 'round',
      smoothFactor: 1.2,
    })
    poly.bindTooltip(r.name, { direction: 'center', sticky: true, className: 'route-tooltip' })
    poly.on('click', () => emit('selectRoute', r))
    return poly
  }))
  routePolylines = polys.filter(Boolean)
  routePolylines.forEach(p => p.addTo(markerGroups.routes))
}

async function renderAll() {
  renderLamps(); renderSpots(); renderEvents()
  await renderRoutes()
  applyFilter(props.activeFilter)
}

function applyFilter(filter) {
  markerGroups.spots.clearLayers()
  markerGroups.events.clearLayers()
  markerGroups.routes.clearLayers()
  if (filter === 'all') {
    spotMarkers.forEach(m => m.addTo(markerGroups.spots))
    eventMarkers.forEach(m => m.addTo(markerGroups.events))
    // 默认不显示路线，仅在点击推荐时显示临时路线
  } else if (filter === 'spots') {
    spotMarkers.forEach(m => m.addTo(markerGroups.spots))
  } else if (filter === 'events') {
    eventMarkers.forEach(m => m.addTo(markerGroups.events))
  } else if (filter === 'routes') {
    routePolylines.forEach(p => p.addTo(markerGroups.routes))
  }
}

watch(() => props.activeFilter, applyFilter)

watch(activeLampId, (newId) => {
  renderLamps()
  if (newId) {
    const coord = getCoord(newId)
    map?.flyTo(coord, 17, { duration: 0.8 })
  }
})

watch(() => props.activeRouteId, () => renderRoutes())

// 数据异步到达时渲染全部元素
watch(() => props.lamps.length, async (len) => {
  if (len > 0 && map) {
    await renderAll()
    const allCoords = []
    props.lamps.forEach(l => { if (LAMP_COORDS[l.id]) allCoords.push(LAMP_COORDS[l.id]) })
    routePolylines.forEach(p => {
      p.getLatLngs().forEach(c => allCoords.push([c.lat, c.lng]))
    })
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60], maxZoom: 17 })
    }
  }
})

// 暴露给父组件：绘制临时路线
async function showTempRoute(fromCoord, toCoord) {
  clearTempRoute()
  const coords = await fetchAmapRoute(fromCoord, toCoord)
  if (coords && coords.length >= 2) {
    tempRouteLine = L.polyline(coords, {
      color: '#f0a050', weight: 4, opacity: 0.9,
      lineCap: 'round', lineJoin: 'round', smoothFactor: 1.2,
    })
    tempRouteLine.addTo(markerGroups.tempRoute)
    map?.fitBounds(L.latLngBounds([fromCoord, toCoord]), { padding: [80, 80], maxZoom: 17 })
  }
}
function clearTempRoute() {
  markerGroups.tempRoute.clearLayers()
  tempRouteLine = null
}

defineExpose({ showTempRoute, clearTempRoute })

onMounted(() => { nextTick(initMap) })
onUnmounted(() => { map?.remove(); map = null })
</script>

<style scoped>
.scenic-map {
  width: 100%; height: 50vh; min-height: 320px;
  border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: 0 4px 20px rgba(61,46,28,0.06);
  background: #f5f0e8;
}
/* 地图加载中的占位背景 */
.scenic-map :deep(.leaflet-container) {
  background: #f5f0e8;
  font-family: var(--font-sans);
}
/* 高德地图水印不遮挡交互 */
.scenic-map :deep(.leaflet-control-attribution) {
  font-size: 10px; opacity: 0.6; pointer-events: none;
}
</style>

<!-- 全局 Leaflet 标记样式 (unscoped) -->
<style>
.custom-lamp-marker { background: transparent !important; border: none !important; }
.lamp-marker-wrap { position: relative; width: 48px; height: 60px; }
.lamp-glow {
  position: absolute; top: -8px; left: 0;
  width: 48px; height: 48px; border-radius: 50%;
  background: radial-gradient(circle, var(--glow) 0%, transparent 70%);
  animation: lamp-breathe 2.5s ease-in-out infinite;
}
.lamp-pin {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff; border: 3px solid var(--color);
  box-shadow: 0 2px 10px rgba(0,0,0,0.18);
}
.lamp-pin-inner {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 7px; height: 7px; border-radius: 50%; background: var(--color);
}
.lamp-num {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  font-size: 12px; font-weight: 700; color: #5a4a3a;
  background: rgba(255,255,255,0.85); padding: 2px 8px; border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.custom-spot-marker, .custom-event-marker { background: transparent !important; border: none !important; }
.spot-marker-wrap, .event-marker-wrap {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; border-radius: 50%; background: rgba(255,255,255,0.85);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}
.spot-marker-wrap:active, .event-marker-wrap:active { transform: scale(1.2); }

/* 路线 tooltip */
.route-tooltip {
  font-size: 13px; font-weight: 600; color: #3d2e1c;
  background: rgba(255,255,255,0.9); border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12); border-radius: 8px;
  padding: 4px 10px;
}
.route-tooltip::before { display: none; }

@keyframes lamp-breathe {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 0.9; transform: scale(1.15); }
}
</style>
