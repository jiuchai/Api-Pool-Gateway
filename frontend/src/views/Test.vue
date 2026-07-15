<template>
  <div class="page container">
    <h1 class="pt">接口测试</h1>
    <div class="tl">
      <div class="card rc">
        <div class="ch"><h3>请求</h3></div>
        <div class="cb">
          <div class="fg"><label>服务</label><el-select v-model="slug" style="width:100%" placeholder="选择服务" @change="loadInfo"><el-option v-for="s in services" :key="s.slug" :label="s.name" :value="s.slug" /></el-select></div>
          <div class="fg"><label>API Key</label><el-input v-model="apiKey" placeholder="在设置中获取" /></div>
          <div v-if="slug" class="ct-hint" :class="forwardType === 'form-data' ? 'ct-form' : 'ct-json'">
            Content-Type: <strong>{{ forwardType === 'form-data' ? 'multipart/form-data' : 'application/json' }}</strong>
          </div>
          <div class="fg" v-for="p in serviceParams" :key="p.name">
            <label>{{ p.name }} <span v-if="p.required" class="rq">*</span></label>
            <div v-if="p.type === 'file'" class="file-upload-cell">
              <input v-show="false" type="file" :ref="el => fileInputRefs[p.name] = el" @change="handleFileSelect($event, p.name)" :accept="p.accept" :multiple="isMultipleFile(p)" />
              <el-button size="small" @click="fileInputRefs[p.name]?.click()">
                <el-icon><upload-filled /></el-icon>
                选择文件
              </el-button>
              <span v-if="selectedFiles[p.name]" class="file-name-count">
                {{ isMultipleFile(p) ? selectedFiles[p.name].length + ' 个文件' : selectedFiles[p.name].name }}
              </span>
              <el-button v-if="selectedFiles[p.name]" size="small" type="danger" plain @click="clearFiles(p.name)">清除</el-button>
            </div>
            <el-input v-else v-model="params[p.name]" :placeholder="p.description" />
          </div>
          <el-button type="primary" style="width:100%" @click="send" :loading="loading">{{ loading ? '请求中...' : '发送请求' }}</el-button>
        </div>
      </div>
      <div class="card rpc">
        <div class="ch" style="display:flex;justify-content:space-between"><h3>响应</h3><span v-if="rt" class="badge badge-info">{{ rt }}ms</span></div>
        <div class="cb">
          <div v-if="!resp&&!loading&&!err" style="text-align:center;padding:40px;color:#94a3b8">点击发送查看结果</div>
          <div v-if="loading" style="text-align:center;padding:40px;color:#94a3b8">请求中...</div>
          <div v-if="err" class="alert alert-error">{{ err }}</div>
          <div v-if="resp"><pre><code>{{ JSON.stringify(resp,null,2) }}</code></pre></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive } from 'vue'; import { get } from '@/api/client'; import { useRoute } from 'vue-router'; import { useToastStore } from '@/stores/toast'; import { UploadFilled } from '@element-plus/icons-vue'
const toast = useToastStore(); const route = useRoute()
const services = ref([]); const slug = ref(''); const apiKey = ref(''); const params = ref({}); const selectedFiles = reactive({}); const serviceParams = ref([]); const resp = ref(null); const rt = ref(0); const loading = ref(false); const err = ref(''); const forwardType = ref('json'); const fileInputRefs = reactive({})

function isMultipleFile(p) { return p.type === 'file' && (p.multiple || p.type.includes('list')) }
onMounted(async () => { try { const r = await get('/api/gateway'); services.value = r.data.data } catch {}; if (route.query.service) { slug.value = route.query.service; loadInfo() }; if (route.query.apikey) { apiKey.value = route.query.apikey } })
async function loadInfo() {
  if (!slug.value) { serviceParams.value = []; forwardType.value = 'json'; return }
  try {
    const svc = services.value.find(s => s.slug === slug.value)
    const r = await get(`/api/gateway/${slug.value}/info`); serviceParams.value = r.data.data.params || []; params.value = {}; Object.keys(selectedFiles).forEach(k => delete selectedFiles[k])
    // 自动识别：有 file 参数就默认 form-data
    const hasFileParams = serviceParams.value.some(p => p.type === 'file' || p.type === 'file list')
    forwardType.value = svc?.forwardType || (hasFileParams ? 'form-data' : 'json')
  }
  catch { serviceParams.value = []; forwardType.value = 'json' }
}
function handleFileSelect(event, paramName) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    if (isMultipleFile(serviceParams.value.find(p => p.name === paramName))) {
      selectedFiles[paramName] = files;
    } else {
      selectedFiles[paramName] = files[0];
    }
  } else {
    delete selectedFiles[paramName];
  }
}
function clearFiles(paramName) {
  delete selectedFiles[paramName];
}
async function send() {
  err.value = ''; resp.value = null; rt.value = 0
  if (!slug.value || !apiKey.value) { err.value = '请选择服务并填写API Key'; return }
  loading.value = true; const start = Date.now()
  try {
    const hasFiles = Object.keys(selectedFiles).length > 0;
    const useFormData = hasFiles || forwardType.value === 'form-data';
    const url = `/api/gateway/${slug.value}`;
    
    if (useFormData) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(params.value)) {
        if (val !== undefined && val !== null && val !== '') {
          formData.append(key, val);
        }
      }
      for (const [key, files] of Object.entries(selectedFiles)) {
        if (Array.isArray(files)) {
          files.forEach(file => formData.append(key, file));
        } else {
          formData.append(key, files);
        }
      }
      
      const res = await fetch(url, { method: 'POST', headers: { 'X-API-Key': apiKey.value }, body: formData })
      rt.value = Date.now() - start; const text = await res.text()
      try { resp.value = JSON.parse(text) } catch { resp.value = { success: false, error: '响应格式异常', raw: text.substring(0,300) } }
      if (resp.value?.success) toast.success('请求成功')
    } else {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.value }, body: JSON.stringify(params.value) })
      rt.value = Date.now() - start; const text = await res.text()
      try { resp.value = JSON.parse(text) } catch { resp.value = { success: false, error: '响应格式异常', raw: text.substring(0,300) } }
      if (resp.value?.success) toast.success('请求成功')
    }
  } catch(e) { rt.value = Date.now() - start; err.value = '请求失败: ' + e.message }
  finally { loading.value = false }
}
</script>
<style scoped>
.container{max-width:1200px;margin:0 auto;padding:24px}.pt{font-size:1.5rem;margin-bottom:20px}
.tl{display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:stretch}@media(max-width:750px){.tl{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9;flex-shrink:0}.ch h3{font-size:1rem}
.cb{padding:20px;flex:1;overflow:auto}.fg{margin-bottom:14px}.fg label{display:block;margin-bottom:6px;font-weight:500;font-size:.875rem}
.fc{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:.875rem;outline:none;background:#fff}.fc:focus{border-color:#4f46e5}
.file-upload-cell{display:flex;align-items:center;gap:8px}
.file-name-count{font-size:.82rem;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rq{color:#ef4444}.badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.badge-info{background:#dbeafe;color:#1e40af}
.ct-hint{padding:8px 12px;border-radius:6px;font-size:.78rem;margin-bottom:14px}
.ct-json{background:#eef2ff;color:#4f46e5}
.ct-form{background:#dbeafe;color:#1e40af}
.alert{padding:10px 14px;border-radius:8px;font-size:.85rem}.alert-error{background:#fee2e2;color:#991b1b}
pre{background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-size:.82rem;line-height:1.6;max-height:600px;overflow-y:auto;white-space:pre;word-break:normal}
code{font-family:'Consolas',monospace}
</style>
