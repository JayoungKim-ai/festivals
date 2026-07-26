import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // IPv6(::1)만 열리면 127.0.0.1:5173 접속·백엔드 연동이 어긋날 수 있음
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // 개발 중에는 같은 origin으로 API를 호출해 CORS/호스트 불일치를 피한다
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
