<template>
  <div class="page">
    <div class="docs-layout">
      <!-- 左侧导航 -->
      <aside class="sidebar">
        <h3 class="sidebar-title">服务列表</h3>
        <nav v-if="!loading">
          <template v-for="(cat, i) in categories" :key="i">
            <div class="cat-name">{{ cat.name || '未分类' }}</div>
            <a v-for="s in cat.services" :key="s.slug" :href="'#'+s.slug" :class="['nav-item', { active: activeSlug === s.slug }]" @click.prevent="scrollTo(s.slug)">{{ s.name }}</a>
          </template>
        </nav>
      </aside>

      <!-- 右侧内容 -->
      <main class="content">
        <h1 class="pt">服务文档</h1>
        <div v-if="loading" style="text-align:center;padding:40px;color:#94a3b8">加载中...</div>
        <template v-else>
          <div class="card" v-for="(cat, i) in categories" :key="i">
            <div class="cat-title">{{ cat.name || '未分类' }}</div>
            <div :id="s.slug" class="card" v-for="s in cat.services" :key="s.slug" style="margin-bottom:16px;border:1px solid #e2e8f0">
              <div class="ch"><h3>{{ s.name }} <span class="scat">{{ s.category }}</span></h3></div>
              <div class="cb">
                <p style="margin-bottom:16px;color:#64748b">{{ s.description }}</p>
                <div class="ep"><span class="m">{{ s.method }}</span><code>{{ '/api/gateway/' + s.slug }}</code></div>
                <div v-if="s.params&&s.params.length" class="mt-2">
                  <h4>参数</h4>
                  <table><thead><tr><th>名称</th><th>类型</th><th>必填</th><th>说明</th></tr></thead><tbody><tr v-for="p in s.params" :key="p.name"><td><code>{{ p.name }}</code></td><td>{{ p.type || 'string' }}</td><td>{{ p.required ? '是' : '否' }}</td><td>{{ p.description }}</td></tr></tbody></table>
                </div>
                <div v-if="s.inputExample" class="mt-2">
                  <h4>请求示例</h4>
                  <pre><code>{{ s.inputExample }}</code></pre>
                </div>
                <div v-if="s.outputExample" class="mt-2">
                  <h4>响应示例</h4>
                  <pre><code>{{ s.outputExample }}</code></pre>
                </div>
                <router-link :to="'/test?service='+s.slug" class="btn btn-primary btn-sm" style="margin-top:14px">测试此服务</router-link>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { get } from '@/api/client'

const services = ref([])
const loading = ref(true)
const activeSlug = ref('')

const categories = computed(() => {
  const map = {}
  services.value.forEach(s => {
    const cat = s.category || '未分类'
    if (!map[cat]) map[cat] = []
    map[cat].push(s)
  })
  return Object.entries(map).map(([name, svcs]) => ({ name, services: svcs }))
})

function scrollTo(slug) {
  activeSlug.value = slug
  const el = document.getElementById(slug)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(async () => {
  try { const r = await get('/api/gateway'); services.value = r.data.data } catch {}
  finally { loading.value = false }
})
</script>

<style scoped>
.page{max-width:1300px;margin:0 auto;padding:24px}
.docs-layout{display:flex;gap:24px;align-items:flex-start}
.sidebar{width:200px;flex-shrink:0;position:sticky;top:80px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;max-height:calc(100vh - 100px);overflow-y:auto}
.sidebar-title{font-size:.9rem;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}
.cat-name{font-size:.68rem;color:#4f46e5;background:#eef2ff;letter-spacing:.8px;margin:12px 0 6px;font-weight:700;padding:4px 8px;border-radius:4px;display:inline-block}
.cat-name:first-child{margin-top:0}
.nav-item{display:block;padding:6px 10px;font-size:.82rem;color:#64748b;text-decoration:none;border-radius:6px;transition:all .15s;cursor:pointer}
.nav-item:hover{color:#4f46e5;background:rgba(79,70,229,.06)}
.nav-item.active{color:#4f46e5;background:#eef2ff;font-weight:500}
.content{flex:1;min-width:0}
.pt{font-size:1.5rem;margin-bottom:24px}
.cat-title{font-size:1.05rem;font-weight:700;color:#4f46e5;margin-bottom:14px;padding:8px 14px;background:#eef2ff;border-radius:8px;display:inline-block}
.card{background:#fff;border-radius:10px}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9}.ch h3{font-size:1rem}.cb{padding:20px}
.scat{font-size:.7rem;padding:2px 8px;border-radius:8px;background:#eef2ff;color:#4f46e5;margin-left:8px;vertical-align:middle}
.m{font-size:.7rem;font-weight:700;padding:3px 8px;border-radius:4px;background:#dbeafe;color:#1e40af;margin-right:10px}
.ep{display:flex;align-items:center;margin-bottom:8px}
code{font-family:'Consolas',monospace;font-size:.85rem}
.mt-2{margin-top:16px}h4{font-size:.9rem;margin-bottom:8px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.82rem}th{color:#94a3b8;font-weight:600}td code{background:#eef2ff;font-size:.8rem;padding:2px 6px;border-radius:4px}
pre{background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:.82rem;line-height:1.6;max-height:300px;overflow-y:auto}
pre code{font-family:'Consolas',monospace;background:none;padding:0;font-size:inherit}
@media(max-width:768px){.docs-layout{flex-direction:column}.sidebar{width:100%;position:static;max-height:none}}
</style>
