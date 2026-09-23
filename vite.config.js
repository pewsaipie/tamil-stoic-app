import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project URL.
export default defineConfig({
  base: '/tamil-stoic-app/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
