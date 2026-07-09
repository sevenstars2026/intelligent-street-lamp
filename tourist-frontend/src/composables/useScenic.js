import { ref, computed } from 'vue'
import { getScenicRoutes, getScenicSpots, getScenicEvents, getScenicLamps } from '@/utils/api'

// 模块级单例
const routes = ref([])
const spots = ref([])
const events = ref([])
const lamps = ref([])
const loading = ref(false)
const error = ref(null)

const ROUTE_MOCK = [
  { id: 1, name: '校园主干道', duration: '15分钟', length: '0.8km', lampIds: ['lamp_001','lamp_003'], tags: ['主干道','教学楼'], description: '从西门经教学楼到操场，贯穿校园核心区' },
  { id: 2, name: '食堂直通线', duration: '8分钟', length: '0.5km', lampIds: ['lamp_001','lamp_002'], tags: ['食堂','生活区'], description: '西门直达一食堂，沿途经过图书馆和银杏大道' },
  { id: 3, name: '操场环形道', duration: '12分钟', length: '0.6km', lampIds: ['lamp_002','lamp_003'], tags: ['运动','环形'], description: '一食堂经图书馆到操场，饭后散步首选路线' },
]

const SPOT_MOCK = [
  { id: 1, name: '北门银杏道', lampId: 'lamp_001', image: '🍂', description: '秋季银杏叶金黄铺地，校园最美打卡点', bestTime: '10月-11月 15:00-17:00', tips: '逆光拍摄银杏叶透光效果最佳' },
  { id: 2, name: '老门柱广场', lampId: 'lamp_002', image: '🏛', description: '重大建校时期的标志性门柱，承载校园历史记忆，暖光路灯映照下的绝佳取景地', bestTime: '17:00-19:00', tips: '利用路灯侧光突出门柱纹理和历史感' },
  { id: 3, name: '操场看台', lampId: 'lamp_003', image: '🏟', description: '夕阳下的操场全景，路灯点亮运动场', bestTime: '17:00-19:00', tips: '看台高处俯拍操场全貌' },
]

const EVENT_MOCK = [
  { id: 1, name: '草坪音乐节', type: '🎵', typeLabel: '音乐节', date: '2026-09-20', time: '18:30', location: '综合楼前草坪', lampId: 'lamp_001', description: '年度校园草坪音乐节，乐队Live演出，路灯氛围灯光配合' },
  { id: 2, name: '校园美食节', type: '🍜', typeLabel: '美食节', date: '2026-10-15', time: '11:00', location: '第一食堂', lampId: 'lamp_002', description: '各地美食汇聚，路灯夜间照明延长营业至晚9点' },
  { id: 3, name: '国际文化节', type: '🌍', typeLabel: '文化节', date: '2026-10-28', time: '14:00', location: '梅园篮球场', lampId: 'lamp_003', description: '多国文化交流展演，路灯彩光装饰营造异域氛围' },
  { id: 4, name: '秋季运动会', type: '🏃', typeLabel: '运动会', date: '2026-11-01', time: '08:00', location: '田径场', lampId: 'lamp_003', description: '全校田径运动会，智慧路灯全程照明保障' },
]

// 路灯坐标（百分比定位）
const LAMP_MOCK = [
  { id: 'lamp_001', name: '北门路灯', x: 25, y: 35 },
  { id: 'lamp_002', name: '田径场路灯', x: 60, y: 45 },
  { id: 'lamp_003', name: '一食堂路灯', x: 55, y: 75 },
]

async function loadScenicData() {
  loading.value = true
  error.value = null
  try {
    const [r, s, e, l] = await Promise.allSettled([
      getScenicRoutes(), getScenicSpots(), getScenicEvents(), getScenicLamps()
    ])
    routes.value = r.status === 'fulfilled' && r.value?.length ? r.value : ROUTE_MOCK
    spots.value  = s.status === 'fulfilled' && s.value?.length ? s.value : SPOT_MOCK
    events.value = e.status === 'fulfilled' && e.value?.length ? e.value : EVENT_MOCK
    lamps.value  = l.status === 'fulfilled' && l.value?.length ? l.value : LAMP_MOCK
  } catch {
    routes.value = ROUTE_MOCK; spots.value = SPOT_MOCK
    events.value = EVENT_MOCK; lamps.value = LAMP_MOCK
  } finally {
    loading.value = false
  }
}

function getSpotById(id) { return spots.value.find(s => s.id === id) }
function getEventById(id) { return events.value.find(e => e.id === id) }
function getRouteById(id) { return routes.value.find(r => r.id === id) }
function getLampById(id) { return lamps.value.find(l => l.id === id) }

function getSpotsByLamp(lampId) { return spots.value.filter(s => s.lampId === lampId) }
function getEventsByLamp(lampId) { return events.value.filter(e => e.lampId === lampId) }
function getRoutesByLamp(lampId) { return routes.value.filter(r => r.lampIds?.includes(lampId)) }

// ===== 经纬度坐标（与 ScenicMap.vue 同步） =====
const LAMP_COORDS = {
  lamp_001: [29.5980, 106.3010],
  lamp_002: [29.5970, 106.3030],
  lamp_003: [29.5967, 106.2985],
}
const SPOT_COORDS = {
  1: [29.5967, 106.3010],   // 北门银杏道
  2: [29.5939, 106.3047],   // 老门柱广场
  3: [29.5970, 106.3028],   // 操场看台
}
const EVENT_COORDS = {
  1: [29.5968, 106.2991],   // 草坪音乐节
  2: [29.5975, 106.2990],   // 校园美食节
  3: [29.5970, 106.3016],   // 国际文化节
  4: [29.5970, 106.3035],   // 秋季运动会
}

// Haversine 距离（米）
function haversine([lat1, lng1], [lat2, lng2]) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// 距离 lampId 最近的 count 个拍照点
function getNearestSpots(lampId, count = 1) {
  const lampCoord = LAMP_COORDS[lampId]
  if (!lampCoord) return []
  return [...spots.value]
    .map(s => ({ ...s, _dist: haversine(lampCoord, SPOT_COORDS[s.id] || lampCoord) }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, count)
}

// 距离 lampId 最近的 count 个活动
function getNearestEvents(lampId, count = 2) {
  const lampCoord = LAMP_COORDS[lampId]
  if (!lampCoord) return []
  return [...events.value]
    .map(e => ({ ...e, _dist: haversine(lampCoord, EVENT_COORDS[e.id] || lampCoord) }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, count)
}

export function useScenic() {
  return {
    routes, spots, events, lamps, loading, error, loadScenicData,
    getSpotById, getEventById, getRouteById, getLampById,
    getSpotsByLamp, getEventsByLamp, getRoutesByLamp,
    getNearestSpots, getNearestEvents,
    LAMP_COORDS, SPOT_COORDS, EVENT_COORDS,
  }
}
