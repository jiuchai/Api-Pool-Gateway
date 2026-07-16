import axios from 'axios'

const api = axios.create({ timeout: 30000, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c })
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('user')
    import('@/stores/toast').then(m => m.useToastStore().error('登录已过期，请重新登录'))
    import('@/router').then(m => m.default.push('/'))
  }
  return Promise.reject({ status: e.response?.status || 0, message: e.response?.data?.error || '请求失败' })
})
export function get(url, params) { return api.get(url, { params }) }
export function post(url, data) { return api.post(url, data) }
export function put(url, data) { return api.put(url, data) }
export function del(url) { return api.delete(url) }
export default api
