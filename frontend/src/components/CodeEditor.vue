<template>
  <div class="cm-outer" :class="{ 'cm-error': !valid && content.length > 0 }">
    <div ref="editorEl"></div>
    <div v-if="!valid && content.length > 0" class="cm-err-msg">{{ errMsg }}</div>
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { placeholder as cmPlaceholder } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

const props = defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'valid'])
const editorEl = ref(null)
const content = ref(props.modelValue || '')
const valid = ref(true)
const errMsg = ref('')
let view = null

function checkJson(val) {
  if (!val || !val.trim()) { valid.value = true; errMsg.value = ''; return }
  try { JSON.parse(val); valid.value = true; errMsg.value = '' } catch (e) { valid.value = false; errMsg.value = 'JSON 格式错误: ' + e.message }
}

onMounted(async () => {
  await nextTick()
  if (!editorEl.value) return
  checkJson(props.modelValue)

  const extensions = [basicSetup, json(), oneDark, EditorView.lineWrapping, EditorState.transactionFilter.of((tr) => (tr.newDoc.length > 50000 ? [] : tr)), EditorView.theme({ '&': { fontSize: '13px' }, '.cm-scroller': { fontFamily: "'Consolas','Monaco',monospace" } })]

  if (props.placeholder) extensions.push(cmPlaceholder(props.placeholder))

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const val = update.state.doc.toString()
      content.value = val
      checkJson(val)
      emit('update:modelValue', val)
      emit('valid', valid.value)
    }
  })
  extensions.push(updateListener)

  view = new EditorView({ doc: props.modelValue || '', extensions, parent: editorEl.value })
})

watch(() => props.modelValue, (val) => {
  if (view && val !== view.state.doc.toString()) {
    checkJson(val || '')
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: val || '' } })
  }
})

onBeforeUnmount(() => { view?.destroy() })
</script>
<style scoped>
.cm-outer { border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
.cm-outer.cm-error { border-color: #ef4444; }
.cm-err-msg { background: #fef2f2; color: #991b1b; font-size: .78rem; padding: 6px 12px; border-top: 1px solid #fecaca; }
</style>
