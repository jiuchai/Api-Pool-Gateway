<template>
  <div class="page">
    <h1 class="pt">工具中心</h1>
    <p class="subtitle">以下是当前网关中注册的所有工具，Agent 可通过 API 获取详情</p>

    <div class="info-card">
      <h3>Agent 使用指南</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">获取工具列表</div>
          <code class="info-code">GET /api/gateway/tools</code>
        </div>
        <div class="info-item">
          <div class="info-label">获取工具详情(JSON)</div>
          <code class="info-code">GET /api/gateway/tools/{slug}</code>
        </div>
        <div class="info-item">
          <div class="info-label">调用工具</div>
          <code class="info-code">POST /api/gateway/{slug}</code>
        </div>
        <div class="info-item">
          <div class="info-label">认证方式</div>
          <code class="info-code">X-API-Key: your-key</code>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <input v-model="search" class="filter-input" placeholder="搜索工具..." />
      <el-select v-model="selectedCategory" placeholder="全部分类" clearable style="width:150px">
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
    </div>

    <div v-if="loading" class="tools-grid">
      <div class="tool-card sk-tool" v-for="i in 6" :key="i">
        <div class="tool-header">
          <div class="sk-line" style="width:40%;height:16px"></div>
          <div class="sk-line" style="width:50px;height:18px;border-radius:6px"></div>
        </div>
        <div class="tool-desc">
          <div class="sk-line" style="width:90%;height:12px;margin-bottom:6px"></div>
          <div class="sk-line" style="width:60%;height:12px"></div>
        </div>
        <div class="tool-endpoint">
          <div class="sk-line" style="width:40px;height:18px;border-radius:4px;flex-shrink:0"></div>
          <div class="sk-line" style="width:50%;height:14px"></div>
        </div>
        <div class="tool-actions" style="display:flex;gap:8px">
          <div class="sk-line" style="width:70px;height:28px;border-radius:6px"></div>
          <div class="sk-line" style="width:90px;height:28px;border-radius:6px"></div>
        </div>
      </div>
    </div>

    <div v-else class="tools-grid">
      <div class="tool-card" v-for="tool in filteredTools" :key="tool.slug">
        <div class="tool-header">
          <h3>{{ tool.name }}</h3>
          <span class="tool-category">{{ tool.category }}</span>
        </div>
        <p class="tool-desc">{{ tool.description }}</p>
        <div class="tool-endpoint">
          <span class="method-badge">POST</span>
          <code>{{ tool.endpoint }}</code>
        </div>
        <div class="tool-actions">
          <router-link :to="'/test?service='+tool.slug" class="btn btn-secondary btn-sm">在线测试</router-link>
          <button class="btn btn-primary btn-sm" @click="copyEndpoint(tool)">复制调用地址</button>
          <a v-if="tool.welcomeUrl" :href="tool.welcomeUrl" target="_blank" class="btn btn-online btn-sm">在线使用</a>
        </div>
      </div>
    </div>

    <div v-if="filteredTools.length === 0" class="empty-state">
      <p>暂无工具，请联系管理员添加</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { get } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const tools = ref([])
const loading = ref(true)
const search = ref('')
const selectedCategory = ref('')

const categories = computed(() => {
  const cats = new Set(tools.value.map(t => t.category))
  return Array.from(cats).sort()
})

const filteredTools = computed(() => {
  return tools.value.filter(t => {
    const matchSearch = !search.value || t.name.toLowerCase().includes(search.value.toLowerCase()) || t.description.toLowerCase().includes(search.value.toLowerCase())
    const matchCategory = !selectedCategory.value || t.category === selectedCategory.value
    return matchSearch && matchCategory
  })
})

async function copyEndpoint(tool) {
  const url = `${window.location.origin}${tool.endpoint}`
  await navigator.clipboard.writeText(url)
  toast.success('已复制调用地址')
}

onMounted(async () => {
  try {
    const r = await get('/api/gateway/tools')
    tools.value = r.data.data
  } catch (e) {
    console.error('Failed to load tools:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page{max-width:1400px;margin:0 auto;padding:24px}
.pt{font-size:1.75rem;margin-bottom:8px}
.subtitle{color:#64748b;font-size:.95rem;margin-bottom:24px}
.info-card{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:12px;padding:20px;margin-bottom:24px;color:#fff}
.info-card h3{font-size:1rem;margin-bottom:16px}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.info-item{background:rgba(255,255,255,.15);border-radius:8px;padding:12px}
.info-label{font-size:.75rem;color:rgba(255,255,255,.8);margin-bottom:6px}
.info-code{font-size:.82rem;font-family:'Consolas',monospace;background:rgba(0,0,0,.2);padding:4px 8px;border-radius:4px;display:block}
.filter-bar{display:flex;gap:12px;margin-bottom:20px}
.filter-input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:.875rem;outline:none}
.filter-input:focus{border-color:#4f46e5}
.tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.tool-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;transition:all .2s}
.tool-card:hover{border-color:#4f46e5;box-shadow:0 4px 20px rgba(79,70,229,.1)}
.tool-header{padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}
.tool-header h3{font-size:1rem;margin:0;color:#1e293b}
.tool-category{font-size:.68rem;padding:3px 8px;border-radius:6px;background:#eef2ff;color:#4f46e5}
.tool-desc{padding:12px 20px 0;margin:0;color:#64748b;font-size:.85rem;line-height:1.5}
.tool-endpoint{padding:10px 20px;display:flex;align-items:center;gap:10px}
.method-badge{font-size:.68rem;font-weight:700;padding:3px 8px;border-radius:4px;background:#dbeafe;color:#1e40af;flex-shrink:0}
.tool-endpoint code{font-size:.8rem;font-family:'Consolas',monospace;color:#475569}
.tool-actions{padding:12px 20px;background:#f8fafc;display:flex;gap:8px;border-top:1px solid #f1f5f9}
.btn{padding:6px 12px;border:none;border-radius:6px;font-size:.8rem;font-weight:500;cursor:pointer;text-decoration:none;transition:all .15s}
.btn-primary{background:#4f46e5;color:#fff}
.btn-primary:hover{background:#4338ca}
.btn-secondary{background:#fff;color:#64748b;border:1px solid #e2e8f0}
.btn-secondary:hover{background:#f1f5f9}
.btn-online{background:#10b981;color:#fff;padding:6px 12px;border:none;border-radius:6px;font-size:.8rem;font-weight:500;cursor:pointer;text-decoration:none;transition:all .15s}
.btn-online:hover{background:#059669}
.empty-state{text-align:center;padding:60px;color:#94a3b8}
.empty-state p{font-size:.95rem}
@media(max-width:768px){
  .tools-grid{grid-template-columns:1fr}
  .info-grid{grid-template-columns:1fr}
  .filter-bar{flex-direction:column}
}
.sk-tool{pointer-events:none}
.sk-line{border-radius:4px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>
