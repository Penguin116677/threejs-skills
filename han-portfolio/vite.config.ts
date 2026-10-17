import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the build works from any sub-path (GitHub Pages, Netlify, etc.)
  base: './',
  build: {
    // The Three.js hero is an intentionally separate, lazy-loaded chunk (~265 kB gzip)
    // that only capable devices download after first paint.
    chunkSizeWarningLimit: 1100,
  },
})
