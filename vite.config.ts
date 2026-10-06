import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      ignored: [
        '**/backend/**',
        '**/data/**',
        '**/.venv/**',
        '**/scratch/**',
        '**/.system_generated/**',
        '**/*.json.tmp*',
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})

