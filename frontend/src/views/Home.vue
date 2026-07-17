<template>
  <div class="page home-page">
    <!-- 动态背景 -->
    <div class="bg-anim">
      <div class="bg-blob b1"></div>
      <div class="bg-blob b2"></div>
      <div class="bg-blob b3"></div>
      <div class="bg-grid"></div>
    </div>
    <div class="home-main">
    <section class="hero container">
      <template v-if="siteLoaded">
        <h1 v-if="siteInfo.title">{{ siteInfo.title }}</h1>
        <p>{{ siteInfo.description }}</p>
        <div class="hero-btns">
          <router-link to="/register" class="btn btn-primary btn-lg">免费注册</router-link>
          <router-link to="/docs" class="btn btn-outline btn-lg">查看服务</router-link>
        </div>
      </template>
      <template v-else>
        <div class="sk-title"></div>
        <div class="sk-desc"></div>
        <div class="sk-btn"></div>
      </template>
      <div class="scroll-hint" :class="{ hide: servicesVisible }">
        <span>向下滚动</span>
        <div class="scroll-arrow"></div>
      </div>
    </section>

    <section class="services container" v-if="services.length" :class="{ visible: servicesVisible }">
      <h2>可用服务</h2>
      <div class="service-grid">
        <div class="scard" v-for="(s, i) in services" :key="s.slug" :style="{ transitionDelay: i * 0.06 + 's' }">
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
    </div>

    <footer class="site-footer">
      <div class="container">
        <div class="footer-row">
          <span class="footer-copy">&copy; {{ new Date().getFullYear() }} API Pool Gateway</span>
          <a href="https://github.com/jiuchai/Api-Pool-Gateway" target="_blank" rel="noopener" class="footer-link">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; import { get } from '@/api/client'

const services = ref([])
const servicesVisible = ref(false)
const siteLoaded = ref(false)
const siteInfo = ref({ name: 'API Pool', title: 'API Pool 聚合网关', description: '一站式API服务聚合平台。动态接入压缩、转换、识别等多种API，随时增删服务无需重启' })

onMounted(async () => {
  try { const r = await get('/api/gateway'); services.value = r.data.data } catch {}
  try { const r = await get('/api/site-info'); siteInfo.value = r.data.data } catch {}
  siteLoaded.value = true
})

function onScroll() {
  servicesVisible.value = window.scrollY > 10
}
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }) })
onUnmounted(() => { window.removeEventListener('scroll', onScroll) })
</script>
<style scoped>
.home-page{position:relative;overflow:hidden;min-height:100vh;display:flex;flex-direction:column}
.home-main{flex:1}
.bg-anim{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.bg-blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;animation:float 12s ease-in-out infinite}
.b1{width:500px;height:500px;background:rgba(99,102,241,.15);top:-10%;left:-5%;animation-delay:0s}
.b2{width:400px;height:400px;background:rgba(139,92,246,.12);top:40%;right:-8%;animation-delay:-4s;animation-duration:14s}
.b3{width:350px;height:350px;background:rgba(59,130,246,.1);bottom:-10%;left:30%;animation-delay:-8s;animation-duration:16s}
.bg-grid{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(99,102,241,.06) 1px,transparent 1px);background-size:40px 40px}

@keyframes float{
  0%,100%{transform:translate(0,0) scale(1)}
  25%{transform:translate(30px,-20px) scale(1.05)}
  50%{transform:translate(-20px,30px) scale(.95)}
  75%{transform:translate(-30px,-10px) scale(1.02)}
}

.hero{text-align:center;padding:0 20px;min-height:65vh;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;z-index:1}
.hero h1{font-size:3.8rem;font-weight:800;margin-bottom:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{color:#64748b;font-size:1.2rem;max-width:760px;margin:0 auto 30px;line-height:1.7}
.hero-btns{display:flex;gap:12px;justify-content:center}
.sk-title{width:320px;height:36px;border-radius:6px;margin:0 auto 14px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
.sk-desc{width:460px;height:60px;border-radius:6px;margin:0 auto 30px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
.sk-btn{width:200px;height:44px;border-radius:8px;margin:0 auto;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.scroll-hint{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:#94a3b8;font-size:.78rem;transition:opacity .3s ease;cursor:default}
.scroll-hint.hide{opacity:0;pointer-events:none}
.scroll-arrow{width:24px;height:24px;border-right:2px solid #94a3b8;border-bottom:2px solid #94a3b8;transform:rotate(45deg);animation:scrollBounce 1.5s ease-in-out infinite}
@keyframes scrollBounce{0%,100%{transform:rotate(45deg) translate(0,0)}50%{transform:rotate(45deg) translate(4px,4px)}}
.container{max-width:1200px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
.services{padding-bottom:60px;margin-top:0}.services h2{text-align:center;margin-bottom:32px;font-size:1.5rem;opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease}
.services .service-grid{opacity:0;transform:translateY(40px);transition:opacity .6s ease,transform .6s ease}
.services.visible h2{opacity:1;transform:translateY(0)}
.services.visible .service-grid{opacity:1;transform:translateY(0)}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.scard{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);opacity:0;transform:translateY(30px);transition:opacity .5s ease,transform .5s ease,box-shadow .2s}
.services.visible .scard{opacity:1;transform:translateY(0)}
.scard:hover{transform:translateY(-2px)!important;box-shadow:0 8px 20px rgba(0,0,0,.08)}
.scat{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:8px;background:#eef2ff;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;font-weight:600}
.scard h3{margin-bottom:6px;font-size:1.05rem}.scard p{color:#64748b;font-size:.85rem;line-height:1.5;margin-bottom:14px}
.smeta{display:flex;align-items:center;gap:10px}
.sbadge{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:4px;background:#dbeafe;color:#1e40af}
.sendpoint{font-family:'Consolas',monospace;font-size:.78rem;color:#94a3b8}.home-main{flex:1;padding-bottom:80px}
.site-footer{position:fixed;bottom:0;left:0;right:0;padding:20px 0;border-top:1px solid #e2e8f0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(8px)}
.footer-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.footer-copy{font-size:.82rem;color:#94a3b8}
.footer-link{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;color:#64748b;text-decoration:none;transition:color .15s}
.footer-link:hover{color:#4f46e5}
</style>
