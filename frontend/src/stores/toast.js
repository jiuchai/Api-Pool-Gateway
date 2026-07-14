import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]); let id = 0
  function add(type, msg, dur = 3000) { const tid = ++id; toasts.value.push({ id: tid, type, msg }); if (dur > 0) setTimeout(() => remove(tid), dur); }
  function remove(tid) { toasts.value = toasts.value.filter(t => t.id !== tid) }
  function success(m, d) { add('success', m, d) }
  function error(m, d) { add('error', m, d) }
  return { toasts, success, error }
})
