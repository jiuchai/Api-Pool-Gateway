<template>
  <div class="page container">
    <div class="page-header">
      <h1 class="page-title">选择套餐</h1>
      <p class="page-subtitle">按月订阅，畅享全部API服务</p>
    </div>

    <div class="plans-grid">
      <div v-for="t in tiers" :key="t.index" class="plan-card" :class="{ current: t.index === currentTierIndex }">
        <div v-if="t.index === currentTierIndex" class="current-badge">当前套餐</div>
        <div class="plan-card-header">
          <h3 class="plan-card-name">{{ t.name }}</h3>
          <div class="plan-card-price">
            <span class="price">{{ t.monthlyFee === 0 ? '免费' : '¥' + t.monthlyFee }}</span>
            <span class="period" v-if="t.monthlyFee > 0">/月</span>
          </div>
          <div class="plan-card-limit">{{ t.ratePerSecond }} 次/秒</div>
        </div>
        <div class="plan-card-body">
          <ul class="plan-features">
            <li><span class="check">&#10003;</span> 每日调用 <strong>{{ t.maxCallsPerDay === -1 ? '不限' : t.maxCallsPerDay.toLocaleString() + ' 次' }}</strong></li>
            <li><span class="check">&#10003;</span> 每月调用 <strong>{{ t.maxCalls === -1 ? '不限' : t.maxCalls.toLocaleString() + ' 次' }}</strong></li>
            <li><span class="check">&#10003;</span> 月费固定，无额外费用</li>
            <li><span class="check">&#10003;</span> 全部API服务通用</li>
            <li><span class="check">&#10003;</span> API Key 认证访问</li>
            <li v-if="t.monthlyFee > 0"><span class="check">&#10003;</span> 优先技术支持</li>
          </ul>
        </div>
        <div class="plan-card-footer">
          <button v-if="t.index === currentTierIndex" class="btn btn-current" disabled>当前套餐</button>
          <button v-else class="btn btn-primary" @click="purchase(t)" :disabled="switching">{{ switching ? '切换中...' : '选择此套餐' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get, put } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const tiers = ref([])
const currentTierIndex = ref(0)
const switching = ref(false)

async function loadTiers() {
  try {
    const res = await get('/api/billing/tiers')
    tiers.value = res.data.data.tiers
    currentTierIndex.value = res.data.data.currentTierIndex
  } catch (e) { toast.error('加载套餐失败') }
}

async function purchase(t) {
  if (t.index === currentTierIndex.value) return
  switching.value = true
  try {
    await put('/api/billing/tier', { tierIndex: t.index })
    currentTierIndex.value = t.index
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    user.tierIndex = t.index
    localStorage.setItem('user', JSON.stringify(user))
    toast.success('已切换为「' + t.name + '」套餐')
  } catch (e) { toast.error(e.message || '切换失败') }
  finally { switching.value = false }
}

onMounted(loadTiers)
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
.page-header { text-align: center; margin-bottom: 36px; }
.page-title { font-size: 1.75rem; margin-bottom: 6px; }
.page-subtitle { color: #64748b; font-size: 0.95rem; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: start; }
.plan-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; overflow: hidden; position: relative; transition: all 0.2s; display: flex; flex-direction: column; }
.plan-card:hover { border-color: #c7d2fe; box-shadow: 0 4px 20px rgba(79,70,229,0.08); }
.plan-card.current { border-color: #4f46e5; box-shadow: 0 4px 24px rgba(79,70,229,0.12); }
.current-badge { position: absolute; top: 12px; right: 12px; background: #4f46e5; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 10px; }
.plan-card-header { padding: 28px 24px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; text-align: center; }
.plan-card-name { font-size: 1.1rem; margin-bottom: 8px; }
.price { font-size: 2rem; font-weight: 700; color: #1e293b; }
.period { font-size: 0.85rem; color: #94a3b8; }
.plan-card-limit { margin-top: 8px; padding: 4px 12px; background: #fff7ed; color: #c2410c; border-radius: 8px; font-size: 0.78rem; font-weight: 600; display: inline-block; }
.plan-card-body { padding: 20px 24px; flex: 1; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.plan-features li { font-size: 0.85rem; color: #475569; display: flex; align-items: flex-start; gap: 8px; }
.check { color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.plan-card-footer { padding: 0 24px 24px; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; width: 100%; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-current { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
.btn:disabled { cursor: not-allowed; opacity: 0.7; }
</style>
