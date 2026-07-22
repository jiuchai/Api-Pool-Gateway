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
        <nav v-else class="sk-nav">
          <div class="sk-cat"></div>
          <div class="sk-item" v-for="i in 4" :key="i" :style="{ width: (80 - i * 10) + '%' }"></div>
          <div class="sk-cat"></div>
          <div class="sk-item" v-for="i in 3" :key="i+10" :style="{ width: (75 - i * 10) + '%' }"></div>
        </nav>
      </aside>

      <!-- 右侧内容 -->
      <main class="content">
        <h1 class="pt">服务文档</h1>

        <!-- 认证说明 -->
        <div class="card auth-card">
          <div class="cb">
            <h3 style="margin-bottom:8px">认证方式 & 调用示例</h3>
            <p style="color:#64748b;margin-bottom:12px">所有接口调用需要在请求头中携带 API Key，在 <router-link to="/settings" style="color:#4f46e5">设置 → API Keys</router-link> 中创建和获取。</p>
            <p style="color:#94a3b8;font-size:.8rem;margin-bottom:12px">所有接口统一使用 <strong style="color:#1e293b">POST</strong> 方法，API Key 放在 <strong style="color:#1e293b">Header</strong> 中，参数放在 <strong style="color:#1e293b">Body (JSON)</strong> 中。如需上传文件，使用 <strong style="color:#1e293b">multipart/form-data</strong>。</p>

            <div class="mb-2">
              <div class="curl-label">普通 JSON 请求</div>
              <pre class="auth-pre"><code>curl -X POST {{ baseUrl }}/api/gateway/{slug} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"param1":"value1","param2":"value2"}'</code></pre>
            </div>
            <div class="mb-2">
              <div class="curl-label">文件上传请求</div>
              <pre class="auth-pre"><code>curl -X POST {{ baseUrl }}/api/gateway/{slug} \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@/path/to/file.jpg" \
  -F "to_format=docx"</code></pre>
            </div>
          </div>
        </div>

        <!-- 文件下载说明 -->
        <div class="card auth-card" style="margin-bottom:24px">
          <div class="cb">
            <h3 style="margin-bottom:12px">文件下载 & 保存说明</h3>
            <p style="color:#64748b;margin-bottom:12px">部分服务（如 PDF 转换、文字转语音等）的响应为文件类型，返回格式如下：</p>
            <pre class="auth-pre" style="margin-bottom:12px"><code>{
  "success": true,
  "data": {
    "type": "file",
    "url": "{{ baseUrl }}/api/downloads/xxx.pdf",
    "contentType": "application/pdf",
    "size": 28416
  }
}</code></pre>
            <table style="margin-bottom:12px">
              <thead><tr><th>字段</th><th>说明</th></tr></thead>
              <tbody>
                <tr><td><code>data.type</code></td><td>固定为 <code>"file"</code>，表示响应为文件下载</td></tr>
                <tr><td><code>data.url</code></td><td>文件下载地址，直接访问即可下载</td></tr>
                <tr><td><code>data.contentType</code></td><td>文件的 MIME 类型</td></tr>
                <tr><td><code>data.size</code></td><td>文件大小，单位字节（Bytes）</td></tr>
              </tbody>
            </table>
            <div class="alert-file-info">
              <strong>文件保存时长：30 分钟</strong>。生成的文件会在服务器上保留 <strong>30 分钟</strong>，超时后自动清理删除，请及时下载。
            </div>
          </div>
        </div>

        <div v-if="loading" class="sk-content">
          <div class="sk-card" v-for="i in 2" :key="i">
            <div class="sk-line" style="width:30%;height:20px;margin-bottom:16px"></div>
            <div class="sk-line" style="width:70%;height:14px;margin-bottom:8px"></div>
            <div class="sk-line" style="width:50%;height:14px;margin-bottom:16px"></div>
            <div class="sk-code"></div>
          </div>
        </div>
        <template v-else>
          <div class="card" v-for="(cat, i) in categories" :key="i">
            <div class="cat-title">{{ cat.name || '未分类' }}</div>
            <div :id="s.slug" class="card" v-for="s in cat.services" :key="s.slug" style="margin-bottom:16px;border:1px solid #e2e8f0">
              <div class="ch"><h3>{{ s.name }} <span class="scat">{{ s.category }}</span></h3></div>
              <div class="cb">
                <p style="margin-bottom:16px;color:#64748b">{{ s.description }}</p>
                <div class="ep">
                  <span class="m">POST</span><code>/api/gateway/{{ s.slug }}</code>
                  <span class="ct-tag" :class="s.forwardType === 'form-data' ? 'ct-form' : 'ct-json'">{{ s.forwardType === 'form-data' ? 'multipart/form-data' : 'application/json' }}</span>
                </div>
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
const baseUrl = window.location.origin

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
.sidebar{width:200px;flex-shrink:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;position:sticky;top:84px;max-height:calc(100vh - 108px);overflow-y:auto}
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
.ep{display:flex;align-items:center;margin-bottom:8px;gap:8px}
.ct-tag{font-size:.7rem;font-weight:600;padding:3px 8px;border-radius:4px}
.ct-json{background:#eef2ff;color:#4f46e5}
.ct-form{background:#dbeafe;color:#1e40af}
.auth-card{margin-bottom:24px;border:1px solid #dbeafe;background:#fff}
.auth-pre{margin:0;padding:12px 14px;background:#1e293b;color:#e2e8f0;font-size:.82rem;border-radius:8px}
.auth-pre code{font-family:'Consolas',monospace;background:none;padding:0;font-size:inherit;color:inherit}
.curl-label{padding:5px 12px;background:#f1f5f9;font-size:.75rem;font-weight:600;color:#64748b;border-radius:8px 8px 0 0}
.mb-2{margin-bottom:14px}
.mb-2 .auth-pre{border-radius:0 0 8px 8px}
code{font-family:'Consolas',monospace;font-size:.85rem}
.mt-2{margin-top:16px}h4{font-size:.9rem;margin-bottom:8px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.82rem}th{color:#94a3b8;font-weight:600}td code{background:#eef2ff;font-size:.8rem;padding:2px 6px;border-radius:4px}
pre{background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:.82rem;line-height:1.6;max-height:300px;overflow-y:auto}
pre code{font-family:'Consolas',monospace;background:none;padding:0;font-size:inherit}
.alert-file-info{padding:12px 16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;font-size:.85rem;color:#92400e}
@media(max-width:768px){.docs-layout{flex-direction:column}.sidebar{width:100%;position:static;max-height:none}}
.sk-nav{padding:4px 0}
.sk-cat{height:16px;width:60px;border-radius:4px;margin:10px 0 6px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
.sk-item{height:12px;border-radius:4px;margin-bottom:8px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
.sk-content{display:flex;flex-direction:column;gap:16px}
.sk-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px}
.sk-line{border-radius:4px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
.sk-code{height:120px;border-radius:8px;margin-top:8px;background:linear-gradient(90deg,#cbd5e1 25%,#e2e8f0 50%,#cbd5e1 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>
