<template>
  <div class="report-form card">
    <div class="form-group">
      <label class="form-label">姓名 <span class="required">*</span></label>
      <input class="input-field" v-model="form.name" placeholder="请输入您的姓名" maxlength="20" />
    </div>
    <div class="form-group">
      <label class="form-label">手机号 <span class="required">*</span></label>
      <input class="input-field" v-model="form.phone" placeholder="请输入11位手机号" maxlength="11" type="tel" />
    </div>
    <div class="form-group">
      <label class="form-label">故障路灯 <span class="required">*</span></label>
      <button class="input-field picker-trigger" type="button" @click="showPicker = true">
        <span v-if="selectedLamp" class="picker-value">{{ selectedLamp.name }}（{{ selectedLamp.id }}）</span>
        <span v-else class="picker-placeholder">请选择故障路灯</span>
        <svg class="picker-arrow" viewBox="0 0 12 12" width="12" height="12"><path fill="#b8a898" d="M6 8L1 3h10z"/></svg>
      </button>
      <span class="select-hint" v-if="lamps.length === 0 && !lampLoading">暂无可选路灯，请刷新重试</span>
    </div>

    <LampPicker
      :show="showPicker"
      v-model="form.lampId"
      :lamps="lamps"
      @close="showPicker = false"
    />
    <div class="form-group">
      <label class="form-label">故障描述 <span class="required">*</span></label>
      <textarea class="input-field textarea" v-model="form.description" placeholder="请描述故障情况（10-200字）" maxlength="200" rows="4"></textarea>
      <span class="char-count">{{ form.description.length }}/200</span>
    </div>
    <div class="form-group">
      <label class="form-label">现场照片（选填）</label>
      <PhotoUploader v-model="form.photos" />
    </div>
    <button class="btn-primary" @click="handleSubmit" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交上报' }}
    </button>
    <div class="emergency-contact">
      📞 紧急情况请联系重庆大学保卫处：(023) 6567 8110
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PhotoUploader from './PhotoUploader.vue'
import LampPicker from './LampPicker.vue'
import { useReport } from '@/composables/useReport'
import { useScenic } from '@/composables/useScenic'
import { useToast } from '@/composables/useToast'

const { form, submitting, error, resetForm, submit } = useReport()
const { lamps, loading: lampLoading, loadScenicData } = useScenic()
const { show } = useToast()

const showPicker = ref(false)

const selectedLamp = computed(() => {
  return lamps.value.find(l => l.id === form.value.lampId) || null
})

onMounted(() => {
  if (lamps.value.length === 0) loadScenicData()
})

async function handleSubmit() {
  const ok = await submit()
  if (ok) {
    show('上报成功，工作人员将尽快处理', 'success')
    resetForm()
  } else {
    show(error.value || '提交失败', 'error')
  }
}
</script>

<style scoped>
.report-form { padding: 20px; display: flex; flex-direction: column; gap: 18px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 14px; font-weight: 600; color: var(--color-text); }
.required { color: var(--color-danger); }
.textarea { resize: vertical; font-family: var(--font-sans); }
.char-count { font-size: 11px; color: var(--color-text-muted); text-align: right; }
.picker-trigger {
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; user-select: none; text-align: left;
}
.picker-value { color: var(--color-text); }
.picker-placeholder { color: var(--color-text-muted); }
.picker-arrow { flex-shrink: 0; transition: transform 0.2s; }
.select-hint { font-size: 11px; color: var(--color-text-muted); }

.emergency-contact {
  text-align: center; font-size: 12px; color: var(--color-text-muted);
  padding-top: 8px; border-top: 1px solid var(--color-divider);
}
</style>
