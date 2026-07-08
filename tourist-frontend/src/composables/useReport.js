import { ref } from 'vue'
import { submitFaultReport } from '@/utils/api'

export function useReport() {
  const submitting = ref(false)
  const error = ref(null)
  const success = ref(false)

  const form = ref({
    name: '',
    phone: '',
    lampId: '',
    description: '',
    photos: [],
  })

  function resetForm() {
    form.value = { name: '', phone: '', lampId: '', description: '', photos: [] }
    success.value = false
    error.value = null
  }

  function validate() {
    const { name, phone, lampId, description } = form.value
    if (!name || name.length < 2 || name.length > 20) return '姓名需2-20个字符'
    if (!/^1\d{10}$/.test(phone)) return '请输入正确的11位手机号'
    if (!/^lamp_\d{3}$/.test(lampId)) return '路灯编号格式为 lamp_XXX'
    if (!description || description.length < 10 || description.length > 200) return '故障描述需10-200字'
    return null
  }

  async function submit() {
    const err = validate()
    if (err) { error.value = err; return false }

    submitting.value = true
    error.value = null
    try {
      const fd = new FormData()
      fd.append('name', form.value.name)
      fd.append('phone', form.value.phone)
      fd.append('lampId', form.value.lampId)
      fd.append('description', form.value.description)
      form.value.photos.forEach((file, i) => fd.append('photos', file, `photo_${i}`))
      await submitFaultReport(fd)
      success.value = true
      return true
    } catch (e) {
      error.value = e.message || '提交失败，请重试'
      return false
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, error, success, resetForm, validate, submit }
}
