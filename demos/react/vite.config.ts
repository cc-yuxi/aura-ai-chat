import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'aura-ai-chat': fileURLToPath(new URL('../../packages/lib/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 4300,
    strictPort: true,
    proxy: {
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-api/, ''),
      },
      '/github-copilot-api': {
        target: 'https://api.githubcopilot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-copilot-api/, ''),
      },
      '/github-copilot-individual-api': {
        target: 'https://api.individual.githubcopilot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github-copilot-individual-api/, ''),
      },
      '/github': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/github/, ''),
      },
    },
  },
})
