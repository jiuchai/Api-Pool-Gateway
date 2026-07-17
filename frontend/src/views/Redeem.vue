<template>
  <div class="page container">
    <div class="hero">
      <div class="hero-icon">🎁</div>
      <h1 class="page-title">兑换码</h1>
      <p class="page-subtitle">输入兑换码激活套餐，畅享 API 服务</p>
      <div v-if="redeemPurchaseUrl" style="margin-top:12px">
        <el-button type="warning" size="default" @click="goPurchase">去获取兑换码</el-button>
      </div>
    </div>

    <div class="card redeem-card">
      <div class="card-header"><h3>兑换套餐</h3></div>
      <div class="card-body">
        <div class="redeem-form">
          <el-input v-model="code" size="large" placeholder="输入兑换码，如 POOL-XXXXXXXX" @keyup.enter="handleRedeem" :disabled="loading" />
          <el-button type="primary" size="large" @click="handleRedeem" :disabled="loading || !code.trim()" :loading="loading">立即兑换</el-button>
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
        <li><span class="tip-dot" style="background:#6366f1"></span>兑换码可用于激活指定套餐</li>
        <li><span class="tip-dot" style="background:#f59e0b"></span>每个兑换码有使用次数限制，请在有效期内使用</li>
        <li><span class="tip-dot" style="background:#10b981"></span>同一兑换码每人只能使用一次</li>
        <li><span class="tip-dot" style="background:#ef4444"></span>如遇问题请联系管理员</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// Copyright (c) 2026 jiucai.
import { ref, onMounted } from 'vue'
import { get, post } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const code = ref('')
const loading = ref(false)
const result = ref(null)
const redeemPurchaseUrl = ref('')

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

function goPurchase() {
  window.open(redeemPurchaseUrl.value, '_blank')
}

onMounted(async () => {
  try {
    const res = await get('/api/site-info')
    redeemPurchaseUrl.value = res.data.data.redeemPurchaseUrl || ''
  } catch {}
})
</script>

<style scoped>
.container { max-width: 600px; margin: 0 auto; padding: 32px 24px; min-height: calc(100vh - 60px); display: flex; flex-direction: column; }
.hero { text-align: center; margin-bottom: 28px; flex-shrink: 0; }
.hero-icon { font-size: 3rem; margin-bottom: 12px; }
.page-title { font-size: 1.5rem; margin-bottom: 4px; }
.page-subtitle { color: #64748b; font-size: 0.9rem; }
.redeem-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; border-top: 3px solid #4f46e5; }
.card-header { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; }
.card-header h3 { font-size: .95rem; color: #1e293b; }
.card-body { padding: 24px; }
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
.tips-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-top: 20px; }
.tips-card h4 { font-size: 0.9rem; margin-bottom: 12px; color: #334155; }
.tips-card ul { list-style: none; padding: 0; }
.tips-card li { font-size: 0.85rem; color: #475569; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
.tips-card li:last-child { margin-bottom: 0; }
.tip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
</style>
