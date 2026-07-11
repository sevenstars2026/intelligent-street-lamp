<template>
  <div class="lamp-illustration">
    <svg viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg" class="lamp-svg">
      <defs>
        <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-cyan" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-strong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <!-- 主题感知灯杆渐变 -->
        <linearGradient id="pole-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="poleDark" />
          <stop offset="35%" :stop-color="poleLight" />
          <stop offset="65%" :stop-color="poleLight" />
          <stop offset="100%" :stop-color="poleDark" />
        </linearGradient>
        <!-- 光照锥形渐变 -->
        <linearGradient id="beam-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="beamColor" stop-opacity="0.5" />
          <stop offset="100%" :stop-color="beamColor" stop-opacity="0" />
        </linearGradient>
        <!-- 灯具面板渐变 -->
        <linearGradient id="panel-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="panelColor" stop-opacity="0.4" />
          <stop offset="100%" :stop-color="panelColor" stop-opacity="0.08" />
        </linearGradient>
      </defs>

      <!-- ===== 背景：城市天际线 ===== -->
      <g :opacity="skylineOpacity">
        <!-- 远层建筑 -->
        <rect x="40"  y="470" width="28" height="90"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="72"  y="440" width="22" height="120" rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="98"  y="490" width="35" height="70"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="138" y="420" width="18" height="140" rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="160" y="505" width="40" height="55"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="380" y="455" width="38" height="105" rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="422" y="410" width="22" height="150" rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="448" y="480" width="32" height="80"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="485" y="450" width="26" height="110" rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <rect x="515" y="500" width="45" height="60"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.6" />
        <!-- 近层建筑 -->
        <rect x="28"  y="500" width="36" height="60"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.7" />
        <rect x="200" y="520" width="42" height="40"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.7" />
        <rect x="340" y="510" width="30" height="50"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.7" />
        <rect x="545" y="525" width="28" height="35"  rx="2" fill="none" :stroke="skylineStroke" stroke-width="0.7" />
        <!-- 窗户 -->
        <g :fill="skylineWindow" opacity="0.6">
          <rect x="78" y="448" width="3" height="2" rx="0.5" /><rect x="84" y="458" width="3" height="2" rx="0.5" />
          <rect x="78" y="470" width="3" height="2" rx="0.5" /><rect x="144" y="430" width="3" height="2" rx="0.5" />
          <rect x="144" y="442" width="3" height="2" rx="0.5" /><rect x="144" y="460" width="3" height="2" rx="0.5" />
          <rect x="428" y="420" width="3" height="2" rx="0.5" /><rect x="428" y="432" width="3" height="2" rx="0.5" />
          <rect x="428" y="450" width="3" height="2" rx="0.5" /><rect x="490" y="460" width="3" height="2" rx="0.5" />
          <rect x="490" y="475" width="3" height="2" rx="0.5" /><rect x="388" y="470" width="3" height="2" rx="0.5" />
          <rect x="522" y="510" width="3" height="2" rx="0.5" /><rect x="528" y="520" width="3" height="2" rx="0.5" />
        </g>
      </g>

      <!-- 地面线 -->
      <line x1="50" y1="560" x2="550" y2="560" :stroke="skylineStroke" stroke-width="0.6" :opacity="skylineOpacity" />

      <!-- ===== 路灯主体 ===== -->
      <!-- 底座 -->
      <rect x="264" y="548" width="72" height="14" rx="5" :fill="poleDark" opacity="0.7" />
      <rect x="274" y="538" width="52" height="12" rx="4" :fill="poleGradUrl" opacity="0.6" />
      <rect x="280" y="530" width="40" height="10" rx="3" :fill="poleGradUrl" opacity="0.5" />

      <!-- 灯杆主体 —— 锥形渐变 -->
      <path d="M292 128 L308 128 L312 528 L288 528 Z" :fill="poleGradUrl" />
      <!-- 灯杆中线高光 -->
      <line x1="300" y1="132" x2="300" y2="526" :stroke="poleLight" stroke-width="1.5" opacity="0.4" />

      <!-- 检修口/装饰面板 -->
      <rect x="290" y="340" width="20" height="50" rx="4" :fill="poleDark" opacity="0.35" />
      <rect x="293" y="344" width="14" height="18" rx="2" fill="none" :stroke="poleLight" stroke-width="0.5" opacity="0.4" />
      <rect x="293" y="366" width="14" height="18" rx="2" fill="none" :stroke="poleLight" stroke-width="0.5" opacity="0.4" />

      <!-- 灯杆装饰环 -->
      <rect x="286" y="210" width="28" height="3" rx="1.5" :fill="poleLight" opacity="0.45" />
      <rect x="286" y="420" width="28" height="3" rx="1.5" :fill="poleLight" opacity="0.45" />

      <!-- 灯臂 —— 左右弧形 -->
      <path d="M300 140 Q300 98 272 90 L200 66" :stroke="poleGradUrl" stroke-width="7" fill="none" stroke-linecap="round" />
      <path d="M300 140 Q300 98 328 90 L400 66" :stroke="poleGradUrl" stroke-width="7" fill="none" stroke-linecap="round" />

      <!-- 灯臂上线高光 -->
      <path d="M298 138 Q298 96 272 88 L200 64" stroke="white" stroke-width="0.8" fill="none" opacity="0.15" stroke-linecap="round" />
      <path d="M302 138 Q302 96 328 88 L400 64" stroke="white" stroke-width="0.8" fill="none" opacity="0.15" stroke-linecap="round" />

      <!-- 左侧灯具外壳 -->
      <g filter="url(#glow-blue)">
        <path d="M172 66 L198 55 L228 66 L228 80 L198 88 L172 80 Z" :fill="fixtureFill" :stroke="accentColor" stroke-width="1" />
        <!-- LED 发光面板 -->
        <path d="M184 70 L198 65 L212 70 L212 78 L198 82 L184 78 Z" :fill="panelGradUrl" />
        <line x1="198" y1="66" x2="198" y2="81" :stroke="accentColor" stroke-width="0.5" opacity="0.4" />
      </g>
      <!-- 左侧光照锥 -->
      <path d="M160 78 L240 78 L280 140 L120 140 Z" fill="url(#beam-grad)" opacity="0.2" filter="url(#glow-strong)" />

      <!-- 右侧灯具外壳 -->
      <g filter="url(#glow-blue)">
        <path d="M372 66 L402 55 L428 66 L428 80 L402 88 L372 80 Z" :fill="fixtureFill" :stroke="accentColor" stroke-width="1" />
        <!-- LED 发光面板 -->
        <path d="M388 70 L402 65 L416 70 L416 78 L402 82 L388 78 Z" :fill="panelGradUrl" />
        <line x1="402" y1="66" x2="402" y2="81" :stroke="accentColor" stroke-width="0.5" opacity="0.4" />
      </g>
      <!-- 右侧光照锥 -->
      <path d="M360 78 L440 78 L480 140 L320 140 Z" fill="url(#beam-grad)" opacity="0.2" filter="url(#glow-strong)" />

      <!-- 灯头顶部模块 -->
      <rect x="286" y="112" width="28" height="18" rx="4" :fill="fixtureFill" :stroke="accentColor" stroke-width="0.8" />
      <rect x="292" y="116" width="16" height="6" rx="2" :fill="poleLight" opacity="0.5" />
      <!-- 顶部传感器/天线 -->
      <line x1="300" y1="112" x2="300" y2="100" :stroke="accentColor" stroke-width="1.5" />
      <circle cx="300" cy="97" r="3" :fill="accentColor" filter="url(#glow-cyan)" />

      <!-- ===== 三个功能模块 ===== -->

      <!-- 模块1：设备管理 -->
      <g class="module-group module-clickable" @click="$emit('nav-lighting')">
        <path class="dash-line" d="M142 172 Q172 158 200 148 Q215 143 222 140" :stroke="accentColor" stroke-width="1.5"
              fill="none" stroke-dasharray="5 4" filter="url(#glow-cyan)" />
        <circle class="conn-dot" cx="222" cy="140" r="4" :fill="accentColor" filter="url(#glow-cyan)" />
        <circle class="outer-ring ring-1" cx="126" cy="186" r="30" fill="none" :stroke="accentColor" stroke-width="0.6" />
        <circle class="outer-ring ring-2" cx="126" cy="186" r="36" fill="none" :stroke="accentColor" stroke-width="0.4" />
        <circle class="icon-bg" cx="126" cy="186" r="25" :fill="iconBgFill" :stroke="accentColor" stroke-width="1.5" filter="url(#glow-cyan)" />
        <g class="icon-inner lighting-icon" transform="translate(126, 186)" fill="none" :stroke="accentColor" stroke-width="1.3" stroke-linecap="round">
          <path d="M-8-8 Q-8-15 0-15 Q8-15 8-8 Q8-2 3 4 L3 8" />
          <path d="M-5 8 L5 8" />
          <line x1="-4" y1="10" x2="4" y2="10" stroke-width="0.8" />
        </g>
        <text x="126" y="228" text-anchor="middle" :fill="labelColor" font-size="11" font-weight="500">设备管理</text>
      </g>

      <!-- 模块2：历史数据 -->
      <g class="module-group module-clickable" @click="$emit('nav-weather')">
        <path class="dash-line" d="M462 358 Q428 348 398 342 Q358 336 322 332" :stroke="accentColor" stroke-width="1.5"
              fill="none" stroke-dasharray="5 4" filter="url(#glow-cyan)" />
        <circle class="conn-dot" cx="322" cy="332" r="4" :fill="accentColor" filter="url(#glow-cyan)" />
        <circle class="outer-ring ring-1" cx="480" cy="366" r="30" fill="none" :stroke="accentColor" stroke-width="0.6" />
        <circle class="outer-ring ring-2" cx="480" cy="366" r="36" fill="none" :stroke="accentColor" stroke-width="0.4" />
        <circle class="icon-bg" cx="480" cy="366" r="25" :fill="iconBgFill" :stroke="accentColor" stroke-width="1.5" filter="url(#glow-cyan)" />
        <g class="icon-inner weather-icon" transform="translate(480, 366)" fill="none" :stroke="accentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="-2" cy="-6" r="5" />
          <path d="M-2-1 L-2 8 M-8 4 L4 4" />
          <path class="sun-ray" d="M7-6 L12-3" /><path class="sun-ray" d="M8 0 L13 2" />
          <path class="sun-ray" d="M7-12 L12-14" /><path class="sun-ray" d="M8-13 L13-15" />
        </g>
        <text x="480" y="408" text-anchor="middle" :fill="labelColor" font-size="11" font-weight="500">历史数据</text>
      </g>

      <!-- 模块4：故障上报 -->
      <g class="module-group module-clickable" @click="$emit('nav-fault-reports')">
        <path class="dash-line" d="M458 172 Q428 158 400 148 Q385 143 378 138" :stroke="accentColor" stroke-width="1.5"
              fill="none" stroke-dasharray="5 4" filter="url(#glow-cyan)" />
        <circle class="conn-dot" cx="378" cy="138" r="4" :fill="accentColor" filter="url(#glow-cyan)" />
        <circle class="outer-ring ring-1" cx="474" cy="186" r="30" fill="none" :stroke="accentColor" stroke-width="0.6" />
        <circle class="outer-ring ring-2" cx="474" cy="186" r="36" fill="none" :stroke="accentColor" stroke-width="0.4" />
        <circle class="icon-bg" cx="474" cy="186" r="25" :fill="iconBgFill" :stroke="accentColor" stroke-width="1.5" filter="url(#glow-cyan)" />
        <g class="icon-inner fault-icon" transform="translate(474, 186)" fill="none" :stroke="accentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M0-12 L10 8 L-10 8 Z" />
          <line x1="0" y1="-4" x2="0" y2="4" />
          <circle cx="0" cy="7" r="1.3" :fill="accentColor" />
        </g>
        <text x="474" y="228" text-anchor="middle" :fill="labelColor" font-size="11" font-weight="500">故障上报</text>
      </g>

      <!-- 模块5：智能问答（仅管理员） -->
      <g v-if="showQa" class="module-group module-clickable" @click="$emit('nav-qa')">
        <path class="dash-line" d="M462 490 Q432 475 390 468 Q350 460 320 457" :stroke="accentColor" stroke-width="1.5"
              fill="none" stroke-dasharray="5 4" filter="url(#glow-cyan)" />
        <circle class="conn-dot" cx="320" cy="457" r="4" :fill="accentColor" filter="url(#glow-cyan)" />
        <circle class="outer-ring ring-1" cx="474" cy="505" r="30" fill="none" :stroke="accentColor" stroke-width="0.6" />
        <circle class="outer-ring ring-2" cx="474" cy="505" r="36" fill="none" :stroke="accentColor" stroke-width="0.4" />
        <circle class="icon-bg" cx="474" cy="505" r="25" :fill="iconBgFill" :stroke="accentColor" stroke-width="1.5" filter="url(#glow-cyan)" />
        <g class="icon-inner qa-icon" transform="translate(474, 505)" fill="none" :stroke="accentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="0" cy="-4" r="8" />
          <circle cx="-3" cy="-4" r="1.5" :fill="accentColor" />
          <circle cx="3" cy="-4" r="1.5" :fill="accentColor" />
          <path d="M-4 0 Q0 5 4 0" />
        </g>
        <text x="474" y="547" text-anchor="middle" :fill="labelColor" font-size="11" font-weight="500">智能问答</text>
      </g>

      <!-- 模块3：通讯报警 -->
      <g class="module-group module-clickable" @click="$emit('show-alarm')">
        <path class="dash-line" d="M142 490 Q172 475 210 468 Q250 460 280 457" :stroke="accentColor" stroke-width="1.5"
              fill="none" stroke-dasharray="5 4" filter="url(#glow-cyan)" />
        <circle class="conn-dot alarm-dot" cx="280" cy="457" r="4" :fill="accentColor" filter="url(#glow-cyan)" />
        <circle class="outer-ring ring-1" cx="126" cy="505" r="30" fill="none" :stroke="accentColor" stroke-width="0.6" />
        <circle class="outer-ring ring-2" cx="126" cy="505" r="36" fill="none" :stroke="accentColor" stroke-width="0.4" />
        <circle class="icon-bg alarm-bg" cx="126" cy="505" r="25" :fill="iconBgFill" :stroke="accentColor" stroke-width="1.5" filter="url(#glow-cyan)" />
        <g class="icon-inner alarm-icon" transform="translate(126, 505)" fill="none" :stroke="accentColor" stroke-width="1.3" stroke-linecap="round">
          <path class="signal-arc s1" d="M-13-9 Q-6-13 0-11 Q6-13 13-9" />
          <path class="signal-arc s2" d="M-9-3 Q-4-6 0-4 Q4-6 9-3" />
          <path class="signal-arc s3" d="M-5 3 Q-2 1 0 2 Q2 1 5 3" />
          <circle cx="0" cy="7" r="1.8" :fill="accentColor" />
          <g class="bell-group">
            <path class="bell-left" d="M-6-16 Q-4-20 0-15" stroke-width="0.9" />
            <path class="bell-right" d="M6-16 Q4-20 0-15" stroke-width="0.9" />
          </g>
        </g>
        <text x="126" y="547" text-anchor="middle" :fill="labelColor" font-size="11" font-weight="500">通讯报警</text>
      </g>

      <!-- 底部标题 -->
      <text x="300" y="610" text-anchor="middle" :fill="poleLight" font-size="13" font-weight="600" opacity="0.7"
            font-family="'Space Grotesk','DM Sans',sans-serif" letter-spacing="3">智慧路灯 · 核心功能</text>
      <line x1="170" y1="625" x2="430" y2="625" :stroke="poleLight" stroke-width="0.5" opacity="0.25" />
    </svg>
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'

const props = defineProps({ showQa: { type: Boolean, default: false } })
const emit = defineEmits(['nav-lighting', 'nav-weather', 'show-alarm', 'nav-fault-reports', 'nav-qa'])
const theme = inject('theme', ref('dark'))

// 主题感知颜色
const isDark = computed(() => theme.value === 'dark')

const labelColor   = computed(() => isDark.value ? '#c5fef5' : '#1e3a8a')
const accentColor  = computed(() => isDark.value ? '#a1feef' : '#1e3a8a')
const poleLight    = computed(() => isDark.value ? '#87a5ed' : '#658ae4')
const poleDark     = computed(() => isDark.value ? '#3a5088' : '#b0c8f0')
const poleGradUrl  = computed(() => 'url(#pole-grad)')
const panelGradUrl = computed(() => 'url(#panel-grad)')
const beamColor    = computed(() => isDark.value ? '#a1feef' : '#658ae4')
const panelColor   = computed(() => isDark.value ? '#a1feef' : '#658ae4')
const fixtureFill  = computed(() => isDark.value ? '#1e2a45' : '#e8edf6')
const iconBgFill   = computed(() => isDark.value ? 'rgba(101,138,228,0.28)' : 'rgba(101,138,228,0.18)')
const skylineStroke = computed(() => isDark.value ? '#658ae4' : '#4a6ab5')
const skylineWindow = computed(() => isDark.value ? '#87a5ed' : '#658ae4')
const skylineOpacity = computed(() => isDark.value ? 0.12 : 0.18)
</script>

<style scoped>
.lamp-illustration {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(101,138,228,0.07) 0%, transparent 60%);
  border-radius: 12px;
  overflow: hidden;
}

.lamp-svg {
  width: 100%;
  height: 100%;
  max-height: 680px;
}

/* ===== 模块组 ===== */
.module-group { animation: module-float 4.5s ease-in-out infinite; }
.module-group:nth-child(16) { animation-delay: 0s; }
.module-group:nth-child(17) { animation-delay: 1.5s; }
.module-group:nth-child(18) { animation-delay: 3s; }

.module-clickable { cursor: pointer; }
.module-clickable:active { opacity: 0.7; }

/* ===== 虚线流动 ===== */
.dash-line { animation: dash-flow 1.8s linear infinite; }
@keyframes dash-flow {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -18; }
}

/* ===== 连接圆点脉冲 ===== */
.conn-dot { animation: dot-pulse 2s ease-in-out infinite; }
.alarm-dot { animation: dot-pulse 1s ease-in-out infinite; }
@keyframes dot-pulse {
  0%, 100% { r: 4; opacity: 0.85; }
  50%      { r: 6.5; opacity: 1; }
}

/* ===== 外圈光晕涟漪 ===== */
.outer-ring { animation: ring-ripple 3.5s ease-out infinite; }
.ring-2 { animation-delay: 1.75s; }
@keyframes ring-ripple {
  0%   { r: 28; opacity: 0.55; stroke-width: 1.2; }
  100% { r: 40; opacity: 0;    stroke-width: 0.1; }
}

/* ===== 图标圆圈呼吸 ===== */
.icon-bg { animation: icon-breathe 3s ease-in-out infinite; }
@keyframes icon-breathe {
  0%, 100% { stroke-width: 1.5; }
  50%      { stroke-width: 2.3; }
}

.alarm-bg { animation: alarm-breathe 2s ease-in-out infinite; }
@keyframes alarm-breathe {
  0%, 100% { stroke-width: 1.5; }
  35%      { stroke-width: 2.6; }
  65%      { stroke-width: 1.8; }
}

/* ===== 模块浮动 ===== */
@keyframes module-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

/* ===== 设备管理：灯泡呼吸 ===== */
.lighting-icon { animation: bulb-glow 2.5s ease-in-out infinite; }
@keyframes bulb-glow {
  0%, 100% { opacity: 0.75; stroke-width: 1.3; }
  50%      { opacity: 1;    stroke-width: 1.7; }
}

/* ===== 历史数据：射线闪烁 ===== */
.weather-icon { animation: weather-sway 5s ease-in-out infinite; }
@keyframes weather-sway {
  0%, 100% { transform: translate(480px, 366px) rotate(0deg); }
  50%      { transform: translate(480px, 366px) rotate(4deg); }
}

.sun-ray { animation: ray-pulse 2s ease-in-out infinite; transform-origin: 10px -4px; }
.sun-ray:nth-child(3) { animation-delay: 0s; }
.sun-ray:nth-child(4) { animation-delay: 0.4s; }
.sun-ray:nth-child(5) { animation-delay: 0.8s; }
.sun-ray:nth-child(6) { animation-delay: 1.2s; }
@keyframes ray-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; stroke-width: 1.8; }
}

/* ===== 通讯报警：信号波 + 铃铛 ===== */
.alarm-icon { animation: alarm-shake 3.5s ease-in-out infinite; }
@keyframes alarm-shake {
  0%, 88%, 100% { transform: translate(126px, 505px) rotate(0deg); }
  90%           { transform: translate(126px, 505px) rotate(-10deg); }
  94%           { transform: translate(126px, 505px) rotate(10deg); }
  96%           { transform: translate(126px, 505px) rotate(-5deg); }
}

.signal-arc { animation: signal-wave 2s ease-in-out infinite; }
.s1 { animation-delay: 0s; }
.s2 { animation-delay: 0.4s; }
.s3 { animation-delay: 0.8s; }
@keyframes signal-wave {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; stroke-width: 1.8; }
}

.bell-group { animation: bell-ring 3.5s ease-in-out infinite; transform-origin: 0px -15px; }
@keyframes bell-ring {
  0%, 88%, 100% { transform: rotate(0deg); }
  89%           { transform: rotate(-8deg); }
  91%           { transform: rotate(8deg); }
  93%           { transform: rotate(-5deg); }
  95%           { transform: rotate(3deg); }
  97%           { transform: rotate(0deg); }
}

/* ===== 智能问答：机器人浮动 + 眨眼 ===== */
.qa-icon { animation: qa-bob 4s ease-in-out infinite; }
@keyframes qa-bob {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -3px; }
}
.qa-icon circle:nth-child(2) { animation: qa-blink 3s ease-in-out infinite; }
.qa-icon circle:nth-child(3) { animation: qa-blink 3s ease-in-out 0.15s infinite; }
@keyframes qa-blink {
  0%, 45%, 55%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}

/* ===== Hover 增强 ===== */
.module-clickable:hover .icon-bg { stroke-width: 3 !important; filter: url(#glow-cyan); }
.module-clickable:hover .outer-ring { animation-duration: 1s; }
.module-clickable:hover text { font-weight: 600; opacity: 0.9; }
.module-clickable:hover .dash-line { animation-duration: 0.6s; }
.module-clickable:hover .icon-inner { stroke-width: 1.8; }
</style>
