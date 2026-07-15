<template>
  <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 60px);background:#f8fafc">
    <div class="ac" style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);width:100%;max-width:420px">
      <h2 style="margin-bottom:4px">登录</h2><p style="color:#94a3b8;margin-bottom:24px;font-size:.9rem">访问API Pool控制台</p>
      <form @submit.prevent="go">
        <div class="fg"><label>用户名或邮箱</label><input v-model="f.username" class="fc" required /></div>
        <div class="fg"><label>密码</label><input v-model="f.password" type="password" class="fc" required /></div>
        <div class="fg">
          <label>验证码</label>
          <div class="captcha-row">
            <input v-model="f.captcha" class="fc" style="flex:1" placeholder="请输入验证码" required maxlength="4" autocomplete="off" />
            <div class="captcha-img" @click="loadCaptcha" title="点击刷新" v-html="captchaSvg"></div>
          </div>
        </div>
        <div v-if="err" class="alert alert-error">{{ err }}</div>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;border-radius:8px" :disabled="ld">{{ ld?'登录中...':'登录' }}</button>
        <p style="text-align:center;margin-top:18px;font-size:.9rem;color:#64748b">没有账号？<router-link to="/register" style="color:#4f46e5;font-weight:500">立即注册</router-link></p>
      </form>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'; import { get } from '@/api/client'
const r = useRouter(); const route = useRoute(); const auth = useAuthStore(); const toast = useToastStore()
const f = ref({ username: '', password: '', captcha: '', captchaId: '' }); const ld = ref(false); const err = ref(''); const captchaSvg = ref('')

async function loadCaptcha() {
  try { const res = await get('/api/auth/captcha'); f.value.captchaId = res.data.data.captchaId; captchaSvg.value = res.data.data.svg; f.value.captcha = '' }
  catch (e) { err.value = '获取验证码失败' }
}
async function go() { err.value = ''; ld.value = true; try { await auth.login(f.value); toast.success('登录成功'); r.push(route.query.redirect || '/dashboard') } catch(e) { err.value = e.message; loadCaptcha() } finally { ld.value = false } }
onMounted(loadCaptcha)
</script>
<style scoped>
.fg{margin-bottom:16px}.fg label{display:block;margin-bottom:6px;font-weight:500;font-size:.875rem}
.fc{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.875rem;outline:none;background:#fff}.fc:focus{border-color:#4f46e5}
.captcha-row{display:flex;gap:10px;align-items:center}
.captcha-img{cursor:pointer;flex-shrink:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;line-height:0;transition:border-color .2s}
.captcha-img:hover{border-color:#4f46e5}
.captcha-img :deep(svg){display:block}
.alert{padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:.85rem}.alert-error{background:#fee2e2;color:#991b1b}
</style>
