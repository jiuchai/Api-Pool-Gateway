<template>
  <div class="page container">
    <section class="hero">
      <h1>API <span class="accent">Pool</span> 聚合网关</h1>
      <p>一站式API服务聚合平台。动态接入压缩、转换、识别等多种API，随时增删服务无需重启</p>
      <div class="hero-btns">
        <router-link to="/register" class="btn btn-primary btn-lg">免费注册</router-link>
        <router-link to="/docs" class="btn btn-outline btn-lg">查看服务</router-link>
      </div>
    </section>

    <section class="services container" v-if="services.length">
      <h2>可用服务</h2>
      <div class="service-grid">
        <div class="scard" v-for="s in services" :key="s.slug">
          <div class="scat">{{ s.category }}</div>
          <h3>{{ s.name }}</h3>
          <p>{{ s.description }}</p>
          <div class="smeta">
            <span class="sbadge">{{ s.method }}</span>
            <span class="sendpoint">/api/gateway/{{ s.slug }}</span>
          </div>
          <router-link :to="'/test?service='+s.slug" class="btn btn-outline btn-sm" style="width:100%;margin-top:12px">立即测试</router-link>
        </div>
      </div>
    </section>
    <div v-else class="container" style="text-align:center;padding:40px;color:#94a3b8">暂无可用服务</div>

    <!-- 公告弹窗 -->
    <div class="notice-overlay" :class="{ active: showNotice }" @click.self="closeNotice">
      <div class="notice-dialog" v-if="currentNotice">
        <div class="notice-header">
          <h3>{{ currentNotice.title }}</h3>
          <button class="btn btn-sm btn-outline" @click="closeNotice">&times;</button>
        </div>
        <div class="notice-body markdown-body" v-html="currentNotice.html"></div>
        <div class="notice-footer" v-if="noticeList.length > 1">
          <span class="notice-dots">
            <span v-for="(n, i) in noticeList" :key="n.id" class="dot" :class="{ active: i === currentIdx }" @click="currentIdx = i"></span>
          </span>
          <button class="btn btn-sm btn-primary" @click="closeNotice">我知道了</button>
        </div>
        <div class="notice-footer" v-else>
          <button class="btn btn-sm btn-primary" @click="closeNotice">我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue'; import { get } from '@/api/client'; import { marked } from 'marked'
const services = ref([])
const noticeList = ref([])
const showNotice = ref(false)
const currentIdx = ref(0)
const currentNotice = computed(() => noticeList.value.length ? noticeList.value[currentIdx.value] : null)
function closeNotice() {
  showNotice.value = false
  const dismissed = JSON.parse(localStorage.getItem('dismissed_notices') || '[]')
  noticeList.value.forEach(n => { if (!dismissed.includes(n.id)) dismissed.push(n.id) })
  localStorage.setItem('dismissed_notices', JSON.stringify(dismissed))
}
onMounted(async () => {
  try { const r = await get('/api/gateway'); services.value = r.data.data } catch {}
  try {
    const r = await get('/api/notices')
    const dismissed = JSON.parse(localStorage.getItem('dismissed_notices') || '[]')
    const notices = (r.data.data || []).filter(n => !dismissed.includes(n.id || n._id))
    if (notices.length) {
      noticeList.value = notices.map(n => ({ ...n, id: n.id || n._id, html: marked.parse(n.content || '') }))
      showNotice.value = true
    }
  } catch {}
})
</script>
<style scoped>
.hero{text-align:center;padding:70px 20px 50px}
.hero h1{font-size:2.4rem;font-weight:800;margin-bottom:14px}.hero .accent{color:#4f46e5}
.hero p{color:#64748b;font-size:1.08rem;max-width:560px;margin:0 auto 30px;line-height:1.7}
.hero-btns{display:flex;gap:12px;justify-content:center}
.container{max-width:1200px;margin:0 auto;padding:0 24px}
.services{padding-bottom:60px}.services h2{text-align:center;margin-bottom:32px;font-size:1.5rem}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.scard{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:transform .2s}
.scard:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
.scat{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:8px;background:#eef2ff;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;font-weight:600}
.scard h3{margin-bottom:6px;font-size:1.05rem}.scard p{color:#64748b;font-size:.85rem;line-height:1.5;margin-bottom:14px}
.smeta{display:flex;align-items:center;gap:10px}
.sbadge{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:4px;background:#dbeafe;color:#1e40af}
.sendpoint{font-family:'Consolas',monospace;font-size:.78rem;color:#94a3b8}

/* 公告弹窗 */
.notice-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:2000;align-items:center;justify-content:center;padding:20px}
.notice-overlay.active{display:flex}
.notice-dialog{background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.2);width:100%;max-width:620px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden}
.notice-header{padding:16px 24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.notice-header h3{font-size:1.1rem;font-weight:700}
.notice-body{flex:1;overflow-y:auto;padding:20px 24px;line-height:1.75;color:#334155}
.notice-footer{padding:14px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.notice-dots{display:flex;gap:6px}
.dot{width:8px;height:8px;border-radius:50%;background:#cbd5e1;cursor:pointer;transition:background .2s}
.dot.active{background:#4f46e5;width:20px;border-radius:4px}

/* markdown 内容样式 */
.markdown-body h1,.markdown-body h2,.markdown-body h3{font-size:1.05rem;font-weight:700;margin:16px 0 8px;color:#1e293b}
.markdown-body h1:first-child,.markdown-body h2:first-child,.markdown-body h3:first-child{margin-top:0}
.markdown-body p{margin:0 0 10px}
.markdown-body ul,.markdown-body ol{padding-left:20px;margin:0 0 10px}
.markdown-body li{margin-bottom:4px}
.markdown-body code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.85rem;font-family:'Consolas',monospace;color:#e11d48}
.markdown-body pre{background:#1e293b;color:#e2e8f0;padding:14px 18px;border-radius:8px;overflow-x:auto;font-size:.82rem;line-height:1.6;margin:0 0 12px}
.markdown-body pre code{background:none;padding:0;color:inherit;font-size:inherit}
.markdown-body a{color:#4f46e5;text-decoration:underline}
.markdown-body blockquote{border-left:3px solid #4f46e5;margin:0 0 10px;padding:4px 14px;color:#64748b;background:#f8fafc}
.markdown-body strong{font-weight:700}
.markdown-body table{width:100%;border-collapse:collapse;margin:0 0 10px}
.markdown-body th,.markdown-body td{padding:6px 10px;border:1px solid #e2e8f0;font-size:.82rem}
.markdown-body th{background:#f8fafc;font-weight:600}
.markdown-body img{max-width:100%;border-radius:6px}
.markdown-body hr{border:none;border-top:1px solid #e2e8f0;margin:14px 0}
</style>
