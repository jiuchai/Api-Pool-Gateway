<template>
  <div class="page container">
    <h1 class="page-title">计费管理</h1>

    <!-- 汇总数据 -->
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">活跃用户</div><div class="stat-value">{{ summary?.activeUsers ?? '-' }}</div></div>
      <div class="stat-card"><div class="stat-label">总调用次数</div><div class="stat-value">{{ summary?.totalCalls ?? '-' }}</div></div>
      <div class="stat-card"><div class="stat-label">本月收款</div><div class="stat-value primary">¥{{ summary?.totalRevenue ?? '-' }}</div></div>
      <div class="stat-card"><div class="stat-label">统计月份</div><div class="stat-value tier">{{ summary?.month ?? '-' }}</div></div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button :class="['tab', { active: tab === 'tiers' }]" @click="tab = 'tiers'">套餐配置</button>
      <button :class="['tab', { active: tab === 'users' }]" @click="tab = 'users'">消费明细</button>
      <button :class="['tab', { active: tab === 'orders' }]" @click="switchTab('orders')">支付记录</button>
      <button :class="['tab', { active: tab === 'allOrders' }]" @click="switchTab('allOrders')">订单查询</button>
    </div>

    <div class="tab-content">

    <!-- ==================== 套餐配置 ==================== -->
    <div v-show="tab === 'tiers'" class="tab-panel">
      <div class="card fixed-card">
        <div class="card-header flex-between">
          <h3>套餐配置 <span class="inf">（拖拽调整顺序，-1 表示不限）</span></h3>
          <div style="display:flex;gap:8px">
            <el-button size="small" @click="addTier">+ 添加套餐</el-button>
            <el-button type="primary" size="small" @click="saveTiers" :loading="savingTiers">保存全部</el-button>
          </div>
        </div>
        <div class="card-body" style="overflow:auto;flex:1">
          <table>
            <thead><tr><th style="width:30px"></th><th style="width:90px">名称</th><th style="width:80px">速率(次/秒)</th><th style="width:90px">日上限</th><th style="width:80px">月费(¥)</th><th style="width:120px">描述</th><th style="width:160px">特性（一行一个）</th><th style="width:60px">开售</th><th style="width:60px">操作</th></tr></thead>
            <tbody>
              <tr v-for="(t, i) in tierEdit" :key="i" draggable="true" @dragstart="onDragStart($event, i)" @dragover.prevent @drop="onDrop($event, i)" :class="{ 'drag-over': dragOverIndex === i }">
                <td class="drag-handle">&#x2630;</td>
                <td><el-input v-model="t.name" size="small" style="width:90px" /></td>
                <td><el-input-number v-model="t.ratePerSecond" size="small" :min="1" :max="1000" controls-position="right" style="width:85px" /></td>
                <td class="cell-limit"><el-input-number v-model="t.maxCallsPerDay" size="small" :min="-1" :max="99999999" controls-position="right" style="width:85px" /><span v-if="t.maxCallsPerDay === -1" class="tag-inf">不限</span></td>
                <td><el-input-number v-model="t.monthlyFee" size="small" :min="0" :max="99999" :precision="0" controls-position="right" style="width:80px" /></td>
                <td><el-input v-model="t.description" size="small" placeholder="简短描述" style="width:120px" /></td>
                <td><el-input v-model="t.featuresStr" size="small" type="textarea" :rows="2" placeholder="一行一个特性" style="width:160px" /></td>
                <td><el-switch v-model="t.onSale" size="small" /></td>
                <td><el-button size="small" type="danger" :icon="Delete" circle @click="removeTier(i)" :disabled="tierEdit.length <= 1" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 消费明细 ==================== -->
    <div v-show="tab === 'users'" class="tab-panel">
      <div class="card fixed-card">
        <div class="card-header flex-between">
          <h3>用户消费明细</h3>
          <div style="display:flex;gap:8px">
            <el-input v-model="search" size="small" placeholder="搜索用户名" style="width:160px" clearable @clear="loadUsers(1)" @keyup.enter="loadUsers(1)" />
            <el-button size="small" type="primary" @click="loadUsers(1)">搜索</el-button>
            <el-button size="small" @click="generateBills" :loading="genLoading">生成月度账单</el-button>
          </div>
        </div>
        <div class="card-body" style="overflow:auto;flex:1">
          <table v-if="users.length">
            <thead><tr><th>用户名</th><th>当前套餐</th><th>到期时间</th><th>总消费</th><th>当月消费</th><th>调用次数</th><th>月费</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.userId">
                <td><strong>{{ u.username }}</strong></td>
                <td>{{ u.activeTier || u.tierName }}</td>
                <td>
                  <template v-if="u.subscriptions && u.subscriptions.length">
                    <div v-for="(s, si) in u.subscriptions" :key="si" style="font-size:0.8rem;line-height:1.6">
                      <span>{{ s.tierName }}</span>
                      <span style="color:#4f46e5;margin-left:4px">{{ s.expiresDate }}</span>
                    </div>
                  </template>
                  <span v-else style="color:#94a3b8">-</span>
                </td>
                <td class="cost">¥{{ u.totalConsumption || 0 }}</td>
                <td class="cost">¥{{ u.monthConsumption || 0 }}</td>
                <td>{{ u.callCount }}</td>
                <td class="cost">¥{{ u.cost }}</td>
                <td><span :class="['badge', u.disabled ? 'bd' : 'bs']">{{ u.disabled ? '已禁用' : '正常' }}</span></td>
                <td>
                  <el-button size="small" type="primary" @click="openTierDialog(u)">配置套餐</el-button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">暂无数据</div>
          <Pagination :page="page" :total="total" :page-size="ps" @change="loadUsers" />
        </div>
      </div>
    </div>

    <!-- 配置套餐对话框 -->
    <el-dialog v-model="tierDialogVisible" title="配置套餐" width="420px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="用户">
          <span style="font-weight:600">{{ tierDialogUser?.username }}</span>
        </el-form-item>
        <el-form-item label="选择套餐">
          <el-select v-model="tierDialogForm.tierIndex" style="width:100%" placeholder="请选择套餐">
            <el-option v-for="(t, i) in tierEdit" :key="i" :label="t.name + ' (¥' + t.monthlyFee + '/月)'" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker
            v-model="tierDialogForm.expiresAt"
            type="datetime"
            placeholder="选择到期时间"
            value-format="x"
            style="width:100%"
          />
          <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px">不选则默认为当前时间 +30 天</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tierDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTierConfig" :loading="tierDialogSaving">确认配置</el-button>
      </template>
    </el-dialog>
    <div v-show="tab === 'orders'" class="tab-panel">
        <div class="card fixed-card">
          <div class="card-header flex-between">
            <h3>支付记录</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <el-input v-model="orderSearch" size="small" placeholder="用户名" style="width:120px" clearable @clear="loadPayOrders(1)" @keyup.enter="loadPayOrders(1)" />
              <el-input v-model="orderTier" size="small" placeholder="套餐" style="width:100px" clearable @clear="loadPayOrders(1)" @keyup.enter="loadPayOrders(1)" />
              <el-date-picker v-model="orderDateRange" type="daterange" size="small" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px" @change="loadPayOrders(1)" />
              <el-button size="small" type="primary" @click="loadPayOrders(1)">搜索</el-button>
            </div>
          </div>
          <div class="card-body" style="padding:0;overflow:auto;flex:1">
           <table v-if="payOrders.length" class="wide-table">
             <thead><tr><th>订单号</th><th>用户名</th><th>邮箱</th><th>套餐</th><th>金额</th><th>来源</th><th>状态</th><th>时间</th></tr></thead>
             <tbody>
               <tr v-for="o in payOrders" :key="o.orderId">
                 <td class="order-cell" :title="o.orderId">{{ o.orderId }}</td>
                 <td>{{ o.username }}</td>
                 <td>{{ o.email }}</td>
                 <td>{{ o.tierName }}</td>
                 <td>¥{{ o.amount }}</td>
                 <td><span class="source-tag" :class="o.source === 'redeem' ? 'source-redeem' : 'source-pay'">{{ o.source === 'redeem' ? '兑换码' : '支付' }}</span></td>
                 <td><span class="pay-tag" :class="payStatusClass(o)">{{ payStatusText(o) }}</span></td>
                 <td>{{ fmtTime(o.createdAt) }}</td>
               </tr>
             </tbody>
           </table>
           <div v-else class="empty">暂无支付记录</div>
           <Pagination :page="payPage" :total="payTotal" :page-size="payPs" @change="loadPayOrders" />
         </div>
       </div>
     </div>

    <!-- ==================== 订单查询 ==================== -->
    <div v-show="tab === 'allOrders'" class="tab-panel">
        <div class="card fixed-card">
          <div class="card-header flex-between">
            <h3>订单查询</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <el-input v-model="allOrderSearch" size="small" placeholder="用户名" style="width:120px" clearable @clear="loadAllOrders(1)" @keyup.enter="loadAllOrders(1)" />
              <el-select v-model="allOrderStatus" size="small" placeholder="状态" clearable style="width:100px" @change="loadAllOrders(1)">
                <el-option label="已支付" value="paid" /><el-option label="待支付" value="pending" /><el-option label="创建失败" value="failed" />
              </el-select>
              <el-select v-model="allOrderSource" size="small" placeholder="来源" clearable style="width:100px" @change="loadAllOrders(1)">
                <el-option label="支付" value="payment" /><el-option label="兑换码" value="redeem" />
              </el-select>
              <el-date-picker v-model="allOrderDateRange" type="daterange" size="small" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px" @change="loadAllOrders(1)" />
              <el-button size="small" type="primary" @click="loadAllOrders(1)">搜索</el-button>
            </div>
          </div>
          <div class="card-body" style="padding:0;overflow:auto;flex:1">
           <table v-if="allOrders.length" class="wide-table">
             <thead><tr><th>订单号</th><th>用户名</th><th>邮箱</th><th>套餐</th><th>金额</th><th>来源</th><th>状态</th><th>时间</th></tr></thead>
             <tbody>
               <tr v-for="o in allOrders" :key="o.orderId">
                 <td class="order-cell" :title="o.orderId">{{ o.orderId }}</td>
                 <td>{{ o.username }}</td>
                 <td>{{ o.email }}</td>
                 <td>{{ o.tierName }}</td>
                 <td>¥{{ o.amount }}</td>
                 <td><span class="source-tag" :class="o.source === 'redeem' ? 'source-redeem' : 'source-pay'">{{ o.source === 'redeem' ? '兑换码' : '支付' }}</span></td>
                 <td><span class="pay-tag" :class="payStatusClass(o)">{{ payStatusText(o) }}</span></td>
                 <td>{{ fmtTime(o.createdAt) }}</td>
               </tr>
             </tbody>
           </table>
           <div v-else class="empty">暂无订单</div>
           <Pagination :page="allOrderPage" :total="allOrderTotal" :page-size="allOrderPs" @change="loadAllOrders" />
         </div>
       </div>
     </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { get, post, put, del } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import Pagination from '@/components/Pagination.vue'

const toast = useToastStore()
const tab = ref('tiers')
const summary = ref(null)
const users = ref([])
const page = ref(1); const total = ref(0); const ps = 20
const search = ref('')
const payOrders = ref([])
const payPage = ref(1); const payTotal = ref(0); const payPs = 20
const orderSearch = ref('')
const orderTier = ref('')
const orderDateRange = ref([])
const allOrders = ref([])
const allOrderPage = ref(1); const allOrderTotal = ref(0); const allOrderPs = 20
const allOrderSearch = ref('')
const allOrderStatus = ref('')
const allOrderSource = ref('')
const allOrderDateRange = ref([])
const tierEdit = ref([])
const savingTiers = ref(false); const genLoading = ref(false)
const tierDialogVisible = ref(false)
const tierDialogUser = ref(null)
const tierDialogSaving = ref(false)
const tierDialogForm = ref({ tierIndex: null, expiresAt: null })
const dragFromIndex = ref(-1)
const dragOverIndex = ref(-1)

function onDragStart(e, index) { dragFromIndex.value = index; e.dataTransfer.effectAllowed = 'move' }
function onDrop(e, toIndex) {
  dragOverIndex.value = -1;
  if (dragFromIndex.value < 0 || dragFromIndex.value === toIndex) return;
  const item = tierEdit.value.splice(dragFromIndex.value, 1)[0];
  tierEdit.value.splice(toIndex, 0, item);
  dragFromIndex.value = -1;
}

async function loadUsers(p = 1) {
  try {
    page.value = p
    const params = { page: p, pageSize: ps }
    if (search.value) params.search = search.value
    const res = await get('/api/admin/billing/stats', params)
    summary.value = res.data.data.summary
    users.value = res.data.data.users.records
    total.value = res.data.data.users.total
  } catch (e) { toast.error(e.message) }
}

async function loadTiers() {
  try {
    const res = await get('/api/admin/tiers')
    tierEdit.value = res.data.data.map(t => ({
      ...t, featuresStr: (t.features || []).join('\n'), onSale: t.onSale !== undefined ? t.onSale : true
    }))
  } catch {}
}

function addTier() {
  tierEdit.value.push({ name: '新套餐', ratePerSecond: 10, maxCallsPerDay: 100, monthlyFee: 0, description: '', featuresStr: '', onSale: true })
}

async function removeTier(index) {
  const tier = tierEdit.value[index]
  if (tier._id) {
    try { await del(`/api/admin/tiers/${tier._id}`); toast.success('已删除') } catch (e) { toast.error(e.message); return }
  }
  tierEdit.value.splice(index, 1)
}

async function saveTiers() {
  savingTiers.value = true
  try {
    const data = tierEdit.value.map(t => ({
      name: t.name, ratePerSecond: Number(t.ratePerSecond) || 10,
      maxCallsPerDay: t.maxCallsPerDay !== undefined ? Number(t.maxCallsPerDay) : -1,
      monthlyFee: Number(t.monthlyFee) || 0,
      description: t.description || '',
      features: (t.featuresStr || '').split('\n').map(s => s.trim()).filter(Boolean),
      onSale: t.onSale !== undefined ? t.onSale : true,
    }))
    await put('/api/admin/tiers/batch/save', { tiers: data })
    toast.success('套餐配置已保存')
    await loadTiers()
  } catch (e) { toast.error(e.message) }
  finally { savingTiers.value = false }
}

async function generateBills() {
  genLoading.value = true
  try { const res = await post('/api/admin/billing/generate', {}); toast.success(res.data.data.message) } catch (e) { toast.error(e.message) }
  finally { genLoading.value = false }
}

function openTierDialog(user) {
  tierDialogUser.value = user
  tierDialogForm.value = { tierIndex: user.tierIndex, expiresAt: null }
  tierDialogVisible.value = true
}

async function submitTierConfig() {
  if (tierDialogForm.value.tierIndex === null) {
    toast.error('请选择套餐')
    return
  }
  tierDialogSaving.value = true
  try {
    const body = { tierIndex: tierDialogForm.value.tierIndex }
    if (tierDialogForm.value.expiresAt) {
      body.expiresAt = tierDialogForm.value.expiresAt
    } else {
      body.durationDays = 30
    }
    await post(`/api/admin/users/${tierDialogUser.value.userId}/subscription`, body)
    toast.success('套餐配置成功')
    tierDialogVisible.value = false
    loadUsers(page.value)
  } catch (e) { toast.error(e.message) }
  finally { tierDialogSaving.value = false }
}

async function loadPayOrders(p = 1) {
  try {
    payPage.value = p
    const params = { page: p, pageSize: payPs, status: 'paid' }
    if (orderSearch.value) params.search = orderSearch.value
    if (orderTier.value) params.tierName = orderTier.value
    if (orderDateRange.value?.length === 2) {
      params.startDate = orderDateRange.value[0]
      params.endDate = orderDateRange.value[1]
    }
    const res = await get('/api/admin/payment-orders', params)
    payOrders.value = res.data.data.orders
    payTotal.value = res.data.data.total
  } catch {}
}

async function loadAllOrders(p = 1) {
  try {
    allOrderPage.value = p
    const params = { page: p, pageSize: allOrderPs }
    if (allOrderSearch.value) params.search = allOrderSearch.value
    if (allOrderStatus.value) params.status = allOrderStatus.value
    if (allOrderSource.value) params.source = allOrderSource.value
    if (allOrderDateRange.value?.length === 2) {
      params.startDate = allOrderDateRange.value[0]
      params.endDate = allOrderDateRange.value[1]
    }
    const res = await get('/api/admin/payment-orders', params)
    allOrders.value = res.data.data.orders
    allOrderTotal.value = res.data.data.total
  } catch {}
}

function switchTab(t) {
  tab.value = t
  if (t === 'orders') loadPayOrders(1)
  if (t === 'allOrders') loadAllOrders(1)
}

function payStatusClass(o) {
  if (o.status === 'paid') return 'pay-success'
  if (o.status === 'failed') return 'pay-fail'
  if (o.expiresAt < Date.now()) return 'pay-expired'
  return 'pay-pending'
}
function payStatusText(o) {
  if (o.status === 'paid') return '已支付'
  if (o.status === 'failed') return '创建失败'
  if (o.expiresAt < Date.now()) return '已过期'
  return '待支付'
}
function fmtTime(ts) { const d = new Date(ts); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` }

onMounted(() => { loadTiers(); loadUsers(); loadPayOrders() })
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 24px; min-height: calc(100vh - 60px); display: flex; flex-direction: column; }
.page-title { font-size: 1.5rem; margin-bottom: 20px; flex-shrink: 0; }
.tab-bar { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; flex-shrink: 0; }
.tab { padding: 10px 24px; font-size: .9rem; border: none; background: none; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .15s; }
.tab:hover { color: #1e293b; }
.tab.active { color: #4f46e5; border-bottom-color: #4f46e5; font-weight: 600; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; flex-shrink: 0; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-height: 90px; }
.stat-label { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
.stat-value { font-size: 1.5rem; font-weight: 700; }
.stat-value.primary { color: #4f46e5; }
.stat-value.tier { font-size: 1.1rem; color: #4f46e5; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.card-header { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
.card-header h3 { font-size: 1rem; }
.card-body { padding: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #1e293b; }
th { color: #94a3b8; font-weight: 600; font-size: 0.75rem; }
.cost { font-weight: 700; color: #4f46e5; }
.badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.bs { background: #d1fae5; color: #065f46; }
.bd { background: #fee2e2; color: #991b1b; }
.empty { text-align: center; padding: 40px; color: #94a3b8; }
.inf { font-size: .75rem; color: #94a3b8; margin-left: 4px; }
.tag-inf { display: inline-block; margin-left: 6px; font-size: .7rem; padding: 1px 6px; border-radius: 4px; background: #eef2ff; color: #4f46e5; font-weight: 600; }
.cell-limit { white-space: nowrap; }
.drag-handle { cursor: grab; color: #94a3b8; font-size: 1rem; text-align: center; user-select: none; }
.drag-handle:active { cursor: grabbing; }
tr.drag-over { background: #eef2ff; }
tr[draggable]:hover { background: #f8fafc; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.wide-table { min-width: 100%; border-collapse: collapse; white-space: nowrap; }
.order-cell { font-family: 'Consolas', monospace; font-size: .8rem; }
.pay-tag { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: .72rem; font-weight: 600; }
.pay-success { background: #dcfce7; color: #166534; }
.pay-fail { background: #fee2e2; color: #991b1b; }
.pay-expired { background: #fef3c7; color: #92400e; }
.pay-pending { background: #e0e7ff; color: #3730a3; }
.source-tag { display: inline-block; padding: 2px 8px; border-radius: 8px; font-size: .72rem; font-weight: 600; }
.source-redeem { background: #f3e8ff; color: #6b21a8; }
.source-pay { background: #dbeafe; color: #1e40af; }
.tab-panel { height: 100%; display: flex; flex-direction: column; }
.fixed-card { display: flex; flex-direction: column; height: 100%; }
.tab-content { height: calc(100vh - 400px); min-height: 400px; }
.card-body { padding: 20px; }
.card-body table { min-width: 600px; }
</style>
