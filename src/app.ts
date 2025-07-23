import { Camera } from './lib/camera'
import Alpine from 'alpinejs'

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
  showDebug: boolean
  apiSupport: any | null
  cameraParams: any | null
  zoomSupported: boolean
  zoomCapabilities: any | null
  currentZoom: number
  initialPinchDistance: number
  initialZoom: number
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
    showDebug: false,
    apiSupport: null,
    cameraParams: null,
    zoomSupported: false,
    zoomCapabilities: null,
    currentZoom: 1,
    initialPinchDistance: 0,
    initialZoom: 1,
    
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
          canvas: this.$refs.canvas
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
        
        // デバッグ情報を取得
        this.updateDebugInfo()
        
        // ズームサポートを確認
        this.zoomSupported = this.camera.isZoomSupported()
        if (this.zoomSupported) {
          this.zoomCapabilities = this.camera.getZoomCapabilities()
          this.currentZoom = this.camera.getCurrentZoom()
        }
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
        this.apiSupport = null
        this.cameraParams = null
        this.zoomSupported = false
        this.zoomCapabilities = null
        this.currentZoom = 1
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
      } catch (error: any) {
        this.showError(error.message)
        console.error('Camera switch error:', error)
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
      
      // パラメータを定期的に更新
      if (this.cameraActive) {
        setTimeout(() => this.updateDebugInfo(), 1000)
      }
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
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})