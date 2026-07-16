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
    <div class="form-actions">
      <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存设置' }}</button>
      <span v-if="msg" class="toast" :class="msgType">{{ msg }}</span>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { get, put } from '@/api/client'

const form = ref({ siteName: '', siteTitle: '', siteDescription: '' })
const saving = ref(false)
const msg = ref('')
const msgType = ref('success')

onMounted(async () => {
  try { const r = await get('/api/admin/settings'); form.value = r.data.data } catch {}
})

async function save() {
  saving.value = true; msg.value = ''
  try {
    await put('/api/admin/settings', form.value)
    msg.value = '保存成功'; msgType.value = 'success'
  } catch {
    msg.value = '保存失败'; msgType.value = 'error'
  } finally { saving.value = false; setTimeout(() => msg.value = '', 3000) }
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
.toast{font-size:.85rem}.success{color:#166534}.error{color:#991b1b}
</style>
