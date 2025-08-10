import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import stylelint from 'vite-plugin-stylelint'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Use service name for Docker Compose, fallback to localhost for local dev
  const target = env.VITE_PROXY_TARGET || 'http://api:8082'
  
  return {
    plugins: [
      react(),
      // ESLint for TypeScript and React
      eslint({
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        exclude: ['node_modules', 'dist'],
        cache: true,
        failOnError: false,
        failOnWarning: false
      }),
      // Stylelint for CSS
      stylelint({
        include: ['src/**/*.{css,scss,sass}'],
        exclude: ['node_modules', 'dist'],
        cache: true
      })
    ],
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      allowedHosts: [
        'instance-agent.subnet05071228.vcn05071228.oraclevcn.com',
        'localhost',
        '127.0.0.1'
      ],
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          timeout: 10000
        },
        '/auth': {
          target,
          changeOrigin: true,
          secure: false,
          timeout: 10000
        },
        '/healthz': {
          target,
          changeOrigin: true,
          secure: false
        },
        '/docs': {
          target,
          changeOrigin: true,
          secure: false
        },
        '/db-admin': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path // allow API to handle prefix stripping
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['chart.js', 'react-chartjs-2']
          }
        }
      }
    },
    // Ensure assets are served correctly
    base: '/',
    // Enable source maps in dev
    css: {
      devSourcemap: true
    },
    // Optimize dependencies
    optimizeDeps: {
  include: ['react', 'react-dom', 'bootstrap', 'chart.js', 'react-chartjs-2', 'react-bootstrap']
    }
  }
})
