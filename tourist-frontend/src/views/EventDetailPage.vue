<template>
  <div class="page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <span class="detail-type">{{ event.type }} {{ event.typeLabel }}</span>
    </div>

    <!-- 头图轮播 -->
    <div class="image-gallery" v-if="event.images?.length">
      <div class="gallery-main">
        <img :src="event.images[currentImage]" :alt="event.name" class="main-image" />
      </div>
      <div class="gallery-thumbs" v-if="event.images.length > 1">
        <img v-for="(img, i) in event.images" :key="i" :src="img"
          :class="{ active: i === currentImage }"
          @click="currentImage = i" class="thumb-image" />
      </div>
    </div>

    <!-- 活动信息 -->
    <div class="detail-body">
      <h1 class="event-name">{{ event.type }} {{ event.name }}</h1>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">📅 日期</span>
          <span class="info-value">{{ event.date }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">⏰ 时间</span>
          <span class="info-value">{{ event.time }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">📍 地点</span>
          <span class="info-value">{{ event.location }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">🏷 类型</span>
          <span class="info-value">{{ event.typeLabel }}</span>
        </div>
      </div>

      <CountdownBadge :targetDate="event.date + 'T' + event.time" />

      <div class="section">
        <h2 class="section-title">活动介绍</h2>
        <p class="section-text">{{ event.description }}</p>
      </div>

      <div class="section">
        <h2 class="section-title">活动详情</h2>
        <p class="section-text">{{ event.detail }}</p>
      </div>

      <div class="section">
        <h2 class="section-title">参与须知</h2>
        <ul class="notice-list">
          <li v-for="n in event.notices" :key="n">{{ n }}</li>
        </ul>
      </div>

      <!-- 地图定位按钮 -->
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import CountdownBadge from '@/components/CountdownBadge.vue'
import BottomNav from '@/components/BottomNav.vue'

const route = useRoute()
const currentImage = ref(0)

const EVENT_DATA = {
  '1': {
    type: '🎵', name: '草坪音乐节', typeLabel: '音乐节',
    date: '2026-09-20', time: '18:30', location: '综合楼前草坪', lampId: 'lamp_001',
    images: ['/images/music1.jpg', '/images/music2.jpg'],
    description: '年度校园草坪音乐节，汇聚校内外优秀乐队与独立音乐人，在综合楼前万平草坪上打造沉浸式户外音乐现场。路灯暖光配合舞台灯光，营造独特的夜间音乐氛围。',
    detail: '本届草坪音乐节设置\"落日舞台\"与\"星空舞台\"双舞台，从傍晚18:30持续至晚间22:00。演出阵容涵盖流行、摇滚、民谣、电子等多种风格，特邀知名校园乐队\"银杏乐队\"压轴演出。现场设有美食市集、文创摊位和互动打卡区，智慧路灯系统将根据演出节奏智能调节区域照明亮度。',
    notices: ['请携带学生证或活动门票入场', '建议携带野餐垫，草坪区域可席地而坐', '夜间气温较低，建议携带外套', '请勿携带玻璃瓶装饮品入场', '活动结束后请将垃圾带离现场'],
  },
  '2': {
    type: '🍜', name: '校园美食节', typeLabel: '美食节',
    date: '2026-10-15', time: '11:00', location: '第一食堂广场', lampId: 'lamp_002',
    images: ['/images/food1.jpg', '/images/food2.jpg'],
    description: '一年一度的校园美食盛会，汇集全国八大菜系及国际美食摊位，在第一食堂广场及周边区域打造\"行走的美食地图\"。路灯夜间照明延长至21:00，保障活动安全。',
    detail: '本届美食节以\"寻味中国·品味世界\"为主题，设50+美食摊位，涵盖川渝火锅、广式茶点、西北烧烤、日韩料理、东南亚风味等。现场还有\"校园厨神争霸赛\"、\"大胃王挑战赛\"等趣味活动。智慧路灯系统将为活动区域提供充足照明，并在夜晚配合灯笼装饰营造温馨用餐氛围。',
    notices: ['美食摊位仅支持校园卡和移动支付', '请自觉排队，文明用餐', '过敏体质请注意摊位标注的致敏信息', '餐后请将餐盒投入分类垃圾桶', '活动期间人流量大，请注意个人财物安全'],
  },
  '3': {
    type: '🌍', name: '国际文化节', typeLabel: '文化节',
    date: '2026-10-28', time: '14:00', location: '梅园篮球场', lampId: 'lamp_003',
    images: ['/images/culture1.jpg', '/images/culture2.jpg'],
    description: '重庆大学年度国际文化交流盛典，来自50+国家的留学生共同呈现本国文化精髓，在梅园篮球场搭建\"世界文化村\"。智慧路灯彩光装饰营造异域风情氛围。',
    detail: '国际文化节设置国家文化展区、传统服饰巡游、世界美食体验、国际艺术表演四大板块。留学生将穿着本国传统服饰进行巡游表演，各国展区可体验传统手工艺制作。晚间19:00在梅园篮球场主舞台举行\"世界之夜\"文艺汇演，智慧路灯系统将配合各国特色音乐变换灯光色彩。',
    notices: ['活动免费开放，无需门票', '各国美食体验需购买文化节纪念币', '传统服饰巡游14:30开始，请提前到场', '体验手工艺制作请听从工作人员指导', '请尊重各国文化习俗和宗教信仰'],
  },
  '4': {
    type: '🏃', name: '秋季运动会', typeLabel: '运动会',
    date: '2026-11-01', time: '08:00', location: '田径场', lampId: 'lamp_003',
    images: ['/images/sports1.jpg', '/images/sports2.jpg'],
    description: '重庆大学虎溪校区年度田径运动会，全校各学院代表队齐聚田径场，展开为期两天的激烈角逐。智慧路灯系统为全天赛事提供稳定照明保障，夜场项目灯光覆盖全场。',
    detail: '本届运动会设男子/女子短跑、中长跑、接力赛、跳高、跳远、铅球等传统田径项目，新增\"师生混合接力\"和\"趣味障碍跑\"两大特色项目。开幕式于11月1日8:00举行，各学院方阵入场式将在路灯灯光秀配合下进行。智慧路灯系统将为11月1日晚间的夜场决赛提供全方位照明，确保赛事安全与观赛体验。',
    notices: ['运动员请于7:30前到场签到检录', '观众请在看台指定区域就座，勿进入赛道', '请勿在比赛期间使用闪光灯拍照', '赛场设有医疗点和饮水站', '如遇恶劣天气，赛事安排将另行通知'],
  },
}

const event = computed(() => EVENT_DATA[route.params.id] || { name: '未知活动' })
</script>

<style scoped>
.page { padding-bottom: 80px; }
.detail-header {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: var(--color-card); position: sticky; top: 0; z-index: 50;
}
.back-btn {
  border: none; background: #f5f0ea; padding: 6px 14px;
  border-radius: 20px; font-size: 14px; cursor: pointer; color: var(--color-text); font-family: var(--font-sans);
}
.detail-type { font-size: 14px; font-weight: 600; color: var(--color-primary-dark); }

.image-gallery { margin: 0 0 12px; }
.gallery-main { width: 100%; aspect-ratio: 16/10; overflow: hidden; background: #f0e8dc; }
.main-image { width: 100%; height: 100%; object-fit: cover; }
.gallery-thumbs { display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto; }
.thumb-image { width: 64px; height: 48px; border-radius: 6px; object-fit: cover; border: 2px solid transparent; cursor: pointer; transition: border-color 0.2s; }
.thumb-image.active { border-color: var(--color-primary); }

.detail-body { padding: 0 16px 24px; display: flex; flex-direction: column; gap: 18px; }
.event-name { font-size: 22px; font-weight: 700; color: var(--color-text); }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 4px; padding: 10px; background: #fdf8f2; border-radius: 10px; }
.info-label { font-size: 12px; color: var(--color-text-muted); }
.info-value { font-size: 14px; font-weight: 600; color: var(--color-text); }

.section { display: flex; flex-direction: column; gap: 8px; }
.section-title { font-size: 16px; font-weight: 600; color: var(--color-text); }
.section-text { font-size: 14px; color: var(--color-text-secondary); line-height: 1.7; }
.notice-list { display: flex; flex-direction: column; gap: 8px; padding-left: 20px; }
.notice-list li { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; }

.map-btn { margin-top: 4px; }
</style>
