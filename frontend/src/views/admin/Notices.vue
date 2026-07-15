<template>
  <div class="notice-manage">
    <div class="card">
      <div class="ch" style="display:flex;justify-content:space-between">
        <h3>公告列表</h3>
        <el-button type="primary" size="small" @click="openCreate">+ 发布公告</el-button>
      </div>
      <div class="cb">
        <table v-if="notices.length">
          <thead><tr><th style="width:60px">置顶</th><th>标题</th><th>内容摘要</th><th style="width:80px">状态</th><th>时间</th><th style="width:160px">操作</th></tr></thead>
          <tbody>
            <tr v-for="n in notices" :key="n.id">
              <td><el-switch v-model="n.pinned" @change="saveToggle(n)" /></td>
              <td><strong>{{ n.title }}</strong></td>
              <td class="notice-summary">{{ n.content }}</td>
              <td><el-switch v-model="n.published" active-text="发布" inactive-text="草稿" inline-prompt @change="saveToggle(n)" /></td>
              <td class="time">{{ n.createdAt }}</td>
              <td class="acts">
                <el-button size="small" @click="editNotice(n)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteNotice(n.id)">删除</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else style="text-align:center;padding:30px;color:#94a3b8">暂无公告</div>
      </div>
    </div>

    <el-dialog v-model="show" :title="editing ? '编辑公告' : '发布公告'" width="650px" destroy-on-close>
      <div class="fg"><label>标题</label><el-input v-model="form.title" placeholder="公告标题" /></div>
      <div class="fg"><label>内容</label><el-input v-model="form.content" type="textarea" :rows="6" placeholder="公告内容" /></div>
      <div class="fg" style="display:flex;gap:24px">
        <el-checkbox v-model="form.published">立即发布</el-checkbox>
        <el-checkbox v-model="form.pinned">置顶</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="show=false">取消</el-button>
        <el-button type="primary" @click="save">{{ editing ? '保存' : '发布' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { get, post, put, del } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const notices = ref([])
const show = ref(false)
const editing = ref(false)
const form = ref({ title: '', content: '', published: true, pinned: false })
const currentId = ref(null)

async function load() {
  try {
    const r = await get('/api/admin/notices')
    notices.value = r.data.data.notices
  } catch (e) { toast.error(e.message) }
}

function openCreate() {
  editing.value = false
  currentId.value = null
  form.value = { title: '', content: '', published: true, pinned: false }
  show.value = true
}

function editNotice(n) {
  editing.value = true
  currentId.value = n.id
  form.value = { title: n.title, content: n.content, published: n.published, pinned: n.pinned }
  show.value = true
}

async function save() {
  try {
    if (editing.value) {
      await put(`/api/admin/notices/${currentId.value}`, form.value)
      toast.success('已更新')
    } else {
      await post('/api/admin/notices', form.value)
      toast.success('已发布')
    }
    show.value = false
    load()
  } catch (e) { toast.error(e.message) }
}

async function saveToggle(n) {
  try {
    await put(`/api/admin/notices/${n.id}`, { title: n.title, content: n.content, published: n.published, pinned: n.pinned })
  } catch (e) { toast.error(e.message); load() }
}

async function deleteNotice(id) {
  if (!confirm('确定删除该公告？')) return
  try {
    await del(`/api/admin/notices/${id}`)
    toast.success('已删除')
    load()
  } catch (e) { toast.error(e.message) }
}

onMounted(load)
</script>

<style scoped>
.notice-manage { padding-top: 4px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.ch { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.ch h3 { font-size: 1rem; }
.cb { padding: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #1e293b; }
th { color: #94a3b8; font-weight: 600; font-size: 0.75rem; }
.notice-summary { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #64748b; }
.time { white-space: nowrap; color: #64748b; font-size: 0.8rem; }
.acts { display: flex; gap: 6px; }
.fg { margin-bottom: 14px; }
.fg label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; }
</style>
