import { emailSender } from './lib/mail'
import Alpine from 'alpinejs'
import { SettingsService, AppSettings } from './services/settings.service'
import { DebugService, DebugLog } from './services/debug.service'
import { EmailService } from './services/email.service'

export interface ReceiptAppData {
  photo: string | null
  error: string | null
  isLoading: boolean
  showDebug: boolean
  debugLogs: DebugLog[]
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  showCaptureEffect: boolean
  isSendingMail: boolean
  isCopyingLogs: boolean
  isPWAMode: boolean
  userAgent: string
  screenInfo: string
  serviceWorkerStatus: string
  buildRevision: string
  buildTime: string
}

export function receiptApp(): ReceiptAppData & Record<string, any> {
  return {
    photo: null,
    error: null,
    isLoading: false,
    showDebug: false,
    debugLogs: [],
    showSettings: false,
    settings: SettingsService.load(),
    tempSettings: {
      email: '',
      apiKey: '',
      dropboxEmail: '',
      fromEmail: '',
      sendPresets: []
    },
    showCaptureEffect: false,
    isSendingMail: false,
    isCopyingLogs: false,
    isPWAMode: false,
    userAgent: '',
    screenInfo: '',
    serviceWorkerStatus: 'checking...',
    buildRevision: '',
    buildTime: '',
    _initialized: false,
    
    // 初期化時に設定完了状態をチェック
    get isSettingsComplete() {
      return SettingsService.isComplete(this.settings)
    },
    
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
      
      // 方法3: URLパラメータによる検出（一部のブラウザ）
      if (window.location.search.includes('mode=standalone')) {
        this.isPWAMode = true
        this.addDebugLog('🎯 PWAモード（URLパラメータ）で起動しました', 'success')
        return
      }
      
      // ブラウザモード
      this.isPWAMode = false
      this.addDebugLog('🌐 ブラウザモードで起動しました', 'info')
    },
    
    retake() {
      this.photo = null
      this.error = null
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
      
      try {
        const result = await EmailService.sendMail(
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          (message: string) => {
            this.error = message
            // 成功メッセージの場合は3秒後に自動クリア
            if (message.startsWith('✅')) {
              setTimeout(() => {
                if (this.error === message) {
                  this.error = null
                }
              }, 3000)
            }
          }
        )
        
        if (result.shouldRetake) {
          this.retake()
        }
        
      } finally {
        this.isSendingMail = false
      }
    },
    
    
    
    
    
    toggleDebug() {
      this.showDebug = !this.showDebug
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
    
    addDebugLog(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
      
      const log: DebugLog = { time, type, message }
      this.debugLogs.push(log)
      
      // DebugServiceにも記録
      DebugService.add(message, type)
      
      // 最大100件に制限
      if (this.debugLogs.length > 100) {
        this.debugLogs.shift()
      }
      
      // 最新のログが見えるようにスクロール
      this.$nextTick(() => {
        const logContainer = document.querySelector('#debug-panel .bg-black')
        if (logContainer) {
          logContainer.scrollTop = logContainer.scrollHeight
        }
      })
    },

    clearDebugLogs() {
      this.debugLogs = []
      DebugService.clear()
    },
    
    async copyDebugLogs() {
      this.isCopyingLogs = true
      await DebugService.copyToClipboard()
      
      // 成功/失敗に関わらず、視覚的フィードバックのために一定時間待つ
      setTimeout(() => {
        this.isCopyingLogs = false
      }, 2000)
    },
    
    // 設定関連メソッド
    openSettings() {
      // 現在の設定を一時設定にコピー（深いコピー）
      this.tempSettings = {
        email: this.settings.email,
        apiKey: this.settings.apiKey,
        dropboxEmail: this.settings.dropboxEmail || '',
        fromEmail: this.settings.fromEmail || '',
        sendPresets: JSON.parse(JSON.stringify(this.settings.sendPresets))
      }
      this.showSettings = true
    },
    
    closeSettings() {
      this.showSettings = false
      // 一時設定をクリア
      this.tempSettings = {
        email: '',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }
    },
    
    async saveSettings() {
      // プリセットを更新
      SettingsService.updatePresetsFromTempSettings(this.tempSettings)
      
      // 設定データを準備
      const newSettings: AppSettings = {
        email: this.tempSettings.email.trim(),
        apiKey: this.tempSettings.apiKey.trim(),
        dropboxEmail: this.tempSettings.dropboxEmail?.trim() || '',
        fromEmail: this.tempSettings.fromEmail?.trim() || '',
        sendPresets: this.tempSettings.sendPresets
      }
      
      // localStorageに保存
      if (SettingsService.save(newSettings)) {
        // 保存成功時のみ状態を更新
        this.settings = newSettings
        
        this.closeSettings()
        this.addDebugLog('設定をlocalStorageに保存しました', 'success')
      } else {
        // 保存失敗時のエラー処理
        this.showError('設定の保存に失敗しました。ブラウザの設定を確認してください。')
        this.addDebugLog('localStorage保存エラー', 'error')
      }
    },
    
    // 複数宛先への送信
    async sendMailToPreset(presetId: string) {
      this.isSendingMail = true
      
      try {
        const result = await EmailService.sendMailToPreset(
          presetId,
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          (message: string) => {
            this.error = message
            // 成功メッセージの場合は3秒後に自動クリア
            if (message.startsWith('✅')) {
              setTimeout(() => {
                if (this.error === message) {
                  this.error = null
                }
              }, 3000)
            }
          }
        )
        
        if (result.shouldRetake) {
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