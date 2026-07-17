<template>
  <div class="page container">
    <div class="page-header">
      <h1 class="page-title">支付记录</h1>
      <p class="page-subtitle">查看您的订单支付历史</p>
    </div>

    <div class="card fixed-card" v-if="history.length">
      <div class="card-body" style="padding:0;overflow:auto;flex:1">
        <table class="history-table">
          <thead><tr><th>订单号</th><th>套餐</th><th>金额</th><th>来源</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="o in history" :key="o.orderId">
              <td class="order-cell" :title="o.orderId">{{ o.orderId }}</td>
              <td>{{ o.tierName }}</td>
              <td>{{ o.amount ? '¥' + o.amount : '-' }}</td>
              <td><span class="source-tag" :class="o.source === 'redeem' ? 'src-redeem' : 'src-pay'">{{ o.source === 'redeem' ? '兑换码' : '支付' }}</span></td>
              <td><span class="status-tag" :class="statusClass(o)">{{ statusText(o) }}</span></td>
              <td>{{ fmtTime(o.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="empty" v-else>暂无支付记录</div>
  </div>
</template>

<script setup>
// Copyright (c) 2026 jiucai.
import { ref, onMounted } from 'vue'
import { get } from '@/api/client'

const history = ref([])

async function load() {
  try {
    const res = await get('/api/billing/payment-history')
    history.value = res.data.data
  } catch {}
}

function statusClass(o) {
  if (o.status === 'paid') return 'status-success'
  if (o.status === 'failed') return 'status-fail'
  if (o.expiresAt < Date.now()) return 'status-expired'
  return 'status-pending'
}
function statusText(o) {
  if (o.status === 'paid') return '已支付'
  if (o.status === 'failed') return '创建失败'
  if (o.expiresAt < Date.now()) return '已过期'
  return '待支付'
}
function fmtTime(ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(load)
</script>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 32px 24px; height: calc(100vh - 60px); display: flex; flex-direction: column; overflow: hidden; }
.page-header { margin-bottom: 28px; flex-shrink: 0; }
.page-title { font-size: 1.5rem; margin-bottom: 4px; }
.page-subtitle { color: #64748b; font-size: .9rem; }
.fixed-card { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.card-body { padding: 20px; }
.history-table { min-width: 100%; border-collapse: collapse; white-space: nowrap; }
.history-table th, .history-table td { padding: 12px 16px; font-size: .85rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
.history-table th { color: #94a3b8; font-weight: 600; font-size: .75rem; text-transform: uppercase; background: #f8fafc; position: sticky; top: 0; z-index: 1; }
.order-cell { font-family: 'Consolas', monospace; font-size: .8rem; }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: .72rem; font-weight: 600; }
.status-success { background: #dcfce7; color: #166534; }
.status-fail { background: #fee2e2; color: #991b1b; }
.status-expired { background: #fef3c7; color: #92400e; }
.status-pending { background: #e0e7ff; color: #3730a3; }
.source-tag { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: .72rem; font-weight: 600; }
.src-redeem { background: #f3e8ff; color: #6b21a8; }
.src-pay { background: #dbeafe; color: #1e40af; }
.empty { text-align: center; padding: 60px; color: #94a3b8; font-size: .9rem; }
</style>
