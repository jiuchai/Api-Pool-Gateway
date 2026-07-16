<template>
  <div class="page container">
    <h1 class="pt">系统监控</h1>
    <div v-if="loading" style="text-align:center;padding:40px">加载中...</div>
    <template v-else-if="data">
      <div style="flex:1;overflow-y:auto;min-height:0">
      <div class="sg">
        <div class="sc"><div class="sl">总用户</div><div class="sv">{{ data.overview.totalUsers }}</div></div>
        <div class="sc"><div class="sl">总服务</div><div class="sv">{{ data.overview.totalServices }}</div></div>
        <div class="sc"><div class="sl">启用服务</div><div class="sv">{{ data.overview.enabledServices }}</div></div>
        <div class="sc"><div class="sl">总调用</div><div class="sv">{{ data.overview.totalCalls }}</div></div>
      </div>

      <div class="charts-row">
        <div class="card chart-card">
          <div class="ch flex-between">
            <h3>近7天调用趋势</h3>
            <el-select v-model="trendService" placeholder="全部服务" size="small" style="width:150px" clearable @change="loadMonitor">
              <el-option label="全部服务" value="" />
              <el-option v-for="s in services" :key="s.slug" :label="s.name" :value="s.slug" />
            </el-select>
          </div>
          <div class="cb"><Line :data="chartData" :options="chartOptions" /></div>
        </div>
        <div class="card chart-card">
          <div class="ch"><h3>状态码分布</h3></div>
          <div class="cb pie-body"><Doughnut :data="statusData" :options="pieOptions" /></div>
        </div>
      </div>

      <!-- 按服务分类 -->
      <div class="card" style="margin-bottom:20px">
        <div class="ch"><h3>按服务分类调用量 (TOP 10)</h3></div>
        <div class="cb bar-body"><Bar v-if="serviceData.labels.length" :data="serviceChartData" :options="barOptions" /><div v-else style="text-align:center;color:#94a3b8;line-height:280px">暂无调用数据</div></div>
      </div>

      <div class="card"><div class="ch"><h3>系统信息</h3></div><div class="cb sys-info">
        <div class="ir"><span>运行时间</span><strong>{{ fmt(data.system.uptime) }}</strong></div>
        <div class="ir"><span>内存占用</span><strong>{{ data.system.memory.rss }}</strong></div>
        <div class="ir"><span>堆内存</span><strong>{{ data.system.memory.heapUsed }}</strong></div>
        <div class="ir"><span>Node版本</span><strong>{{ data.system.nodeVersion }}</strong></div>
      </div></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { get } from '@/api/client'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, ArcElement, BarElement, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, ArcElement, BarElement, Tooltip, Legend, Filler)

const loading = ref(true); const data = ref(null); const services = ref([]); const trendService = ref('')
function fmt(s) { const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60); return `${d}天${h}时${m}分` }

async function loadMonitor() {
  try {
    const params = trendService.value ? `?serviceSlug=${encodeURIComponent(trendService.value)}` : ''
    const r = await get('/api/admin/monitor' + params)
    data.value = r.data.data
  } catch {}
}

const chartData = computed(() => {
  const dd = data.value?.charts?.dailyData
  if (!dd?.length) return { labels: ['暂无'], datasets: [{ label: '调用次数', data: [0], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 }] }
  return { labels: dd.map(d => d.date), datasets: [{ label: '调用次数', data: dd.map(d => d.calls), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#4f46e5', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 }] }
})
const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }

const statusData = computed(() => {
  const s = data.value?.charts?.statusBreakdown || {}
  return { labels: ['2xx 成功', '4xx 错误', '5xx 失败'], datasets: [{ data: [s.success || 0, s.clientErr || 0, s.serverErr || 0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }] }
})
const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }

const serviceData = computed(() => {
  const ss = data.value?.charts?.byService || []
  return { labels: ss.map(s => s.name), counts: ss.map(s => s.count) }
})
const serviceChartData = computed(() => ({
  labels: serviceData.value.labels,
  datasets: [{ label: '调用次数', data: serviceData.value.counts, backgroundColor: '#6366f1', borderRadius: 6 }],
}))
const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }

onMounted(async () => {
  loading.value = true
  try {
    await loadMonitor()
    const sr = await get('/api/services')
    services.value = sr.data.data || []
  } catch {} finally { loading.value = false }
})
</script>

<style scoped>
.container{max-width:1100px;margin:0 auto;padding:24px;height:100%;display:flex;flex-direction:column;overflow:hidden}.pt{font-size:1.5rem;margin-bottom:20px;flex-shrink:0}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.sc{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center}.sl{font-size:.75rem;color:#94a3b8;text-transform:uppercase;margin-bottom:6px}.sv{font-size:1.8rem;font-weight:700}
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
@media(max-width:768px){.charts-row{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9}.ch h3{font-size:1rem}.cb{padding:20px;height:300px}
.pie-body{height:300px}.bar-body{height:300px}.sys-info{height:auto}
.ir{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f8fafc;font-size:.875rem}.ir:last-child{border-bottom:none}.ir span{color:#94a3b8}
</style>
