<template>
  <div class="page container">
    <h1 class="pt">API Keys</h1>
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between"><h3>密钥列表</h3><button class="btn btn-primary btn-sm" @click="showCreate=true">+ 创建</button></div>
      <div class="cb">
        <table v-if="keys.length"><thead><tr><th>名称</th><th>密钥</th><th>已开通服务</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="k in keys" :key="k.id"><td>{{ k.name }}</td><td><code>{{ k.key }}</code> <button class="btn btn-sm btn-outline" @click="copy(k.key)">复制</button></td><td><span class="svc-count" @click="openServices(k)">{{ k.services?.length ? k.services.length + ' 个服务' : '全部服务' }}</span></td><td><span :class="['badge',k.disabled?'bd':'bs']">{{ k.disabled?'已禁用':'正常' }}</span></td><td class="acts"><button class="btn btn-sm btn-primary" @click="openServices(k)">开通服务</button><button class="btn btn-sm btn-success" @click="goTest(k.key)">测试</button><button class="btn btn-sm btn-outline" @click="exportSkill(k.key)">导出SKILL</button><button v-if="!k.disabled" class="btn btn-sm btn-outline" @click="disable(k.id)">禁用</button><button v-else class="btn btn-sm btn-outline" @click="enable(k.id)">启用</button><button class="btn btn-sm btn-warning" @click="regen(k.id)">重新生成</button><button class="btn btn-sm btn-danger" @click="remove(k.id)">删除</button></td></tr></tbody></table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无密钥</div>
      </div>
    </div>
    <div class="modal-overlay" :class="{active:showCreate}" @click.self="showCreate=false">
      <div class="modal"><div class="mh"><h3>创建API Key</h3><button class="btn btn-sm btn-outline" @click="showCreate=false">&times;</button></div>
      <div class="mb"><div class="fg"><label>名称</label><input v-model="newName" class="fc" /></div>
      <div v-if="newKey" style="margin-top:16px"><div style="color:#94a3b8;font-size:.8rem;margin-bottom:4px">新密钥</div><div class="akd"><span>{{ newKey.key }}</span><button class="cb" @click="copy(newKey.key)">复制</button></div></div></div>
      <div class="mf"><button class="btn btn-outline" @click="showCreate=false">关闭</button><button v-if="!newKey" class="btn btn-primary" @click="create">确认</button></div></div>
    </div>

    <!-- 服务选择抽屉 -->
    <el-drawer v-model="drawerVisible" title="开通服务" direction="rtl" size="440px">
      <div class="drawer-body">
        <div class="drawer-tip">勾选该 Key 可以调用的服务</div>
        <div class="drawer-actions">
          <el-button size="small" style="min-width:88px" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</el-button>
        </div>
        <div v-for="[cat, svcs], ci in groupedServices" :key="cat" class="svc-cat-group">
          <div class="svc-cat-title" :style="{ color: catColor(ci).base, background: catColor(ci).light }">{{ cat }}</div>
          <div class="svc-grid">
            <div v-for="s in svcs" :key="s.slug" class="svc-tag"
              :class="{ active: selectedServices.includes(s.slug) }"
              :style="selectedServices.includes(s.slug) ? { borderColor: catColor(ci).base, background: catColor(ci).light, color: catColor(ci).base } : {}"
              @click="toggleSvc(s.slug)">{{ s.name }}</div>
          </div>
        </div>
        <div v-if="!allServices.length" style="text-align:center;color:#94a3b8;padding:30px">暂无可用服务</div>
      </div>
      <template #footer>
        <el-button @click="drawerVisible=false">取消</el-button>
        <el-button type="primary" @click="saveServices" :disabled="!selectedServices.length">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue'; import { get, post, put, del } from '@/api/client'; import { useToastStore } from '@/stores/toast'; import { useRouter } from 'vue-router'
const toast = useToastStore(); const router = useRouter(); const keys = ref([]); const showCreate = ref(false); const newName = ref(''); const newKey = ref(null)
const drawerVisible = ref(false)
const allServices = ref([])
const selectedServices = ref([])
const currentKeyId = ref(null)

// 按分类分组
const groupedServices = computed(() => {
  const map = {}
  for (const s of allServices.value) {
    const cat = s.category || '未分类'
    if (!map[cat]) map[cat] = []
    map[cat].push(s)
  }
  return Object.entries(map)
})

const allSlugs = computed(() => allServices.value.map(s => s.slug))
const allSelected = computed(() => selectedServices.value.length === allServices.value.length)

// 分类配色
const catColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316']
function catColor(idx) { const c = catColors[idx % catColors.length]; return { light: c + '18', mid: c + '30', base: c } }
function selectAll() { selectedServices.value = [...allSlugs.value] }
function deselectAll() { selectedServices.value = [] }
function toggleSelectAll() { if (allSelected.value) deselectAll(); else selectAll() }
function toggleSvc(slug) {
  const idx = selectedServices.value.indexOf(slug)
  if (idx >= 0) selectedServices.value.splice(idx, 1)
  else selectedServices.value.push(slug)
}

async function load() { try { const r = await get('/api/keys'); keys.value = r.data.data } catch(e) { toast.error(e.message) } }
async function loadServices() { try { const r = await get('/api/admin/services'); allServices.value = r.data.data } catch {} }
async function create() { try { const r = await post('/api/keys',{name:newName.value}); newKey.value = r.data.data; load(); toast.success('已创建') } catch(e) { toast.error(e.message) } }
async function disable(id) { try { await put(`/api/keys/${id}/disable`); toast.success('已禁用'); load() } catch(e) { toast.error(e.message) } }
async function enable(id) { try { await put(`/api/keys/${id}/enable`); toast.success('已启用'); load() } catch(e) { toast.error(e.message) } }
async function regen(id) { try { const r = await post(`/api/keys/${id}/regenerate`); newKey.value = r.data.data; showCreate.value = true; load(); toast.success('已重新生成') } catch(e) { toast.error(e.message) } }
async function remove(id) { if (!confirm('确定删除该密钥？删除后不可恢复。')) return; try { await del(`/api/keys/${id}`); toast.success('已删除'); load() } catch(e) { toast.error(e.message) } }
function copy(t) { navigator.clipboard.writeText(t).then(()=>toast.success('已复制')) }
function goTest(key) { router.push({ name: 'Test', query: { apikey: key } }) }
async function exportSkill(key) {
  try {
    const r = await get('/api/skills/template')
    let content = r.data.data
    content = content.replace(/Default: `[^`]+`/, `Default: \`${window.location.origin}/\``)
    content = content.replace(
      "Calling tools requires an API Key. If you don't have one, **ask the user to provide their API Key**.",
      `Calling tools requires an API Key.\n\n> **Default Key:** \`${key}\``
    )
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'SKILL.md'; a.click()
    URL.revokeObjectURL(url); toast.success('已导出 SKILL.md')
  } catch(e) { toast.error('导出失败: ' + e.message) }
}
function openServices(k) {
  currentKeyId.value = k.id
  // 如果 services 为空（全部服务），默认全选
  if (!k.services || k.services.length === 0) {
    selectedServices.value = [...allSlugs.value]
  } else {
    selectedServices.value = [...k.services]
  }
  drawerVisible.value = true
}
async function saveServices() {
  if (!selectedServices.value.length) { toast.error('请至少选择一个服务'); return }
  try {
    await put(`/api/keys/${currentKeyId.value}/services`, { services: selectedServices.value })
    toast.success('已保存')
    drawerVisible.value = false
    load()
  } catch(e) { toast.error(e.message || '保存失败') }
}
onMounted(() => { load(); loadServices() })
</script>
<style scoped>
.container{max-width:1200px;margin:0 auto;padding:24px;height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden}.pt{font-size:1.5rem;margin-bottom:20px;flex-shrink:0}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;flex:1;overflow-y:auto;min-height:0}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9}.ch h3{font-size:1rem}.cb{padding:20px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.82rem;color:#1e293b;vertical-align:top}th{color:#94a3b8;font-weight:600;white-space:nowrap}code{font-size:.75rem;font-family:'Consolas',monospace;word-break:break-all;background:#f1f5f9;padding:2px 6px;border-radius:4px;vertical-align:middle}
.acts{display:flex;gap:4px;flex-wrap:wrap}.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
.cb{overflow-x:auto}
.svc-count{color:#4f46e5;font-size:.82rem;font-weight:500;cursor:pointer;text-decoration:underline}.svc-count:hover{color:#3730a3}
.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center}.modal-overlay.active{display:flex}
.modal{background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);width:90%;max-width:500px}.mh{padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}.mb{padding:20px}.mf{padding:14px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:8px}
.fg{margin-bottom:14px}.fg label{display:block;margin-bottom:6px;font-weight:500;font-size:.875rem}.fc{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.875rem;background:#fff;color:#1e293b}
.akd{background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-family:'Consolas',monospace;font-size:.85rem;display:flex;align-items:center;gap:10px}.akd span{flex:1;word-break:break-all}.cb{background:rgba(255,255,255,.1);color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:.8rem}
.drawer-body{padding:0 4px}
.drawer-tip{font-size:.82rem;color:#94a3b8;margin-bottom:12px}
.drawer-actions{display:flex;gap:8px;margin-bottom:16px}
.svc-cat-group{margin-bottom:16px}
.svc-cat-title{font-size:.75rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;background:#f8fafc;border-radius:6px;margin-bottom:8px}
.svc-grid{display:flex;flex-wrap:wrap;gap:8px}
.svc-tag{padding:6px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:.82rem;font-weight:500;color:#475569;cursor:pointer;user-select:none;transition:all .15s}
.svc-tag:hover{border-color:#cbd5e1;background:#f8fafc}
.svc-tag.active{font-weight:600}
@media(max-width:768px){.container{padding:16px}th,td{font-size:.75rem;padding:6px 8px}code{max-width:120px;font-size:.7rem}.acts{gap:2px}.btn-sm{padding:3px 6px;font-size:.72rem}}
</style>
