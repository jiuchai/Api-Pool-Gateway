<template>
  <div class="page container">
    <h1 class="page-title">兑换码</h1>
    <p class="page-subtitle">输入兑换码激活套餐</p>
    <div class="card">
      <div class="card-body">
        <div class="redeem-form">
          <el-input v-model="code" size="large" placeholder="输入兑换码，如 POOL-XXXXXXXX" @keyup.enter="handleRedeem" :disabled="loading" />
          <el-button type="primary" size="large" @click="handleRedeem" :disabled="loading || !code.trim()" :loading="loading">兑换</el-button>
        </div>
        <div v-if="result" class="result-card" :class="result.success ? 'success' : 'error'">
          <div class="result-icon">{{ result.success ? '&#10003;' : '&#10005;' }}</div>
          <div class="result-text">{{ result.message }}</div>
        </div>
      </div>
    </div>
    <div class="tips-card">
      <h4>使用说明</h4>
      <ul>
        <li>兑换码可用于激活指定套餐</li>
        <li>每个兑换码有使用次数限制，请在有效期内使用</li>
        <li>同一兑换码每人只能使用一次</li>
        <li>如遇问题请联系管理员</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { post } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const code = ref('')
const loading = ref(false)
const result = ref(null)

async function handleRedeem() {
  if (!code.value.trim()) return
  loading.value = true; result.value = null
  try {
    const res = await post('/api/redeem', { code: code.value })
    result.value = { success: true, message: res.data.data.message }
    code.value = ''
    toast.success('兑换成功')
  } catch (e) { result.value = { success: false, message: e.message || '兑换失败' } }
  finally { loading.value = false }
}
</script>

<style scoped>
.container { max-width: 600px; margin: 0 auto; padding: 32px 24px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.page-title { font-size: 1.5rem; margin-bottom: 4px; flex-shrink: 0; }
.page-subtitle { color: #64748b; margin-bottom: 24px; flex-shrink: 0; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
.card-body { padding: 28px; }
.redeem-form { display: flex; gap: 12px; }
.result-card { display: flex; align-items: center; gap: 12px; margin-top: 20px; padding: 16px; border-radius: 10px; }
.result-card.success { background: #f0fdf4; border: 1px solid #bbf7d0; }
.result-card.error { background: #fef2f2; border: 1px solid #fecaca; }
.result-icon { font-size: 1.5rem; font-weight: 700; }
.result-card.success .result-icon { color: #16a34a; }
.result-card.error .result-icon { color: #dc2626; }
.result-text { font-size: 0.95rem; font-weight: 500; }
.result-card.success .result-text { color: #166534; }
.result-card.error .result-text { color: #991b1b; }
.tips-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-top: 20px; }
.tips-card h4 { font-size: 0.9rem; margin-bottom: 10px; color: #475569; }
.tips-card ul { padding-left: 18px; }
.tips-card li { font-size: 0.82rem; color: #64748b; margin-bottom: 4px; }
</style>
