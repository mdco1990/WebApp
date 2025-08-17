import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
