import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const demo = loadEnv(mode, new URL('..', import.meta.url).pathname, 'DEMO_')
  return {
  define: {
    'import.meta.env.VITE_DEMO_EMAIL': JSON.stringify(demo.DEMO_EMAIL || 'demo@airag.com'),
    'import.meta.env.VITE_DEMO_PASSWORD': JSON.stringify(demo.DEMO_PASSWORD || ''),
  },
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT || 3056),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 8050}`,
        changeOrigin: true,
      },
    },
  },
  }
})
