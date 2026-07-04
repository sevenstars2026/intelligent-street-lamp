<template>
  <div id="root-app">
    <!-- ========== 登录页 ========== -->
    <div v-if="!isLoggedIn" class="login-page">
      <div class="login-card">
        <h2>💡 智慧路灯管理系统</h2>
        <p class="subtitle">Smart Street Light Management</p>
        <div class="error-msg" v-text="loginError"></div>
        <div class="form-group">
          <label>账号</label>
          <input v-model="loginForm.username" placeholder="请输入账号" @keyup.enter="doLogin" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="doLogin" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="loginForm.role">
            <option value="municipal">市政人员</option>
            <option value="admin">路灯管理员</option>
          </select>
        </div>
        <button class="login-btn" @click="doLogin" :disabled="loggingIn">{{ loggingIn ? '登录中...' : '登 录' }}</button>
        <p class="hint">演示账号：admin / 123456（市政人员） | manager / 123456（管理员）</p>
      </div>
    </div>

    <!-- ========== 主界面 ========== -->
    <div v-else class="app">
      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="logo"><span class="icon">💡</span><span>智慧路灯</span></div>
        <div class="user-info">
          <div class="avatar">{{ currentUser.avatar }}</div>
          <div>
            <div style="color:rgba(255,255,255,.85);font-weight:500;font-size:13px">{{ currentUser.nickname }}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.65)">{{ currentUser.roleName }}</div>
          </div>
        </div>
        <div class="nav">
          <div v-for="item in menuItems" :key="item.key"
               class="nav-item" :class="{active: currentPage === item.key}"
               @click="currentPage = item.key">
            <span class="nav-icon" v-html="item.icon"></span>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- 主区域 -->
      <div class="main">
        <div class="header">
          <div class="page-title">{{ currentPageTitle }}</div>
          <div class="header-right">
            <span>{{ currentUser.nickname }}</span>
            <button class="logout-btn" @click="logout">退出登录</button>
          </div>
        </div>

        <div class="content">
          <!-- ===== 数据总览 ===== -->
          <template v-if="currentPage === 'dashboard'">
            <!-- 告警提醒条 -->
            <div class="alert-bar" v-if="activeAlerts.length > 0 && !alertDismissed">
              <span class="alert-icon">⚠️</span>
              <span class="alert-text">设备离线告警：{{ activeAlerts.map(a => a.device_name).join('、') }} 已离线，请及时处理！</span>
              <span class="close-alert" @click="alertDismissed = true" title="关闭">✕</span>
            </div>

            <!-- 统计卡片 -->
            <div class="stat-row">
              <div class="stat-card bg-blue">
                <div class="stat-icon">💡</div>
                <div>
                  <div class="stat-label">亮灯设备</div>
                  <div class="stat-val">{{ litCount }} <span class="stat-unit">/ {{ devices.length }}</span></div>
                </div>
              </div>
              <div class="stat-card bg-green">
                <div class="stat-icon">✅</div>
                <div>
                  <div class="stat-label">在线设备</div>
                  <div class="stat-val">{{ onlineCount }} <span class="stat-unit">/ {{ devices.length }}</span></div>
                </div>
              </div>
              <div class="stat-card bg-orange">
                <div class="stat-icon">🔔</div>
                <div>
                  <div class="stat-label">离线告警</div>
                  <div class="stat-val">{{ pendingAlertCount }}</div>
                </div>
              </div>
              <div class="stat-card" :class="controlMode === 'auto' ? 'bg-blue' : 'bg-orange'">
                <div class="stat-icon">{{ controlMode === 'auto' ? '🤖' : '🖐' }}</div>
                <div>
                  <div class="stat-label">控制模式</div>
                  <div class="stat-val" style="font-size:18px">{{ controlMode === 'auto' ? '自动控制' : '手动控制' }}</div>
                </div>
              </div>
            </div>

            <!-- 图表 + 设备状态 -->
            <div class="col-2">
              <div class="card">
                <div class="card-title"><span class="dot"></span>7天光照趋势（ECharts可视化）</div>
                <div class="chart-box" ref="historyChartRef" id="historyChart"></div>
              </div>
              <div class="card">
                <div class="card-title"><span class="dot"></span>设备状态列表（来自数据库）</div>
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>设备ID</th><th>设备名称</th><th>状态</th><th>当前状态</th><th>最后心跳</th></tr></thead>
                    <tbody>
                      <tr v-for="d in devices" :key="d.id">
                        <td>{{ d.deviceId }}</td>
                        <td>{{ d.deviceName }}</td>
                        <td><span :class="d.online ? 'tag tag-online' : 'tag tag-offline'"><span class="status-dot" :class="d.online ? 'status-online' : 'status-offline'"></span>{{ d.online ? '在线' : '离线' }}</span></td>
                        <td><span :class="d.currentState === 'on' ? 'tag tag-online' : 'tag tag-offline'">{{ d.currentState === 'on' ? '亮灯' : '熄灯' }}</span></td>
                        <td>{{ formatTime(d.lastHeartbeat) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== 设备控制 ===== -->
          <template v-if="currentPage === 'control'">
            <div class="control-grid">
              <!-- 开关灯控制 -->
              <div class="card">
                <div class="card-title"><span class="dot"></span>手动开关灯控制</div>
                <p style="font-size:13px;color:#999;margin-bottom:16px">控制设备：<b>{{ controlDeviceName }}</b></p>
                <div class="switch-btn-group">
                  <button class="light-switch-btn on" @click="controlLight('on')">🔆 开灯</button>
                  <button class="light-switch-btn off" @click="controlLight('off')">🌑 关灯</button>
                </div>
                <div :class="['feedback-msg', switchFeedback.type]" v-if="switchFeedback.show">{{ switchFeedback.msg }}</div>
                <div style="margin-top:16px">
                  <label style="font-size:12px;color:#999">选择设备：</label>
                  <select v-model="controlDeviceId" style="padding:6px 12px;border:1px solid #d9d9d9;border-radius:4px;font-size:13px">
                    <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName }}</option>
                  </select>
                </div>
              </div>

              <!-- 全局阈值与模式设置 -->
              <div class="card">
                <div class="card-title"><span class="dot"></span>全局阈值与模式设置</div>
                <div class="mode-toggle">
                  <span class="mode-label">当前模式：</span>
                  <span :class="['mode-option', {active: controlMode === 'auto'}]" @click="switchMode('auto')">🤖 自动</span>
                  <span :class="['mode-option', {active: controlMode === 'manual'}]" @click="switchMode('manual')">🖐 手动</span>
                </div>
                <div class="threshold-form">
                  <div class="field">
                    <label>光照下限阈值：</label>
                    <input type="number" v-model.number="lightThreshold.low" placeholder="低于此值自动开灯" />
                    <span class="unit">lux</span>
                  </div>
                  <div class="field">
                    <label>光照上限阈值：</label>
                    <input type="number" v-model.number="lightThreshold.high" placeholder="高于此值自动关灯" />
                    <span class="unit">lux</span>
                  </div>
                  <button class="btn btn-primary" @click="saveThreshold" :disabled="savingThreshold">{{ savingThreshold ? '保存中...' : '💾 保存全局阈值' }}</button>
                </div>
                <div :class="['feedback-msg', thresholdFeedback.type]" v-if="thresholdFeedback.show">{{ thresholdFeedback.msg }}</div>
              </div>
            </div>

            <!-- 批量控制 -->
            <div class="card">
              <div class="card-title"><span class="dot"></span>批量控制</div>
              <div class="batch-control-bar">
                <label class="batch-label">选择设备：</label>
                <div class="batch-devices">
                  <label v-for="d in devices" :key="d.id" class="batch-device-item">
                    <input type="checkbox" :value="d.id" v-model="selectedDevices" />
                    <span>{{ d.deviceName }}</span>
                    <span :class="d.online ? 'dot-online' : 'dot-offline'"></span>
                  </label>
                </div>
                <div class="batch-actions">
                  <button class="btn btn-primary" @click="doBatchControl('on')" :disabled="batchControlLoading || selectedDevices.length === 0">
                    {{ batchControlLoading ? '下发中...' : '🔆 批量开灯' }}
                  </button>
                  <button class="btn btn-default" @click="doBatchControl('off')" :disabled="batchControlLoading || selectedDevices.length === 0">
                    🌑 批量关灯
                  </button>
                  <button class="btn btn-sm btn-default" @click="selectedDevices = devices.map(d => d.id)">全选</button>
                  <button class="btn btn-sm btn-default" @click="selectedDevices = []">清空</button>
                </div>
              </div>
            </div>

            <!-- 设备独立阈值/模式快速设置 -->
            <div class="card">
              <div class="card-title"><span class="dot"></span>设备独立阈值与模式</div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>设备ID</th><th>设备名称</th><th>当前模式</th><th>当前状态</th><th>操作</th></tr></thead>
                  <tbody>
                    <tr v-for="d in devices" :key="d.id">
                      <td>{{ d.deviceId }}</td>
                      <td>{{ d.deviceName }}</td>
                      <td><span :class="['tag', d.mode === 'auto' ? 'tag-online' : 'tag-pending']">{{ d.mode === 'auto' ? '自动' : '手动' }}</span></td>
                      <td><span :class="d.currentState === 'on' ? 'tag tag-online' : 'tag tag-offline'">{{ d.currentState === 'on' ? '已开灯' : '已关灯' }}</span></td>
                      <td>
                        <button class="btn btn-sm btn-primary" @click="openThresholdModal(d)">阈值</button>
                        <button class="btn btn-sm btn-default" @click="openModeModal(d)" style="margin-left:8px">模式</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- ===== 设备管理 ===== -->
          <template v-if="currentPage === 'devices'">
            <div class="card">
              <div class="card-title"><span class="dot"></span>路灯设备管理</div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>设备ID</th><th>设备名称</th><th>在线状态</th><th>当前状态</th><th>控制模式</th><th>最后心跳</th><th>操作</th></tr></thead>
                  <tbody>
                    <tr v-for="d in devices" :key="d.id">
                      <td>{{ d.deviceId }}</td>
                      <td>{{ d.deviceName }}</td>
                      <td><span :class="d.online ? 'tag tag-online' : 'tag tag-offline'">{{ d.online ? '在线' : '离线' }}</span></td>
                      <td>{{ d.currentState === 'on' ? '已开灯' : '已关灯' }}</td>
                      <td><span :class="['tag', d.mode === 'auto' ? 'tag-online' : 'tag-pending']">{{ d.mode === 'auto' ? '自动' : '手动' }}</span></td>
                      <td>{{ formatTime(d.lastHeartbeat) }}</td>
                      <td>
                        <button class="btn btn-sm btn-primary" @click="openThresholdModal(d)">阈值</button>
                        <button class="btn btn-sm btn-default" @click="openModeModal(d)" style="margin-left:8px">模式</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 设备阈值设置弹窗 -->
            <div class="modal-overlay" v-if="deviceThresholdModal.show" @click.self="deviceThresholdModal.show = false">
              <div class="modal">
                <h3>设置阈值 - {{ deviceThresholdModal.deviceName }}</h3>
                <div class="form-group">
                  <label>开灯阈值（低于此值自动开灯）</label>
                  <input type="number" v-model.number="deviceThresholdModal.low" />
                </div>
                <div class="form-group">
                  <label>关灯阈值（高于此值自动关灯）</label>
                  <input type="number" v-model.number="deviceThresholdModal.high" />
                </div>
                <div class="modal-btns">
                  <button class="btn btn-default" @click="deviceThresholdModal.show = false">取消</button>
                  <button class="btn btn-primary" @click="saveDeviceThreshold" :disabled="deviceThresholdModal.saving">{{ deviceThresholdModal.saving ? '保存中...' : '确认保存' }}</button>
                </div>
              </div>
            </div>

            <!-- 设备模式切换弹窗 -->
            <div class="modal-overlay" v-if="deviceModeModal.show" @click.self="deviceModeModal.show = false">
              <div class="modal">
                <h3>切换模式 - {{ deviceModeModal.deviceName }}</h3>
                <div class="form-group">
                  <label>控制模式</label>
                  <select v-model="deviceModeModal.mode">
                    <option value="auto">🤖 自动模式</option>
                    <option value="manual">🖐 手动模式</option>
                  </select>
                </div>
                <div class="modal-btns">
                  <button class="btn btn-default" @click="deviceModeModal.show = false">取消</button>
                  <button class="btn btn-primary" @click="saveDeviceMode" :disabled="deviceModeModal.saving">{{ deviceModeModal.saving ? '保存中...' : '确认切换' }}</button>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== 告警日志 ===== -->
          <template v-if="currentPage === 'alerts'">
            <div class="card">
              <div class="card-title"><span class="dot"></span>告警日志</div>
              <div style="padding:60px;text-align:center;color:#999">
                <div style="font-size:48px;margin-bottom:16px">🔔</div>
                <div>告警功能将在后续版本中开放</div>
                <div style="font-size:12px;margin-top:8px">当前MVP版本暂不支持告警查询与处理</div>
              </div>
            </div>
          </template>

          <!-- ===== 控制日志 ===== -->
          <template v-if="currentPage === 'logs'">
            <div class="card">
              <div class="card-title">
                <span class="dot"></span>控制日志
                <select v-model="controlLogDeviceId" @change="controlLogPage = 1; loadControlLogs()" style="margin-left:auto;padding:4px 10px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px">
                  <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName }}</option>
                </select>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>序号</th><th>设备</th><th>指令</th><th>状态</th><th>操作人</th><th>请求时间</th><th>响应时间</th></tr></thead>
                  <tbody>
                    <tr v-for="(log, i) in controlLogs" :key="log.id">
                      <td>{{ (controlLogPage - 1) * controlLogPageSize + i + 1 }}</td>
                      <td>{{ log.device_name }}</td>
                      <td><span :class="['tag', log.command === 'on' ? 'tag-online' : 'tag-offline']">{{ log.command === 'on' ? '开灯' : '关灯' }}</span></td>
                      <td><span :class="['tag', log.status === 'success' ? 'tag-done' : 'tag-pending']">{{ log.status === 'success' ? '成功' : (log.status === 'timeout' ? '超时' : '失败') }}</span></td>
                      <td>{{ log.operatorName || '—' }}</td>
                      <td>{{ formatTime(log.requestTime) }}</td>
                      <td>{{ log.responseTime ? formatTime(log.responseTime) : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="pagination">
                <button :disabled="controlLogPage <= 1" @click="controlLogPage--; loadControlLogs()">上一页</button>
                <span class="page-num">第 {{ controlLogPage }} 页</span>
                <button :disabled="controlLogs.length < controlLogPageSize" @click="controlLogPage++; loadControlLogs()">下一页</button>
              </div>
            </div>
          </template>

          <!-- ===== 历史数据 ===== -->
          <template v-if="currentPage === 'history'">
            <div class="card">
              <div class="card-title">
                <span class="dot"></span>设备历史光照数据
                <div class="history-toolbar">
                  <select v-model="historyDeviceId" @change="loadHistoryData">
                    <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName }}</option>
                  </select>
                  <select v-model="historyRange" @change="loadHistoryData">
                    <option value="24h">最近24小时</option>
                    <option value="7d">最近7天</option>
                    <option value="30d">最近30天</option>
                  </select>
                </div>
              </div>
              <div class="chart-box" ref="historyChartRef2" id="historyChart2" style="height:360px"></div>
            </div>
          </template>

          <!-- ===== 统计概览 ===== -->
          <template v-if="currentPage === 'statistics'">
            <div class="stat-row">
              <div class="stat-card bg-blue">
                <div class="stat-icon">📟</div>
                <div>
                  <div class="stat-label">设备总数</div>
                  <div class="stat-val">{{ devices.length }}</div>
                </div>
              </div>
              <div class="stat-card bg-green">
                <div class="stat-icon">✅</div>
                <div>
                  <div class="stat-label">在线设备</div>
                  <div class="stat-val">{{ onlineCount }}</div>
                </div>
              </div>
              <div class="stat-card bg-orange">
                <div class="stat-icon">⚙️</div>
                <div>
                  <div class="stat-label">自动模式设备</div>
                  <div class="stat-val">{{ autoModeCount }}</div>
                </div>
              </div>
              <div class="stat-card bg-blue">
                <div class="stat-icon">💡</div>
                <div>
                  <div class="stat-label">当前亮灯设备</div>
                  <div class="stat-val">{{ litCount }}</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><span class="dot"></span>设备状态一览</div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>设备ID</th><th>名称</th><th>在线</th><th>当前状态</th><th>模式</th><th>最后心跳</th></tr></thead>
                  <tbody>
                    <tr v-for="d in devices" :key="d.id">
                      <td>{{ d.deviceId }}</td>
                      <td>{{ d.deviceName }}</td>
                      <td><span :class="d.online ? 'tag tag-online' : 'tag tag-offline'">{{ d.online ? '在线' : '离线' }}</span></td>
                      <td>{{ d.currentState === 'on' ? '亮灯' : '熄灯' }}</td>
                      <td><span :class="d.mode === 'auto' ? 'tag tag-online' : 'tag tag-pending'">{{ d.mode === 'auto' ? '自动' : '手动' }}</span></td>
                      <td>{{ formatTime(d.lastHeartbeat) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

           <!-- ===== 智能问答 ===== -->
         <template v-if="currentPage === 'chat'">
  <div class="card chat-card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;flex:1;">
    <div class="card-title" style="padding:16px 20px;margin-bottom:0;border-bottom:1px solid #f0f0f0;flex-shrink:0;">
      <span class="dot"></span>路灯维护智能问答（MaxKB RAG知识库）
    </div>
    <iframe
      src="http://192.168.20.119:8080/chat/1a18bc3351901450"
      style="width:100%;flex:1;border:none;display:block;min-height:500px;"
      allow="microphone"
      frameborder="0"
    ></iframe>
  </div>
</template>

        </div>   <!-- 关闭 .content ← 新增 -->

    <!-- Toast通知 -->
    <div :class="['toast', toast.show ? 'show' : '', 'toast-' + toast.type]" v-text="toast.msg"></div>
  </div>   <!-- 关闭 main -->
</div>     <!-- 关闭 app -->
</div>     <!-- 关闭 root-app ← 新增 -->
</template>




<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getDevices, getDeviceById,
         controlDevice, batchControl,
         getDeviceThreshold, setDeviceThreshold,
         getDeviceMode, setDeviceMode,
         getControlLogs, getDeviceLightHistory } from './utils/api.ts'

// ==================== 状态定义 ====================

const isLoggedIn = ref(false)
const loginForm = reactive({ username: 'admin', password: '123456', role: 'municipal' })
const loginError = ref('')
const loggingIn = ref(false)
const currentUser = reactive({ username: '', nickname: '', role: '', roleName: '', avatar: '' })
const currentPage = ref('dashboard')

// 设备数据
const devices = ref([])

// 阈值配置
const thresholdLow = ref(100)
const thresholdHigh = ref(800)
const lightThreshold = reactive({ low: 100, high: 800 })

// 告警提醒
const alertDismissed = ref(false)

// 控制
const controlDeviceId = ref('light-001')
const controlMode = ref('auto')
const switchFeedback = reactive({ show: false, type: '', msg: '' })
const thresholdFeedback = reactive({ show: false, type: '', msg: '' })
const savingThreshold = ref(false)

// 批量控制
const selectedDevices = ref([])
const batchControlLoading = ref(false)

// 设备独立阈值与模式
const deviceThresholdModal = reactive({ show: false, deviceId: '', deviceName: '', low: 100, high: 800, saving: false })
const deviceModeModal = reactive({ show: false, deviceId: '', deviceName: '', mode: 'auto', saving: false })

// 控制日志
const controlLogs = ref([])
const controlLogPage = ref(1)
const controlLogPageSize = ref(10)
const controlLogDeviceId = ref('')

// 历史数据与统计
const historyDeviceId = ref('')
const historyRange = ref('7d')
const historyData = ref([])
const historyChartRef2 = ref(null)
let historyChartInstance = null

// MaxKB 浮窗对话
const showMaxKBChat = ref(false)

// 智能问答
const chatMessages = ref([
  { role: 'bot', text: '你好！我是路灯维护助手 🤖，基于RAG知识库为你解答路灯维护相关问题。你可以问我：\n• 路灯不亮怎么办？\n• 如何排查传感器故障？\n• 设备离线如何处理？' }
])
const chatInput = ref('')
const chatLoading = ref(false)
const chatMsgsRef = ref(null)
const ragKnowledge = {
  '路灯不亮': '根据知识库检索，路灯不亮的常见原因：\n1. 电源故障 — 检查供电线路是否正常\n2. 灯泡/灯珠损坏 — 需要更换光源模组\n3. 继电器故障 — 检查控制继电器动作是否正常\n4. 光照传感器脏污 — 清洁传感器表面',
  '传感器': '光照传感器（BH1750）维护要点：\n1. 定期清洁传感器表面\n2. 检查I2C通信线缆连接\n3. 正常范围：0-65535 lux\n4. 读数为0或65535可能是损坏或接线脱落',
  '离线': '设备离线处理流程：\n1. 查看设备最后心跳时间\n2. 检查设备供电\n3. 检查网络连接\n4. 尝试重启设备\n5. 安排现场检修',
  '阈值': '光照阈值建议配置：\n• 城市主干道：下限50 lux / 上限500 lux\n• 小区道路：下限30 lux / 上限300 lux\n• 隧道入口：下限200 lux / 上限1000 lux',
  '默认': '没有找到直接匹配的知识条目。建议尝试关键词：路灯不亮、传感器故障、设备离线、阈值设置。'
}

// Toast
const toast = reactive({ show: false, msg: '', type: 'info' })

// ECharts
const historyChartRef = ref(null)
let chartInstance = null

// ==================== 数据标准化 ====================

function normalizeDevice(d) {
  return {
    ...d,
    deviceId: d.id,
    deviceName: d.name,
    online: d.status === 'online',
    device_id: d.id,
    device_name: d.name,
    last_heartbeat: d.lastHeartbeat,
    location: '—',
    bind_time: null,
    bindTime: null,
    threshold_on: null,
    threshold_off: null,
  }
}

function normalizeControlLog(log) {
  const device = devices.value.find(d => d.id === log.deviceId)
  return {
    ...log,
    device_name: device?.name || log.deviceId,
    action: log.command,
    mode: device?.mode || '—',
    operator: log.operatorName || '—',
    result: log.status === 'success' ? '成功' : log.resultMessage || log.status,
    create_time: log.requestTime,
  }
}

// ==================== 计算属性 ====================

const menuItems = computed(() => {
  if (currentUser.role === 'municipal') {
    return [
      { key: 'dashboard', label: '数据总览', icon: '📊' },
      { key: 'control', label: '设备控制', icon: '🎮' },
      { key: 'logs', label: '控制日志', icon: '📄' },
      { key: 'history', label: '历史数据', icon: '📈' },
      { key: 'statistics', label: '统计概览', icon: '📉' },
    ]
  }
  return [
    { key: 'dashboard', label: '数据总览', icon: '📊' },
    { key: 'control', label: '设备控制', icon: '🎮' },
    { key: 'devices', label: '设备管理', icon: '📋' },
    { key: 'alerts', label: '告警日志', icon: '🔔' },
    { key: 'logs', label: '控制日志', icon: '📄' },
    { key: 'history', label: '历史数据', icon: '📈' },
    { key: 'statistics', label: '统计概览', icon: '📉' },
  ]
})

const currentPageTitle = computed(() => {
  const map = {
    dashboard: '数据总览', control: '设备控制', devices: '设备管理',
    alerts: '告警日志', logs: '控制日志', history: '历史数据',
    statistics: '统计概览', chat: '智能问答'
  }
  return map[currentPage.value] || ''
})

const onlineCount = computed(() => devices.value.filter(d => d.online).length)

const activeAlerts = computed(() => devices.value.filter(d => !d.online))

const pendingAlertCount = computed(() => activeAlerts.value.length)

const autoModeCount = computed(() => devices.value.filter(d => d.mode === 'auto').length)

const litCount = computed(() => devices.value.filter(d => d.currentState === 'on').length)

const controlDeviceName = computed(() => {
  const d = devices.value.find(d => d.deviceId === controlDeviceId.value)
  return d ? d.deviceName : '—'
})

// ==================== 方法 ====================

function formatTime(t) {
  if (!t) return '—'
  // 后端 Date 序列化为 UTC ISO 字符串，需转为本地时区显示
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function showToast(msg, type = 'info') {
  toast.show = true
  toast.msg = msg
  toast.type = type
  setTimeout(() => { toast.show = false }, 2500)
}

// ---- 登录 ----
async function doLogin() {
  loginError.value = ''
  loggingIn.value = true
  try {
    // Mock 延迟
    await new Promise(resolve => setTimeout(resolve, 400))

    // 本地验证
    const validCredentials = [
      { username: 'admin', password: '123456', roles: ['municipal', 'admin'] },
      { username: 'manager', password: '123456', roles: ['admin'] },
    ]
    const match = validCredentials.find(
      c => c.username === loginForm.username && c.password === loginForm.password
    )
    if (!match) {
      throw new Error('账号或密码错误')
    }
    if (!match.roles.includes(loginForm.role)) {
      throw new Error('该账号无此角色权限')
    }

    const validUsers = {
      municipal: { nickname: '张工', roleName: '市政人员', avatar: '张' },
      admin: { nickname: '李管理', roleName: '路灯管理员', avatar: '李' }
    }
    const u = validUsers[loginForm.role]
    Object.assign(currentUser, u, { username: loginForm.username, role: loginForm.role })
    isLoggedIn.value = true
    currentPage.value = loginForm.role === 'municipal' ? 'dashboard' : 'control'

    await nextTick()
    if (currentPage.value === 'dashboard') initChart()
    loadAllData()
    showToast('登录成功，欢迎使用智慧路灯管理系统', 'success')
  } catch (e) {
    loginError.value = e.message || '登录失败'
  } finally {
    loggingIn.value = false
  }
}

function logout() {
  isLoggedIn.value = false
  loginForm.username = ''
  loginForm.password = ''
  loginForm.role = 'municipal'
  alertDismissed.value = false
  chatMessages.value = [chatMessages.value[0]]
}

// ---- 加载数据 ----
let loadAllDataPromise = null

async function loadAllData() {
  if (loadAllDataPromise) return loadAllDataPromise

  loadAllDataPromise = (async () => {
    try {
      const devicesRes = await getDevices()
      devices.value = (devicesRes.data || []).map(normalizeDevice)
      if (devices.value.length) {
        const firstId = devices.value[0].id
        if (!controlDeviceId.value) controlDeviceId.value = firstId
        if (!historyDeviceId.value) historyDeviceId.value = firstId
        if (!controlLogDeviceId.value) controlLogDeviceId.value = firstId
        // 加载第一个设备的模式和阈值
        try {
          const modeRes = await getDeviceMode(firstId)
          controlMode.value = modeRes.data?.mode || 'auto'
        } catch (_) {}
        try {
          const thresholdRes = await getDeviceThreshold(firstId)
          if (thresholdRes.data) {
            thresholdLow.value = thresholdRes.data.lightThresholdOn
            thresholdHigh.value = thresholdRes.data.lightThresholdOff
            lightThreshold.low = thresholdRes.data.lightThresholdOn
            lightThreshold.high = thresholdRes.data.lightThresholdOff
          }
        } catch (_) {}
      }
    } catch (e) { console.error(e) }
  })()

  try {
    return await loadAllDataPromise
  } finally {
    loadAllDataPromise = null
  }
}

// ---- ECharts 图表 ----
async function initChart() {
  const dom = document.getElementById('historyChart')
  if (!dom) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(dom)

  let days = [], values = []
  // 尝试从第一个设备获取真实历史数据
  if (devices.value.length > 0) {
    try {
      const end = new Date()
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      const res = await getDeviceLightHistory(devices.value[0].id, {
        startTime: start.toISOString(),
        endTime: end.toISOString()
      })
      const records = res.data?.records || []
      if (records.length > 0) {
        const dayMap = {}
        records.forEach(r => {
          const d = new Date(r.timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
          if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
          dayMap[d].sum += r.lightIntensity
          dayMap[d].count++
        })
        days = Object.keys(dayMap)
        values = days.map(d => Math.round(dayMap[d].sum / dayMap[d].count))
      }
    } catch (_) {}
  }

  // 兜底：如果没数据就生成默认
  if (days.length === 0) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days.push((d.getMonth()+1)+'/'+d.getDate())
      values.push(Math.floor(Math.random()*400)+200)
    }
  }

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: days, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '光照(lux)', min: 0, axisLabel: { fontSize: 11 } },
    series: [{
      data: values,
      type: 'line',
      smooth: true,
      lineStyle: { color: '#1890ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(24,144,255,.25)' },
            { offset: 1, color: 'rgba(24,144,255,.02)' }
          ]
        }
      },
      itemStyle: { color: '#1890ff' },
      symbol: 'circle', symbolSize: 6,
    }]
  })
}

function resizeChart() {
  if (chartInstance) chartInstance.resize()
}

// ---- 设备控制 ----
async function controlLight(command) {
  const dev = devices.value.find(d => d.deviceId === controlDeviceId.value)
  if (!dev || !dev.online) {
    Object.assign(switchFeedback, { show: true, type: 'feedback-error', msg: '设备离线，无法执行控制指令' })
    setTimeout(() => { switchFeedback.show = false }, 3000)
    return
  }

  try {
    const actName = command === 'on' ? '开灯' : '关灯'
    await controlDevice(controlDeviceId.value, command)
    Object.assign(switchFeedback, { show: true, type: 'feedback-success', msg: `${actName}指令已下发至 ${controlDeviceName.value}` })
    showToast(`${actName}指令已发送`, 'success')
  } catch (e) {
    Object.assign(switchFeedback, { show: true, type: 'feedback-error', msg: e.message || '控制指令发送失败' })
  }
  setTimeout(() => { switchFeedback.show = false }, 3000)
}

async function switchMode(mode) {
  try {
    await setDeviceMode(controlDeviceId.value, mode)
    controlMode.value = mode
    const dev = devices.value.find(d => d.id === controlDeviceId.value)
    if (dev) dev.mode = mode
    showToast(`已切换至${mode === 'auto' ? '自动' : '手动'}模式`, 'info')
  } catch (e) {
    showToast(e.message || '模式切换失败', 'error')
  }
}

async function saveThreshold() {
  if (lightThreshold.low >= lightThreshold.high) {
    Object.assign(thresholdFeedback, { show: true, type: 'feedback-error', msg: '下限阈值不能大于等于上限阈值' })
    setTimeout(() => { thresholdFeedback.show = false }, 3000)
    return
  }
  savingThreshold.value = true
  try {
    await setDeviceThreshold(controlDeviceId.value, {
      lightThresholdOn: lightThreshold.low,
      lightThresholdOff: lightThreshold.high
    })
    thresholdLow.value = lightThreshold.low
    thresholdHigh.value = lightThreshold.high
    Object.assign(thresholdFeedback, { show: true, type: 'feedback-success', msg: `阈值已保存：下限 ${lightThreshold.low} lux / 上限 ${lightThreshold.high} lux` })
    showToast('阈值参数已更新', 'success')
  } catch (e) {
    Object.assign(thresholdFeedback, { show: true, type: 'feedback-error', msg: e.message || '保存失败' })
  } finally {
    savingThreshold.value = false
  }
  setTimeout(() => { thresholdFeedback.show = false }, 3000)
}

// ---- 批量控制 ----
async function doBatchControl(command) {
  if (selectedDevices.value.length === 0) { showToast('请先选择设备', 'warn'); return }
  batchControlLoading.value = true
  try {
    await batchControl(selectedDevices.value, command)
    showToast(`已向 ${selectedDevices.value.length} 个设备下发${command === 'on' ? '开灯' : '关灯'}指令`, 'success')
  } catch (e) {
    showToast(e.message || '批量控制失败', 'error')
  } finally {
    batchControlLoading.value = false
  }
}

// ---- 设备独立阈值与模式 ----
async function openThresholdModal(d) {
  const deviceId = d.id
  let low = 100, high = 800
  try {
    const res = await getDeviceThreshold(deviceId)
    if (res.data) {
      low = res.data.lightThresholdOn
      high = res.data.lightThresholdOff
    }
  } catch (_) {}
  Object.assign(deviceThresholdModal, {
    show: true,
    deviceId,
    deviceName: d.name,
    low,
    high,
    saving: false
  })
}

async function saveDeviceThreshold() {
  if (deviceThresholdModal.low >= deviceThresholdModal.high) {
    showToast('开灯阈值必须小于关灯阈值', 'warn'); return
  }
  deviceThresholdModal.saving = true
  try {
    await setDeviceThreshold(deviceThresholdModal.deviceId, {
      lightThresholdOn: deviceThresholdModal.low,
      lightThresholdOff: deviceThresholdModal.high
    })
    const dev = devices.value.find(d => d.id === deviceThresholdModal.deviceId)
    if (dev) { dev.threshold_on = deviceThresholdModal.low; dev.threshold_off = deviceThresholdModal.high }
    deviceThresholdModal.show = false
    showToast('设备阈值已更新', 'success')
  } catch (e) {
    showToast(e.message || '保存失败', 'error')
  } finally {
    deviceThresholdModal.saving = false
  }
}

function openModeModal(d) {
  Object.assign(deviceModeModal, {
    show: true,
    deviceId: d.id,
    deviceName: d.name,
    mode: d.mode || 'auto',
    saving: false
  })
}

async function saveDeviceMode() {
  deviceModeModal.saving = true
  try {
    await setDeviceMode(deviceModeModal.deviceId, deviceModeModal.mode)
    const dev = devices.value.find(d => d.id === deviceModeModal.deviceId)
    if (dev) dev.mode = deviceModeModal.mode
    deviceModeModal.show = false
    showToast(`已切换至${deviceModeModal.mode === 'auto' ? '自动' : '手动'}模式`, 'success')
  } catch (e) {
    showToast(e.message || '模式切换失败', 'error')
  } finally {
    deviceModeModal.saving = false
  }
}

// ---- 控制日志 ----
async function loadControlLogs() {
  try {
    const deviceId = controlLogDeviceId.value || controlDeviceId.value || (devices.value[0]?.id) || ''
    if (deviceId && !controlLogDeviceId.value) controlLogDeviceId.value = deviceId
    const res = await getControlLogs(deviceId, { page: controlLogPage.value, pageSize: controlLogPageSize.value })
    const rawLogs = res.data?.logs || []
    controlLogs.value = rawLogs.map(normalizeControlLog)
  } catch (e) { console.error(e) }
}

// ---- 历史数据 ----
async function loadHistoryData() {
  if (!historyDeviceId.value && devices.value.length) {
    historyDeviceId.value = devices.value[0].id
  }
  if (!historyDeviceId.value) return
  try {
    const end = new Date()
    let start = new Date()
    switch (historyRange.value) {
      case '24h': start = new Date(end.getTime() - 24 * 60 * 60 * 1000); break
      case '7d': start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); break
      case '30d': start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); break
      default: start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    const res = await getDeviceLightHistory(historyDeviceId.value, {
      startTime: start.toISOString(),
      endTime: end.toISOString()
    })
    historyData.value = res.data?.records || []
    initHistoryChart()
  } catch (e) { console.error(e) }
}

function initHistoryChart() {
  const dom = document.getElementById('historyChart2')
  if (!dom) return
  if (historyChartInstance) historyChartInstance.dispose()
  historyChartInstance = echarts.init(dom)

  const data = historyData.value.length ? historyData.value : []
  const x = data.map(d => {
    const t = new Date(d.timestamp)
    return t.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  })
  const y = data.map(d => d.lightIntensity)

  if (x.length === 0) {
    historyChartInstance.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#999' } }
    })
    return
  }

  historyChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: x, axisLabel: { fontSize: 11, rotate: 30 } },
    yAxis: { type: 'value', name: '光照(lux)', min: 0 },
    series: [{
      data: y, type: 'line', smooth: true,
      lineStyle: { color: '#52c41a', width: 2 },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(82,196,26,.25)' }, { offset: 1, color: 'rgba(82,196,26,.02)' }]
        }
      },
      itemStyle: { color: '#52c41a' }, symbol: 'circle', symbolSize: 6
    }]
  })
}

// ---- MaxKB 浮窗 ----
function toggleMaxKBChat() {
  showMaxKBChat.value = !showMaxKBChat.value
}

// ---- 智能问答 ----
function sendChat() {
  const q = chatInput.value.trim()
  if (!q) return
  chatMessages.value.push({ role: 'user', text: q })
  chatInput.value = ''
  chatLoading.value = true
  nextTick(() => scrollChat())
  
  setTimeout(() => {
    chatLoading.value = false
    let answer = ragKnowledge['默认']
    for (const [kw, ans] of Object.entries(ragKnowledge)) {
      if (kw !== '默认' && q.includes(kw)) { answer = ans; break }
    }
    chatMessages.value.push({ role: 'bot', text: answer })
    nextTick(() => scrollChat())
  }, 800 + Math.random() * 1200)
}

function scrollChat() {
  const el = chatMsgsRef.value
  if (el) el.scrollTop = el.scrollHeight
}

// ==================== 监听 & 生命周期 ====================

watch(currentPage, async (val) => {
  if (val === 'dashboard') {
    await nextTick()
    initChart()
  } else if (val === 'logs') {
    loadControlLogs()
  } else if (val === 'history') {
    await nextTick()
    if (!devices.value.length || !historyDeviceId.value) {
      await loadAllData()
    }
    await loadHistoryData()
  }
})

onMounted(() => {
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  if (chartInstance) chartInstance.dispose()
  if (historyChartInstance) historyChartInstance.dispose()
})
</script>

<style>
/* 全局样式 */
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;background:#f0f2f5;color:#333}

/* 布局 */
.app{display:flex;min-height:100vh}
.sidebar{width:220px;background:#001529;color:#fff;flex-shrink:0;display:flex;flex-direction:column}
.sidebar .logo{padding:20px 24px;font-size:18px;font-weight:bold;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px}
.sidebar .logo .icon{font-size:28px}
.sidebar .user-info{padding:16px 24px;font-size:13px;color:rgba(255,255,255,.65);border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:8px}
.sidebar .user-info .avatar{width:36px;height:36px;border-radius:50%;background:#1890ff;display:flex;align-items:center;justify-content:center;font-size:16px}
.sidebar .nav{flex:1;padding:12px 0}
.sidebar .nav-item{display:flex;align-items:center;gap:10px;padding:12px 24px;cursor:pointer;color:rgba(255,255,255,.65);transition:all .2s;font-size:14px;border-left:3px solid transparent}
.sidebar .nav-item:hover{color:#fff;background:rgba(255,255,255,.08)}
.sidebar .nav-item.active{color:#fff;background:#1890ff;border-left-color:#69b1ff}
.sidebar .nav-item .nav-icon{font-size:18px;width:20px;text-align:center}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.header{height:56px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;box-shadow:0 1px 4px rgba(0,0,0,.08);z-index:10}
.header .page-title{font-size:16px;font-weight:600}
.header .header-right{display:flex;align-items:center;gap:16px;font-size:13px;color:#666}
.header .logout-btn{position:relative;z-index:10;padding:8px 20px;background:#ff4d4f;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;transition:all .2s;display:inline-block;min-width:80px;text-align:center;user-select:none;-webkit-tap-highlight-color:transparent}
.header .logout-btn::before{content:'';position:absolute;top:-6px;left:-6px;right:-6px;bottom:-6px;z-index:-1}
.header .logout-btn:hover{background:#ff7875;box-shadow:0 2px 8px rgba(255,77,79,.3)}
.header .logout-btn:active{background:#d9363e;transform:translateY(1px)}
.content{flex:1;padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:20px}

/* 登录 */
.login-page{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#001529 0%,#003a70 50%,#0050b3 100%)}
.login-card{width:400px;background:#fff;border-radius:8px;padding:40px;box-shadow:0 8px 40px rgba(0,0,0,.3)}
.login-card h2{text-align:center;margin-bottom:8px;font-size:22px;color:#001529}
.login-card .subtitle{text-align:center;color:#999;font-size:13px;margin-bottom:32px}
.login-card .form-group{margin-bottom:20px}
.login-card label{display:block;margin-bottom:6px;font-size:13px;color:#555;font-weight:500}
.login-card input,.login-card select{width:100%;padding:10px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:14px;outline:none;transition:border .2s}
.login-card input:focus,.login-card select:focus{border-color:#1890ff;box-shadow:0 0 0 2px rgba(24,144,255,.2)}
.login-card select{appearance:auto;cursor:pointer}
.login-card .login-btn{width:100%;padding:12px;background:#1890ff;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;transition:all .2s;font-weight:500}
.login-card .login-btn:hover{background:#40a9ff}
.login-card .hint{text-align:center;margin-top:16px;font-size:12px;color:#999}
.login-card .error-msg{color:#ff4d4f;font-size:12px;text-align:center;margin-bottom:16px;min-height:18px}

/* 卡片 */
.card{background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.card-title{font-size:15px;font-weight:600;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px}
.card-title .dot{width:6px;height:6px;border-radius:50%;background:#1890ff;display:inline-block}

/* 统计卡片 */
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.stat-card{background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);display:flex;align-items:center;gap:16px;transition:all .2s}
.stat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-2px)}
.stat-card .stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.stat-card .stat-val{font-size:28px;font-weight:700;line-height:1.2}
.stat-card .stat-label{font-size:12px;color:#999;margin-top:2px}
.stat-card .stat-unit{font-size:14px;font-weight:400;color:#666}
.bg-blue{background:#e6f7ff}.bg-blue .stat-icon{background:#1890ff;color:#fff}
.bg-green{background:#f6ffed}.bg-green .stat-icon{background:#52c41a;color:#fff}
.bg-orange{background:#fff7e6}.bg-orange .stat-icon{background:#fa8c16;color:#fff}
.bg-red{background:#fff2f0}.bg-red .stat-icon{background:#ff4d4f;color:#fff}

/* 图表 */
.chart-box{width:100%;height:320px}

/* 表格 */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 16px;text-align:left;border-bottom:1px solid #f0f0f0;font-size:13px}
th{background:#fafafa;font-weight:600;color:#555;white-space:nowrap}
tr:hover td{background:#fafafa}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.status-online{background:#52c41a}
.status-offline{background:#d9d9d9}
.tag{padding:2px 10px;border-radius:10px;font-size:12px;display:inline-block}
.tag-online{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}
.tag-offline{background:#f5f5f5;color:#999;border:1px solid #d9d9d9}
.tag-done{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}
.tag-pending{background:#fff7e6;color:#fa8c16;border:1px solid #ffd591}

/* 按钮 */
.btn{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;transition:all .2s;font-weight:500}
.btn-primary{background:#1890ff;color:#fff}.btn-primary:hover{background:#40a9ff;box-shadow:0 2px 8px rgba(24,144,255,.3)}
.btn-danger{background:#ff4d4f;color:#fff}.btn-danger:hover{background:#ff7875}
.btn-default{background:#fff;color:#333;border:1px solid #d9d9d9}.btn-default:hover{border-color:#1890ff;color:#1890ff}
.btn-sm{padding:4px 12px;font-size:12px}
.btn-success{background:#52c41a;color:#fff}.btn-success:hover{background:#73d13d}
.btn:disabled{opacity:.6;cursor:not-allowed}

/* 告警条 */
.alert-bar{background:#fff2f0;border:1px solid #ffccc7;border-radius:8px;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;animation:pulse 2s infinite}
.alert-bar .alert-icon{color:#ff4d4f;font-size:18px}
.alert-bar .alert-text{color:#cf1322;flex:1}
.alert-bar .close-alert{cursor:pointer;color:#999;font-size:16px;font-weight:bold}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,77,79,.3)}50%{box-shadow:0 0 0 6px rgba(255,77,79,0)}}

/* 控制页 */
.control-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.switch-btn-group{display:flex;gap:12px;margin-top:12px}
.switch-btn-group .btn{padding:14px 32px;font-size:16px;border-radius:8px}
.mode-toggle{display:flex;align-items:center;gap:16px;margin-top:12px;padding:16px;background:#fafafa;border-radius:8px}
.mode-toggle .mode-label{font-weight:600;font-size:14px}
.mode-option{padding:8px 20px;border-radius:6px;cursor:pointer;border:2px solid #d9d9d9;font-size:13px;transition:all .2s;background:#fff}
.mode-option.active{border-color:#1890ff;background:#e6f7ff;color:#1890ff;font-weight:600}
.threshold-form{display:flex;flex-direction:column;gap:16px;margin-top:12px}
.threshold-form .field{display:flex;align-items:center;gap:12px}
.threshold-form label{width:100px;text-align:right;font-size:13px;font-weight:500}
.threshold-form input{flex:1;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px;outline:none}
.threshold-form input:focus{border-color:#1890ff}
.threshold-form .unit{font-size:12px;color:#999;width:30px}
.feedback-msg{padding:10px 16px;border-radius:6px;font-size:13px;margin-top:8px}
.feedback-success{background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}
.feedback-error{background:#fff2f0;color:#ff4d4f;border:1px solid #ffccc7}

/* 开关按钮 */
.light-switch-btn{padding:20px 40px;font-size:20px;border-radius:12px;border:none;cursor:pointer;font-weight:700;transition:all .3s;min-width:160px}
.light-switch-btn.on{background:#faad14;color:#fff;box-shadow:0 0 30px rgba(250,173,20,.5)}
.light-switch-btn.off{background:#d9d9d9;color:#666}
.light-switch-btn.on:hover{box-shadow:0 0 40px rgba(250,173,20,.7);transform:scale(1.05)}
.light-switch-btn.off:hover{background:#bfbfbf;transform:scale(1.05)}

/* 智能问答 */
.chat-area{border:1px solid #f0f0f0;border-radius:8px;height:400px;display:flex;flex-direction:column;overflow:hidden}
.chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fafafa}
.chat-msg{max-width:75%;padding:10px 16px;border-radius:12px;font-size:13px;line-height:1.6;word-break:break-word}
.chat-msg.user{align-self:flex-end;background:#1890ff;color:#fff;border-bottom-right-radius:4px}
.chat-msg.bot{align-self:flex-start;background:#fff;border:1px solid #e8e8e8;border-bottom-left-radius:4px}
.chat-input-area{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #f0f0f0}
.chat-input-area input{flex:1;padding:10px 14px;border:1px solid #d9d9d9;border-radius:20px;outline:none;font-size:13px}
.chat-input-area input:focus{border-color:#1890ff}
.chat-input-area button{padding:10px 20px;background:#1890ff;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px}
.chat-input-area button:hover{background:#40a9ff}

/* 分页 */
.pagination{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px}
.pagination button{padding:6px 12px;border:1px solid #d9d9d9;background:#fff;border-radius:4px;cursor:pointer;font-size:12px}
.pagination button:hover:not(:disabled){border-color:#1890ff;color:#1890ff}
.pagination button:disabled{color:#d9d9d9;cursor:not-allowed}
.pagination .page-num{font-size:13px;color:#666}

/* 弹窗 */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100}
.modal{background:#fff;border-radius:8px;padding:28px;width:440px;box-shadow:0 8px 40px rgba(0,0,0,.2)}
.modal h3{margin-bottom:20px;font-size:16px}
.modal .form-group{margin-bottom:16px}
.modal .form-group input,.modal .form-group select{width:100%;padding:10px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px;outline:none}
.modal .form-group input:focus{border-color:#1890ff}
.modal .form-group label{display:block;margin-bottom:6px;font-size:13px;font-weight:500}
.modal .modal-btns{display:flex;justify-content:end;gap:10px;margin-top:24px}

/* Toast */
.toast{position:fixed;top:20px;right:20px;padding:12px 24px;border-radius:8px;color:#fff;font-size:14px;z-index:200;opacity:0;transition:opacity .3s}
.toast.show{opacity:1}
.toast-success{background:#52c41a}
.toast-info{background:#1890ff}
.toast-warn{background:#fa8c16}

/* 列布局 */
.col-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:1000px){.col-2{grid-template-columns:1fr}}

/* 动画 */
@keyframes flash{0%{opacity:1}50%{opacity:.6}100%{opacity:1}}
.live-data{animation:flash .5s;transition:all .3s}
.live-indicator{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#52c41a}
.live-indicator .blink-dot{width:8px;height:8px;border-radius:50%;background:#52c41a;animation:blink 1.5s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}

/* 批量控制 */
.batch-control-bar{display:flex;flex-direction:column;gap:12px}
.batch-label{font-size:13px;font-weight:600;color:#555}
.batch-devices{display:flex;flex-wrap:wrap;gap:10px}
.batch-device-item{display:flex;align-items:center;gap:6px;padding:6px 12px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;font-size:12px;cursor:pointer;transition:all .2s}
.batch-device-item:hover{background:#f6ffed;border-color:#52c41a}
.batch-device-item input{margin:0}
.dot-online{width:8px;height:8px;border-radius:50%;background:#52c41a}
.dot-offline{width:8px;height:8px;border-radius:50%;background:#d9d9d9}
.batch-actions{display:flex;gap:10px;align-items:center;margin-top:4px}

/* 历史数据工具栏 */
.history-toolbar{display:flex;gap:10px;margin-left:auto}
.history-toolbar select{padding:4px 10px;border:1px solid #d9d9d9;border-radius:4px;font-size:12px}

/* 统计网格 */
.statistics-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.stat-item{background:#fafafa;border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:6px}
.stat-item-label{font-size:12px;color:#999}
.stat-item-val{font-size:20px;font-weight:700;color:#333}

/* 响应式 */
@media(max-width:1200px){.stat-row{grid-template-columns:repeat(2,1fr)}.control-grid{grid-template-columns:1fr}.statistics-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.sidebar{width:60px}.sidebar .logo span,.sidebar .nav-item span,.sidebar .user-info span{display:none}.sidebar .logo,.sidebar .nav-item,.sidebar .user-info{justify-content:center;padding:12px}.stat-row{grid-template-columns:1fr}.statistics-grid{grid-template-columns:1fr}}

/* MaxKB 浮窗样式 */
.maxkb-chat-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
}
.chat-toggle-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(24,144,255,.4);
  transition: all .3s;
}
.chat-toggle-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(24,144,255,.55);
}
.chat-window {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 420px;
  height: 560px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,.2);
  overflow: hidden;
  border: 1px solid #e8e8e8;
}
@media (max-width: 600px) {
  .chat-window {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
}
</style>
