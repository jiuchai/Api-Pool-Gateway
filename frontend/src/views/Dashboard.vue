<template>
  <div class="page container">
    <h1 class="page-title">控制台</h1>
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else-if="data">
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
import { get } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { Line, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, Filler)

const toast = useToastStore()
const loading = ref(true)
const data = ref(null)
const recentLogs = ref([])

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

onMounted(async () => {
  try {
    const [dashRes, logsRes] = await Promise.all([
      get('/api/logs/dashboard'),
      get('/api/logs', { page: 1, pageSize: 10 })
    ])
    data.value = dashRes.data.data
    recentLogs.value = logsRes.data.data.logs
  } catch (e) { toast.error(e.message || '获取数据失败') }
  finally { loading.value = false }
})
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
</style>
