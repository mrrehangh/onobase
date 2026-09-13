import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // dev server must use '/' so Electron renderer can load from http://localhost:5173
  // production build uses './' so Electron can load from file:// protocol
  base: command === 'build' ? './' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}))