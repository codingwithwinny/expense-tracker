import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// Your repo name on GitHub Pages
const REPO = 'expense-tracker'

export default defineConfig({
  // IMPORTANT for GitHub Pages
  base: `/${REPO}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg','robots.txt','apple-touch-icon.png'],
      manifest: {
        name: 'Expense Tracker',
        short_name: 'Expenses',
        description: 'Track income, budgets, and expenses offline.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        // IMPORTANT: must match your Pages path
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        // optional: quiets Chrome’s “richer install UI” warning later
        screenshots: [
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide' }
        ]
      }
    })
  ],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
})
