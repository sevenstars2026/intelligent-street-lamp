import type { LampPosition, PhotoSpot, ScenicEvent, ScenicRoute } from '../types/scenic.types';

export const lampPositions: LampPosition[] = [
  { lampId: 'lamp_001', name: '入口广场路灯', x: 18, y: 78, zone: '主入口' },
  { lampId: 'lamp_002', name: '湖畔步道路灯', x: 42, y: 54, zone: '湖区' },
  { lampId: 'lamp_003', name: '花海栈道路灯', x: 68, y: 42, zone: '花海' },
];

export const scenicRoutes: ScenicRoute[] = [
  {
    id: 'route_night_lake',
    name: '湖畔夜光步道',
    description: '从入口广场出发，沿湖畔步道到达花海栈道，适合夜间散步和拍照。',
    duration: '约 35 分钟',
    lampIds: ['lamp_001', 'lamp_002', 'lamp_003'],
    highlights: ['入口广场夜景', '湖面灯光倒影', '花海栈道暖光'],
  },
  {
    id: 'route_photo_walk',
    name: '夜景拍照路线',
    description: '串联景区主要补光点，适合游客快速找到人像和湖景拍摄位置。',
    duration: '约 25 分钟',
    lampIds: ['lamp_002', 'lamp_003'],
    highlights: ['湖畔人像补光', '花海背景构图'],
  },
];

export const photoSpots: PhotoSpot[] = [
  {
    id: 'spot_lake_reflection',
    name: '湖畔倒影点',
    description: '面向湖面拍摄，利用路灯和水面倒影形成层次，适合夜景人像。',
    lampId: 'lamp_002',
    bestTime: '19:00-20:30',
    tags: ['湖景', '倒影', '人像'],
  },
  {
    id: 'spot_flower_walk',
    name: '花海栈道',
    description: '花海背景搭配栈道路灯，适合拍摄半身照和同行合影。',
    lampId: 'lamp_003',
    bestTime: '18:30-20:00',
    tags: ['花海', '栈道', '合影'],
  },
];

export const scenicEvents: ScenicEvent[] = [
  {
    id: 'event_lake_parade',
    name: '湖畔夜游巡演',
    type: 'parade',
    description: '沿湖畔步道进行的小型巡游表演，游客可在主入口和湖区观赏。',
    date: '2026-10-01',
    startTime: '19:30',
    endTime: '20:00',
    location: '湖畔步道',
    countdown: true,
  },
  {
    id: 'event_water_show',
    name: '水幕电影',
    type: 'water_show',
    description: '湖区水幕投影展示景区故事，建议提前 15 分钟到达湖畔区域。',
    date: '2026-10-01',
    startTime: '20:20',
    endTime: '20:45',
    location: '湖区观景台',
    countdown: true,
  },
];

