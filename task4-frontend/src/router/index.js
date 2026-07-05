import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardPage.vue'),
    meta: { title: '数据总览' },
  },
  {
    path: '/control',
    name: 'Control',
    component: () => import('@/views/ControlPage.vue'),
    meta: { title: '设备控制' },
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryPage.vue'),
    meta: { title: '历史数据' },
  },
  {
    path: '/alarms',
    name: 'Alarms',
    component: () => import('@/views/AlarmPage.vue'),
    meta: { title: '告警日志' },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫：未登录 → /login
router.beforeEach((to) => {
  const loggedIn = localStorage.getItem('loggedIn')
  if (to.name !== 'Login' && !loggedIn) {
    return { name: 'Login' }
  }
})

export default router
