import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // При локальній розробці проксіюємо /api на Vercel dev server
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
