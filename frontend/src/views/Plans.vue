<template>
  <div class="page container">
    <div class="page-header">
      <h1 class="page-title">选择套餐</h1>
      <p class="page-subtitle">按月订阅，可叠加购买，畅享全部API服务</p>
    </div>

    <!-- 当前有效订阅 -->
    <div class="card current-subs" v-if="subscriptions.length">
      <div class="card-header"><h3>我的有效订阅</h3></div>
      <div class="card-body">
        <div class="sub-list">
          <div v-for="s in subscriptions" :key="s.id" class="sub-item">
            <div>
              <strong>{{ s.name }}</strong>
              <span class="sub-meta">{{ s.ratePerSecond }} 次/秒 · 日上限 {{ s.maxCallsPerDay === -1 ? '不限' : s.maxCallsPerDay.toLocaleString() }}</span>
            </div>
            <div class="sub-expires">到期：{{ s.expiresDate }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="plans-grid">
      <div v-for="t in tiers" :key="t.index" class="plan-card" :class="{ current: isSubscribed(t.index) }">
        <div v-if="isSubscribed(t.index)" class="current-badge">已订阅</div>
        <div class="plan-card-header">
          <h3 class="plan-card-name">{{ t.name }}</h3>
          <div class="plan-card-price">
            <span class="price">{{ t.monthlyFee === 0 ? '免费' : '¥' + t.monthlyFee }}</span>
            <span class="period" v-if="t.monthlyFee > 0">/月</span>
          </div>
          <div class="plan-card-limit">{{ t.ratePerSecond }} 次/秒</div>
        </div>
        <div class="plan-card-body">
          <p v-if="t.description" class="plan-desc">{{ t.description }}</p>
          <ul class="plan-features">
            <li v-for="(f, i) in (t.features && t.features.length ? t.features : defaultFeatures(t))" :key="i">
              <span class="check">&#10003;</span> {{ f }}
            </li>
          </ul>
        </div>
        <div class="plan-card-footer">
          <el-button v-if="!t.onSale" type="warning" disabled style="width:100%">等待开售</el-button>
          <el-button v-else-if="t.monthlyFee === 0" type="info" disabled style="width:100%">免费套餐</el-button>
          <el-button v-else type="primary" style="width:100%" @click="purchase(t)">
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
          <li>点击套餐下方「去支付」按钮，系统会生成一个一次性支付凭证（30分钟有效）</li>
          <li>跳转到支付页面（仅携带 <code>token</code>，不暴露用户信息）</li>
          <li>支付完成后，支付系统回调 <code>POST /api/billing/payment-webhook</code></li>
          <li>回调参数：<code>&#123; secret, token &#125;</code>，服务端验证 token 后开通套餐</li>
          <li>同一 token 只能使用一次，过期自动失效</li>
        </ol>
      </div>
    </div>
    <div v-else class="card purchase-guide" style="margin-top:24px">
      <div class="card-header"><h3>购买说明</h3></div>
      <div class="card-body">
        <p style="color:#64748b;font-size:.85rem">管理员暂未配置支付跳转地址，购买后直接开通。如需接入外部支付，请在管理后台「服务管理 → 设置」中配置支付跳转地址和回调密钥。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get, post } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const tiers = ref([])
const subscriptions = ref([])
const paymentUrl = ref('')

async function loadData() {
  try {
    const [tiersRes, subsRes, siteRes] = await Promise.all([
      get('/api/billing/tiers'),
      get('/api/billing/subscriptions'),
      get('/api/site-info')
    ])
    tiers.value = tiersRes.data.data.tiers
    subscriptions.value = subsRes.data.data
    paymentUrl.value = siteRes.data.data.paymentUrl || ''
  } catch (e) { toast.error('加载套餐失败') }
}

function isSubscribed(index) {
  return subscriptions.value.some(s => s.tierIndex === index)
}

function defaultFeatures(t) {
  const f = [`每日调用 ${t.maxCallsPerDay === -1 ? '不限' : t.maxCallsPerDay.toLocaleString() + ' 次'}`, '全部 API 服务通用', 'API Key 认证访问']
  if (t.monthlyFee > 0) f.push('优先技术支持')
  return f
}

async function purchase(t) {
  // 如果配置了支付跳转地址，先创建支付凭证再跳转
  if (paymentUrl.value) {
    try {
      const res = await post('/api/billing/create-payment', { tierIndex: t.index, durationDays: 30 })
      const token = res.data.data.token
      const url = `${paymentUrl.value}${paymentUrl.value.includes('?') ? '&' : '?'}token=${token}`
      window.open(url, '_blank')
      toast.info('已跳转到支付页面，支付完成后将自动开通')
    } catch (e) { toast.error(e.message || '创建支付失败') }
    return
  }
  // 没有配置支付地址，直接开通
  try {
    const res = await post('/api/billing/subscribe', { tierIndex: t.index, durationDays: 30 })
    toast.success(res.data.data.message)
    await loadData()
  } catch (e) { toast.error(e.message || '购买失败') }
}

onMounted(loadData)
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
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
.sub-meta { color: #64748b; font-size: 0.8rem; margin-left: 10px; }
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
.plan-card-limit { margin-top: 8px; padding: 4px 12px; background: #fff7ed; color: #c2410c; border-radius: 8px; font-size: 0.78rem; font-weight: 600; display: inline-block; }
.plan-card-body { padding: 20px 24px; flex: 1; }
.plan-desc { color: #64748b; font-size: 0.82rem; margin: 0 0 14px; line-height: 1.5; }
.plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.plan-features li { font-size: 0.85rem; color: #475569; display: flex; align-items: flex-start; gap: 8px; }
.check { color: #10b981; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.plan-card-footer { padding: 0 24px 24px; }
.purchase-guide { margin-top: 32px; }
.guide-steps { padding-left: 20px; }
.guide-steps li { font-size: .85rem; color: #475569; margin-bottom: 8px; line-height: 1.6; }
.guide-steps code { font-size: .78rem; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #e11d48; }
</style>
