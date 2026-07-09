import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',       name: 'Map',    component: () => import('@/views/MapPage.vue') },
  { path: '/routes', name: 'Routes', component: () => import('@/views/RoutesPage.vue') },
  { path: '/spots',      name: 'Spots',      component: () => import('@/views/SpotsPage.vue') },
  { path: '/spots/:id', name: 'SpotDetail', component: () => import('@/views/SpotDetailPage.vue') },
  { path: '/events',      name: 'Events',      component: () => import('@/views/EventsPage.vue') },
  { path: '/events/:id', name: 'EventDetail', component: () => import('@/views/EventDetailPage.vue') },
  { path: '/report', name: 'Report', component: () => import('@/views/ReportPage.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
