<template>
  <div class="lamp-search">
    <span class="search-icon">🔍</span>
    <input class="search-input" type="text" v-model="query"
      placeholder="输入路灯编号（如 lamp_001）"
      @keyup.enter="submit" />
    <button class="search-btn" @click="submit" :disabled="!query.trim()">查找</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const query = ref('')
const emit = defineEmits(['search'])
function submit() {
  if (query.value.trim()) emit('search', query.value.trim())
}
</script>

<style scoped>
.lamp-search {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: var(--color-card);
}
.search-icon { font-size: 18px; flex-shrink: 0; }
.search-input {
  flex: 1; padding: 8px 12px; border: 1.5px solid var(--color-divider);
  border-radius: 20px; font-size: 14px; outline: none;
  background: var(--color-bg); font-family: var(--font-sans);
}
.search-input:focus { border-color: var(--color-primary); }
.search-btn {
  padding: 8px 16px; border-radius: 20px; border: none;
  background: var(--color-primary); color: #fff; font-size: 13px;
  font-weight: 600; cursor: pointer; flex-shrink: 0; font-family: var(--font-sans);
}
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
