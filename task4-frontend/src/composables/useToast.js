import { reactive } from 'vue'

// 模块级单例
const toast = reactive({
  show: false,
  msg: '',
  type: 'info', // 'info' | 'success' | 'error' | 'warning'
})
let timer = null

function showToast(msg, type = 'info') {
  if (timer) clearTimeout(timer)
  toast.show = true
  toast.msg = msg
  toast.type = type
  timer = setTimeout(() => {
    toast.show = false
  }, 3000)
}

export function useToast() {
  return { toast, showToast }
}
