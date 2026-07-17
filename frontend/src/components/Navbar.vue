<template>
  <nav class="nav"><div class="nav-inner">
    <router-link to="/" class="brand">{{ siteName }}</router-link>
    <div class="links" :class="{open:mo}" @click="mo=false">
      <router-link to="/docs">文档</router-link>
      <router-link to="/tools">工具中心</router-link>
      <router-link to="/test" class="hl">⚡ 测试</router-link>
      <template v-if="a.isLoggedIn">
        <router-link to="/dashboard">控制台</router-link>
        <router-link to="/settings">API Key</router-link>
        <router-link to="/logs">日志</router-link>
        <router-link to="/plans">套餐</router-link>
        <router-link to="/redeem">兑换</router-link>
        <router-link to="/payment-history">支付记录</router-link>
      </template>
      <template v-if="a.isAdmin">
        <span class="sep">|</span>
        <router-link to="/admin/services" class="al">服务管理</router-link>
        <router-link to="/admin/users" class="al">用户</router-link>
        <router-link to="/admin/logs" class="al">日志</router-link>
        <router-link to="/admin/monitor" class="al">监控</router-link>
        <router-link to="/admin/redeem" class="al">兑换码</router-link>
        <router-link to="/admin/billing" class="al">计费</router-link>
      </template>
    </div>
    <div class="acts">
      <template v-if="a.isLoggedIn">
        <span class="ui"><router-link to="/profile" class="un-link">{{ a.user?.username }}</router-link><span v-if="a.isAdmin" class="rb admin">管理员</span></span>
        <button class="btn btn-sm btn-outline" @click="logout">退出</button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-sm btn-outline">登录</router-link>
        <router-link to="/register" class="btn btn-sm btn-primary">注册</router-link>
      </template>
      <button class="mt" @click="mo=!mo"><span></span><span></span><span></span></button>
    </div>
  </div></nav>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import { useAuthStore } from '@/stores/auth'; import { get } from '@/api/client'
const a = useAuthStore(); const r = useRouter(); const mo = ref(false)
const siteName = ref('API Pool')
onMounted(async () => {
  try { const r = await get('/api/site-info'); siteName.value = r.data.data.name } catch {}
})
function logout() { a.logout(); mo.value = false; r.push('/') }
</script>
<style scoped>
.nav{background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:100}
.nav-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;height:60px;padding:0 24px}
.brand{font-size:1.2rem;font-weight:700;color:#4f46e5;text-decoration:none;flex-shrink:0}
.links{display:flex;align-items:center;gap:4px;margin-left:24px;flex:1}
.links a{color:#64748b;text-decoration:none;padding:6px 12px;border-radius:6px;font-size:.85rem;font-weight:500;transition:all .2s}
.links a:hover,.links a.router-link-active{color:#4f46e5;background:rgba(79,70,229,.07)}
.links a.hl{color:#7c3aed!important;font-weight:600;background:rgba(124,58,237,.07)!important}
.sep{color:#cbd5e1;margin:0 4px}.al{color:#ef4444!important}
.acts{display:flex;align-items:center;gap:10px;flex-shrink:0}
.ui{display:flex;align-items:center;gap:8px;font-size:.85rem}
.un-link{font-weight:600;color:#1e293b;text-decoration:none;cursor:pointer;transition:color .2s}.un-link:hover{color:#4f46e5}.rb{font-size:.65rem;padding:2px 7px;border-radius:10px;background:#4f46e5;color:#fff}.rb.admin{background:#ef4444}
.mt{display:none;flex-direction:column;gap:4px;background:none;border:none;cursor:pointer;padding:4px}
.mt span{width:22px;height:2px;background:#64748b;border-radius:1px}
@media(max-width:900px){.links{display:flex;position:absolute;top:60px;left:0;right:0;background:#fff;flex-direction:column;padding:0 12px;border-bottom:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.08);margin-left:0;gap:2px;max-height:0;overflow:hidden;opacity:0;transition:max-height .3s ease,opacity .25s ease,padding .3s ease}.links.open{max-height:calc(100vh - 70px);overflow-y:auto;padding:12px;opacity:1}.mt{display:flex}}
</style>
