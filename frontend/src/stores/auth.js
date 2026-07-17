import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setAuth(t, u) { token.value = t; user.value = u; localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)) }
  function clear() { token.value = ''; user.value = null; localStorage.removeItem('token'); localStorage.removeItem('user') }

  async function login(creds) { const r = await api.post('/api/auth/login', creds); setAuth(r.data.data.token, r.data.data.user); return r.data.data }
  async function register(f) { const r = await api.post('/api/auth/register', f); setAuth(r.data.data.token, r.data.data.user); return r.data.data }
  async function fetchProfile() { const r = await api.get('/api/auth/profile'); user.value = { ...user.value, ...r.data.data }; localStorage.setItem('user', JSON.stringify(user.value)); return r.data.data }
  async function updateProfile(data) { const r = await api.put('/api/auth/profile', data); user.value = { ...user.value, ...r.data.data }; localStorage.setItem('user', JSON.stringify(user.value)); return r.data.data }
  function logout() { clear() }

  return { token, user, isLoggedIn, isAdmin, login, register, fetchProfile, logout }
})
