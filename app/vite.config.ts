import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages serves this repository from a sub-path, so production builds
 * need the repository name as their base. Dev and preview servers stay at the
 * root so the hosted live preview works without a redirect.
 */
const PAGES_BASE = '/tamil-stoic-app/'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    base: isBuild ? PAGES_BASE : '/',

    // `host: true` binds 0.0.0.0 so the sandbox proxy can reach the dev server.
    server: { host: true, port: 5173, strictPort: true, allowedHosts: true },
    preview: { host: true, port: 4173, strictPort: true, allowedHosts: true },

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // The reader controls when an update is applied (Feature 11).
        registerType: 'prompt',
        // Registered explicitly in src/lib/pwa.ts so the UI can own the flow.
        injectRegister: null,
        includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,svg,png,jpg,webp,json}'],
          // The full corpus is ~700 KB; it must live in the precache so the
          // app is genuinely offline-complete after the first visit.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.endsWith('/data/kurals.json'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'kurals-corpus',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        manifest: {
          name: 'குறள் — Tamil Stoic',
          short_name: 'குறள்',
          description:
            'A calm, offline companion for reading Thirukkural in Tamil with a plain-English meaning.',
          lang: 'ta',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          background_color: '#F5EDD6',
          theme_color: '#F5EDD6',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],

    build: {
      target: 'es2020',
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Function form on purpose: the object form adds the listed packages
          // as chunk entries even when nothing imports them yet, which emitted
          // (and preloaded) a Three.js chunk the app never used. This splits
          // only what is genuinely in the module graph.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (/node_modules\/(three|@react-three)\//.test(id)) return 'three'
            if (id.includes('node_modules/framer-motion')) return 'motion'
            return undefined
          },
        },
      },
    },
  }
})
