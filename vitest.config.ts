import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/types/**',
        '**/*.d.ts',
        'src/main.ts',
        'src/styles/**',
        'vite.config.ts',
        'vitest.config.ts',
        'postcss.config.js',
        '**/*.config.*'
      ]
    }
  }
})