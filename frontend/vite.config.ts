import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // PC·폰 동일 Wi-Fi 접속 (0.0.0.0)
    host: true,
    port: 5173,
    strictPort: true,
    // 폰에서 localhost:8000 이 안 열리므로 /api → 백엔드 프록시
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

