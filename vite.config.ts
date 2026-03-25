import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // IPv6/localhost 해석 차이로 인한 ECONNREFUSED 가능성 방지
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
