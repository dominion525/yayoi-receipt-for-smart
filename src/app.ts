import { emailSender } from './lib/mail'
import Alpine from 'alpinejs'
import { SettingsService, AppSettings } from './services/settings.service'

import { useDebugPanel } from './composables/useDebugPanel'
import { useSettings } from './composables/useSettings'
import { EmailService } from './services/email.service'
import { SendProgress } from './types/progress.types'

export interface ReceiptAppData {
  photo: string | null
  error: string | null
  successMessage: string | null
  isLoading: boolean
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  showCaptureEffect: boolean
  isSendingMail: boolean

  isPWAMode: boolean
  userAgent: string
  screenInfo: string
  serviceWorkerStatus: string
  buildRevision: string
  buildTime: string
  sendProgress: SendProgress | null
}

export function receiptApp(): ReceiptAppData & Record<string, any> {
  // デバッグパネル機能を統合
  const debug = useDebugPanel()
  // 設定管理機能を統合
  const settingsComposable = useSettings()
  
  return {
    // デバッグ機能を展開
    ...debug,
    // 設定機能を展開
    ...settingsComposable,
    
    // アプリケーション状態
    photo: null,
    error: null,
    successMessage: null,
    isLoading: false,
    showCaptureEffect: false,
    isSendingMail: false,
    isPWAMode: false,
    userAgent: '',
    screenInfo: '',
    serviceWorkerStatus: 'checking...',
    buildRevision: '',
    buildTime: '',
    sendProgress: null,
    _initialized: false,
    

    // 初期化処理
    init() {
      // 重複実行を防ぐ
      if (this._initialized) {
        return
      }
      this._initialized = true
      
      // ビルド情報を取得
      try {
        this.buildRevision = __BUILD_REVISION__
        this.buildTime = __BUILD_TIME__
      } catch (error) {
        this.buildRevision = 'dev'
        this.buildTime = 'development'
      }
      
      // PWAモード検出
      this.detectPWAMode()
      
      // 動作環境情報を取得
      this.userAgent = navigator.userAgent
      this.screenInfo = `${window.innerWidth} x ${window.innerHeight} (${window.devicePixelRatio}x)`
      
      // Service Worker状態チェック
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          this.serviceWorkerStatus = '✅ 有効'
          this.addDebugLog('Service Worker: 有効', 'success')
          
          // 明示的に更新をチェック（PWA起動時に最新版を確認）
          navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) {
              registration.update()
              this.addDebugLog('最新版をチェック中...', 'info')
            }
          })
          
          // Service Workerからのメッセージを受信
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_ACTIVATED') {
              this.addDebugLog('🔄 Service Worker更新完了', 'success')
              // 必要に応じてページをリロード
              setTimeout(() => {
                if (confirm('新しいバージョンが利用可能です。ページをリロードしますか？')) {
                  window.location.reload()
                }
              }, 1000)
            }
          })
        }).catch(() => {
          this.serviceWorkerStatus = '❌ エラー'
          this.addDebugLog('Service Worker: エラー', 'error')
        })
      } else {
        this.serviceWorkerStatus = '❌ 未対応'
      }
      
      // 保存されたAPIキーと送信元アドレスがあれば設定
      if (this.settings.apiKey) {
        emailSender.setApiKey(this.settings.apiKey)
      }
      if (this.settings.fromEmail) {
        emailSender.setFromEmail(this.settings.fromEmail)
      }
      
      // プリセットが空の場合、または古い形式の場合は再生成
      if (!this.settings.sendPresets || this.settings.sendPresets.length === 0) {
        SettingsService.syncPresetsWithEmails(this.settings)
      } else {
        // プリセットの整合性チェックと修正
        let needsUpdate = false
        
        // Dropboxプリセットのチェック
        const dropboxPreset = this.settings.sendPresets.find(p => p.id === 'dropbox')
        if (this.settings.dropboxEmail) {
          if (!dropboxPreset) {
            needsUpdate = true
          } else if (!dropboxPreset.isActive || dropboxPreset.recipients.length === 0) {
            dropboxPreset.isActive = true
            dropboxPreset.recipients = [this.settings.dropboxEmail]
            needsUpdate = true
          }
        }
        
        // メインプリセットのチェック
        const mainPreset = this.settings.sendPresets.find(p => p.id === 'main')
        if (this.settings.email && mainPreset) {
          if (mainPreset.recipients[0] !== this.settings.email) {
            mainPreset.recipients = [this.settings.email]
            needsUpdate = true
          }
        }
        
        if (needsUpdate) {
          SettingsService.syncPresetsWithEmails(this.settings)
        } else {
          // 「すべてに送信」プリセットの更新チェック
          SettingsService.updateAllPreset(this.settings)
        }
      }
      
      // デバッグ用：現在のプリセット状態を表示
      const activeCount = this.settings.sendPresets?.filter(p => p.isActive).length || 0
      this.addDebugLog(`プリセット数: ${activeCount}個がアクティブ`, 'info')
    },
    
    // PWAモード検出
    detectPWAMode() {
      // 方法1: display-mode メディアクエリ
      if (window.matchMedia('(display-mode: standalone)').matches) {
        this.isPWAMode = true
        this.addDebugLog('🎯 PWAモードで起動しました', 'success')
        return
      }
      
      // 方法2: iOS Safari の standalone プロパティ
      if ((window.navigator as any).standalone === true) {
        this.isPWAMode = true
        this.addDebugLog('🎯 PWAモード（iOS）で起動しました', 'success')
        return
      }
      
      // ブラウザモード
      this.isPWAMode = false
      this.addDebugLog('🌐 ブラウザモードで起動しました', 'info')
    },
    
    retake() {
      this.photo = null
      this.error = null
      // successMessageは保持（撮影画面に戻っても表示を続ける）
    },
    
    returnToHome() {
      this.photo = null
      this.error = null
    },
    
    // 標準カメラアプリでの撮影処理
    handleNativeCamera(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      
      if (file) {
        this.addDebugLog('標準カメラで撮影された画像を処理中...', 'info')
        
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (result && typeof result === 'string') {
            // キャプチャエフェクトを表示
            this.showCaptureEffect = true
            
            // 画像を設定
            this.photo = result
            
            // エフェクトを非表示
            setTimeout(() => {
              this.showCaptureEffect = false
            }, 300)
            
            this.addDebugLog('標準カメラで撮影完了', 'success')
          }
        }
        
        reader.onerror = () => {
          this.showError('画像の読み込みに失敗しました')
          this.addDebugLog('画像読み込みエラー', 'error')
        }
        
        reader.readAsDataURL(file)
      }
      
      // inputをリセット（同じファイルを再選択できるように）
      input.value = ''
    },
    
    async sendMail() {
      // 設定が完了しているか確認
      if (!SettingsService.isComplete(this.settings)) {
        this.showError('メール設定が完了していません。設定を行ってください。')
        this.openSettings()
        return
      }
      
      this.isSendingMail = true
      this.sendProgress = null
      
      try {
        const result = await EmailService.sendMail(
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          this.handleEmailMessage.bind(this),
          this.handleEmailProgress.bind(this)
        )
        
        if (result.shouldRetake) {
          // 成功時は撮影画面に戻る
          this.retake()
        }
        
      } finally {
        this.isSendingMail = false
      }
    },
    
    
    
    
    
    // 共通メール処理ハンドラー
    handleEmailMessage(message: string) {
      // 成功メッセージとエラーメッセージを分けて処理
      if (message.startsWith('✅')) {
        // 成功メッセージは専用エリアに表示
        this.successMessage = message.replace('✅ ', '')
        // 5秒後に自動クリア
        setTimeout(() => {
          if (this.successMessage === message.replace('✅ ', '')) {
            this.successMessage = null
          }
        }, 5000)
      } else {
        // エラーメッセージは従来通り
        this.error = message
      }
    },
    
    // 共通進捗処理ハンドラー
    handleEmailProgress(progress: SendProgress) {
      this.sendProgress = progress
      // 完了時は3秒後に進捗表示をクリア
      if (progress.status === 'completed' || progress.status === 'error') {
        setTimeout(() => {
          this.sendProgress = null
        }, 3000)
      }
    },
    

    
    showError(message: string) {
      this.error = message
      // エラーメッセージを長めに表示（10秒）
      setTimeout(() => {
        if (this.error === message) {
          this.error = null
        }
      }, 10000)
    },
    
    showSuccess(message: string) {
      this.successMessage = message
      // 成功メッセージを5秒表示
      setTimeout(() => {
        if (this.successMessage === message) {
          this.successMessage = null
        }
      }, 5000)
    },
    

    
    // 複数宛先への送信
    async sendMailToPreset(presetId: string) {
      this.isSendingMail = true
      this.sendProgress = null
      
      try {
        const result = await EmailService.sendMailToPreset(
          presetId,
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          this.handleEmailMessage.bind(this),
          this.handleEmailProgress.bind(this)
        )
        
        if (result.shouldRetake) {
          // 成功時は撮影画面に戻る
          this.retake()
        }
        
      } finally {
        this.isSendingMail = false
      }
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})