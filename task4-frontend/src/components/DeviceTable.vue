<template>
  <div class="device-table-wrap">
    <table class="device-table">
      <thead>
        <tr>
          <th>设备 ID</th>
          <th>设备名称</th>
          <th>在线状态</th>
          <th>开关状态</th>
          <th>控制模式</th>
          <th>最后心跳</th>
          <th v-if="showActions">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(d, idx) in devices"
          :key="d.id || d.deviceId"
          class="table-row-anim"
          :style="{ animationDelay: (idx * 50) + 'ms' }"
        >
          <td class="td-id">{{ d.deviceId || d.id }}</td>
          <td>{{ d.deviceName || d.name }}</td>
          <td>
            <span class="status-badge" :class="d.online ? 'online' : 'offline'">
              <span class="pulse-dot" :class="d.online ? 'online' : 'offline'"></span>
              {{ d.online ? '在线' : '离线' }}
            </span>
          </td>
          <td>
            <span class="state-badge" :class="d.currentState === 'on' ? 'on' : 'off'">
              {{ d.currentState === 'on' ? '开灯' : '关灯' }}
            </span>
          </td>
          <td>
            <span class="mode-badge" :class="d.mode === 'auto' ? 'auto' : 'manual'">
              {{ d.mode === 'auto' ? '自动' : '手动' }}
            </span>
          </td>
          <td class="td-time">{{ formatTime(d.lastHeartbeat || d.last_heartbeat) }}</td>
          <td v-if="showActions">
            <div class="action-btns">
              <button class="action-btn" @click="$emit('editThreshold', d)">阈值</button>
              <button class="action-btn" @click="$emit('editMode', d)">模式</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="table-empty" v-if="!devices || devices.length === 0">
      暂无设备数据
    </div>
  </div>
</template>

<script setup>
defineProps({
  devices: { type: Array, default: () => [] },
  showActions: { type: Boolean, default: false },
})
defineEmits(['editThreshold', 'editMode'])

function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t).replace('T', ' ').slice(0, 19)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
</script>

<style scoped>
.device-table-wrap {
  overflow-x: auto;
}

.device-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.device-table th {
  text-align: left;
  padding: 10px 20px;
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.device-table td {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(101, 138, 228, 0.04);
}

.table-row-anim {
  opacity: 0;
  animation: fade-in-up 350ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.device-table tbody tr:hover {
  background: rgba(101, 138, 228, 0.06);
}

.td-id {
  font-family: var(--font-mono);
  color: var(--color-brand-soft);
  font-size: 12px;
}

.td-time {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.status-badge.online {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.1);
}

.status-badge.offline {
  color: var(--color-status-offline);
  background: rgba(239, 68, 68, 0.1);
}

.state-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.state-badge.on {
  color: var(--color-status-warning);
  background: rgba(245, 158, 11, 0.12);
}

.state-badge.off {
  color: var(--color-text-muted);
  background: rgba(100, 116, 139, 0.1);
}

.mode-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

.mode-badge.auto {
  color: var(--color-status-online);
  background: rgba(34, 197, 94, 0.1);
}

.mode-badge.manual {
  color: var(--color-brand-soft);
  background: rgba(101, 138, 228, 0.1);
}

.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-brand-soft);
  font-size: 11px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 150ms ease;
}

.action-btn:hover {
  background: rgba(101, 138, 228, 0.12);
  border-color: var(--color-border-glow);
}

.table-empty {
  padding: 48px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
