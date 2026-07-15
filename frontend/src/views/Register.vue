<template>
  <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 60px);background:#f8fafc">
    <el-card class="register-card" shadow="hover">
      <h2 style="margin-bottom:4px">注册</h2><p style="color:#94a3b8;margin-bottom:24px;font-size:.9rem">创建API Pool账号</p>
      <el-form @submit.prevent="go" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="f.username" placeholder="3-30位字母数字下划线" clearable />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="f.email" type="email" placeholder="请输入邮箱" clearable />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="f.password" type="password" placeholder="至少8位含大小写字母和数字" show-password />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="captcha-row">
            <el-input v-model="f.captcha" placeholder="请输入验证码" maxlength="4" autocomplete="off" />
            <div class="captcha-img" @click="loadCaptcha" title="点击刷新" v-html="captchaSvg"></div>
          </div>
        </el-form-item>
        <el-alert v-if="err" :title="err" type="error" show-icon :closable="false" style="margin-bottom:16px" />
        <el-button type="primary" style="width:100%" :loading="ld" @click="go">{{ ld ? '注册中...' : '注册' }}</el-button>
        <p style="text-align:center;margin-top:18px;font-size:.9rem;color:#64748b">已有账号？<router-link to="/login" style="color:#4f46e5;font-weight:500">立即登录</router-link></p>
      </el-form>
    </el-card>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'; import { get } from '@/api/client'
const r = useRouter(); const auth = useAuthStore(); const toast = useToastStore()
const f = ref({ username: '', email: '', password: '', captcha: '', captchaId: '' }); const ld = ref(false); const err = ref(''); const captchaSvg = ref('')

async function loadCaptcha() {
  try { const res = await get('/api/auth/captcha'); f.value.captchaId = res.data.data.captchaId; captchaSvg.value = res.data.data.svg; f.value.captcha = '' }
  catch (e) { err.value = '获取验证码失败' }
}
async function go() { err.value = ''; if (!/^[a-zA-Z0-9_]{3,30}$/.test(f.value.username)) { err.value = '用户名格式不对'; return }; ld.value = true; try { await auth.register(f.value); toast.success('注册成功'); r.push('/dashboard') } catch(e) { err.value = e.message; loadCaptcha() } finally { ld.value = false } }
onMounted(loadCaptcha)
</script>
<style scoped>
.register-card { width: 100%; max-width: 420px; border-radius: 12px; }
.register-card :deep(.el-card__body) { padding: 40px; }
.captcha-row { display: flex; gap: 10px; align-items: center; width: 100%; }
.captcha-row .el-input { flex: 1; }
.captcha-img { cursor: pointer; flex-shrink: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; line-height: 0; transition: border-color .2s; }
.captcha-img:hover { border-color: #4f46e5; }
.captcha-img :deep(svg) { display: block; }
</style>
