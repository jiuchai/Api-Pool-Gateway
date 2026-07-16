<template>
  <div class="page container">
    <h1 class="pt">兑换码管理</h1>
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between;align-items:center">
        <h3>兑换码列表</h3>
        <div style="display:flex;gap:8px">
          <el-select v-model="statusFilter" placeholder="状态" size="small" clearable style="width:120px" @change="load">
            <el-option label="全部" value="" /><el-option label="启用中" value="active" /><el-option label="已禁用" value="disabled" />
          </el-select>
          <el-input v-model="search" placeholder="搜索代码" size="small" style="width:180px" @keyup.enter="load" clearable @clear="load" />
          <el-button type="primary" size="small" @click="openGen">+ 生成</el-button>
        </div>
      </div>
      <div class="cb">
        <table v-if="codes.length"><thead><tr><th>兑换码</th><th>类型</th><th>套餐</th><th>已用/上限</th><th>过期</th><th>状态</th><th>操作</th></tr></thead><tbody>
          <tr v-for="c in codes" :key="c.id">
            <td><code>{{ c.code }}</code></td>
            <td>{{ c.type === 'tier' ? '套餐' : '金额' }}</td>
            <td>{{ c.tierName || '-' }}</td>
            <td>{{ c.usedCount }}/{{ c.maxUses === -1 ? '∞' : c.maxUses }}</td>
            <td>{{ c.expiresAt || '永不过期' }}</td>
            <td><span :class="['badge',c.disabled?'bd':'bs']">{{ c.disabled?'禁用':'启用' }}</span></td>
            <td class="acts"><el-button size="small" :type="c.disabled?'success':'warning'" @click="toggle(c)">{{ c.disabled?'启用':'禁用' }}</el-button></td>
          </tr>
        </tbody></table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无兑换码</div>
        <Pagination :page="page" :total="total" :page-size="ps" @change="p=>{page=p;load()}" />
      </div>
    </div>

    <el-dialog v-model="showGen" title="生成兑换码" width="500px">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div><label>数量</label><el-input-number v-model="gen.count" :min="1" :max="100" style="width:100%" /></div>
        <el-select v-model="gen.tierIndex" placeholder="选择套餐" style="width:100%">
          <el-option v-for="t in tiers" :key="t.index" :label="t.name + ' (¥' + t.monthlyFee + '/月)'" :value="t.index" />
        </el-select>
        <div><label>使用次数上限</label><el-input-number v-model="gen.maxUses" :min="1" style="width:100%" /><span style="font-size:.75rem;color:#94a3b8">设 -1 表示不限</span></div>
        <el-date-picker v-model="gen.expiresAt" type="datetime" placeholder="过期时间（可选）" style="width:100%" format="YYYY-MM-DD HH:mm" value-format="x" />
      </div>
      <template #footer><el-button @click="showGen=false">取消</el-button><el-button type="primary" @click="generate" :loading="genLoading">生成</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { get, post, put } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import Pagination from '@/components/Pagination.vue'

const toast = useToastStore()
const codes = ref([]); const page = ref(1); const total = ref(0); const ps = 30
const search = ref(''); const statusFilter = ref('')
const showGen = ref(false); const genLoading = ref(false)
const tiers = ref([])
const gen = reactive({ count: 1, tierIndex: 0, maxUses: 1, expiresAt: null })

async function load() {
  try {
    const r = await get('/api/admin/redeem-codes', { page: page.value, pageSize: ps, search: search.value, status: statusFilter.value })
    codes.value = r.data.data.codes; total.value = r.data.data.pagination.total
  } catch {}
}
async function loadTiers() {
  try { const r = await get('/api/billing/tiers'); tiers.value = r.data.data.tiers; if (tiers.value.length) gen.tierIndex = tiers.value[0].index } catch {}
}
async function toggle(c) {
  try { await put(`/api/admin/redeem-codes/${c.id}/disable`, { disabled: !c.disabled }); toast.success(c.disabled ? '已启用' : '已禁用'); load() }
  catch (e) { toast.error(e.message) }
}
function openGen() { gen.count = 1; gen.maxUses = 1; gen.expiresAt = null; showGen.value = true }
async function generate() {
  genLoading.value = true
  try {
    const r = await post('/api/admin/redeem-codes', { ...gen, type: 'tier', expiresAt: gen.expiresAt ? parseInt(gen.expiresAt) : null })
    toast.success(`已生成 ${r.data.data.count} 个兑换码`); showGen.value = false; load()
  } catch (e) { toast.error(e.message) }
  finally { genLoading.value = false }
}
onMounted(() => { load(); loadTiers() })
</script>

<style scoped>
.container{max-width:1200px;margin:0 auto;padding:24px;height:100%;display:flex;flex-direction:column;overflow:hidden}.pt{font-size:1.5rem;margin-bottom:20px;flex-shrink:0}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;flex:1;overflow-y:auto;min-height:0}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}.ch h3{font-size:1rem}.cb{padding:20px}
table{width:100%;border-collapse:collapse}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.85rem;color:#1e293b}th{color:#94a3b8;font-weight:600;font-size:.75rem}code{font-size:.8rem;font-family:'Consolas',monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px}
.acts{display:flex;gap:6px}.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
label{font-weight:500;font-size:.875rem;margin-bottom:4px;display:block}
</style>
