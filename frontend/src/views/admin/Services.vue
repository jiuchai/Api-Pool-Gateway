<template>
  <div class="page container">
    <h1 class="pt">服务管理</h1>
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between"><h3>已注册服务</h3><el-button type="primary" size="small" @click="openCreate">+ 添加服务</el-button></div>
      <div class="cb">
        <table v-if="services.length"><thead><tr><th>名称</th><th>标识</th><th>分类</th><th>方法</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="s in services" :key="s._id"><td><strong>{{ s.name }}</strong></td><td><code>{{ s.slug }}</code></td><td>{{ s.category }}</td><td><span class="mb">{{ s.method }}</span></td><td><span :class="['badge',s.enabled?'bs':'bd']">{{ s.enabled?'启用':'禁用' }}</span></td><td class="acts"><el-button size="small" @click="editService(s)">编辑</el-button><el-button size="small" :type="s.enabled?'warning':'success'" @click="toggle(s)">{{ s.enabled?'禁用':'启用' }}</el-button><el-button size="small" type="danger" @click="deleteService(s.slug)">删除</el-button></td></tr></tbody></table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无服务，请添加</div>
      </div>
    </div>
    <!-- 编辑弹窗 -->
    <el-dialog v-model="show" :title="editing?'编辑服务':'添加服务'" width="750px" destroy-on-close>
      <div class="mb">
        <div class="fg"><label>服务名称</label><el-input v-model="form.name" placeholder="例如：图片压缩" /></div>
        <div class="row2">
          <div class="fg"><label>标识 (英文)</label><el-input v-model="form.slug" :disabled="editing" placeholder="例如：img-compress" /></div>
          <div class="fg"><label>分类</label><el-input v-model="form.category" placeholder="image / audio / text / video" /></div>
        </div>
        <div class="fg"><label>描述</label><el-input v-model="form.description" type="textarea" :rows="2" placeholder="此服务的功能说明" /></div>
        <div class="row2">
          <div class="fg"><label>目标URL</label><el-input v-model="form.targetUrl" placeholder="https://api.example.com/endpoint" /></div>
          <div class="fg"><label>请求方法</label><el-select v-model="form.method" style="width:100%"><el-option value="POST" /><el-option value="GET" /><el-option value="PUT" /></el-select></div>
        </div>
        <div class="fg" style="margin-top:16px">
          <label>转发Headers <span class="hlp">（支持 &#123;&#123;参数名&#125;&#125; 模板）</span></label>
          <CodeEditor v-model="form.forwardHeadersJson" :placeholder="headersPH" @update:model-value="syncParams" />
        </div>
        <div class="fg" style="margin-top:16px">
          <label>请求体模板 <span class="hlp">（用 &#123;&#123;参数名&#125;&#125; 占位，下方自动识别参数）</span></label>
          <CodeEditor v-model="form.bodyTemplate" :placeholder="bodyPH" @update:model-value="syncParams" />
        </div>

        <!-- 参数表单（始终显示） -->
        <div class="params-section">
          <label style="font-weight:500;font-size:.875rem;margin-bottom:10px;display:block">请求参数 <span class="hlp">（从模板自动识别，也可手动添加）</span></label>
          <div v-if="!form.params.length" style="color:#94a3b8;font-size:.82rem;margin-bottom:8px">暂无参数，请手动添加或在模板中使用 &#123;&#123;参数名&#125;&#125; 占位符</div>
          <div class="param-row" v-for="(p,i) in form.params" :key="i">
            <el-tag type="primary" class="p-tag">{{ p.name }}</el-tag>
            <el-select v-model="p.type" style="width:100px" filterable allow-create clearable placeholder="类型">
              <el-option value="string" /><el-option value="number" /><el-option value="boolean" /><el-option value="file" /><el-option value="list" /><el-option value="file list" />
            </el-select>
            <el-checkbox v-model="p.required">必填</el-checkbox>
            <el-input v-model="p.description" placeholder="参数说明" class="p-desc" />
            <el-button :icon="Delete" circle size="small" type="danger" plain class="p-del" @click="form.params.splice(i,1)" />
          </div>
          <div class="param-row">
            <el-input v-model="newParam.name" placeholder="参数名" style="width:110px" />
            <el-select disabled style="width:100px"><el-option value="string" /></el-select>
            <span style="width:54px"></span>
            <el-input v-model="newParam.desc" placeholder="说明" class="p-desc" />
            <el-button size="small" type="primary" plain class="p-add" @click="addParam">+</el-button>
          </div>
        </div>

        <div class="fg" style="margin-top:16px">
          <label>请求示例 <span class="hlp">（展示在文档页面）</span></label>
          <CodeEditor v-model="form.inputExample" placeholder='{"uuid":"示例值","user_url":"https://..."}' />
        </div>
        <div class="fg" style="margin-top:16px">
          <label>响应示例 <span class="hlp">（展示在文档页面）</span></label>
          <CodeEditor v-model="form.outputExample" placeholder='{"code":0,"data":{"result":"..."}}' />
        </div>
      </div>
      <template #footer>
        <el-button @click="show=false">取消</el-button>
        <el-button type="primary" @click="save">{{ editing?'保存':'创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { get, post, put, del } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import CodeEditor from '@/components/CodeEditor.vue'
const toast = useToastStore()
const services = ref([])
const show = ref(false)
const editing = ref(false)
const form = ref({ name:'',slug:'',category:'',description:'',targetUrl:'',method:'POST',bodyTemplate:'',forwardHeadersJson:'',params:[],inputExample:'',outputExample:'' })
const newParam = reactive({ name:'',desc:'' })
const headersPH = '{"Authorization":"Bearer {{token}}"}'
const bodyPH = '{\n  "uuid": "{{uuid}}",\n  "image": { "url": "{{user_url}}" }\n}'

function extractParams(template) {
  if (!template) return []
  const seen = new Set()
  const matches = template.matchAll(/\{\{(\w+)\}\}/g)
  const result = []
  for (const m of matches) { if (!seen.has(m[1])) { seen.add(m[1]); result.push({ name:m[1], type:'string', required:true, description:'' }) } }
  return result
}
function syncParams() {
  const bodyParams = extractParams(form.value.bodyTemplate)
  const headerParams = extractParams(form.value.forwardHeadersJson)
  const seen = new Set(); const merged = []
  for (const p of [...bodyParams, ...headerParams]) { if (!seen.has(p.name)) { seen.add(p.name); merged.push(p) } }
  const existing = {}; form.value.params.forEach(p => { existing[p.name] = p })
  form.value.params = merged.map(p => ({ ...p, ...(existing[p.name] || {}) }))
}
function addParam() {
  if (!newParam.name) return
  form.value.params.push({ name:newParam.name, type:'string', required:false, description:newParam.desc })
  newParam.name = ''; newParam.desc = ''
}
async function load() { try { const r = await get('/api/admin/services'); services.value = r.data.data } catch {} }
function openCreate() { editing.value = false; form.value = { name:'',slug:'',category:'',description:'',targetUrl:'',method:'POST',bodyTemplate:'',forwardHeadersJson:'',params:[],inputExample:'',outputExample:'' }; show.value = true }
function editService(s) {
  editing.value = true
  form.value = { name:s.name, slug:s.slug, category:s.category||'', description:s.description||'', targetUrl:s.targetUrl||'', method:s.method||'POST', bodyTemplate:s.bodyTemplate||'', forwardHeadersJson: s.forwardHeaders ? JSON.stringify(s.forwardHeaders) : '', params: s.params || [], inputExample: s.inputExample || '', outputExample: s.outputExample || '' }
  show.value = true
}
async function save() {
  const data = { name:form.value.name, slug:form.value.slug, category:form.value.category, description:form.value.description, targetUrl:form.value.targetUrl, method:form.value.method, params:form.value.params, inputExample: form.value.inputExample, outputExample: form.value.outputExample }
  if (form.value.bodyTemplate.trim()) data.bodyTemplate = form.value.bodyTemplate
  try { data.forwardHeaders = JSON.parse(form.value.forwardHeadersJson); } catch { if (form.value.forwardHeadersJson.trim()) { toast.error('Headers JSON 格式错误'); return } }
  try {
    if (editing.value) { await put(`/api/admin/services/${form.value.slug}`, data); toast.success('已更新') }
    else { await post('/api/admin/services', data); toast.success('已创建') }
    show.value = false; load()
  } catch(e) { toast.error(e.message) }
}
async function toggle(s) {
  try { await put(`/api/admin/services/${s.slug}`, { enabled: !s.enabled }); toast.success(s.enabled?'已禁用':'已启用'); load() }
  catch(e) { toast.error(e.message) }
}
async function deleteService(slug) { if (!confirm('确定删除？')) return; try { await del(`/api/admin/services/${slug}`); toast.success('已删除'); load() } catch(e) { toast.error(e.message) } }
onMounted(load)
</script>

<style scoped>
.container{max-width:1200px;margin:0 auto;padding:24px}.pt{font-size:1.5rem;margin-bottom:20px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px}.ch{padding:14px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center}.ch h3{font-size:1rem}.cb{padding:20px}
table{width:100%;border-collapse:collapse}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:.85rem;color:#1e293b}th{color:#94a3b8;font-weight:600;font-size:.75rem}code{font-size:.8rem;font-family:'Consolas',monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px}
.acts{display:flex;gap:6px}.mb{font-weight:600;color:#4f46e5;font-size:.75rem}.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:600}.bs{background:#d1fae5;color:#065f46}.bd{background:#fee2e2;color:#991b1b}
.mb{padding:0}.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fg{margin-bottom:14px}.fg label{display:block;margin-bottom:6px;font-weight:500;font-size:.875rem}
.hlp{font-weight:400;color:#94a3b8;font-size:.78rem}
.params-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px}
.param-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.param-row:last-child{margin-bottom:0}
.p-tag{width:110px;text-align:center;display:inline-flex;justify-content:center}
.p-desc{flex:1;min-width:120px}
.p-del,.p-add{width:32px;height:32px;padding:0}
</style>
