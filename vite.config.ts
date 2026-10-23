import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Pages la app vive en /<repositorio>/
const base = process.env.BASE_PATH || '/'

const mock = process.env.MOCK === '1'

export default defineConfig({
  base,
  resolve: mock ? { alias: [
    { find: /^(\.\.?\/)+auth$/, replacement: '/src/mock/auth.tsx' },
    { find: /^(\.\.?\/)+db$/, replacement: '/src/mock/db.ts' },
    { find: /^(\.\.?\/)+fotos$/, replacement: '/src/mock/fotos.ts' }
  ] } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Girasoleros Cerinza',
        short_name: 'Girasoleros',
        description: 'Control del cultivo de girasol y de las semillas tostadas',
        lang: 'es-CO',
        theme_color: '#2F5A2A',
        background_color: '#F1F3EA',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            // Solo las fotos que se muestran; al compartir fotos se piden directo a la nube.
            urlPattern: ({ url, request }) => url.hostname === 'firebasestorage.googleapis.com' && request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'fotos', expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } }
          }
        ]
      }
    })
  ]
})
