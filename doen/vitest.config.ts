import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // Zelfde alias als vite.config: zonder dit kan een test niets importeren
  // uit src dat op zijn beurt '@/...' gebruikt.
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
