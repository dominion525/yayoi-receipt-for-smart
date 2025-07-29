import { defineConfig } from 'vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Git リビジョンとビルド時刻を取得
function getBuildInfo() {
  try {
    const revision = execSync('git rev-parse --short HEAD').toString().trim()
    const buildTime = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    return { revision, buildTime }
  } catch (error) {
    console.warn('Git revision not available:', error)
    return { revision: 'unknown', buildTime: new Date().toISOString() }
  }
}

const buildInfo = getBuildInfo()

export default defineConfig({
  define: {
    '__BUILD_REVISION__': JSON.stringify(buildInfo.revision),
    '__BUILD_TIME__': JSON.stringify(buildInfo.buildTime),
  },
  server: {
    host: true,
    port: 5173,
    hmr: {
      // HTTPS環境（ngrok等）では443、それ以外はデフォルト
      clientPort: process.env.NODE_ENV === 'production' || process.env.HTTPS ? 443 : undefined
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