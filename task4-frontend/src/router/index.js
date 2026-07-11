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
    meta: { title: '告警日志', roles: ['admin', 'municipal'] },
  },
  {
    path: '/fault-reports',
    name: 'FaultReports',
    component: () => import('@/views/FaultReportsPage.vue'),
    meta: { title: '故障上报', roles: ['admin', 'municipal'] },
  },
  {
    path: '/qa',
    name: 'QA',
    component: () => import('@/views/QAPage.vue'),
    meta: { title: '智能问答', roles: ['admin'] },
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
  const role = localStorage.getItem('role') || 'admin'
  if (to.name === 'Login' && loggedIn) {
    return { name: 'Dashboard' }
  }
  if (to.name !== 'Login' && !loggedIn) {
    return { name: 'Login' }
  }
  if (to.meta?.roles && !to.meta.roles.includes(role)) {
    return { name: 'Dashboard' }
  }
})

export default router
