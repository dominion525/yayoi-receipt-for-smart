import { Camera } from './lib/camera'
import { emailSender } from './lib/mail'
import Alpine from 'alpinejs'

export interface DebugLog {
  time: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
  message: string
}

export interface AppSettings {
  email: string
  apiKey: string
}

// localStorage管理用の定数とユーティリティ
const STORAGE_KEY = 'yayoi-receipt-settings'

function loadSettingsFromStorage(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        email: parsed.email || '',
        apiKey: parsed.apiKey || ''
      }
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error)
  }
  
  return {
    email: '',
    apiKey: ''
  }
}

function saveSettingsToStorage(settings: AppSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('設定の保存に失敗しました:', error)
    return false
  }
}

export interface ReceiptAppData {
  camera: Camera | null
  cameraActive: boolean
  photo: string | null
  error: string | null
  isLoading: boolean
  torchOn: boolean
  torchSupported: boolean
  availableCameras: any[]
  currentCamera: any | null
  availableZooms: number[]
  availableZoomLevels: number[]
  currentZoomLevel: number
  currentZoomType: 'optical' | 'digital'
  showDebug: boolean
  apiSupport: any | null
  cameraParams: any | null
  zoomSupported: boolean
  zoomCapabilities: any | null
  currentZoom: number
  initialPinchDistance: number
  initialZoom: number
  deviceInfo: any | null
  debugLogs: DebugLog[]
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  isSendingTestEmail: boolean
}

export function receiptApp(): ReceiptAppData & Record<string, any> {
  return {
    camera: null,
    cameraActive: false,
    photo: null,
    error: null,
    isLoading: false,
    torchOn: false,
    torchSupported: false,
    availableCameras: [],
    currentCamera: null,
    availableZooms: [],
    availableZoomLevels: [],
    currentZoomLevel: 1,
    currentZoomType: 'optical' as 'optical' | 'digital',
    showDebug: false,
    apiSupport: null,
    cameraParams: null,
    zoomSupported: false,
    zoomCapabilities: null,
    currentZoom: 1,
    initialPinchDistance: 0,
    initialZoom: 1,
    deviceInfo: null,
    debugLogs: [],
    showSettings: false,
    settings: loadSettingsFromStorage(),
    tempSettings: {
      email: '',
      apiKey: ''
    },
    isSendingTestEmail: false,
    
    // 初期化時に設定完了状態をチェック
    get isSettingsComplete() {
      return this.checkSettingsComplete()
    },
    
    // 初期化処理
    init() {
      // 保存されたAPIキーがあれば設定
      if (this.settings.apiKey) {
        emailSender.setApiKey(this.settings.apiKey)
      }
    },
    
    async startCamera() {
      // 既にカメラが起動している場合はスキップ
      if (this.cameraActive || this.isLoading) {
        return
      }
      
      this.isLoading = true
      this.error = null
      
      try {
        // カメラサポートチェック
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('このブラウザはカメラ機能をサポートしていません')
        }
        
        // HTTPS接続チェック（開発環境を除く）
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          throw new Error('カメラアクセスにはHTTPS接続が必要です')
        }
        
        // Cameraインスタンスを作成
        this.camera = new Camera({
          video: this.$refs.video,
          canvas: this.$refs.canvas,
          onLog: (message, type) => this.addDebugLog(message, type)
        })
        
        // カメラを開始
        await this.camera.start()
        this.cameraActive = true
        
        // トーチサポート状態を確認
        this.torchSupported = this.camera.isTorchSupported()
        this.torchOn = this.camera.getTorchState()
        
        // 利用可能なカメラを取得
        this.availableCameras = this.camera.getAvailableCameras()
        this.currentCamera = this.camera.getCurrentCamera()
        this.availableZooms = [...new Set(this.availableCameras.map(cam => cam.zoom))].sort()
        
        // 初回起動時の物理カメラ情報をログ
        if (this.availableCameras.length > 1) {
          this.addDebugLog(`物理カメラ ${this.availableCameras.length}台検出: ${this.availableCameras.map(c => c.zoom + 'x').join(', ')}`, 'info')
        }
        
        // 統合ズーム情報を取得
        this.availableZoomLevels = this.camera.getAvailableZoomLevels()
        const zoomInfo = this.camera.getCurrentZoomInfo()
        this.currentZoomLevel = zoomInfo.level
        this.currentZoomType = zoomInfo.type
        
        // デバッグ情報を取得
        this.updateDebugInfo()
        
        // ズームサポートを確認
        this.zoomSupported = this.camera.isZoomSupported()
        if (this.zoomSupported) {
          this.zoomCapabilities = this.camera.getZoomCapabilities()
          this.currentZoom = this.camera.getCurrentZoom()
        }
        
        // デバイス情報を取得
        this.deviceInfo = this.camera.getDeviceInfo()
      } catch (error: any) {
        // より詳細なエラーメッセージを提供
        let errorMessage = error.message
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'カメラへのアクセスが拒否されました。ブラウザの設定でカメラの使用を許可してください。'
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'カメラが見つかりません。カメラが接続されているか確認してください。'
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'カメラを起動できません。他のアプリケーションがカメラを使用している可能性があります。'
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'カメラの設定に問題があります。別のカメラを試してください。'
        }
        
        this.showError(errorMessage)
        this.addDebugLog(`カメラエラー: ${error.name} - ${error.message}`, 'error')
        console.error('Camera error:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    capture() {
      if (!this.camera) return
      
      try {
        const imageData = this.camera.capture()
        if (imageData) {
          this.photo = imageData
          this.stopCamera()
        }
      } catch (error: any) {
        this.showError(error.message)
        console.error('Capture error:', error)
      }
    },
    
    stopCamera() {
      if (this.camera) {
        this.camera.stop()
        this.camera = null
        this.cameraActive = false
        this.torchOn = false
        this.torchSupported = false
        this.availableCameras = []
        this.currentCamera = null
        this.availableZooms = []
        this.availableZoomLevels = []
        this.currentZoomLevel = 1
        this.currentZoomType = 'optical' as 'optical' | 'digital'
        this.apiSupport = null
        this.cameraParams = null
        this.zoomSupported = false
        this.zoomCapabilities = null
        this.currentZoom = 1
        this.deviceInfo = null
      }
    },
    
    retake() {
      this.photo = null
      this.error = null
      this.startCamera()
    },
    
    async sendMail() {
      if (!this.photo) {
        this.showError('写真が撮影されていません')
        return
      }
      
      // 設定が完了しているか確認
      if (!this.checkSettingsComplete()) {
        this.showError('メール設定が完了していません。設定を行ってください。')
        this.openSettings()
        return
      }
      
      this.isLoading = true
      this.addDebugLog('レシート画像をメール送信中...', 'info')
      
      try {
        // レシート画像を送信
        const result = await emailSender.sendReceipt(
          this.settings.email,
          this.photo
        )
        
        if (result.success) {
          this.addDebugLog(`レシート画像を送信しました: messageId=${result.messageId}`, 'success')
          
          // 成功メッセージを表示
          const successMessage = 'レシート画像をメール送信しました'
          this.error = '✅ ' + successMessage
          setTimeout(() => {
            if (this.error === '✅ ' + successMessage) {
              this.error = null
            }
          }, 3000)
          
          // 写真をクリアしてカメラに戻る
          this.retake()
          
        } else {
          this.addDebugLog(`メール送信失敗: ${result.error}`, 'error')
          this.showError(`メール送信に失敗しました: ${result.error}`)
        }
        
      } catch (error: any) {
        this.addDebugLog(`メール送信エラー: ${error.message}`, 'error')
        this.showError(`予期しないエラーが発生しました: ${error.message}`)
        console.error('Send mail error:', error)
        
      } finally {
        this.isLoading = false
      }
    },
    
    async toggleTorch() {
      if (!this.camera) return
      
      // トーチサポートを再確認
      this.torchSupported = this.camera.isTorchSupported()
      
      if (!this.torchSupported) {
        this.showError('このデバイスはトーチ機能をサポートしていません')
        return
      }
      
      try {
        this.torchOn = await this.camera.toggleTorch()
      } catch (error: any) {
        this.showError(error.message)
        console.error('Torch error:', error)
      }
    },
    
    async selectZoom(zoom: number) {
      if (!this.camera) return
      
      try {
        await this.camera.selectCameraByZoom(zoom)
        this.currentCamera = this.camera.getCurrentCamera()
        
        // カメラが変わったのでトーチ状態を再確認
        this.torchSupported = this.camera.isTorchSupported()
        this.torchOn = this.camera.getTorchState()
        
        // デバッグ情報を更新
        this.updateDebugInfo()
        
        // ズームサポートを再確認
        this.zoomSupported = this.camera.isZoomSupported()
        if (this.zoomSupported) {
          this.zoomCapabilities = this.camera.getZoomCapabilities()
          this.currentZoom = this.camera.getCurrentZoom()
        }
        
        // デバイス情報を更新
        this.deviceInfo = this.camera.getDeviceInfo()
      } catch (error: any) {
        this.showError(error.message)
        console.error('Camera switch error:', error)
      }
    },
    
    async selectZoomLevel(level: number) {
      if (!this.camera) return
      
      // 即座にUI状態を更新（レスポンシブなUX）
      this.currentZoomLevel = level
      this.addDebugLog(`UI状態を即座に更新: ${level}x`, 'info')
      
      try {
        // カメラ処理を実行
        await this.camera.setZoomLevel(level)
        
        // カメラ処理完了後、実際の状態で同期
        const zoomInfo = this.camera.getCurrentZoomInfo()
        this.currentZoomLevel = zoomInfo.level
        this.currentZoomType = zoomInfo.type
        
        this.addDebugLog(`カメラ処理完了後の同期: ${zoomInfo.level}x (${zoomInfo.type})`, 'success')
        
        // カメラ情報を更新
        this.currentCamera = this.camera.getCurrentCamera()
        
        // トーチ状態を再確認
        this.torchSupported = this.camera.isTorchSupported()
        this.torchOn = this.camera.getTorchState()
        
        // デバッグ情報を更新
        this.updateDebugInfo()
        
        // 既存のズーム情報を更新
        this.zoomSupported = this.camera.isZoomSupported()
        if (this.zoomSupported) {
          this.zoomCapabilities = this.camera.getZoomCapabilities()
          this.currentZoom = this.camera.getCurrentZoom()
        }
        
        // デバイス情報を更新
        this.deviceInfo = this.camera.getDeviceInfo()
        
        // Alpine.jsの次の更新サイクルでUI更新を確実にトリガー
        this.$nextTick(() => {
          // 強制的にリアクティブ更新をトリガー
          const currentZoomLevel = this.currentZoomLevel
          const currentZoomType = this.currentZoomType
          this.currentZoomLevel = currentZoomLevel
          this.currentZoomType = currentZoomType
        })
      } catch (error: any) {
        // エラー時は元の状態に戻す
        const zoomInfo = this.camera?.getCurrentZoomInfo()
        if (zoomInfo) {
          this.currentZoomLevel = zoomInfo.level
          this.currentZoomType = zoomInfo.type
        }
        
        this.showError(error.message)
        console.error('Zoom level error:', error)
      }
    },
    
    updateDebugInfo() {
      if (!this.camera) return
      
      this.apiSupport = this.camera.getAPISupport()
      this.cameraParams = this.camera.getCurrentParameters()
      
      // ズーム情報を更新
      if (this.zoomSupported) {
        this.currentZoom = this.camera.getCurrentZoom()
      }
      
      // 統合ズーム情報を更新（重要：デバッグパネル表示用）
      const zoomInfo = this.camera.getCurrentZoomInfo()
      this.currentZoomLevel = zoomInfo.level
      this.currentZoomType = zoomInfo.type
      
      // デバイス情報を更新
      this.deviceInfo = this.camera.getDeviceInfo()
      
      // パラメータを定期的に更新（コメントアウト - 過剰な更新を防ぐ）
      // if (this.cameraActive) {
      //   setTimeout(() => this.updateDebugInfo(), 1000)
      // }
    },
    
    toggleDebug() {
      this.showDebug = !this.showDebug
      if (this.showDebug && this.camera) {
        this.updateDebugInfo()
      }
    },
    
    showError(message: string) {
      this.error = message
      // 3秒後にエラーメッセージを消す
      setTimeout(() => {
        if (this.error === message) {
          this.error = null
        }
      }, 3000)
    },
    
    async updateZoom(value: string | number) {
      if (!this.camera || !this.zoomSupported) return
      
      try {
        await this.camera.applyZoom(parseFloat(value.toString()))
        this.currentZoom = this.camera.getCurrentZoom()
        
        // 統合ズーム情報を更新
        const zoomInfo = this.camera.getCurrentZoomInfo()
        this.currentZoomLevel = zoomInfo.level
        this.currentZoomType = zoomInfo.type
      } catch (error: any) {
        this.showError(error.message)
        console.error('Zoom error:', error)
      }
    },
    
    handleTouchStart(event: TouchEvent) {
      if (event.touches.length === 2) {
        // ピンチジェスチャー開始
        const touch1 = event.touches[0]
        const touch2 = event.touches[1]
        this.initialPinchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        this.initialZoom = this.currentZoom
      }
    },
    
    handleTouchMove(event: TouchEvent) {
      if (event.touches.length === 2 && this.initialPinchDistance > 0) {
        event.preventDefault()
        
        const touch1 = event.touches[0]
        const touch2 = event.touches[1]
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        
        const scale = currentDistance / this.initialPinchDistance
        const newZoom = this.initialZoom * scale
        
        this.updateZoom(newZoom)
      }
    },
    
    handleTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) {
        this.initialPinchDistance = 0
      }
    },
    
    addDebugLog(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
      
      this.debugLogs.push({ time, type, message })
      
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
    },
    
    copyDebugLogs() {
      const logText = this.debugLogs
        .map(log => `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`)
        .join('\n')
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(logText)
          .then(() => {
            this.addDebugLog('ログをクリップボードにコピーしました', 'success')
          })
          .catch(err => {
            this.addDebugLog('ログのコピーに失敗しました', 'error')
            console.error('Copy failed:', err)
          })
      } else {
        // フォールバック: テキストエリアを使用
        const textarea = document.createElement('textarea')
        textarea.value = logText
        textarea.style.position = 'absolute'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          this.addDebugLog('ログをクリップボードにコピーしました', 'success')
        } catch (err) {
          this.addDebugLog('ログのコピーに失敗しました', 'error')
          console.error('Copy failed:', err)
        }
        document.body.removeChild(textarea)
      }
    },
    
    // 設定関連メソッド
    openSettings() {
      // 現在の設定を一時設定にコピー
      this.tempSettings = {
        email: this.settings.email,
        apiKey: this.settings.apiKey
      }
      this.showSettings = true
    },
    
    closeSettings() {
      this.showSettings = false
      // 一時設定をクリア
      this.tempSettings = {
        email: '',
        apiKey: ''
      }
    },
    
    saveSettings() {
      // 簡単なバリデーション
      if (!this.tempSettings.email.trim() || !this.tempSettings.apiKey.trim()) {
        this.showError('メールアドレスとAPIキーを入力してください')
        return
      }
      
      // 設定データを準備
      const newSettings: AppSettings = {
        email: this.tempSettings.email.trim(),
        apiKey: this.tempSettings.apiKey.trim()
      }
      
      // localStorageに保存
      if (saveSettingsToStorage(newSettings)) {
        // 保存成功時のみ状態を更新
        this.settings = newSettings
        
        // EmailSenderにAPIキーを設定
        emailSender.setApiKey(newSettings.apiKey)
        
        this.closeSettings()
        this.addDebugLog('設定をlocalStorageに保存しました', 'success')
      } else {
        // 保存失敗時のエラー処理
        this.showError('設定の保存に失敗しました。ブラウザの設定を確認してください。')
        this.addDebugLog('localStorage保存エラー', 'error')
      }
    },
    
    // 設定完了チェック
    checkSettingsComplete() {
      return this.settings.email.trim() !== '' && this.settings.apiKey.trim() !== ''
    },
    
    // テストメール送信
    async sendTestEmail() {
      // バリデーション
      if (!this.tempSettings.email.trim() || !this.tempSettings.apiKey.trim()) {
        this.showError('メールアドレスとAPIキーを入力してください')
        return
      }
      
      this.isSendingTestEmail = true
      this.addDebugLog('テストメール送信を開始...', 'info')
      
      try {
        // テストメール送信
        const result = await emailSender.sendTestEmail(
          this.tempSettings.apiKey.trim(),
          this.tempSettings.email.trim(),
          this.tempSettings.email.trim()
        )
        
        if (result.success) {
          this.addDebugLog(`テストメール送信成功: messageId=${result.messageId}`, 'success')
          this.showError('') // エラーメッセージをクリア
          
          // 成功メッセージを表示
          const successMessage = 'テストメールを送信しました。指定したメールアドレスを確認してください。'
          this.addDebugLog(successMessage, 'success')
          
          // 一時的に成功メッセージを表示（3秒後に消える）
          const originalError = this.error
          this.error = '✅ ' + successMessage
          setTimeout(() => {
            if (this.error === '✅ ' + successMessage) {
              this.error = originalError
            }
          }, 5000)
          
        } else {
          this.addDebugLog(`テストメール送信失敗: ${result.error}`, 'error')
          this.showError(`テストメール送信に失敗しました: ${result.error}`)
          
          // 詳細なエラー情報をデバッグログに記録
          if (result.details) {
            this.addDebugLog(`エラー詳細: ${JSON.stringify(result.details)}`, 'debug')
          }
        }
        
      } catch (error: any) {
        this.addDebugLog(`テストメール送信エラー: ${error.message}`, 'error')
        this.showError(`予期しないエラーが発生しました: ${error.message}`)
        console.error('Test email error:', error)
        
      } finally {
        this.isSendingTestEmail = false
      }
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})