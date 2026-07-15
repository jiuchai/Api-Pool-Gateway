import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/Register.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { auth: true } },
  { path: '/settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { auth: true } },
  { path: '/logs', name: 'Logs', component: () => import('@/views/Logs.vue'), meta: { auth: true } },
  { path: '/docs', name: 'Docs', component: () => import('@/views/Docs.vue') },
  { path: '/tools', name: 'Tools', component: () => import('@/views/Tools.vue') },
  { path: '/test', name: 'Test', component: () => import('@/views/Test.vue') },
  { path: '/plans', name: 'Plans', component: () => import('@/views/Plans.vue') },
  { path: '/redeem', name: 'Redeem', component: () => import('@/views/Redeem.vue'), meta: { auth: true } },
  { path: '/admin/services', name: 'AdminServices', component: () => import('@/views/admin/Services.vue'), meta: { auth: true, admin: true } },
  { path: '/admin/users', name: 'AdminUsers', component: () => import('@/views/admin/Users.vue'), meta: { auth: true, admin: true } },
  { path: '/admin/logs', name: 'AdminLogs', component: () => import('@/views/admin/Logs.vue'), meta: { auth: true, admin: true } },
  { path: '/admin/monitor', name: 'AdminMonitor', component: () => import('@/views/admin/Monitor.vue'), meta: { auth: true, admin: true } },
  { path: '/admin/redeem', name: 'AdminRedeem', component: () => import('@/views/admin/RedeemCodes.vue'), meta: { auth: true, admin: true } },
  { path: '/admin/billing', name: 'AdminBilling', component: () => import('@/views/admin/Billing.vue'), meta: { auth: true, admin: true } },
]

const router = createRouter({ history: createWebHashHistory(), routes })
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (to.meta.auth && !token) return next({ name: 'Login', query: { redirect: to.fullPath } })
  if (to.meta.admin && (!user || user.role !== 'admin')) return next({ name: 'Home' })
  if ((to.name === 'Login' || to.name === 'Register') && token) return next({ name: 'Dashboard' })
  next()
})
export default router
