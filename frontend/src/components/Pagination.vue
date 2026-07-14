<template>
  <div class="pagination" v-if="totalPages>1">
    <button :disabled="page<=1" @click="$emit('change',page-1)">上一页</button>
    <template v-for="p in vis" :key="p"><button v-if="p!=='...'" :class="{active:p===page}" @click="$emit('change',p)">{{ p }}</button><span v-else>...</span></template>
    <button :disabled="page>=totalPages" @click="$emit('change',page+1)">下一页</button>
    <span class="info">共{{total}}条</span>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ page:Number, total:Number, pageSize:{type:Number,default:20} })
defineEmits(['change'])
const totalPages = computed(()=>Math.ceil(props.total/props.pageSize)||1)
const vis = computed(()=>{const ps=[],tp=totalPages.value,p=props.page;if(tp<=7){for(let i=1;i<=tp;i++)ps.push(i)}else{ps.push(1);if(p>3)ps.push('...');for(let i=Math.max(2,p-1);i<=Math.min(tp-1,p+1);i++)ps.push(i);if(p<tp-2)ps.push('...');ps.push(tp)}return ps})
</script>
<style scoped>
.pagination{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:20px}
.pagination button{padding:6px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:.85rem}
.pagination button:hover:not(:disabled){background:#4f46e5;color:#fff;border-color:#4f46e5}
.pagination button.active{background:#4f46e5;color:#fff;border-color:#4f46e5}
.pagination button:disabled{opacity:.5;cursor:not-allowed}
.info{font-size:.8rem;color:#94a3b8;margin-left:12px}
</style>
