<template>
  <div class="page container">
    <h1 class="page-title">个人中心</h1>

    <div class="profile-grid">
      <!-- 基本信息 -->
      <div class="card">
        <div class="card-header"><h3>基本信息</h3></div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value" v-if="!editing.name">{{ profile?.username || '-' }}</span>
            <div class="info-edit" v-else>
              <el-input v-model="editForm.username" size="small" style="width:180px" placeholder="新用户名" />
              <el-button size="small" type="primary" @click="saveName" :loading="saving.name">保存</el-button>
              <el-button size="small" @click="cancelEdit('name')">取消</el-button>
            </div>
            <el-button v-if="!editing.name" size="small" text type="primary" @click="startEdit('name')">修改</el-button>
          </div>
          <div class="info-row">
            <span class="info-label">邮箱</span>
            <span class="info-value" v-if="!editing.email">{{ profile?.email || '-' }}</span>
            <div class="info-edit" v-else>
              <el-input v-model="editForm.email" size="small" style="width:220px" placeholder="新邮箱" />
              <el-button size="small" type="primary" @click="saveEmail" :loading="saving.email">保存</el-button>
              <el-button size="small" @click="cancelEdit('email')">取消</el-button>
            </div>
            <el-button v-if="!editing.email" size="small" text type="primary" @click="startEdit('email')">修改</el-button>
          </div>
          <div class="info-row">
            <span class="info-label">角色</span>
            <span class="info-value">{{ profile?.role === 'admin' ? '管理员' : '普通用户' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ profile?.createdAt || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="card">
        <div class="card-header"><h3>修改密码</h3></div>
        <div class="card-body">
          <el-form :model="pwForm" label-width="80px" size="small" @submit.prevent="changePassword">
            <el-form-item label="原密码">
              <el-input v-model="pwForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwForm.newPassword" type="password" show-password placeholder="至少8位含大小写字母和数字" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="pwForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="saving.pw">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>

    <!-- 当前套餐 -->
    <div class="card" style="margin-top: 20px" v-if="usage">
      <div class="card-header flex-between">
        <h3>当前套餐</h3>
        <span class="text-muted">{{ usage.currentTier?.name || usage.tier?.name }}</span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">速率</span>
          <span class="info-value">{{ usage.currentTier?.ratePerSecond || usage.tier?.ratePerSecond }} 次/秒</span>
        </div>
        <div class="info-row">
          <span class="info-label">日上限</span>
          <span class="info-value">{{ (usage.currentTier?.maxCallsPerDay ?? usage.tier?.maxCallsPerDay) === -1 ? '不限' : (usage.currentTier?.maxCallsPerDay ?? usage.tier?.maxCallsPerDay).toLocaleString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">今日用量</span>
          <span class="info-value">{{ (usage.todayCalls || 0).toLocaleString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">月费</span>
          <span class="info-value">¥{{ usage.currentTier?.monthlyFee ?? usage.tier?.monthlyFee }}</span>
        </div>
      </div>
      <div v-if="usage.tier?.subscriptions?.length" class="sub-list">
        <div class="sub-list-title">有效订阅</div>
        <div class="sub-item" v-for="s in usage.tier.subscriptions" :key="s.id">
          <span class="sub-name">{{ s.name }}</span>
          <span class="sub-expire">到期：<strong>{{ s.expiresDate }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 支付记录 -->
    <div class="card" style="margin-top: 20px">
      <div class="card-header flex-between">
        <h3>支付记录</h3>
        <span class="text-muted">共 {{ payments.length }} 条</span>
      </div>
      <div class="pay-table-wrap">
        <table v-if="pagedPayments.length">
          <thead><tr><th>时间</th><th>套餐</th><th>金额</th><th>状态</th><th>来源</th></tr></thead>
          <tbody>
            <tr v-for="p in pagedPayments" :key="p.orderId">
              <td class="time">{{ formatTime(p.createdAt) }}</td>
              <td>{{ p.tierName }}</td>
              <td>¥{{ p.amount }}</td>
              <td><span :class="statusClass(p)">{{ statusText(p) }}</span></td>
              <td>{{ p.source === 'redeem' ? '兑换码' : '购买' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="text-muted" style="text-align:center;padding:20px">暂无支付记录</div>
      </div>
      <div class="pay-pager" v-if="totalPages > 1">
        <el-pagination small background layout="prev, pager, next" :total="payments.length" :page-size="payPageSize" v-model:current-page="payPage" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { get, put } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()

const profile = ref(null)
const usage = ref(null)
const payments = ref([])
const payPage = ref(1)
const payPageSize = 10
const editing = reactive({ name: false, email: false })
const saving = reactive({ name: false, email: false, pw: false })
const editForm = reactive({ username: '', email: '' })
const pwForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const totalPages = computed(() => Math.ceil(payments.value.length / payPageSize))
const pagedPayments = computed(() => {
  const start = (payPage.value - 1) * payPageSize
  return payments.value.slice(start, start + payPageSize)
})

function startEdit(field) {
  editing[field] = true
  if (field === 'name') editForm.username = profile.value?.username || ''
  if (field === 'email') editForm.email = profile.value?.email || ''
}
function cancelEdit(field) {
  editing[field] = false
}
async function saveName() {
  if (!editForm.username) { toast.error('用户名不能为空'); return }
  saving.name = true
  try {
    const r = await put('/api/auth/profile', { username: editForm.username })
    profile.value = r.data.data
    auth.user = { ...auth.user, username: r.data.data.username }
    localStorage.setItem('user', JSON.stringify(auth.user))
    editing.name = false
    toast.success('用户名已更新')
  } catch (e) { toast.error(e.message || '修改失败') }
  finally { saving.name = false }
}
async function saveEmail() {
  if (!editForm.email) { toast.error('邮箱不能为空'); return }
  saving.email = true
  try {
    const r = await put('/api/auth/profile', { email: editForm.email })
    profile.value = r.data.data
    auth.user = { ...auth.user, email: r.data.data.email }
    localStorage.setItem('user', JSON.stringify(auth.user))
    editing.email = false
    toast.success('邮箱已更新')
  } catch (e) { toast.error(e.message || '修改失败') }
  finally { saving.email = false }
}
async function changePassword() {
  if (!pwForm.oldPassword) { toast.error('请输入原密码'); return }
  if (!pwForm.newPassword) { toast.error('请输入新密码'); return }
  if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('两次密码输入不一致'); return }
  saving.pw = true
  try {
    await put('/api/auth/password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
    pwForm.oldPassword = ''; pwForm.newPassword = ''; pwForm.confirmPassword = ''
    toast.success('密码已修改，请重新登录')
    setTimeout(() => auth.logout(), 1500)
  } catch (e) { toast.error(e.message || '修改失败') }
  finally { saving.pw = false }
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}
function statusClass(p) {
  if (p.status === 'paid') return 's2'
  if (p.status === 'failed') return 's5'
  if (p.expiresAt && p.expiresAt < Date.now()) return 's5'
  return 's4'
}
function statusText(p) {
  if (p.status === 'paid') return '已支付'
  if (p.status === 'failed') return '失败'
  if (p.expiresAt && p.expiresAt < Date.now()) return '已过期'
  return '待支付'
}

async function load() {
  try {
    const [profileRes, payRes, usageRes] = await Promise.all([
      get('/api/auth/profile'),
      get('/api/billing/payment-history'),
      get('/api/billing/usage'),
    ])
    profile.value = profileRes.data.data
    usage.value = usageRes.data.data
    payments.value = payRes.data.data
  } catch (e) { toast.error(e.message || '加载失败') }
}

onMounted(load)
</script>

<style scoped>
.container { max-width: 1000px; margin: 0 auto; padding: 24px; min-height: calc(100vh - 60px); }
.page-title { font-size: 1.5rem; margin-bottom: 24px; }
.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.card-header h3 { font-size: 1rem; }
.card-body { padding: 20px; }
.info-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc; gap: 12px; }
.info-row:last-child { border-bottom: none; }
.info-label { width: 70px; color: #94a3b8; font-size: .85rem; flex-shrink: 0; }
.info-value { flex: 1; font-weight: 500; font-size: .9rem; }
.info-edit { display: flex; align-items: center; gap: 8px; }
.card-body table { width: 100%; border-collapse: collapse; }
.card-body th, .card-body td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: .82rem; }
.card-body th { color: #94a3b8; font-weight: 600; }
.time { white-space: nowrap; color: #64748b; font-size: .8rem; }
.s2 { color: #10b981; font-weight: 600; }
.s4 { color: #f59e0b; font-weight: 600; }
.s5 { color: #ef4444; font-weight: 600; }
.text-muted { color: #94a3b8; font-size: .8rem; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.sub-list { border-top: 1px solid #f1f5f9; padding: 14px 20px; }
.sub-list-title { font-size: .78rem; color: #94a3b8; margin-bottom: 10px; }
.sub-item { display: flex; align-items: center; gap: 16px; padding: 10px 14px; border-radius: 8px; background: #f8fafc; font-size: .85rem; margin-bottom: 6px; }
.sub-name { font-weight: 600; }
.sub-expire { color: #64748b; }
.sub-expire strong { color: #4f46e5; }
.pay-table-wrap { height: 380px; overflow-y: auto; }
.pay-table-wrap table { width: 100%; border-collapse: collapse; }
.pay-table-wrap th, .pay-table-wrap td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: .82rem; }
.pay-table-wrap th { color: #94a3b8; font-weight: 600; position: sticky; top: 0; background: #fff; z-index: 1; }
.pay-pager { padding: 12px 20px; display: flex; justify-content: center; border-top: 1px solid #f1f5f9; }
</style>
