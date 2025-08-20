/* eslint-env node */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve as pathResolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = 'expense-tracker'

// Use Vite's command to decide base:
// dev/preview => '/', build (for Pages) => '/expense-tracker/'
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  const basePath = isBuild ? `/${REPO}/` : '/'

  return {
    base: basePath,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Expense Tracker',
          short_name: 'Expenses',
          description: 'Track income, budgets, and expenses offline.',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: basePath,
          scope: basePath,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        }
      })
    ],
    resolve: { alias: { '@': pathResolve(__dirname, 'src') } },
  }
})
