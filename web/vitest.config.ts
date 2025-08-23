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
      all: true,
      include: [
        'src/hooks/useMonthlyData.ts',
        'src/hooks/useMemoizedValue.ts',
        'src/hooks/useDebounce.ts',
        'src/hooks/useTheme.ts',
        'src/hooks/useTheme.view.tsx',
        'src/hooks/useBudgetState.ts',
        'src/hooks/useNavigation.ts',
      ],
      thresholds: {
        lines: 75,
        functions: 60,
        branches: 75,
        statements: 75,
      },
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
