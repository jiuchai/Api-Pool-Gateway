<template>
  <div class="page container">
    <h1 class="pt">调用日志</h1>
    <div class="fb">
      <el-select v-model="fl.serviceSlug" placeholder="服务类型" style="width:150px" size="default" clearable filterable>
        <el-option v-for="s in serviceList" :key="s.slug" :label="s.name" :value="s.slug" />
      </el-select>
      <el-input v-model="fl.apiKeyName" placeholder="Key名称" style="width:130px" size="default" clearable />
      <el-select v-model="fl.status" placeholder="状态" style="width:120px" size="default" clearable>
        <el-option label="成功" value="success" /><el-option label="失败" value="fail" />
      </el-select>
      <el-date-picker v-model="dateRange" type="datetimerange" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" size="default" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" style="width:380px" />
      <el-button type="primary" size="default" @click="search">查询</el-button>
      <el-button size="default" @click="reset">重置</el-button>
    </div>
    <div class="card"><div class="cb">
      <div class="table-wrap">
      <table v-if="logs.length"><thead><tr><th>时间</th><th>方法</th><th>路径</th><th>服务</th><th>Key</th><th>状态码</th><th>响应时间</th><th></th></tr></thead><tbody>
        <template v-for="l in logs" :key="l.id">
          <tr class="lr" :class="{ex:l._e}" @click="l._e=!l._e"><td class="time">{{ l.timestamp }}</td><td><span class="mt">{{ l.method }}</span></td><td class="path">{{ l.path }}</td><td>{{ l.serviceName || l.serviceSlug || '-' }}</td><td class="key-cell">{{ l.apiKeyName || '-' }}</td><td><span :class="sc(l.statusCode)">{{ l.statusCode }}</span></td><td>{{ l.responseTime }}ms</td><td><span class="ei">{{ l._e?'▲':'▼' }}</span></td></tr>
          <tr v-if="l._e" class="ldr"><td colspan="8"><div class="ld">
            <div class="ds"><h4>基本信息</h4><div class="info-grid"><div><span class="il">方法:</span>{{ l.method }}</div><div><span class="il">路径:</span><code>{{ l.path }}</code></div><div><span class="il">状态码:</span>{{ l.statusCode }}</div><div><span class="il">响应时间:</span>{{ l.responseTime }}ms</div><div><span class="il">Key名称:</span>{{ l.apiKeyName || '-' }}</div><div><span class="il">IP:</span>{{ l.ip||'-' }}</div></div></div>
            <div class="ds"><h4>用户请求</h4><pre v-if="l.userRequest"><code>{{ fj(l.userRequest) }}</code></pre><pre v-else-if="l.requestBody"><code>{{ fb(l.requestBody) }}</code></pre><div v-else style="color:#94a3b8">无</div></div>
            <div class="ds"><h4>用户响应</h4><pre v-if="l.userResponse"><code>{{ fb(l.userResponse) }}</code></pre><pre v-else-if="l.responseBody"><code>{{ fb(l.responseBody) }}</code></pre><div v-else style="color:#94a3b8">无</div></div>
          </div></td></tr>
        </template>
      </tbody></table>
      <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无日志</div>
      </div>
      <Pagination :page="page" :total="total" :page-size="ps" @change="load" />
    </div></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { get } from '@/api/client'
import Pagination from '@/components/Pagination.vue'
const logs = ref([]); const page = ref(1); const total = ref(0); const ps = 30
const fl = reactive({ serviceSlug:'', apiKeyName:'', status:'', startTime:'', endTime:'' })
const dateRange = ref(null)
const serviceList = ref([])

watch(dateRange, (val) => {
  if (val) { fl.startTime = val[0]; fl.endTime = val[1] }
  else { fl.startTime = ''; fl.endTime = '' }
})

function sc(c) { if (c>=200&&c<300) return 's2'; if (c>=400&&c<500) return 's4'; if (c>=500) return 's5'; return '' }
function fb(s) { if (!s) return ''; try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s } }
function fj(obj) { if (!obj) return ''; try { return JSON.stringify(obj, null, 2) } catch { return String(obj) } }
async function load(p = 1) {
  page.value = p
  const params = { page: p, pageSize: ps }
  Object.keys(fl).forEach(k => { if (fl[k]) params[k] = fl[k] })
  if (fl.status === 'success') { params.statusCode = '2xx'; delete params.status }
  else if (fl.status === 'fail') { params.statusCode = '4xx,5xx'; delete params.status }
  try { const r = await get('/api/logs', params); logs.value = r.data.data.logs.map(l => ({ ...l, _e: false })); total.value = r.data.data.pagination.total } catch {}
}
function search() { load(1) }
function reset() { Object.keys(fl).forEach(k => fl[k] = ''); dateRange.value = null; search() }
onMounted(() => { load(); loadServices() })
async function loadServices() { try { const r = await get('/api/services'); serviceList.value = r.data.data } catch {} }
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 24px; height: calc(100vh - 60px); display: flex; flex-direction: column; overflow: hidden; }
.pt { font-size: 1.5rem; margin-bottom: 16px; flex-shrink: 0; }
.fb { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; flex-shrink: 0; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.cb { padding: 20px; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.table-wrap { flex: 1; overflow-y: auto; min-height: 0; }
table { width: 100%; border-collapse: collapse; min-width: 850px; }
thead { position: sticky; top: 0; z-index: 1; }
th { background: #fff; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: .85rem; color: #1e293b; }
th { color: #94a3b8; font-weight: 600; font-size: .75rem; }
.time { white-space: nowrap; color: #64748b; font-size: .8rem; }
.path { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Consolas',monospace; }
.key-cell { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748b; }
.mt { font-weight: 600; color: #4f46e5; }
.s2 { color: #10b981; font-weight: 600; }
.s4 { color: #f59e0b; font-weight: 600; }
.s5 { color: #ef4444; font-weight: 600; }
.lr { cursor: pointer; }
.lr:hover { background: #f8fafc; }
.lr.ex { background: #eef2ff; }
.ei { color: #94a3b8; font-size: .7rem; }
.ldr td { padding: 0; }
.ld { padding: 16px 20px; background: #f8fafc; display: flex; flex-direction: column; gap: 14px; }
.ds h4 { font-size: .85rem; color: #475569; margin-bottom: 6px; }
.info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; font-size: .82rem; }
.il { color: #94a3b8; margin-right: 6px; }
pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: .78rem; line-height: 1.5; max-height: 300px; overflow-y: auto; }
code { font-family: 'Consolas',monospace; }
</style>
