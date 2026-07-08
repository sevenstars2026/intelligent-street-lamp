<template>
  <div class="page">
    <div class="page-header">⚠️ 路灯故障上报</div>
    <div class="form-container">
      <ReportForm />
    </div>
    <BottomNav />
  </div>
</template>

<script setup>
import ReportForm from '@/components/ReportForm.vue'
import BottomNav from '@/components/BottomNav.vue'
</script>

<style scoped>
.form-container { padding: 0 16px; }
</style>
