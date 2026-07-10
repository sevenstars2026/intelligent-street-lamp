<template>
  <div class="page">
    <div class="detail-header">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <span class="detail-type">📸 拍照点</span>
    </div>

    <!-- 图片横向滑动展示 -->
    <div class="image-gallery" v-if="spot.images?.length">
      <div class="gallery-scroll" ref="scrollRef" @scroll="onScroll">
        <img v-for="(img, i) in spot.images" :key="i" :src="img" :alt="spot.name" class="gallery-img" />
      </div>
      <div class="gallery-dots" v-if="spot.images.length > 1">
        <span v-for="(img, i) in spot.images" :key="i" :class="{ active: i === currentIndex }" @click="scrollTo(i)" class="dot"></span>
      </div>
    </div>

    <div class="detail-body">
      <h1 class="spot-name">{{ spot.image }} {{ spot.name }}</h1>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">🕐 最佳时间</span>
          <span class="info-value">{{ spot.bestTime }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">💡 拍摄建议</span>
          <span class="info-value">{{ spot.tips }}</span>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">景点介绍</h2>
        <p class="section-text">{{ spot.description }}</p>
      </div>

      <div class="section">
        <h2 class="section-title">拍摄攻略</h2>
        <p class="section-text">{{ spot.guide }}</p>
      </div>

      <div class="section">
        <h2 class="section-title">周边设施</h2>
        <ul class="notice-list">
          <li v-for="f in spot.facilities" :key="f">{{ f }}</li>
        </ul>
      </div>

    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'

const route = useRoute()
const currentIndex = ref(0)
const scrollRef = ref(null)

function onScroll() {
  if (!scrollRef.value) return
  const w = scrollRef.value.clientWidth
  currentIndex.value = Math.round(scrollRef.value.scrollLeft / w)
}
function scrollTo(i) {
  if (!scrollRef.value) return
  scrollRef.value.scrollTo({ left: i * scrollRef.value.clientWidth, behavior: 'smooth' })
}

const SPOT_DATA = {
  '1': {
    image: '🍂', name: '北门银杏道',
    bestTime: '10月-11月 15:00-17:00', tips: '逆光拍摄银杏叶透光效果最佳',
    lampId: 'lamp_001',
    images: ['/images/ginkgo1.jpg', '/images/ginkgo2.jpg'],
    description: '北门银杏道是重庆大学虎溪校区最具标志性的景观大道，每年深秋时节，两排数十棵银杏树同时变黄，铺就一条金色长廊。智慧路灯暖光与金叶交相辉映，成为校园最热门的拍照打卡地。',
    guide: '推荐拍摄时间为下午3-5点，此时阳光斜射，银杏叶呈现最佳透光效果。建议使用广角镜头站在道路中段取景，可将两排银杏树形成的纵深隧道感完整呈现；或用长焦大光圈拍摄路灯与单片银杏叶的细节。雨后初晴的清晨，满地金黄落叶搭配湿润路面倒影，也是绝佳出片时机。',
    facilities: ['道路两侧设有休闲长椅', '北门入口处有校园导览图', '距北门停车场步行3分钟', '沿途有自动贩卖机', '路灯编号 lamp_001，扫码可查看导览信息'],
  },
  '2': {
    image: '🏛', name: '老门柱广场',
    bestTime: '17:00-19:00', tips: '利用路灯侧光突出门柱纹理和历史感',
    lampId: 'lamp_002',
    images: ['/images/gate1.jpg'],
    description: '老门柱广场保留着重庆大学建校时期的标志性石门柱，历经数十年风雨仍巍然矗立。厚重石材纹理承载着学校"耐劳苦、尚俭朴、勤学业、爱国家"的校训精神。夕阳时分，智慧路灯暖光斜照门柱，历史与现代在此交汇。',
    guide: '最佳拍摄时间为傍晚金色时刻（17:00-19:00），此时路灯亮起，暖色侧光完美勾勒门柱的石材纹理与浮雕细节。建议低角度仰拍突出门柱的雄伟感，或将人物置于门柱之间形成框式构图。毕业季时穿着学士服在此留影，是重大学子的传统。',
    facilities: ['广场设有休息区和长椅', '距第一食堂步行2分钟', '周边有自行车停放架', '广场地面为防滑石材', '路灯编号 lamp_002，夜间照明明亮'],
  },
  '3': {
    image: '🏟', name: '操场看台',
    bestTime: '17:00-19:00', tips: '看台高处俯拍操场全貌',
    lampId: 'lamp_003',
    images: ['/images/stand1.jpg', '/images/stand2.jpg'],
    description: '田径场看台是虎溪校区视野最开阔的制高点之一，可俯瞰标准400米跑道、足球场及远处教学楼群。夕阳西沉时，操场被染成金黄色，路灯逐一亮起如星点排列，是拍摄校园全景和运动题材的理想机位。',
    guide: '推荐傍晚登上看台最高层，用广角镜头收纳跑道弧线与渐暗天空的壮阔构图。路灯亮起瞬间（约18:00）可拍摄冷暖光交替的magic hour效果。运动会期间从此处俯拍方阵入场和比赛场面，视角独到。夜间长曝光可拍出路灯光轨与跑道人影的动感画面。',
    facilities: ['看台共有5层，可容纳2000人', '一层设有卫生间和饮水机', '距田径场入口步行1分钟', '看台下方有体育器材室', '路灯编号 lamp_003，覆盖看台全部区域'],
  },
}

const spot = computed(() => SPOT_DATA[route.params.id] || { name: '未知' })
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

.image-gallery { position: relative; }
.gallery-scroll {
  display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.gallery-scroll::-webkit-scrollbar { display: none; }
.gallery-img {
  width: 100%; flex-shrink: 0; aspect-ratio: 16/10;
  object-fit: cover; scroll-snap-align: start;
}
.gallery-dots {
  display: flex; justify-content: center; gap: 6px;
  padding: 8px 0; position: absolute; bottom: 8px; left: 0; right: 0;
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,0.5); cursor: pointer; transition: background 0.2s;
}
.dot.active { background: #fff; width: 18px; border-radius: 3px; }

.detail-body { padding: 0 16px 24px; display: flex; flex-direction: column; gap: 18px; }
.spot-name { font-size: 22px; font-weight: 700; color: var(--color-text); }
.info-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
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
