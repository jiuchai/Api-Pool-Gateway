<template>
  <div class="app-shell">
    <Navbar />
    <main class="main-content">
      <div class="content-wrap"><router-view /></div>
    </main>
    <ToastContainer />
    <!-- 公告弹窗 -->
    <div class="notice-overlay" :class="{ active: showNotice }" @click.self="closeNotice">
      <div class="notice-dialog">
        <div class="notice-header">
          <div class="notice-header-left">
            <span class="notice-icon">📢</span>
            <h3>系统公告</h3>
          </div>
          <button class="notice-close" @click="closeNotice">&times;</button>
        </div>
        <div v-if="noticeList.length > 1" class="notice-tabs">
          <button v-for="(n, i) in noticeList" :key="n.id" class="notice-tab" :class="{ active: noticeTab === i }" @click="noticeTab = i">
            {{ n.title }}
          </button>
        </div>
        <div class="notice-body markdown-body" v-if="noticeList.length" v-html="noticeList[noticeTab].html"></div>
        <div class="notice-footer">
          <span v-if="noticeList.length > 1" class="notice-page">{{ noticeTab + 1 }} / {{ noticeList.length }}</span>
          <button class="btn btn-sm btn-primary" @click="closeNotice">我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { get } from '@/api/client'
import { marked } from 'marked'
import Navbar from './components/Navbar.vue'
import ToastContainer from './components/ToastContainer.vue'

const noticeList = ref([])
const showNotice = ref(false)
const noticeTab = ref(0)
function closeNotice() {
  showNotice.value = false
  const dismissed = JSON.parse(sessionStorage.getItem('dismissed_notices') || '[]')
  noticeList.value.forEach(n => { if (!dismissed.includes(n.id)) dismissed.push(n.id) })
  sessionStorage.setItem('dismissed_notices', JSON.stringify(dismissed))
}
async function loadNotices() {
  try {
    const r = await get('/api/notices')
    const dismissed = JSON.parse(sessionStorage.getItem('dismissed_notices') || '[]')
    const notices = (r.data.data || []).filter(n => !dismissed.includes(n.id || n._id))
    if (notices.length) {
      noticeList.value = notices.map(n => ({ ...n, id: n.id || n._id, html: marked.parse(n.content || '') }))
      showNotice.value = true
    }
  } catch {}
}
onMounted(loadNotices)
</script>
<style>
html,body{height:100%}
#app{min-height:100%}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6}
.app-shell{display:flex;flex-direction:column;min-height:100%}
.main-content{flex:1;display:flex;flex-direction:column}
.content-wrap{flex:1}

/* Element Plus 主题适配 */
:root {
  --el-color-primary: #4f46e5;
  --el-color-primary-light-3: #7370f0;
  --el-color-primary-light-5: #9492f5;
  --el-color-primary-light-7: #b8b6f8;
  --el-color-primary-light-8: #cccaf9;
  --el-color-primary-light-9: #e0defb;
  --el-color-primary-dark-2: #4338ca;
  --el-color-success: #10b981;
  --el-color-warning: #f59e0b;
  --el-color-danger: #ef4444;
  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;
  --el-font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --el-font-size-base: 14px;
}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:.875rem;font-weight:500;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:all .2s}
.btn-primary{background:#4f46e5;color:#fff}.btn-primary:hover{background:#4338ca}
.btn-success{background:#10b981;color:#fff}.btn-danger{background:#ef4444;color:#fff}
.btn-warning{background:#f59e0b;color:#fff}.btn-outline{background:transparent;border-color:#e2e8f0;color:#334155}.btn-outline:hover{border-color:#4f46e5;color:#4f46e5}
.btn-sm{padding:5px 12px;font-size:.8rem}.btn-lg{padding:12px 28px;font-size:1rem}.btn:disabled{opacity:.6;cursor:not-allowed}
.page{animation:fadeIn .2s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
/* 公告弹窗 */
.notice-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:2000;align-items:center;justify-content:center;padding:20px}
.notice-overlay.active{display:flex}
.notice-dialog{background:#fff;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.18);width:100%;max-width:640px;height:70vh;display:flex;flex-direction:column;overflow:hidden}
.notice-header{padding:10px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}
.notice-header-left{display:flex;align-items:center;gap:8px}
.notice-icon{font-size:1.1rem}
.notice-header h3{font-size:.95rem;font-weight:700;color:#fff}
.notice-close{background:none;border:none;color:rgba(255,255,255,.8);font-size:1.3rem;cursor:pointer;padding:0 4px;line-height:1;transition:color .2s}
.notice-close:hover{color:#fff}
.notice-tabs{display:flex;gap:6px;border-bottom:1px solid #e2e8f0;padding:8px 20px;flex-shrink:0;overflow-x:auto;background:#f8fafc}
.notice-tab{flex-shrink:0;padding:6px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;font-size:.78rem;font-weight:500;color:#64748b;cursor:pointer;transition:all .2s;white-space:nowrap}
.notice-tab:hover{color:#4f46e5;border-color:#4f46e5}
.notice-tab.active{background:#4f46e5;color:#fff;border-color:#4f46e5}
.notice-body{flex:1;overflow-y:auto;padding:20px 24px;line-height:1.75;color:#334155}
.notice-footer{padding:14px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.notice-page{font-size:.8rem;color:#94a3b8}
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
