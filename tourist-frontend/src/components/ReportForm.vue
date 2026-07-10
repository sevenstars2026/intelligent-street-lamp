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
      <label class="form-label">故障路灯编号 <span class="required">*</span></label>
      <input class="input-field" v-model="form.lampId" placeholder="如 lamp_001" maxlength="12" />
    </div>
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
import PhotoUploader from './PhotoUploader.vue'
import { useReport } from '@/composables/useReport'
import { useToast } from '@/composables/useToast'

const { form, submitting, resetForm, submit } = useReport()
const { show } = useToast()

async function handleSubmit() {
  const ok = await submit()
  if (ok) {
    show('上报成功，工作人员将尽快处理', 'success')
    resetForm()
  } else {
    show(form.value.error || '提交失败', 'error')
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
.emergency-contact {
  text-align: center; font-size: 12px; color: var(--color-text-muted);
  padding-top: 8px; border-top: 1px solid var(--color-divider);
}
</style>
