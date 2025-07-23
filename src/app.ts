import { Camera } from './lib/camera'
import Alpine from 'alpinejs'

export interface DebugLog {
  time: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
  message: string
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
    
    async startCamera() {
      this.isLoading = true
      this.error = null
      
      try {
        // カメラサポートチェック
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('このブラウザはカメラ機能をサポートしていません')
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
        this.showError(error.message)
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
    
    sendMail() {
      // TODO: メール送信機能の実装
      alert('メール送信機能は後で実装します')
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
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})