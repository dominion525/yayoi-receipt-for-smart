export interface CameraOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  width?: number
  height?: number
}

export interface CameraConstraints {
  audio: boolean
  video: {
    facingMode?: string
    width?: { ideal: number }
    height?: { ideal: number }
    deviceId?: { exact: string }
  }
}

export interface CameraDevice {
  deviceId: string
  label: string
  zoom?: number
}

export interface APISupport {
  getUserMedia: boolean
  enumerateDevices: boolean
  mediaStreamTrack: boolean
  applyConstraints: boolean
  getCapabilities: boolean
  getSettings: boolean
  torch: boolean
  zoom: boolean
  focusMode: boolean
  exposureMode: boolean
  whiteBalanceMode: boolean
}

export interface CameraParameters {
  width?: number
  height?: number
  frameRate?: number
  torch?: boolean
  zoom?: number
  focusMode?: string
  exposureMode?: string
  whiteBalanceMode?: string
  iso?: number
  exposureTime?: number
  colorTemperature?: number
}

export class Camera {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement
  private canvas: HTMLCanvasElement
  private width: number
  private height: number
  private currentTrack: MediaStreamTrack | null = null
  private devices: CameraDevice[] = []
  private currentDeviceIndex: number = 0
  private currentZoom: number = 1

  constructor(options: CameraOptions) {
    this.video = options.video
    this.canvas = options.canvas
    this.width = options.width || 640
    this.height = options.height || 480
  }

  async start(deviceId?: string): Promise<void> {
    try {
      // 利用可能なカメラデバイスを取得
      await this.updateDeviceList()
      
      const constraints: CameraConstraints = {
        audio: false,
        video: {
          width: { ideal: this.width },
          height: { ideal: this.height }
        }
      }
      
      if (deviceId) {
        constraints.video.deviceId = { exact: deviceId }
      } else if (this.devices.length > 0) {
        // 背面カメラのみを使用
        const rearCamera = this.devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        )
        if (rearCamera) {
          constraints.video.deviceId = { exact: rearCamera.deviceId }
          this.currentDeviceIndex = this.devices.indexOf(rearCamera)
        } else {
          // 背面カメラが見つからない場合、facingModeで指定
          constraints.video.facingMode = { exact: 'environment' }
        }
      } else {
        // デバイスリストが取得できない場合も背面カメラを指定
        constraints.video.facingMode = { exact: 'environment' }
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video.srcObject = this.stream
      
      // ビデオトラックを保存
      const videoTracks = this.stream.getVideoTracks()
      if (videoTracks.length > 0) {
        this.currentTrack = videoTracks[0]
      }

      // ビデオのメタデータが読み込まれるのを待つ
      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
          resolve()
        }
      })
    } catch (error) {
      // 背面カメラが見つからない場合のエラーメッセージをカスタマイズ
      if (error.name === 'OverconstrainedError' && error.constraint === 'facingMode') {
        throw new Error('背面カメラが見つかりません。デバイスに背面カメラがあるか確認してください。')
      }
      throw this.handleError(error)
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
      this.video.srcObject = null
      this.currentTrack = null
    }
  }
  
  private async updateDeviceList(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    // 背面カメラのみをフィルタリング
    this.devices = devices
      .filter(device => {
        if (device.kind !== 'videoinput') return false
        const label = device.label.toLowerCase()
        // フロントカメラを除外
        if (label.includes('front') || label.includes('user')) return false
        return true
      })
      .map((device, index) => {
        // iPhoneのカメラ名から倍率を推定
        let zoom = 1
        const label = device.label.toLowerCase()
        if (label.includes('ultra wide') || label.includes('0.5x')) {
          zoom = 0.5
        } else if (label.includes('telephoto') || label.includes('2x')) {
          zoom = 2
        } else if (label.includes('3x')) {
          zoom = 3
        }
        
        return {
          deviceId: device.deviceId,
          label: device.label || `背面カメラ ${index + 1}`,
          zoom
        }
      })
  }
  
  async switchCamera(): Promise<void> {
    if (this.devices.length <= 1) {
      throw new Error('利用可能なカメラが1つしかありません')
    }
    
    // 次のカメラに切り替え
    this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.devices.length
    const nextDevice = this.devices[this.currentDeviceIndex]
    
    // 一旦カメラを停止
    this.stop()
    
    // 新しいカメラで再開始
    await this.start(nextDevice.deviceId)
  }
  
  getAvailableCameras(): CameraDevice[] {
    return this.devices
  }
  
  getCurrentCamera(): CameraDevice | null {
    if (this.devices.length === 0) return null
    return this.devices[this.currentDeviceIndex]
  }

  capture(): string | null {
    if (!this.stream) {
      throw new Error('カメラが起動していません')
    }

    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas contextを取得できませんでした')
    }

    // ビデオの実際のサイズを取得
    const videoWidth = this.video.videoWidth
    const videoHeight = this.video.videoHeight

    if (videoWidth && videoHeight) {
      // canvasのサイズをビデオに合わせる
      this.canvas.width = videoWidth
      this.canvas.height = videoHeight

      // ビデオフレームをcanvasに描画
      context.drawImage(this.video, 0, 0, videoWidth, videoHeight)

      // 画像をDataURL形式で取得
      return this.canvas.toDataURL('image/png')
    }

    return null
  }

  private handleError(error: any): Error {
    console.error('Camera error:', error)

    if (error.name === 'NotAllowedError') {
      return new Error('カメラへのアクセスが拒否されました。設定でカメラの使用を許可してください。')
    } else if (error.name === 'NotFoundError') {
      return new Error('カメラが見つかりません。デバイスにカメラが接続されているか確認してください。')
    } else if (error.name === 'NotReadableError') {
      return new Error('カメラにアクセスできません。他のアプリケーションで使用中の可能性があります。')
    } else if (error.name === 'OverconstrainedError') {
      return new Error('要求されたカメラ設定はサポートされていません。')
    } else if (error.name === 'SecurityError') {
      return new Error('セキュリティエラー: HTTPSで接続してください。')
    } else {
      return new Error(`カメラエラー: ${error.message || '不明なエラーが発生しました'}`)
    }
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  async toggleTorch(): Promise<boolean> {
    if (!this.currentTrack) {
      throw new Error('カメラが起動していません')
    }

    try {
      const capabilities = this.currentTrack.getCapabilities() as any
      
      // トーチがサポートされているか確認
      if (!capabilities.torch) {
        throw new Error('このデバイスはトーチ機能をサポートしていません')
      }

      // 現在のトーチ状態を取得
      const settings = this.currentTrack.getSettings() as any
      const currentTorchState = settings.torch || false
      const newTorchState = !currentTorchState

      // トーチ状態を切り替え
      // iOS Safariの場合、advancedを使わずに直接constraintsを指定
      const constraints = {
        torch: newTorchState
      } as any
      
      await this.currentTrack.applyConstraints(constraints)

      return newTorchState
    } catch (error) {
      // advancedで失敗した場合のフォールバック
      try {
        await this.currentTrack.applyConstraints({
          advanced: [{ torch: !this.getTorchState() }]
        } as any)
        return !this.getTorchState()
      } catch (fallbackError) {
        throw this.handleError(error)
      }
    }
  }

  getTorchState(): boolean {
    if (!this.currentTrack) {
      return false
    }

    try {
      const settings = this.currentTrack.getSettings() as any
      return settings.torch || false
    } catch (error) {
      console.error('Get torch state error:', error)
      return false
    }
  }

  isTorchSupported(): boolean {
    if (!this.currentTrack) {
      return false
    }

    try {
      const capabilities = this.currentTrack.getCapabilities() as any
      
      // torchプロパティが存在するか確認
      const hasTorch = 'torch' in capabilities
      
      return hasTorch
    } catch (error) {
      console.error('Check torch support error:', error)
      return false
    }
  }
  
  async selectCameraByZoom(targetZoom: number): Promise<void> {
    const camera = this.devices.find(device => device.zoom === targetZoom)
    if (!camera) {
      throw new Error(`${targetZoom}x のカメラが見つかりません`)
    }
    
    this.currentDeviceIndex = this.devices.indexOf(camera)
    
    // 一旦カメラを停止
    this.stop()
    
    // 新しいカメラで再開始
    await this.start(camera.deviceId)
  }
  
  getAPISupport(): APISupport {
    const support: APISupport = {
      getUserMedia: false,
      enumerateDevices: false,
      mediaStreamTrack: false,
      applyConstraints: false,
      getCapabilities: false,
      getSettings: false,
      torch: false,
      zoom: false,
      focusMode: false,
      exposureMode: false,
      whiteBalanceMode: false
    }

    // 基本APIのチェック
    if (navigator.mediaDevices) {
      support.getUserMedia = typeof navigator.mediaDevices.getUserMedia === 'function'
      support.enumerateDevices = typeof navigator.mediaDevices.enumerateDevices === 'function'
    }

    // MediaStreamTrack APIのチェック
    if (window.MediaStreamTrack) {
      support.mediaStreamTrack = true
      const proto = MediaStreamTrack.prototype
      support.applyConstraints = typeof proto.applyConstraints === 'function'
      support.getCapabilities = typeof proto.getCapabilities === 'function'
      support.getSettings = typeof proto.getSettings === 'function'
    }

    // 現在のトラックから機能サポートを確認
    if (this.currentTrack && support.getCapabilities) {
      try {
        const capabilities = this.currentTrack.getCapabilities() as any
        support.torch = !!capabilities.torch
        support.zoom = !!capabilities.zoom
        support.focusMode = !!capabilities.focusMode
        support.exposureMode = !!capabilities.exposureMode
        support.whiteBalanceMode = !!capabilities.whiteBalanceMode
      } catch (error) {
        console.error('Error checking capabilities:', error)
      }
    }

    return support
  }
  
  getCurrentParameters(): CameraParameters {
    const params: CameraParameters = {}
    
    if (!this.currentTrack || !this.currentTrack.getSettings) {
      return params
    }
    
    try {
      const settings = this.currentTrack.getSettings() as any
      
      // 基本パラメータ
      params.width = settings.width
      params.height = settings.height
      params.frameRate = settings.frameRate
      
      // カメラ特有のパラメータ
      params.torch = settings.torch
      params.zoom = settings.zoom
      params.focusMode = settings.focusMode
      params.exposureMode = settings.exposureMode
      params.whiteBalanceMode = settings.whiteBalanceMode
      params.iso = settings.iso
      params.exposureTime = settings.exposureTime
      params.colorTemperature = settings.colorTemperature
      
    } catch (error) {
      console.error('Error getting parameters:', error)
    }
    
    return params
  }
  
  async applyZoom(zoomLevel: number): Promise<void> {
    if (!this.currentTrack) {
      throw new Error('カメラが起動していません')
    }

    try {
      const capabilities = this.currentTrack.getCapabilities() as any
      
      // ズームがサポートされているか確認
      if (!capabilities.zoom) {
        throw new Error('このデバイスはズーム機能をサポートしていません')
      }

      // ズーム値を範囲内に制限
      const minZoom = capabilities.zoom.min || 1
      const maxZoom = capabilities.zoom.max || 1
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel))

      // ズームを適用
      await this.currentTrack.applyConstraints({
        advanced: [{ zoom: clampedZoom }]
      } as any)
      
      this.currentZoom = clampedZoom
    } catch (error) {
      throw this.handleError(error)
    }
  }
  
  getZoomCapabilities(): { min: number, max: number, step: number } | null {
    if (!this.currentTrack) {
      return null
    }

    try {
      const capabilities = this.currentTrack.getCapabilities() as any
      
      if (!capabilities.zoom) {
        return null
      }
      
      return {
        min: capabilities.zoom.min || 1,
        max: capabilities.zoom.max || 1,
        step: capabilities.zoom.step || 0.1
      }
    } catch (error) {
      console.error('Get zoom capabilities error:', error)
      return null
    }
  }
  
  getCurrentZoom(): number {
    if (!this.currentTrack) {
      return 1
    }

    try {
      const settings = this.currentTrack.getSettings() as any
      return settings.zoom || this.currentZoom
    } catch (error) {
      console.error('Get current zoom error:', error)
      return this.currentZoom
    }
  }
  
  isZoomSupported(): boolean {
    const capabilities = this.getZoomCapabilities()
    return capabilities !== null && capabilities.max > capabilities.min
  }
}