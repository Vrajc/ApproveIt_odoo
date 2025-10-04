import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth/, '/api/auth')
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 30000
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  define: {
    // Suppress React Router warnings in development
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
})
  