import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // localhost / 127.0.0.1 모두 접속 가능 (카카오 Web 도메인에 둘 다 등록 권장)
    host: true,
    port: 5173,
    strictPort: true,
  },
})
