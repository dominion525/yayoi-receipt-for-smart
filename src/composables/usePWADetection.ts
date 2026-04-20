import { TIMEOUTS } from '../constants/timeouts'
import { SERVICE_WORKER } from '../constants/service-worker'
import { CompleteAppData } from '../types/app'

declare global {
  interface Window {
    __BUILD_REVISION__: string
    __BUILD_TIME__: string
  }
  interface Navigator {
    standalone?: boolean
  }
}

export interface PWADetectionComposable {
  isPWAMode: boolean
  userAgent: string
  screenInfo: string
  serviceWorkerStatus: string
  buildRevision: string
  buildTime: string
  detectPWAMode: () => void
  initPWADetection: () => void
  initServiceWorker: () => void
}

export function usePWADetection(): PWADetectionComposable {
  return {
    // 状態
    isPWAMode: false,
    userAgent: '',
    screenInfo: '',
    serviceWorkerStatus: 'checking...',
    buildRevision: '',
    buildTime: '',

    // PWAモード検出
    detectPWAMode() {
      // 方法1: display-mode メディアクエリ
      if (window.matchMedia('(display-mode: standalone)').matches) {
        this.isPWAMode = true
        const app = this as CompleteAppData
        if (app.addDebugLog) {
          app.addDebugLog('🎯 PWAモードで起動しました', 'success')
        }
        return
      }

      // 方法2: iOS Safari の standalone プロパティ
      if (window.navigator.standalone === true) {
        this.isPWAMode = true
        const app = this as CompleteAppData
        if (app.addDebugLog) {
          app.addDebugLog('🎯 PWAモード（iOS）で起動しました', 'success')
        }
        return
      }

      // ブラウザモード
      this.isPWAMode = false
      const app = this as CompleteAppData
      if (app.addDebugLog) {
        app.addDebugLog('🌐 ブラウザモードで起動しました', 'info')
      }
    },

    // PWA関連の初期化
    initPWADetection() {
      // ビルド情報を取得
      try {
        this.buildRevision = window.__BUILD_REVISION__ || 'dev'
        this.buildTime = window.__BUILD_TIME__ || 'development'
      } catch (_error) {
        this.buildRevision = 'dev'
        this.buildTime = 'development'
      }

      // 動作環境情報を取得
      this.userAgent = navigator.userAgent
      this.screenInfo = `${window.innerWidth} x ${window.innerHeight} (${window.devicePixelRatio}x)`

      // PWAモード検出
      this.detectPWAMode()

      // Service Worker初期化
      this.initServiceWorker()
    },

    // Service Worker初期化
    initServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(() => {
            this.serviceWorkerStatus = '✅ 有効'
            const app = this as CompleteAppData
            if (app.addDebugLog) {
              app.addDebugLog('Service Worker: 有効', 'success')
            }

            // 明示的に更新をチェック（PWA起動時に最新版を確認）
            navigator.serviceWorker.getRegistration().then((registration) => {
              if (registration) {
                registration.update()
                if (app.addDebugLog) {
                  app.addDebugLog('最新版をチェック中...', 'info')
                }
              }
            })

            // Service Workerからのメッセージを受信
            navigator.serviceWorker.addEventListener('message', (event) => {
              if (event.data && event.data.type === SERVICE_WORKER.MESSAGES.ACTIVATED) {
                if (app.addDebugLog) {
                  app.addDebugLog('🔄 Service Worker更新完了', 'success')
                }
                // 必要に応じてページをリロード
                setTimeout(() => {
                  if (confirm('新しいバージョンが利用可能です。ページをリロードしますか？')) {
                    window.location.reload()
                  }
                }, TIMEOUTS.PWA_UPDATE_DIALOG)
              }
            })
          })
          .catch(() => {
            this.serviceWorkerStatus = '❌ エラー'
            const app = this as CompleteAppData
            if (app.addDebugLog) {
              app.addDebugLog('Service Worker: エラー', 'error')
            }
          })
      } else {
        this.serviceWorkerStatus = '❌ 未対応'
      }
    }
  }
}
