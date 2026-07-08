<template>
  <div class="photo-uploader">
    <div class="photos-preview">
      <div v-for="(file, i) in photos" :key="i" class="photo-item">
        <img :src="previews[i]" alt="预览" class="photo-img" />
        <button class="photo-remove" @click="remove(i)">✕</button>
      </div>
      <label v-if="photos.length < 3" class="photo-add">
        <input type="file" accept="image/*" capture="environment" multiple
          @change="onSelect" class="photo-input" />
        <span class="add-icon">+</span>
        <span class="add-label">{{ photos.length ? '添加' : '拍照/选图' }}</span>
      </label>
    </div>
    <div class="photo-hint" v-if="photos.length">最多 3 张，单张 ≤ 5MB</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])
const photos = ref([...props.modelValue])
const previews = ref([])

watch(() => props.modelValue, (v) => { photos.value = [...v] })

function onSelect(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    if (photos.value.length >= 3) break
    if (f.size > 5 * 1024 * 1024) { alert('单张图片不能超过 5MB'); continue }
    photos.value.push(f)
    const reader = new FileReader()
    reader.onload = ev => previews.value.push(ev.target.result)
    reader.readAsDataURL(f)
  }
  emit('update:modelValue', photos.value)
  e.target.value = ''
}
function remove(i) {
  photos.value.splice(i, 1); previews.value.splice(i, 1)
  emit('update:modelValue', photos.value)
}
</script>

<style scoped>
.photos-preview { display: flex; gap: 10px; flex-wrap: wrap; }
.photo-item { position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; }
.photo-img { width: 100%; height: 100%; object-fit: cover; }
.photo-remove {
  position: absolute; top: 2px; right: 2px;
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; cursor: pointer;
}
.photo-add {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 80px; border-radius: 8px;
  border: 2px dashed var(--color-divider); cursor: pointer; transition: border-color 0.2s;
}
.photo-add:hover { border-color: var(--color-primary); }
.photo-input { display: none; }
.add-icon { font-size: 24px; color: var(--color-text-muted); }
.add-label { font-size: 10px; color: var(--color-text-muted); }
.photo-hint { font-size: 11px; color: var(--color-text-muted); margin-top: 6px; }
</style>
