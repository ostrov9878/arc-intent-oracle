import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: '/arc-intent-oracle/',
  plugins: [
    react(),
    nodePolyfills({
      // Specifically enable Buffer and global for @circle-fin/app-kit
      include: ['buffer', 'process', 'util'],
    }),
  ],
  define: {
    global: 'globalThis',
  },
})