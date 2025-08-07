import { TIMEOUTS } from '../constants/timeouts'
import { SERVICE_WORKER } from '../constants/service-worker'

declare global {
  interface Window {
    __BUILD_REVISION__: string
    __BUILD_TIME__: string
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
        if ((this as any).addDebugLog) {
          (this as any).addDebugLog('🎯 PWAモードで起動しました', 'success')
        }
        return
      }
      
      // 方法2: iOS Safari の standalone プロパティ
      if ((window.navigator as any).standalone === true) {
        this.isPWAMode = true
        if ((this as any).addDebugLog) {
          (this as any).addDebugLog('🎯 PWAモード（iOS）で起動しました', 'success')
        }
        return
      }
      
      // ブラウザモード
      this.isPWAMode = false
      if ((this as any).addDebugLog) {
        (this as any).addDebugLog('🌐 ブラウザモードで起動しました', 'info')
      }
    },
    
    // PWA関連の初期化
    initPWADetection() {
      // ビルド情報を取得
      try {
        this.buildRevision = window.__BUILD_REVISION__ || 'dev'
        this.buildTime = window.__BUILD_TIME__ || 'development'
      } catch (error) {
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
        navigator.serviceWorker.ready.then(() => {
          this.serviceWorkerStatus = '✅ 有効'
          if ((this as any).addDebugLog) {
            (this as any).addDebugLog('Service Worker: 有効', 'success')
          }
          
          // 明示的に更新をチェック（PWA起動時に最新版を確認）
          navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) {
              registration.update()
              if ((this as any).addDebugLog) {
                (this as any).addDebugLog('最新版をチェック中...', 'info')
              }
            }
          })
          
          // Service Workerからのメッセージを受信
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === SERVICE_WORKER.MESSAGES.ACTIVATED) {
              if ((this as any).addDebugLog) {
                (this as any).addDebugLog('🔄 Service Worker更新完了', 'success')
              }
              // 必要に応じてページをリロード
              setTimeout(() => {
                if (confirm('新しいバージョンが利用可能です。ページをリロードしますか？')) {
                  window.location.reload()
                }
              }, TIMEOUTS.PWA_UPDATE_DIALOG)
            }
          })
        }).catch(() => {
          this.serviceWorkerStatus = '❌ エラー'
          if ((this as any).addDebugLog) {
            (this as any).addDebugLog('Service Worker: エラー', 'error')
          }
        })
      } else {
        this.serviceWorkerStatus = '❌ 未対応'
      }
    }
  }
}