<template>
  <div class="page container">
    <h1 class="page-title">计费管理</h1>
    <div style="flex:1;overflow-y:auto;min-height:0">

    <!-- 汇总 -->
    <div class="stats-grid" v-if="summary">
      <div class="stat-card"><div class="stat-label">活跃用户</div><div class="stat-value">{{ summary.activeUsers }}</div></div>
      <div class="stat-card"><div class="stat-label">总调用次数</div><div class="stat-value">{{ summary.totalCalls }}</div></div>
      <div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value primary">¥{{ summary.totalRevenue }}</div></div>
      <div class="stat-card"><div class="stat-label">统计月份</div><div class="stat-value tier">{{ summary.month }}</div></div>
    </div>

    <!-- 套餐配置 -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header flex-between">
        <h3>套餐配置 <span class="inf">（拖拽调整顺序，-1 表示不限）</span></h3>
        <div style="display:flex;gap:8px">
          <el-button size="small" @click="addTier">+ 添加套餐</el-button>
          <el-button type="primary" size="small" @click="saveTiers" :loading="savingTiers">保存全部</el-button>
        </div>
      </div>
      <div class="card-body" style="overflow-x:auto">
        <table>
          <thead><tr><th style="width:30px"></th><th style="width:90px">名称</th><th style="width:80px">速率(次/秒)</th><th style="width:90px">日上限</th><th style="width:80px">月费(¥)</th><th style="width:120px">描述</th><th style="width:160px">特性（一行一个）</th><th style="width:60px">开售</th><th style="width:60px">操作</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in tierEdit" :key="t._id || i" draggable="true" @dragstart="onDragStart($event, i)" @dragover.prevent @drop="onDrop($event, i)" :class="{ 'drag-over': dragOverIndex === i }">
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

    <!-- 用户消费列表 -->
    <div class="card">
      <div class="card-header flex-between">
        <h3>用户消费明细</h3>
        <el-button size="small" @click="generateBills" :loading="genLoading">生成月度账单</el-button>
      </div>
      <div class="card-body">
        <table v-if="users.length">
          <thead><tr><th>用户名</th><th>当前套餐</th><th>调用次数</th><th>月费</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.userId">
              <td><strong>{{ u.username }}</strong></td>
              <td>{{ u.tierName }}</td>
              <td>{{ u.callCount }}</td>
              <td class="cost">¥{{ u.cost }}</td>
              <td><span :class="['badge', u.disabled ? 'bd' : 'bs']">{{ u.disabled ? '已禁用' : '正常' }}</span></td>
              <td>
                <el-select v-model="tierChanges[u.userId]" size="small" style="width:110px" placeholder="切换套餐" @change="changeTier(u.userId)">
                  <el-option v-for="(t, i) in tierEdit" :key="t._id || i" :label="t.name" :value="i" />
                </el-select>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">暂无数据</div>
        <Pagination :page="page" :total="total" :page-size="ps" @change="loadData" />
      </div>
    </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { get, post, put, del } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import Pagination from '@/components/Pagination.vue'

const toast = useToastStore()
const summary = ref(null)
const users = ref([])
const page = ref(1); const total = ref(0); const ps = 20
const tierEdit = ref([])
const savingTiers = ref(false); const genLoading = ref(false)
const tierChanges = reactive({})
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

async function loadData(p = 1) {
  try {
    page.value = p
    const [statsRes, tiersRes] = await Promise.all([
      get('/api/admin/billing/stats', { page: p, pageSize: ps }),
      get('/api/admin/tiers')
    ])
    summary.value = statsRes.data.data.summary
    users.value = statsRes.data.data.users.records
    total.value = statsRes.data.data.users.total
    tierEdit.value = tiersRes.data.data.map(t => ({
      ...t, featuresStr: (t.features || []).join('\n'), onSale: t.onSale !== undefined ? t.onSale : true
    }))
  } catch (e) { toast.error(e.message) }
}

function addTier() {
  tierEdit.value.push({ name: '新套餐', ratePerSecond: 10, maxCallsPerDay: 100, monthlyFee: 0, description: '', featuresStr: '', onSale: true })
}

async function removeTier(index) {
  const tier = tierEdit.value[index]
  if (tier._id) {
    try {
      await del(`/api/admin/tiers/${tier._id}`)
      toast.success('已删除')
    } catch (e) { toast.error(e.message); return }
  }
  tierEdit.value.splice(index, 1)
}

async function saveTiers() {
  savingTiers.value = true
  try {
    const data = tierEdit.value.map((t, i) => ({
      name: t.name, ratePerSecond: Number(t.ratePerSecond) || 10,
      maxCallsPerDay: t.maxCallsPerDay !== undefined ? Number(t.maxCallsPerDay) : -1,
      monthlyFee: Number(t.monthlyFee) || 0,
      description: t.description || '',
      features: (t.featuresStr || '').split('\n').map(s => s.trim()).filter(Boolean),
      onSale: t.onSale !== undefined ? t.onSale : true,
    }))
    await put('/api/admin/tiers/batch/save', { tiers: data })
    toast.success('套餐配置已保存')
    await loadData(page.value)
  } catch (e) { toast.error(e.message) }
  finally { savingTiers.value = false }
}

async function generateBills() {
  genLoading.value = true
  try {
    const res = await post('/api/admin/billing/generate', {})
    toast.success(res.data.data.message)
  } catch (e) { toast.error(e.message) }
  finally { genLoading.value = false }
}

async function changeTier(userId) {
  try {
    await put(`/api/admin/users/${userId}/tier`, { tierIndex: tierChanges[userId] })
    toast.success('套餐已更改')
    loadData(page.value)
  } catch (e) { toast.error(e.message) }
}

onMounted(() => loadData())
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 24px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.page-title { font-size: 1.5rem; margin-bottom: 24px; flex-shrink: 0; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; text-align: center; display: flex; flex-direction: column; justify-content: center; min-height: 110px; }
.stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
.stat-value { font-size: 1.6rem; font-weight: 700; }
.stat-value.primary { color: #4f46e5; }
.stat-value.tier { font-size: 1.2rem; color: #4f46e5; }
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
</style>
