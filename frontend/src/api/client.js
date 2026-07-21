// Copyright (c) 2026 jiucai.
import axios from 'axios'
import router from '@/router'

const api = axios.create({ timeout: 30000, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c })
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) {
    // 登录接口的401由Login.vue自行处理（如用户名或密码错误），不触发全局拦截
    if (e.config?.url === '/api/auth/login') {
      return Promise.reject({ status: 401, message: e.response?.data?.error || '请求失败' })
    }
    localStorage.removeItem('token'); localStorage.removeItem('user')
    import('@/stores/toast').then(m => m.useToastStore().error('登录已过期，请重新登录'))
    router.push('/')
  }
  return Promise.reject({ status: e.response?.status || 0, message: e.response?.data?.error || '请求失败' })
})
export function get(url, params) { return api.get(url, { params }) }
export function post(url, data) { return api.post(url, data) }
export function put(url, data) { return api.put(url, data) }
export function del(url, data) { return api.delete(url, { data }) }
export default api
