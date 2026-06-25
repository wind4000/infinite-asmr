import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/infinite-asmr/',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/proxy/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/dashscope/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Origin', 'https://dashscope.aliyuncs.com')
          })
        },
      },
      '/proxy/dashscope-intl': {
        target: 'https://dashscope-intl.aliyuncs.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/proxy\/dashscope-intl/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Origin', 'https://dashscope-intl.aliyuncs.com')
          })
        },
      },
    },
  },
})
