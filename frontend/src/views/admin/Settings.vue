<template>
  <div class="wrap">
    <div class="form-group">
      <label>站点名称（顶部导航栏显示）</label>
      <input v-model="form.siteName" class="input" placeholder="API Pool" />
    </div>
    <div class="form-group">
      <label>首页标题</label>
      <input v-model="form.siteTitle" class="input" placeholder="API Pool 聚合网关" />
    </div>
    <div class="form-group">
      <label>首页描述文字</label>
      <textarea v-model="form.siteDescription" class="input" rows="3" placeholder="一站式API服务聚合平台..." style="resize:vertical"></textarea>
    </div>
    <div class="form-section">
      <div class="section-title">支付配置</div>
      <div class="form-group">
        <label>支付页面地址（用户点击购买后跳转，携带 token 参数）</label>
        <input v-model="form.paymentUrl" class="input" placeholder="https://pay.example.com/checkout" />
      </div>
      <div class="form-group">
        <label>支付通知地址（创建订单时主动通知此地址，POST JSON）</label>
        <input v-model="form.paymentNotifyUrl" class="input" placeholder="https://pay.example.com/api/order-create" />
        <div class="form-hint">服务端会向此地址发送：<code>&#123; token, userId, tierIndex, tierName, amount, durationDays, webhookUrl &#125;</code><br/>支付服务保存后，支付成功时回调 webhookUrl，参数：<code>&#123; secret, token &#125;</code></div>
      </div>
      <div class="form-group">
        <label>支付回调密钥（webhook 验证用）</label>
        <input v-model="form.paymentWebhookSecret" class="input" placeholder="shared-secret-key" />
      </div>
    </div>
    <div class="form-section">
      <div class="section-title">兑换码配置</div>
      <div class="form-group">
        <label>兑换码购买地址（配置后，兑换码页面和套餐页面将显示跳转按钮）</label>
        <input v-model="form.redeemPurchaseUrl" class="input" placeholder="https://shop.example.com/redeem" />
        <div class="form-hint">留空则不在前端显示获取兑换码的入口按钮</div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存设置' }}</button>
    </div>

    <div class="form-section">
      <div class="section-title">系统更新</div>
      <div style="display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap">
        <el-button type="primary" @click="checkUpdate" :loading="checking">
          {{ checking ? '检测中...' : '检查更新' }}
        </el-button>
        <el-button v-if="updateInfo && updateInfo.hasUpdate" type="success" @click="doUpdate" :loading="updating">
          {{ updating ? '更新中...' : '一键更新' }}
        </el-button>
      </div>
      <div v-if="updateInfo" style="margin-top:14px;padding:14px;background:#f8fafc;border-radius:8px;font-size:.85rem;line-height:1.8;text-align:center">
        <template v-if="updateInfo.hasUpdate">
          <div style="color:#4f46e5;font-weight:600;margin-bottom:6px">发现新版本！落后 {{ updateInfo.behind }} 个提交</div>
          <div>当前: <code>{{ updateInfo.local }}</code>（{{ updateInfo.localDate }}）</div>
          <div>最新: <code>{{ updateInfo.remote }}</code>（{{ updateInfo.remoteDate }}）</div>
          <div style="margin-top:6px;color:#64748b" v-if="updateInfo.changelog">
            <div style="font-weight:600;margin-bottom:2px">更新日志:</div>
            <pre style="margin:0;font-size:.8rem;white-space:pre-wrap;text-align:left">{{ updateInfo.changelog }}</pre>
          </div>
        </template>
        <template v-else>
          <div style="color:#16a34a;font-weight:600">已是最新版本</div>
          <div>版本: <code>{{ updateInfo.local }}</code>（{{ updateInfo.localDate }}）</div>
        </template>
      </div>
      <div v-if="updateError" style="margin-top:10px;color:#dc2626;font-size:.85rem">{{ updateError }}</div>
    </div>
  </div>
</template>
<script setup>
// Copyright (c) 2026 jiucai.
import { ref, onMounted } from 'vue'; import { get, put, post } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const form = ref({ siteName: '', siteTitle: '', siteDescription: '' })
const saving = ref(false)
const checking = ref(false)
const updating = ref(false)
const updateInfo = ref(null)
const updateError = ref('')

onMounted(async () => {
  try { const r = await get('/api/admin/settings'); form.value = r.data.data } catch {}
})

async function save() {
  saving.value = true
  try {
    await put('/api/admin/settings', form.value)
    toast.success('保存成功')
  } catch {
    toast.error('保存失败')
  } finally { saving.value = false }
}

async function checkUpdate() {
  checking.value = true; updateError.value = ''
  try {
    const r = await get('/api/admin/check-update')
    updateInfo.value = r.data.data
    if (updateInfo.value.hasUpdate) toast.info('发现新版本！')
    else toast.success('已是最新版本')
  } catch (e) {
    updateError.value = e.message || '检测失败'
  } finally { checking.value = false }
}

async function doUpdate() {
  updating.value = true; updateError.value = ''
  try {
    await post('/api/admin/update')
    toast.success('更新完成，服务正在重启...')
    setTimeout(() => location.reload(), 4000)
  } catch (e) {
    updateError.value = e.message || '更新失败'
    // 服务重启导致连接中断，自动刷新
    if (!e.status || e.status === 0 || e.status >= 500) {
      toast.success('更新完成，即将自动刷新...')
      setTimeout(() => location.reload(), 3000)
    }
  } finally { updating.value = false }
}
</script>
<style scoped>
.wrap{max-width:560px;margin:0 auto;padding-top:10px}
.form-group{margin-bottom:18px}
.form-group label{display:block;font-size:.85rem;font-weight:600;color:#334155;margin-bottom:6px}
.input{width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:.9rem;outline:none;box-sizing:border-box}.input:focus{border-color:#4f46e5}
textarea.input{font-family:inherit}
.form-actions{margin-top:20px;display:flex;align-items:center;justify-content:center;gap:14px}
.form-section{margin-top:28px;padding-top:20px;border-top:1px solid #f1f5f9}
.section-title{font-size:.95rem;font-weight:700;color:#1e293b;margin-bottom:16px}
.form-hint{margin-top:6px;font-size:.75rem;color:#94a3b8;line-height:1.5}
.form-hint code{background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:.72rem}
</style>
