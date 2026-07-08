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
  { id: 1, name: '湖畔夜光步道', duration: '45分钟', length: '1.8km', lampIds: ['lamp_001','lamp_003'], tags: ['夜景','散步'], description: '沿湖步道，夜晚路灯暖光映射湖面，是散步赏景的最佳路线' },
  { id: 2, name: '花海漫步路线', duration: '30分钟', length: '1.2km', lampIds: ['lamp_001','lamp_002'], tags: ['赏花','拍照'], description: '穿行四季花海，路灯与花丛相映成趣，沿途多个绝佳拍照点' },
  { id: 3, name: '森林探幽小径', duration: '60分钟', length: '2.5km', lampIds: ['lamp_002','lamp_003'], tags: ['徒步','森林'], description: '深入湿地森林腹地，路灯引导安全前行，聆听鸟鸣虫吟' },
]

const SPOT_MOCK = [
  { id: 1, name: '夕阳亭', lampId: 'lamp_001', image: '🌅', description: '傍晚路灯暖光与夕阳交织，湖面倒影如画', bestTime: '17:30-19:00', tips: '建议使用广角镜头，站在亭子东侧取景' },
  { id: 2, name: '樱花大道', lampId: 'lamp_002', image: '🌸', description: '春季樱花盛开时，路灯下花瓣飘落，浪漫至极', bestTime: '3月-4月 15:00-17:00', tips: '逆光拍摄花瓣透光效果最佳' },
  { id: 3, name: '湖心观景台', lampId: 'lamp_003', image: '🏞', description: '湿地全景尽收眼底，路灯点缀如星落人间', bestTime: '18:00-20:00', tips: '等待路灯亮起时刻，冷暖光对比极佳' },
  { id: 4, name: '水杉林栈道', lampId: 'lamp_002', image: '🌲', description: '高耸水杉林间栈道，路灯穿透树冠形成光柱', bestTime: '16:00-18:00', tips: '仰拍光柱穿透树冠的丁达尔效应' },
]

const EVENT_MOCK = [
  { id: 1, name: '国庆烟花盛典', type: '🎇', typeLabel: '烟花', date: '2026-10-01', time: '19:30', location: '湖心广场', lampId: 'lamp_003', description: '年度最大型烟花表演，配合路灯灯光秀' },
  { id: 2, name: '中秋灯会巡游', type: '🎭', typeLabel: '巡游', date: '2026-09-15', time: '18:00', location: '樱花大道', lampId: 'lamp_002', description: '传统花灯巡游，沿途路灯配合调暗营造氛围' },
  { id: 3, name: '水幕光影秀', type: '💧', typeLabel: '水幕', date: '2026-07-20', time: '20:00', location: '湖心观景台', lampId: 'lamp_003', description: '水幕投影+路灯联动变色，视觉盛宴' },
  { id: 4, name: '湿地音乐节', type: '🎵', typeLabel: '音乐', date: '2026-08-10', time: '18:30', location: '花海广场', lampId: 'lamp_001', description: '户外音乐演出，路灯随音乐节奏变幻色彩' },
]

// 路灯 SVG 坐标（百分比定位）
const LAMP_MOCK = [
  { id: 'lamp_001', name: '夕阳亭路灯', x: 30, y: 35 },
  { id: 'lamp_002', name: '花海路灯',   x: 58, y: 52 },
  { id: 'lamp_003', name: '湖心路灯',   x: 45, y: 72 },
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

export function useScenic() {
  return {
    routes, spots, events, lamps, loading, error, loadScenicData,
    getSpotById, getEventById, getRouteById, getLampById,
    getSpotsByLamp, getEventsByLamp, getRoutesByLamp,
  }
}
