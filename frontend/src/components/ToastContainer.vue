<template>
  <div class="toast-container" v-if="store.toasts.length">
    <transition-group name="t"><div v-for="t in store.toasts" :key="t.id" :class="['toast','toast-'+t.type]" @click="store.remove(t.id)">{{ t.msg }}</div></transition-group>
  </div>
</template>
<script setup>
import { useToastStore } from '@/stores/toast'; const store = useToastStore()
</script>
<style>
.toast-container{position:fixed;top:72px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px}
.toast{padding:10px 18px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.12);font-size:.85rem;font-weight:500;cursor:pointer}
.toast-success{background:#d1fae5;color:#065f46}.toast-error{background:#fee2e2;color:#991b1b}
.t-enter-active{animation:toastIn .3s ease}.t-leave-active{animation:toastOut .3s ease}
@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes toastOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}
</style>
