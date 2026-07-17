<template>
  <div class="page container">
    <h1 class="pt">用户管理</h1>
    <div class="fb"><input v-model="search" class="fi" placeholder="搜索" @keyup.enter="load(1)" /><button class="btn btn-primary btn-sm" @click="load(1)">查询</button></div>
    <div class="card"><div class="cb">
      <table v-if="users.length"><thead><tr><th>用户名</th><th>邮箱</th><th>角色</th><th>Key数量</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="u in users" :key="u.id"><td><strong>{{ u.username }}</strong></td><td>{{ u.email }}</td><td><span class="badge" :class="u.role==='admin'?'bd':'bi'">{{ u.role==='admin'?'管理员':'用户' }}</span></td><td>{{ u.keyCount }}</td><td><span :class="['badge',u.disabled?'bd':'bs']">{{ u.disabled?'已禁用':'正常' }}</span></td><td class="actions"><button class="btn btn-sm" :class="u.disabled?'btn-success':'btn-danger'" @click="tgl(u)">{{ u.disabled?'启用':'禁用' }}</button><button class="btn btn-sm btn-outline" @click="openReset(u)">重置密码</button></td></tr></tbody></table>
      <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无用户</div>
      <Pagination :page="page" :total="total" :page-size="ps" @change="load" />
    </div></div>

    <el-dialog v-model="resetVisible" title="重置密码" width="400px" :close-on-click-modal="false">
      <el-form label-width="80px" size="small">
        <el-form-item label="用户">{{ resetUser?.username }}</el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetPw" type="password" show-password placeholder="至少8位含大小写字母和数字" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" @click="doReset" :loading="resetting">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { get, put, post } from '@/api/client'; import { useToastStore } from '@/stores/toast'; import Pagination from '@/components/Pagination.vue'
const toast = useToastStore(); const users = ref([]); const page = ref(1); const total = ref(0); const ps = 20; const search = ref('')
async function load(p=1){page.value=p;try{const r=await get('/api/admin/users',{page:p,pageSize:ps,search:search.value});users.value=r.data.data.users;total.value=r.data.data.pagination.total}catch{}}
async function tgl(u){try{await put(`/api/admin/users/${u.id}`,{disabled:!u.disabled});toast.success(u.disabled?'已启用':'已禁用');load(page.value)}catch(e){toast.error(e.message)}}

const resetVisible = ref(false)
const resetUser = ref(null)
const resetPw = ref('')
const resetting = ref(false)
function openReset(u) { resetUser.value = u; resetPw.value = ''; resetVisible.value = true }
async function doReset() {
  if (!resetPw.value) { toast.error('请输入新密码'); return }
  resetting.value = true
  try {
    await post(`/api/admin/users/${resetUser.value.id}/reset-password`, { newPassword: resetPw.value })
    toast.success(`${resetUser.value.username} 密码已重置`)
    resetVisible.value = false
  } catch (e) { toast.error(e.message || '重置失败') }
  finally { resetting.value = false }
}
onMounted(()=>load())
</script>
<style scoped>
.container{max-width:1000px;margin:0 auto;padding:24px;height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden}.pt{font-size:1.5rem;margin-bottom:16px;flex-shrink:0}.fb{display:flex;gap:8px;margin-bottom:16px;flex-shrink:0}.fi{width:200px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;flex:1;overflow-y:auto;min-height:0}.cb{padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.85rem}th{color:#94a3b8;font-weight:600;font-size:.75rem}
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bi{background:#dbeafe;color:#1e40af}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
.actions{white-space:nowrap;display:flex;gap:6px}
</style>
