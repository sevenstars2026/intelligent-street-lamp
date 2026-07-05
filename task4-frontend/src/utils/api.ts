import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
})

api.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code === 200) {
            return res
        } else {
            return Promise.reject(new Error(res.message || '请求失败'))
        }
    },
    error => {
        const msg = error.response?.data?.message || error.message
        return Promise.reject(new Error(msg))
    }
)

// ===== 设备相关 =====
export function getDevices() { return api.get('/devices') }

export function getDeviceById(deviceId: string) {
    return api.get(`/devices/${deviceId}`)
}

// ===== 设备控制 =====
export function controlDevice(deviceId: string, command: 'on' | 'off') {
    return api.post(`/devices/${deviceId}/control`, { command })
}

export function batchControl(deviceIds: string[], command: 'on' | 'off') {
    return api.post('/devices/batch-control', { deviceIds, command })
}

// ===== 设备阈值 =====
export function getDeviceThreshold(deviceId: string) {
    return api.get(`/devices/${deviceId}/threshold`)
}

export function setDeviceThreshold(deviceId: string, data: {
    lightThresholdOn: number
    lightThresholdOff: number
}) {
    return api.post(`/devices/${deviceId}/threshold`, data)
}

// ===== 设备模式 =====
export function getDeviceMode(deviceId: string) {
    return api.get(`/devices/${deviceId}/mode`)
}

export function setDeviceMode(deviceId: string, mode: 'auto' | 'manual') {
    return api.put(`/devices/${deviceId}/mode`, { mode })
}

// ===== 控制日志 =====
export function getControlLogs(deviceId: string, params?: { page?: number; pageSize?: number }) {
    return api.get(`/devices/${deviceId}/control-logs`, { params })
}

// ===== 历史数据 =====
export function getDeviceLightHistory(deviceId: string, params: { startTime: string; endTime: string }) {
    return api.get(`/devices/${deviceId}/light-history`, { params })
}

// ===== 健康检查 =====
export function getHealth() { return api.get('/health') }

// ===== 告警相关 (NEW) =====
export function getAlarms(params?: { level?: string; status?: string }) {
  return api.get('/alarms', { params })
}

export function getAlarm(alarmId: string) {
  return api.get(`/alarms/${alarmId}`)
}

export function resolveAlarm(alarmId: string) {
  return api.put(`/alarms/${alarmId}/resolve`)
}

export default api
