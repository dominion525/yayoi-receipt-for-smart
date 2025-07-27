import { defineConfig } from 'vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: {
      clientPort: 443
    },
    // ngrok経由のアクセスを許可
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app'
    ]
  },
  plugins: [
    {
      name: 'copy-term-html',
      closeBundle() {
        // ビルド完了後にterm.htmlをdistにコピー
        try {
          copyFileSync(
            resolve(__dirname, 'term.html'),
            resolve(__dirname, 'dist', 'term.html')
          )
          console.log('✓ term.html copied to dist/')
        } catch (err) {
          console.error('Failed to copy term.html:', err)
        }
      }
    }
  ]
})