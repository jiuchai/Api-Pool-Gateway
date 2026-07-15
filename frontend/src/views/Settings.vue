<template>
  <div class="page container">
    <h1 class="pt">API Keys</h1>
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between"><h3>密钥列表</h3><button class="btn btn-primary btn-sm" @click="showCreate=true">+ 创建</button></div>
      <div class="cb">
        <table v-if="keys.length"><thead><tr><th>名称</th><th>密钥</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="k in keys" :key="k.id"><td>{{ k.name }}</td><td><code>{{ k.key }}</code> <button class="btn btn-sm btn-outline" @click="copy(k.key)">复制</button></td><td><span :class="['badge',k.disabled?'bd':'bs']">{{ k.disabled?'已禁用':'正常' }}</span></td><td class="acts"><button v-if="!k.disabled" class="btn btn-sm btn-outline" @click="disable(k.id)">禁用</button><button v-else class="btn btn-sm btn-outline" @click="enable(k.id)">启用</button><button class="btn btn-sm btn-warning" @click="regen(k.id)">重新生成</button><button class="btn btn-sm btn-danger" @click="remove(k.id)">删除</button></td></tr></tbody></table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无密钥</div>
      </div>
    </div>
    <div class="modal-overlay" :class="{active:showCreate}" @click.self="showCreate=false">
      <div class="modal"><div class="mh"><h3>创建API Key</h3><button class="btn btn-sm btn-outline" @click="showCreate=false">&times;</button></div>
      <div class="mb"><div class="fg"><label>名称</label><input v-model="newName" class="fc" /></div>
      <div v-if="newKey" style="margin-top:16px"><div style="color:#94a3b8;font-size:.8rem;margin-bottom:4px">新密钥</div><div class="akd"><span>{{ newKey.key }}</span><button class="cb" @click="copy(newKey.key)">复制</button></div></div></div>
      <div class="mf"><button class="btn btn-outline" @click="showCreate=false">关闭</button><button v-if="!newKey" class="btn btn-primary" @click="create">确认</button></div></div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { get, post, put, del } from '@/api/client'; import { useToastStore } from '@/stores/toast'
const toast = useToastStore(); const keys = ref([]); const showCreate = ref(false); const newName = ref(''); const newKey = ref(null)
async function load() { try { const r = await get('/api/keys'); keys.value = r.data.data } catch(e) { toast.error(e.message) } }
async function create() { try { const r = await post('/api/keys',{name:newName.value}); newKey.value = r.data.data; load(); toast.success('已创建') } catch(e) { toast.error(e.message) } }
async function disable(id) { try { await put(`/api/keys/${id}/disable`); toast.success('已禁用'); load() } catch(e) { toast.error(e.message) } }
async function enable(id) { try { await put(`/api/keys/${id}/enable`); toast.success('已启用'); load() } catch(e) { toast.error(e.message) } }
async function regen(id) { try { const r = await post(`/api/keys/${id}/regenerate`); newKey.value = r.data.data; showCreate.value = true; load(); toast.success('已重新生成') } catch(e) { toast.error(e.message) } }
async function remove(id) { if (!confirm('确定删除该密钥？删除后不可恢复。')) return; try { await del(`/api/keys/${id}`); toast.success('已删除'); load() } catch(e) { toast.error(e.message) } }
function copy(t) { navigator.clipboard.writeText(t).then(()=>toast.success('已复制')) }
onMounted(load)
</script>
<style scoped>
.container{max-width:900px;margin:0 auto;padding:24px}.pt{font-size:1.5rem;margin-bottom:20px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9}.ch h3{font-size:1rem}.cb{padding:20px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.82rem;color:#1e293b}th{color:#94a3b8;font-weight:600}code{font-size:.78rem;font-family:'Consolas',monospace;word-break:break-all;background:#f1f5f9;padding:2px 8px;border-radius:4px}
.acts{display:flex;gap:6px}.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
.modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center}.modal-overlay.active{display:flex}
.modal{background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);width:90%;max-width:500px}.mh{padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}.mb{padding:20px}.mf{padding:14px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:8px}
.fg{margin-bottom:14px}.fg label{display:block;margin-bottom:6px;font-weight:500;font-size:.875rem}.fc{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.875rem;background:#fff;color:#1e293b}
.akd{background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-family:'Consolas',monospace;font-size:.85rem;display:flex;align-items:center;gap:10px}.akd span{flex:1;word-break:break-all}.cb{background:rgba(255,255,255,.1);color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:.8rem}
</style>
