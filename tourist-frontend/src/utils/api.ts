import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.response.use(
  res => {
    const { code, message, data } = res.data
    if (code !== 200) return Promise.reject(new Error(message || '请求失败'))
    return data
  },
  err => Promise.reject(err)
)

// ===== 设备（复用管理端） =====
export function getDevices() { return api.get('/devices') }
export function getDeviceById(id) { return api.get(`/devices/${id}`) }

// ===== 景区数据 =====
export function getScenicRoutes() { return api.get('/scenic/routes') }
export function getScenicSpots() { return api.get('/scenic/spots') }
export function getScenicEvents() { return api.get('/scenic/events') }
export function getScenicLamps() { return api.get('/scenic/lamps') }

// ===== 故障上报 =====
export function submitFaultReport(formData) {
  // 不手动设置 Content-Type，让浏览器自动添加 boundary 参数
  return api.post('/reports', formData, {
    timeout: 30000,
  })
}

export default api
