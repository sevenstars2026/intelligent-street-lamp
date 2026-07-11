import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/maxkb': {
        target: 'http://192.168.20.119:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maxkb/, ''),
        // 剥掉 X-Frame-Options，允许 MaxKB 被 iframe 嵌入
        onProxyRes(proxyRes) {
          delete proxyRes.headers['x-frame-options']
          delete proxyRes.headers['content-security-policy']
        }
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router'],
          echarts: ['echarts'],
          vendor: ['axios']
        }
      }
    }
  }
})
