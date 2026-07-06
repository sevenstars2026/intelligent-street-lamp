import { ref, watch } from 'vue'

// 模块级单例
const theme = ref(document.documentElement.getAttribute('data-theme') || 'dark')

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme(theme.value)
}

// 监听系统主题变化（未手动设置时跟随系统）
if (typeof window !== 'undefined') {
  const systemMedia = window.matchMedia('(prefers-color-scheme: light)')
  systemMedia.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      theme.value = e.matches ? 'light' : 'dark'
      applyTheme(theme.value)
    }
  })
}

export function useTheme() {
  return { theme, toggleTheme }
}
