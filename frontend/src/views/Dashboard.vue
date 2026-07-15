<template>
  <div class="page container">
    <h1 class="page-title">控制台</h1>
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else-if="data">
      <!-- 当前套餐 -->
      <div class="tier-card card" v-if="usage">
        <div class="tier-card-header">
          <div>
            <div class="tier-name">{{ usage.tier.name }}</div>
            <div class="tier-limit">{{ usage.tier.ratePerSecond }} 次/秒 · 日上限 {{ usage.tier.maxCallsPerDay === -1 ? '不限' : usage.tier.maxCallsPerDay.toLocaleString() }}</div>
            <div v-if="usage.tier.subscriptions?.length" class="tier-expires">
              有效期至：<strong>{{ latestExpire }}</strong>
              <span v-if="usage.tier.subscriptions.length > 1" class="sub-count">（{{ usage.tier.subscriptions.length }} 个有效订阅）</span>
            </div>
          </div>
          <div class="tier-actions">
            <div class="tier-fee">¥{{ usage.tier.monthlyFee }}<span>/月</span></div>
            <div class="tier-switch">
              <el-select v-model="activeSubId" size="small" style="width:140px" placeholder="切换套餐" @change="switchActiveTier">
                <el-option v-if="usage.tier.subscriptions?.length" v-for="s in usage.tier.subscriptions" :key="s.id" :label="s.name" :value="s.id" />
                <el-option label="免费版" value="free" />
              </el-select>
              <el-button type="primary" size="small" @click="goPlans">购买套餐</el-button>
            </div>
          </div>
        </div>
        <div class="tier-progress-row">
          <div class="tier-progress-label">
            <span>今日用量</span>
            <span>{{ usage.todayCalls?.toLocaleString() || usage.callCount?.toLocaleString() || 0 }} / {{ usage.tier.maxCallsPerDay === -1 ? '不限' : usage.tier.maxCallsPerDay.toLocaleString() }}</span>
          </div>
          <el-progress :percentage="usagePercent" :status="usageStatus" :stroke-width="14" />
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">今日调用</div><div class="stat-value">{{ data.stats.todayCalls }}</div></div>
        <div class="stat-card"><div class="stat-label">本月调用</div><div class="stat-value">{{ data.stats.monthCalls }}</div></div>
        <div class="stat-card"><div class="stat-label">总调用次数</div><div class="stat-value">{{ data.stats.totalCalls }}</div></div>
        <div class="stat-card"><div class="stat-label">成功调用</div><div class="stat-value success">{{ data.stats.successCalls }}</div></div>
        <div class="stat-card"><div class="stat-label">活跃服务</div><div class="stat-value tier">{{ data.stats.activeServices }}</div></div>
        <div class="stat-card"><div class="stat-label">API Key 数量</div><div class="stat-value">{{ data.stats.keyCount }}</div></div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-row">
        <div class="card chart-card">
          <div class="card-header"><h3>近7天调用趋势</h3></div>
          <div class="card-body"><Line :data="chartData" :options="chartOptions" /></div>
        </div>
        <div class="card chart-card">
          <div class="card-header"><h3>状态码分布</h3></div>
          <div class="card-body pie-body"><Doughnut :data="statusData" :options="pieOptions" /></div>
        </div>
      </div>

      <!-- 最近调用日志 -->
      <div class="card">
        <div class="card-header flex-between">
          <h3>最近调用日志</h3>
          <router-link to="/logs" class="btn btn-sm btn-outline">查看全部</router-link>
        </div>
        <div class="card-body">
          <table v-if="recentLogs.length">
            <thead><tr><th>时间</th><th>服务</th><th>方法</th><th>状态码</th><th>响应时间</th></tr></thead>
            <tbody>
              <tr v-for="l in recentLogs" :key="l._id">
                <td class="time">{{ l.timestamp }}</td>
                <td>{{ l.serviceName || l.serviceSlug || '-' }}</td>
                <td><span class="method-tag">{{ l.method }}</span></td>
                <td><span :class="statusClass(l.statusCode)">{{ l.statusCode }}</span></td>
                <td>{{ l.responseTime }}ms</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-muted" style="text-align:center;padding:20px">暂无调用记录</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { get, put } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { Line, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Filler)

const toast = useToastStore()
const router = useRouter()
const loading = ref(true)
const data = ref(null)
const usage = ref(null)
const recentLogs = ref([])
const activeSubId = ref('')

const latestExpire = computed(() => {
  if (!usage.value?.tier?.subscriptions?.length) return ''
  return usage.value.tier.subscriptions[0].expiresDate
})
function goPlans() { router.push('/plans') }

async function switchActiveTier(subId) {
  try {
    if (subId === 'free') {
      await put('/api/billing/active-subscription', { tierIndex: 0 })
    } else {
      await put('/api/billing/active-subscription', { subscriptionId: subId })
    }
    toast.success('已切换当前套餐')
    await load()
  } catch (e) { toast.error(e.message || '切换失败') }
}
async function load() {
  try {
    const [dashRes, logsRes, usageRes] = await Promise.all([
      get('/api/logs/dashboard'),
      get('/api/logs', { page: 1, pageSize: 10 }),
      get('/api/billing/usage')
    ])
    data.value = dashRes.data.data
    recentLogs.value = logsRes.data.data.logs
    usage.value = usageRes.data.data
    // 仅在首次加载时设置当前选中的套餐
    if (!activeSubId.value) {
      if (usageRes.data.data.activeTierIndex === 0) {
        activeSubId.value = 'free'
      } else if (usage.value?.tier?.subscriptions?.length) {
        activeSubId.value = usage.value.tier.subscriptions[0].id
      }
    }
  } catch (e) { toast.error(e.message || '获取数据失败') }
  finally { loading.value = false }
}

const usagePercent = computed(() => {
  if (!usage.value || usage.value.tier.maxCallsPerDay === -1) return 0
  const today = usage.value.todayCalls || usage.value.callCount || 0
  const pct = Math.round((today / usage.value.tier.maxCallsPerDay) * 100)
  return Math.min(pct, 100)
})
const usageStatus = computed(() => {
  if (!usage.value || usage.value.tier.maxCallsPerDay === -1) return ''
  const pct = usagePercent.value
  if (pct >= 100) return 'exception'
  if (pct >= 80) return 'warning'
  return 'success'
})

const chartData = computed(() => {
  if (!data.value?.dailyData?.length) return { labels: ['暂无'], datasets: [{ label: '调用次数', data: [0], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#4f46e5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7 }] }
  return { labels: data.value.dailyData.map(d => d.date), datasets: [{ label: '调用次数', data: data.value.dailyData.map(d => d.calls), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#4f46e5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7 }] }
})
const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
const statusData = computed(() => {
  const s = data.value?.stats || {}
  return { labels: ['2xx 成功', '4xx 错误', '5xx 错误'], datasets: [{ data: [s.successCalls || 0, s.clientErrorCalls || 0, s.serverErrorCalls || 0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }] }
})
const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
function statusClass(c) { if (c >= 200 && c < 300) return 's2'; if (c >= 400 && c < 500) return 's4'; if (c >= 500) return 's5'; return '' }

onMounted(load)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-title { font-size: 1.5rem; margin-bottom: 24px; }
.loading { text-align: center; padding: 60px; color: #94a3b8; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.stat-label { font-size: .75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.stat-value { font-size: 1.8rem; font-weight: 700; }
.stat-value.success { color: #10b981; }
.stat-value.tier { font-size: 1.2rem; color: #4f46e5; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width:768px) { .charts-row { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.card-header h3 { font-size: 1rem; }
.card-body { padding: 20px; }
.card-body table { width: 100%; border-collapse: collapse; }
.card-body th, .card-body td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: .82rem; }
.card-body th { color: #94a3b8; font-weight: 600; }
.time { white-space: nowrap; color: #64748b; font-size: .8rem; }
.method-tag { font-weight: 600; color: #4f46e5; }
.s2 { color: #10b981; font-weight: 600; }
.s4 { color: #f59e0b; font-weight: 600; }
.s5 { color: #ef4444; font-weight: 600; }
.chart-card .card-body { height: 300px; }
.pie-body { height: 300px; }
.text-muted { color: #94a3b8; font-size: .8rem; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.tier-card { margin-bottom: 20px; padding: 20px; }
.tier-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.tier-name { font-size: 1.15rem; font-weight: 600; color: #1e293b; }
.tier-limit { font-size: 0.82rem; color: #64748b; margin-top: 4px; }
.tier-expires { font-size: 0.82rem; color: #64748b; margin-top: 6px; }
.tier-expires strong { color: #4f46e5; }
.sub-count { color: #94a3b8; margin-left: 6px; }
.tier-actions { text-align: right; }
.tier-fee { font-size: 1.6rem; font-weight: 700; color: #4f46e5; margin-bottom: 8px; }
.tier-fee span { font-size: 0.85rem; color: #94a3b8; font-weight: 400; }
.tier-switch { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.tier-progress-label { display: flex; justify-content: space-between; font-size: 0.82rem; color: #475569; margin-bottom: 8px; }
</style>
