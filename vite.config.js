/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve as pathResolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = dirname(fileURLToPath(import.meta.url))

const REPO = 'expense-tracker'
const isGH = process.env.GH_PAGES === 'true'
const basePath = isGH ? `/${REPO}/` : '/'

export default defineConfig({
  base: basePath, // <-- IMPORTANT
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
        start_url: basePath, // match base
        scope: basePath,     // match base
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  resolve: { alias: { '@': pathResolve(__dirname, 'src') } },
})
