<template>
  <div class="page container">
    <div class="page-header">
      <h1 class="page-title">选择套餐</h1>
      <p class="page-subtitle">按月订阅，可叠加购买，畅享全部API服务</p>
    </div>

    <!-- 当前有效订阅 -->
    <div class="card current-subs" v-if="!loading && subscriptions.length">
      <div class="card-header"><h3>我的有效订阅</h3></div>
      <div class="card-body">
        <div class="sub-list">
          <div v-for="s in subscriptions" :key="s.id" class="sub-item">
            <div>
              <strong>{{ s.name }}</strong>
            </div>
            <div class="sub-expires">到期：{{ s.expiresDate }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载骨架 -->
    <template v-if="loading">
      <div class="plans-grid">
        <div v-for="i in 3" :key="'sk'+i" class="plan-card sk-card">
          <div class="plan-card-header" style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <div class="sk-line" style="width:60px;height:18px"></div>
            <div class="sk-line" style="width:80px;height:32px"></div>
          </div>
          <div class="plan-card-body">
            <div class="sk-line" style="width:80%;height:12px;margin-bottom:14px"></div>
            <div class="sk-line" style="width:90%;height:12px;margin-bottom:10px"></div>
            <div class="sk-line" style="width:70%;height:12px;margin-bottom:10px"></div>
            <div class="sk-line" style="width:60%;height:12px"></div>
          </div>
          <div class="plan-card-footer">
            <div class="sk-line" style="width:100%;height:32px;border-radius:6px"></div>
          </div>
        </div>
      </div>
      <div class="card purchase-guide">
        <div class="card-header"><div class="sk-line" style="width:80px;height:16px"></div></div>
        <div class="card-body">
          <div class="sk-line" style="width:70%;height:14px;margin-bottom:10px"></div>
          <div class="sk-line" style="width:85%;height:14px;margin-bottom:10px"></div>
          <div class="sk-line" style="width:60%;height:14px"></div>
        </div>
      </div>
    </template>

    <!-- 真实内容 -->
    <template v-else>
      <div class="plans-grid">
        <div v-for="t in tiers" :key="t.index" class="plan-card" :class="{ current: isSubscribed(t.index) }">
          <div v-if="isSubscribed(t.index)" class="current-badge">已订阅</div>
          <div class="plan-card-header">
            <h3 class="plan-card-name">{{ t.name }}</h3>
            <div class="plan-card-price">
              <span class="price">{{ t.monthlyFee === 0 ? '免费' : '¥' + t.monthlyFee }}</span>
              <span class="period" v-if="t.monthlyFee > 0">/月</span>
            </div>
          </div>
          <div class="plan-card-body">
            <p v-if="t.description" class="plan-desc">{{ t.description }}</p>
            <ul class="plan-features">
              <li v-for="(f, i) in t.features" :key="i">
                <span class="check">&#10003;</span> {{ f }}
              </li>
            </ul>
          </div>
          <div class="plan-card-footer">
            <el-button v-if="!t.onSale" type="warning" disabled style="width:100%">等待开售</el-button>
            <el-button v-else-if="t.monthlyFee === 0" type="info" disabled style="width:100%">免费套餐</el-button>
            <el-button v-else type="primary" style="width:100%" @click="purchase(t)" :loading="purchasing === t.index">
              {{ isSubscribed(t.index) ? '续订一个月' : '去支付' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 购买说明 -->
      <div v-if="paymentUrl" class="card purchase-guide">
        <div class="card-header"><h3>购买流程</h3></div>
        <div class="card-body">
          <ol class="guide-steps">
            <li>点击套餐下方「去支付」，系统生成一个一次性订单（15 分钟有效）</li>
            <li>跳转到支付页面完成支付</li>
            <li>支付完成后系统自动开通套餐，无需手动操作</li>
          </ol>
        </div>
      </div>

      <!-- 兑换码入口 -->
      <div v-if="redeemPurchaseUrl" style="margin-top:24px;text-align:center">
        <el-button type="warning" size="default" @click="goRedeem">去获取兑换码</el-button>
      </div>
    </template>

  </div>
</template>

<script setup>
// Copyright (c) 2026 jiucai.
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { get, post } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'

const toast = useToastStore()
const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const tiers = ref([])
const subscriptions = ref([])
const paymentUrl = ref('')
const redeemPurchaseUrl = ref('')
const purchasing = ref(-1)

async function loadData() {
  try {
    const [tiersRes, siteRes] = await Promise.all([
      get('/api/billing/tiers'),
      get('/api/site-info')
    ])
    tiers.value = tiersRes.data.data.tiers
    paymentUrl.value = siteRes.data.data.paymentUrl || ''
    redeemPurchaseUrl.value = siteRes.data.data.redeemPurchaseUrl || ''

    // 订阅信息仅登录用户加载，失败不影响页面展示
    if (auth.isLoggedIn) {
      try {
        const subsRes = await get('/api/billing/subscriptions')
        subscriptions.value = subsRes.data.data
      } catch {}
    }
  } catch (e) { toast.error('加载套餐失败') }
  finally { loading.value = false }
}

function isSubscribed(index) {
  return subscriptions.value.some(s => s.tierIndex === index)
}

function goRedeem() {
  window.open(redeemPurchaseUrl.value, '_blank')
}

async function purchase(t) {
  if (!auth.isLoggedIn) {
    router.push({ name: 'Login', query: { redirect: '/plans' } })
    return
  }
  if (!paymentUrl.value) {
    toast.error('管理员未配置支付地址，无法购买')
    return
  }
  try {
    purchasing.value = t.index
    const res = await post('/api/billing/create-payment', { tierIndex: t.index, durationDays: 30 })
    const { orderId } = res.data.data
    const url = `${paymentUrl.value}${paymentUrl.value.includes('?') ? '&' : '?'}orderId=${orderId}`
    window.open(url, '_blank')
    toast.info('已跳转到支付页面，支付完成后将自动开通')
  } catch (e) { toast.error(e.message || '创建支付失败') }
  finally { purchasing.value = -1 }
}

onMounted(loadData)
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; min-height: calc(100vh - 60px); display: flex; flex-direction: column; }
.page-header { text-align: center; margin-bottom: 36px; flex-shrink: 0; }
.page-title { font-size: 1.75rem; margin-bottom: 6px; }
.page-subtitle { color: #64748b; font-size: 0.95rem; }
.current-subs { margin-bottom: 24px; flex-shrink: 0; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.card-header h3 { font-size: 1rem; }
.card-body { padding: 20px; }
.sub-list { display: flex; flex-direction: column; gap: 12px; }
.sub-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; }
.sub-expires { color: #4f46e5; font-size: 0.85rem; font-weight: 500; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: start; }
.plan-card { background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; overflow: hidden; position: relative; transition: all 0.2s; display: flex; flex-direction: column; }
.plan-card:hover { border-color: #c7d2fe; box-shadow: 0 4px 20px rgba(79,70,229,0.08); }
.plan-card.current { border-color: #4f46e5; box-shadow: 0 4px 24px rgba(79,70,229,0.12); }
.current-badge { position: absolute; top: 12px; right: 12px; background: #4f46e5; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 10px; }
.plan-card-header { padding: 28px 24px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; text-align: center; }
.plan-card-name { font-size: 1.1rem; margin-bottom: 8px; }
.price { font-size: 2rem; font-weight: 700; color: #1e293b; }
.period { font-size: 0.85rem; color: #94a3b8; }
.plan-card-body { padding: 20px 24px; flex: 1; }
.plan-desc { color: #64748b; font-size: 0.82rem; margin: 0 0 14px; line-height: 1.5; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.plan-features li { font-size: 0.85rem; color: #475569; display: flex; align-items: flex-start; gap: 8px; }
.check { color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.plan-card-footer { padding: 0 24px 24px; }
.purchase-guide { margin-top: 32px; }
.guide-steps { padding-left: 20px; }
.guide-steps li { font-size: .85rem; color: #475569; margin-bottom: 8px; line-height: 1.6; }
.sk-card { pointer-events: none; }
.sk-line {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
