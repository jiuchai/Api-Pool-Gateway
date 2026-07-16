<template>
  <div class="page home-page">
    <!-- 动态背景 -->
    <div class="bg-anim">
      <div class="bg-blob b1"></div>
      <div class="bg-blob b2"></div>
      <div class="bg-blob b3"></div>
      <div class="bg-grid"></div>
    </div>
    <section class="hero container">
      <h1 v-if="siteInfo.title">{{ siteInfo.title }}</h1>
      <p>{{ siteInfo.description }}</p>
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
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { get } from '@/api/client'

const services = ref([])
const siteInfo = ref({ name: 'API Pool', title: 'API Pool 聚合网关', description: '一站式API服务聚合平台。动态接入压缩、转换、识别等多种API，随时增删服务无需重启' })

onMounted(async () => {
  try { const r = await get('/api/gateway'); services.value = r.data.data } catch {}
  try { const r = await get('/api/site-info'); siteInfo.value = r.data.data } catch {}
})
</script>
<style scoped>
.home-page{position:relative;overflow:hidden}
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

.hero{text-align:center;padding:70px 20px 50px;position:relative;z-index:1}
.hero h1{font-size:2.4rem;font-weight:800;margin-bottom:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{color:#64748b;font-size:1.08rem;max-width:560px;margin:0 auto 30px;line-height:1.7}
.hero-btns{display:flex;gap:12px;justify-content:center}
.container{max-width:1200px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
.services{padding-bottom:60px}.services h2{text-align:center;margin-bottom:32px;font-size:1.5rem}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.scard{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:transform .2s}
.scard:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.08)}
.scat{display:inline-block;font-size:.7rem;padding:2px 8px;border-radius:8px;background:#eef2ff;color:#4f46e5;margin-bottom:10px;text-transform:uppercase;font-weight:600}
.scard h3{margin-bottom:6px;font-size:1.05rem}.scard p{color:#64748b;font-size:.85rem;line-height:1.5;margin-bottom:14px}
.smeta{display:flex;align-items:center;gap:10px}
.sbadge{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:4px;background:#dbeafe;color:#1e40af}
.sendpoint{font-family:'Consolas',monospace;font-size:.78rem;color:#94a3b8}
</style>
