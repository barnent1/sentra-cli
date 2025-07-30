/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/dashboard/frontend/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'coverage/',
        'rollup.config.js',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/core': resolve(__dirname, './src/core'),
      '@/agents': resolve(__dirname, './src/agents'),
      '@/integrations': resolve(__dirname, './src/integrations'),
      '@/utils': resolve(__dirname, './src/utils')
    }
  }
});