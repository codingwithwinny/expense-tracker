import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const REPO = 'expense-tracker' // <- your repo name

export default defineConfig({
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
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
})
