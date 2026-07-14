<template>
  <div>
    <Navbar />
    <main style="min-height:calc(100vh - 60px)"><router-view /></main>
    <ToastContainer />
  </div>
</template>
<script setup>
import Navbar from './components/Navbar.vue'
import ToastContainer from './components/ToastContainer.vue'
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6}

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
</style>
