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
        return Promise.reject(error)
    }
)

// ===== 用户相关 =====
export function login(data: { username: string; password: string }) {
    return api.post('/login', data)
}

// ===== 设备相关 =====
export function getDevices() { return api.get('/devices') }

export function addDevice(data: { deviceId: string; deviceName: string; location?: string }) {
    return api.post('/devices', data)
}

export function unbindDevice(deviceId: string) {
    return api.delete(`/devices/${deviceId}`)
}

// ===== 光照数据 =====
export function getCurrentLight() { return api.get('/light/current') }
export function getLightHistory() { return api.get('/light/history') }
export function recordLight(data: { deviceId: string; value: number }) {
    return api.post('/light/record', data)
}

// ===== 告警相关 =====
export function getAlerts(params?: { page?: number; pageSize?: number }) {
    return api.get('/alerts', { params })
}

export function handleAlert(id: number) {
    return api.put(`/alerts/${id}/handle`)
}

export function resolveAlert(id: number, note?: string) {
    return api.put(`/alerts/${id}/resolve`, { note })
}

// ===== 配置相关 =====
export function getConfig() { return api.get('/config') }

export function updateConfig(data: {
    threshold_low?: number | string
    threshold_high?: number | string
    control_mode?: string
}) {
    return api.put('/config', data)
}

// ===== 控制相关 =====
export function controlDevice(deviceId: string, action: 'on' | 'off') {
    return api.post(`/control/${deviceId}/${action}`)
}

export function batchControl(deviceIds: string[], command: 'on' | 'off') {
    return api.post('/devices/batch-control', { deviceIds, command })
}

// ===== 设备阈值与模式 =====
export function getDeviceThreshold(deviceId: string) {
    return api.get(`/devices/${deviceId}/threshold`)
}

export function setDeviceThreshold(deviceId: string, data: {
    lightThresholdOn: number
    lightThresholdOff: number
}) {
    return api.post(`/devices/${deviceId}/threshold`, data)
}

export function getDeviceMode(deviceId: string) {
    return api.get(`/devices/${deviceId}/mode`)
}

export function setDeviceMode(deviceId: string, mode: 'auto' | 'manual') {
    return api.put(`/devices/${deviceId}/mode`, { mode })
}

// ===== 控制日志与历史数据 =====
export function getControlLogs(deviceId: string, params?: { page?: number; pageSize?: number }) {
    return api.get(`/devices/${deviceId}/control-logs`, { params })
}

export function getDeviceLightHistory(deviceId: string, params?: { range?: '24h' | '7d' | '30d' }) {
    return api.get(`/devices/${deviceId}/light-history`, { params })
}

export function getDeviceStatistics(deviceId: string, params?: { range?: '7d' | '30d' }) {
    return api.get(`/devices/${deviceId}/statistics`, { params })
}

// ===== 统计概览 =====
export function getDashboardStats() { return api.get('/dashboard/stats') }
export function getStatisticsOverview() { return api.get('/statistics/overview') }
export function getHealth() { return api.get('/health') }

// ===== 心跳 =====
export function heartbeat(deviceId: string) {
    return api.post(`/devices/${deviceId}/heartbeat`)
}

export default api
