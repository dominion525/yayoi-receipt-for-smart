import { defineConfig } from 'vite'
import { copyFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// ビルド情報を取得
function getBuildInfo() {
  // package.jsonからバージョンを取得（常に必要）
  const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
  const version = packageJson.version

  try {
    // Gitリビジョンを取得
    const gitCommit = execSync('git rev-parse --short HEAD').toString().trim()

    // ビルド時刻を取得
    const buildTimeISO = new Date().toISOString()
    const buildTimeJP = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    return {
      version,
      gitCommit,
      buildTime: buildTimeISO,
      revision: gitCommit, // 後方互換性のため
      buildTimeJP // 日本語表示用
    }
  } catch (error) {
    console.warn('Build info not available:', error)
    const fallbackTime = new Date()
    return {
      version, // package.jsonから取得したバージョンを使用
      gitCommit: 'unknown',
      buildTime: fallbackTime.toISOString(),
      revision: 'unknown',
      buildTimeJP: fallbackTime.toLocaleString('ja-JP')
    }
  }
}

const buildInfo = getBuildInfo()

export default defineConfig({
  define: {
    '__BUILD_REVISION__': JSON.stringify(buildInfo.revision),
    '__BUILD_TIME__': JSON.stringify(buildInfo.buildTimeJP),
  },
  envPrefix: ['VITE_'],
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