import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8082'
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          timeout: 10000
        },
        '/healthz': {
          target,
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            bootstrap: ['bootstrap']
          }
        }
      }
    },
    // Ensure assets are served correctly
    base: '/',
    // Enable source maps in dev
    css: {
      devSourcemap: true
    }
  }
})
