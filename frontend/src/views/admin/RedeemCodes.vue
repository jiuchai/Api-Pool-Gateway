<template>
  <div class="page container">
    <h1 class="pt">兑换码管理</h1>
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3>兑换码列表</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <el-select v-model="statusFilter" placeholder="状态" size="small" clearable style="width:100px" @change="load(1)">
            <el-option label="全部" value="" /><el-option label="启用中" value="active" /><el-option label="已禁用" value="disabled" />
          </el-select>
          <el-input v-model="search" placeholder="搜索代码或批次名" size="small" style="width:180px" @keyup.enter="load(1)" clearable @clear="load(1)" />
          <el-button size="small" @click="load(1)">搜索</el-button>
          <el-button type="primary" size="small" @click="openGen">+ 生成</el-button>
          <el-button type="danger" size="small" @click="batchDelete" :loading="delLoading" :disabled="!selectedIds.length">批量删除（{{ selectedIds.length }}）</el-button>
        </div>
      </div>
      <div class="cb">
        <table v-if="codes.length">
          <thead><tr>
            <th style="width:36px"><el-checkbox v-model="selectAll" @change="onSelectAll" /></th>
            <th>兑换码</th><th>批次名</th><th>类型</th><th>套餐</th><th>已用/上限</th><th>过期</th><th>状态</th><th>操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="c in codes" :key="c.id">
              <td><el-checkbox :model-value="selectedIds.includes(c.id)" @change="toggleSelect(c.id)" /></td>
              <td><code>{{ c.code }}</code></td>
              <td>{{ c.batchName || '-' }}</td>
              <td>{{ c.type === 'tier' ? '套餐' : '金额' }}</td>
              <td>{{ c.tierName || '-' }}</td>
              <td>{{ c.usedCount }}/{{ c.maxUses === -1 ? '∞' : c.maxUses }}</td>
              <td>{{ c.expiresAt || '永不过期' }}</td>
              <td><span :class="['badge',c.disabled?'bd':'bs']">{{ c.disabled?'禁用':'启用' }}</span></td>
              <td class="acts"><el-button size="small" @click="copyCode(c.code)">复制</el-button><el-button size="small" :type="c.disabled?'success':'warning'" @click="toggle(c)">{{ c.disabled?'启用':'禁用' }}</el-button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无兑换码</div>
      </div>
      <div class="cf"><Pagination :page="page" :total="total" :page-size="ps" @change="p=>{page=p;load()}" /></div>
    </div>

    <!-- 生成对话框 -->
    <el-dialog v-model="showGen" title="生成兑换码" width="500px" :close-on-click-modal="false">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div><label>批次名称（可选）</label><el-input v-model="gen.batchName" placeholder="如：618活动批次" /></div>
        <div><label>数量</label><el-input-number v-model="gen.count" :min="1" :max="100" style="width:100%" /></div>
        <el-select v-model="gen.tierIndex" placeholder="选择套餐" style="width:100%">
          <el-option v-for="t in tiers" :key="t.index" :label="t.name + ' (¥' + t.monthlyFee + '/月)'" :value="t.index" />
        </el-select>
        <div><label>使用次数上限</label><el-input-number v-model="gen.maxUses" :min="-1" style="width:100%" /><span style="font-size:.75rem;color:#94a3b8">设 -1 表示不限</span></div>
        <el-date-picker v-model="gen.expiresAt" type="datetime" placeholder="过期时间（可选）" style="width:100%" format="YYYY-MM-DD HH:mm" value-format="x" />
      </div>
      <template #footer><el-button @click="showGen=false">取消</el-button><el-button type="primary" @click="generate" :loading="genLoading">生成</el-button></template>
    </el-dialog>

    <!-- 生成结果对话框 -->
    <el-dialog v-model="showResult" title="生成结果" width="520px" :close-on-click-modal="false">
      <div v-if="genResult.length" style="max-height:350px;overflow-y:auto">
        <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.85rem;color:#64748b">共 {{ genResult.length }} 个兑换码</span>
          <div style="display:flex;gap:6px">
            <el-button size="small" @click="copyAllCodes">一键复制全部</el-button>
            <el-button size="small" type="primary" @click="exportTxt(genResult)">导出 TXT</el-button>
          </div>
        </div>
        <div v-for="c in genResult" :key="c" class="result-code-row">
          <code>{{ c }}</code>
          <el-button size="small" text @click="copyCode(c)">复制</el-button>
        </div>
      </div>
      <template #footer><el-button type="primary" @click="showResult=false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
// Copyright (c) 2026 jiucai.
import { ref, onMounted, reactive, computed } from 'vue'
import { get, post, put, del } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import Pagination from '@/components/Pagination.vue'

const toast = useToastStore()
const codes = ref([]); const page = ref(1); const total = ref(0); const ps = 30
const search = ref(''); const statusFilter = ref('')
const showGen = ref(false); const genLoading = ref(false); const delLoading = ref(false)
const showResult = ref(false); const genResult = ref([])
const tiers = ref([])
const selectedIds = ref([])
const gen = reactive({ count: 1, tierIndex: 0, maxUses: 1, expiresAt: null, batchName: '' })

const selectAll = computed({
  get: () => codes.value.length > 0 && selectedIds.value.length === codes.value.length,
  set: () => {},
})

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}
function onSelectAll(val) {
  if (val) selectedIds.value = codes.value.map(c => c.id)
  else selectedIds.value = []
}

async function load(p) {
  if (p) page.value = p
  selectedIds.value = []
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
function openGen() { gen.count = 1; gen.maxUses = 1; gen.expiresAt = null; gen.batchName = ''; showGen.value = true }
async function generate() {
  genLoading.value = true
  try {
    const r = await post('/api/admin/redeem-codes', { ...gen, type: 'tier', expiresAt: gen.expiresAt ? parseInt(gen.expiresAt) : null })
    genResult.value = r.data.data.codes.map(c => c.code)
    showGen.value = false; showResult.value = true; load()
    toast.success(`已生成 ${r.data.data.count} 个兑换码`)
  } catch (e) { toast.error(e.message) }
  finally { genLoading.value = false }
}
async function batchDelete() {
  if (!selectedIds.value.length) return
  delLoading.value = true
  try {
    await del('/api/admin/redeem-codes', { ids: selectedIds.value })
    toast.success(`已删除 ${selectedIds.value.length} 个兑换码`)
    selectedIds.value = []
    load()
  } catch (e) { toast.error(e.message) }
  finally { delLoading.value = false }
}
async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('已复制')
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    toast.success('已复制')
  }
}
function copyAllCodes() {
  copyCode(genResult.value.join('\n'))
}
function exportTxt(codesArr) {
  const text = codesArr.join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `兑换码_${new Date().toISOString().slice(0,10)}.txt`
  a.click(); URL.revokeObjectURL(url)
}
onMounted(() => { load(); loadTiers() })
</script>

<style scoped>
.container{max-width:1200px;margin:0 auto;padding:24px;height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden}.pt{font-size:1.5rem;margin-bottom:20px;flex-shrink:0}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}.ch h3{font-size:1rem}.cb{padding:20px 20px 0;overflow-y:auto;flex:1}.cf{padding:12px 20px;border-top:1px solid #f1f5f9;flex-shrink:0;display:flex;justify-content:center}
table{width:100%;border-collapse:collapse}th,td{padding:0 14px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.85rem;color:#1e293b;vertical-align:middle;height:40px}th{color:#94a3b8;font-weight:600;font-size:.75rem}code{font-size:.8rem;font-family:'Consolas',monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px}
.acts{display:flex;gap:6px;white-space:nowrap;align-items:center}.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
label{font-weight:500;font-size:.875rem;margin-bottom:4px;display:block}
.result-code-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9}
.result-code-row:last-child{border-bottom:none}
.result-code-row code{font-size:.82rem;font-family:'Consolas',monospace;background:#f1f5f9;padding:3px 8px;border-radius:4px}
</style>
