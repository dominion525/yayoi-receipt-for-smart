export interface CameraOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  width?: number
  height?: number
  onLog?: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug') => void
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
  private isMobile: boolean = false
  private onLog?: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug') => void
  private lastFrameDataUrl: string | null = null
  private isSwitching: boolean = false

  constructor(options: CameraOptions) {
    this.video = options.video
    this.canvas = options.canvas
    this.width = options.width || 640
    this.height = options.height || 480
    this.isMobile = this.isMobileDevice()
    this.onLog = options.onLog
  }
  
  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`)
    if (this.onLog) {
      this.onLog(message, type)
    }
  }
  
  private isMobileDevice(): boolean {
    // User-Agentでモバイルデバイスを判定
    const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const userAgentCheck = mobileRegex.test(navigator.userAgent)
    
    // screen.orientationのサポート状況でもチェック
    const hasOrientationAPI = typeof screen.orientation !== 'undefined'
    
    // タッチイベントのサポート状況でも追加チェック
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    return userAgentCheck || (hasOrientationAPI && hasTouchSupport)
  }
  

  async start(deviceId?: string): Promise<void> {
    try {
      
      // 利用可能なカメラデバイスを取得
      await this.updateDeviceList()
      
      // 物理カメラ検出状況をログ
      if (this.devices.length > 0) {
        this.log(`検出されたカメラ: ${this.devices.length}台 (${this.devices.map(d => d.zoom + 'x').join(', ')})`, 'info')
        // 望遠カメラの検出ログ
        const telephotoCameras = this.devices.filter(d => d.zoom === 2 || d.zoom === 3)
        if (telephotoCameras.length > 0) {
          telephotoCameras.forEach(cam => {
            this.log(`望遠カメラ検出: ${cam.label} → ${cam.zoom}x (ラベル分析による判定)`, 'success')
          })
        }
      }
      
      const constraints: CameraConstraints = {
        audio: false,
        video: {
          width: { ideal: this.width },
          height: { ideal: this.height }
        }
      }
      
      if (deviceId) {
        this.log(`指定されたdeviceIdでカメラを起動: ${deviceId.substring(0, 8)}...`, 'info')
        constraints.video.deviceId = { exact: deviceId }
        // 指定されたdeviceIdのカメラのズーム倍率を設定
        const targetDevice = this.devices.find(d => d.deviceId === deviceId)
        if (targetDevice) {
          this.currentZoom = targetDevice.zoom
        }
      } else if (this.devices.length > 0) {
        // 背面カメラを優先的に選択
        const rearCamera = this.devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        )
        if (rearCamera) {
          constraints.video.deviceId = { exact: rearCamera.deviceId }
          this.currentDeviceIndex = this.devices.indexOf(rearCamera)
        } else {
          // 背面カメラがない場合の処理
          if (this.isMobile) {
            // モバイル: 背面カメラを厳格に要求
            constraints.video.facingMode = { exact: 'environment' }
          } else {
            // PC: 利用可能な最初のカメラを使用
            constraints.video.deviceId = { exact: this.devices[0].deviceId }
            this.currentDeviceIndex = 0
          }
        }
      } else {
        // デバイスリストが取得できない場合
        if (this.isMobile) {
          // モバイル: 背面カメラを指定
          constraints.video.facingMode = { exact: 'environment' }
        } else {
          // PC: フロントカメラを許可
          constraints.video.facingMode = 'user'
        }
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video.srcObject = this.stream
      
      // ビデオトラックを保存
      const videoTracks = this.stream.getVideoTracks()
      if (videoTracks.length > 0) {
        this.currentTrack = videoTracks[0]
        
        // 実際に起動したカメラ情報をログ出力
        const settings = this.currentTrack.getSettings() as any
        const actualDevice = this.devices.find(d => d.deviceId === settings.deviceId)
        if (actualDevice) {
          this.log(`カメラ起動成功: ${actualDevice.label} (${actualDevice.zoom}x) [${actualDevice.deviceId.substring(0, 8)}...]`, 'success')
          // 物理カメラのズーム倍率を設定
          this.currentZoom = actualDevice.zoom
          this.log(`currentZoom更新: ${this.currentZoom}x`, 'debug')
        } else {
          this.log(`カメラ起動成功（デバイス不明）: deviceId=${settings.deviceId?.substring(0, 8)}...`, 'warning')
          // デバイスが不明な場合もデフォルトで1xとする
          this.currentZoom = 1
        }
        
        // currentDeviceIndexを更新
        if (actualDevice) {
          const newIndex = this.devices.indexOf(actualDevice)
          if (newIndex !== -1 && newIndex !== this.currentDeviceIndex) {
            this.currentDeviceIndex = newIndex
          }
        }
      }

      // ビデオのメタデータが読み込まれるのを待つ
      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
          resolve()
        }
      })
    } catch (error: any) {
      // カメラが見つからない場合のエラーメッセージをカスタマイズ
      if (error.name === 'OverconstrainedError' && error.constraint === 'facingMode') {
        if (this.isMobile) {
          throw new Error('背面カメラが見つかりません。デバイスに背面カメラがあるか確認してください。')
        } else {
          throw new Error('カメラが見つかりません。ブラウザのカメラアクセス許可を確認し、カメラが接続されているか確認してください。')
        }
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
      // currentZoomはリセットしない（物理カメラ切り替え時に必要）
    }
  }
  
  private async updateDeviceList(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    
    // デバッグ: 全デバイスをログ出力
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    
    // ラベルが空の場合は警告
    if (videoDevices.some(d => !d.label)) {
      this.log('カメラのラベルが取得できません。カメラ権限を確認してください。', 'warning')
    }
    
    // 削除: カメラ総数による推測は使用しない
    
    // フィルタリング処理
    const filteredDevices = devices.filter(device => {
      if (device.kind !== 'videoinput') return false
      const label = device.label.toLowerCase()
      
      // 前面カメラをより包括的に除外（日本語ラベルも考慮）
      const isFrontCamera = label.includes('front') || 
                          label.includes('user') || 
                          label.includes('facetime') ||
                          label.includes('webcam') ||
                          label.includes('前面') ||
                          (label.includes('camera') && label.includes('0')) // 一部のPCウェブカメラ
      
      if (this.isMobile) {
        // モバイル: 背面カメラのみを許可
        return !isFrontCamera
      } else {
        // PC: 背面カメラがあればそれを優先、なければフロントカメラも許可
        const hasRearCamera = devices.some(d => {
          const dLabel = d.label.toLowerCase()
          return d.kind === 'videoinput' && 
                 (dLabel.includes('back') || dLabel.includes('rear') || dLabel.includes('environment')) &&
                 !dLabel.includes('front') && !dLabel.includes('user')
        })
        
        if (hasRearCamera) {
          // 背面カメラがある場合は背面カメラのみ
          return !isFrontCamera
        } else {
          // 背面カメラがない場合はフロントカメラも許可
          return true
        }
      }
    })

    // ラベルベース判定のみを使用してシンプルに処理
    this.log('ラベルベースのカメラ分析を開始...', 'info')
    
    this.devices = filteredDevices.map((device, index) => {
      const label = device.label || ''
      
      // デバッグ用にラベルをログ出力
      if (label) {
        this.log(`カメラ検出: "${label}"`, 'debug')
      }
      
      let zoom = 1 // デフォルトは1x
      const lowerLabel = label.toLowerCase()
      
      // ラベルベースでズーム倍率を判定
      if (lowerLabel.includes('ultra wide') || lowerLabel.includes('ultra-wide') || 
          lowerLabel.includes('0.5x') || lowerLabel.includes('0.5') ||
          lowerLabel.includes('超広角')) {
        zoom = 0.5
      } else if (lowerLabel.includes('3x') || lowerLabel.includes('3倍')) {
        zoom = 3
      } else if (lowerLabel.includes('2x') || lowerLabel.includes('2倍')) {
        zoom = 2
      } else if (lowerLabel.includes('telephoto') || lowerLabel.includes('tele') || 
                 lowerLabel.includes('望遠')) {
        // 望遠カメラの倍率を判定（ラベルに明示されている場合のみ）
        if (lowerLabel.includes('3x') || lowerLabel.includes('3倍')) {
          zoom = 3
        } else if (lowerLabel.includes('2x') || lowerLabel.includes('2倍')) {
          zoom = 2
        } else {
          // 倍率が不明な望遠カメラはデフォルトで2xとする
          zoom = 2
        }
      } else if (lowerLabel.includes('wide') || lowerLabel.includes('main') || 
                 lowerLabel.includes('1x') || lowerLabel.includes('広角')) {
        zoom = 1
      }
      
      this.log(`ラベル分析完了: ${label} → ${zoom}x`, 'debug')
      
      return {
        deviceId: device.deviceId,
        label: label || `カメラ ${index + 1}`,
        zoom
      }
    })
    
  }
  
  async switchCamera(): Promise<void> {
    if (this.isSwitching) {
      this.log('カメラ切り替えが既に実行中です', 'warning')
      throw new Error('カメラ切り替えが既に実行中です')
    }
    
    if (this.devices.length <= 1) {
      throw new Error('利用可能なカメラが1つしかありません')
    }
    
    this.isSwitching = true
    
    // 次のカメラに切り替え
    this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.devices.length
    const nextDevice = this.devices[this.currentDeviceIndex]
    
    // 切り替え前に現在のビデオサイズを保存
    const currentHeight = this.video.offsetHeight
    if (currentHeight > 0 && this.video.parentElement) {
      this.video.parentElement.style.height = `${currentHeight}px`
      this.video.parentElement.style.transition = 'none' // トランジションを無効化
      this.log(`ビデオ高さを固定: ${currentHeight}px`, 'debug')
    }
    
    // 切り替え前に最後のフレームをキャプチャ
    try {
      this.lastFrameDataUrl = this.capture()
      if (this.lastFrameDataUrl && this.video.parentElement) {
        // 背景として最後のフレームを設定
        this.video.parentElement.style.backgroundImage = `url(${this.lastFrameDataUrl})`
        this.video.parentElement.style.backgroundSize = 'cover'
        this.video.parentElement.style.backgroundPosition = 'center'
        this.video.parentElement.style.backgroundRepeat = 'no-repeat'
      }
    } catch (e) {
      // キャプチャに失敗しても処理を続行
      this.log('最後のフレームのキャプチャに失敗しました', 'debug')
    }
    
    // 一旦カメラを停止
    this.stop()
    
    // 新しいカメラで再開始
    try {
      await this.start(nextDevice.deviceId)
      
      // 新しいカメラが起動したら背景と高さ制約を削除
      if (this.video.parentElement) {
        setTimeout(() => {
          if (this.video.parentElement) {
            this.video.parentElement.style.backgroundImage = ''
            this.video.parentElement.style.height = ''
            this.video.parentElement.style.transition = ''
            this.log('ビデオ高さの固定を解除', 'debug')
          }
        }, 100) // 少し遅延させて映像が表示されてから削除
      }
    } catch (error: any) {
      // 失敗時も背景と高さ制約を削除
      if (this.video.parentElement) {
        this.video.parentElement.style.backgroundImage = ''
        this.video.parentElement.style.height = ''
        this.video.parentElement.style.transition = ''
      }
      throw error
    } finally {
      this.isSwitching = false
    }
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
    if (this.isSwitching) {
      this.log('カメラ切り替えが既に実行中です', 'warning')
      throw new Error('カメラ切り替えが既に実行中です')
    }
    
    this.isSwitching = true
    this.log(`${targetZoom}x カメラを検索中...`, 'info')
    
    // 背面カメラのみを対象にしてzoomで検索
    const rearCameras = this.devices.filter(device => {
      const label = device.label.toLowerCase()
      // 前面カメラを除外（日本語ラベルも考慮）
      return !(label.includes('front') || label.includes('user') || label.includes('facetime') || label.includes('前面'))
    })
    
    this.log(`背面カメラ候補: ${rearCameras.length}台`, 'debug')
    
    const camera = rearCameras.find(device => device.zoom === targetZoom)
    if (!camera) {
      this.log(`${targetZoom}x の背面カメラが見つかりません（候補: ${rearCameras.map(d => d.label).join(', ')}）`, 'error')
      throw new Error(`${targetZoom}x の背面カメラが見つかりません`)
    }
    
    this.log(`${targetZoom}x カメラを発見: ${camera.label} [${camera.deviceId.substring(0, 8)}...]`, 'success')
    
    const oldCamera = this.getCurrentCamera()
    this.log(`カメラ切り替え: ${oldCamera ? `${oldCamera.label} (${oldCamera.zoom}x)` : 'なし'} → ${camera.label} (${camera.zoom}x)`, 'info')
    
    this.currentDeviceIndex = this.devices.indexOf(camera)
    
    // 切り替え前に現在のビデオサイズを保存
    const currentHeight = this.video.offsetHeight
    if (currentHeight > 0 && this.video.parentElement) {
      this.video.parentElement.style.height = `${currentHeight}px`
      this.video.parentElement.style.transition = 'none' // トランジションを無効化
      this.log(`ビデオ高さを固定: ${currentHeight}px`, 'debug')
    }
    
    // 切り替え前に最後のフレームをキャプチャ
    try {
      this.lastFrameDataUrl = this.capture()
      if (this.lastFrameDataUrl && this.video.parentElement) {
        // 背景として最後のフレームを設定
        this.video.parentElement.style.backgroundImage = `url(${this.lastFrameDataUrl})`
        this.video.parentElement.style.backgroundSize = 'cover'
        this.video.parentElement.style.backgroundPosition = 'center'
        this.video.parentElement.style.backgroundRepeat = 'no-repeat'
      }
    } catch (e) {
      // キャプチャに失敗しても処理を続行
      this.log('最後のフレームのキャプチャに失敗しました', 'debug')
    }
    
    // 一旦カメラを停止
    this.stop()
    
    // 新しいカメラで再開始
    try {
      await this.start(camera.deviceId)
      // 物理カメラ切り替え時は、そのカメラのネイティブズーム倍率を設定
      this.currentZoom = camera.zoom
      this.log(`カメラ切り替え完了: ${this.getCurrentCamera()?.label} (${this.getCurrentCamera()?.zoom}x)`, 'success')
      
      // 新しいカメラが起動したら背景と高さ制約を削除
      if (this.video.parentElement) {
        setTimeout(() => {
          if (this.video.parentElement) {
            this.video.parentElement.style.backgroundImage = ''
            this.video.parentElement.style.height = ''
            this.video.parentElement.style.transition = ''
            this.log('ビデオ高さの固定を解除', 'debug')
          }
        }, 100) // 少し遅延させて映像が表示されてから削除
      }
    } catch (error: any) {
      this.log(`カメラ切り替え失敗: ${error.message}`, 'error')
      // 失敗時も背景と高さ制約を削除
      if (this.video.parentElement) {
        this.video.parentElement.style.backgroundImage = ''
        this.video.parentElement.style.height = ''
        this.video.parentElement.style.transition = ''
      }
      throw error
    } finally {
      this.isSwitching = false
    }
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
        this.log('デバイスがズーム機能をサポートしていません', 'warning')
        throw new Error('このデバイスはズーム機能をサポートしていません')
      }

      // ズーム値を範囲内に制限
      const minZoom = capabilities.zoom.min || 1
      const maxZoom = capabilities.zoom.max || 1
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel))
      
      this.log(`デジタルズーム適用: ${zoomLevel}x → ${clampedZoom}x (範囲: ${minZoom}x-${maxZoom}x)`, 'debug')

      // ズームを適用
      await this.currentTrack.applyConstraints({
        advanced: [{ zoom: clampedZoom }]
      } as any)
      
      // 総合ズーム倍率を計算（物理カメラ倍率 × デジタルズーム）
      const currentCamera = this.getCurrentCamera()
      if (currentCamera) {
        this.currentZoom = currentCamera.zoom * clampedZoom
        this.log(`総合ズーム倍率: ${this.currentZoom}x (物理: ${currentCamera.zoom}x × デジタル: ${clampedZoom}x)`, 'debug')
      } else {
        this.currentZoom = clampedZoom
      }
      
      // 実際に適用されたズームを確認
      const settings = this.currentTrack.getSettings() as any
      const actualZoom = settings.zoom || 1
      if (Math.abs(actualZoom - clampedZoom) > 0.1) {
        this.log(`デジタルズーム適用後の値が異なる: 要求=${clampedZoom}x, 実際=${actualZoom}x`, 'warning')
      }
    } catch (error) {
      this.log(`デジタルズーム適用エラー: ${error}`, 'error')
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
    // 内部で保持しているズーム値を優先的に返す
    // iOSではgetSettings().zoomが常に未定義のため
    return this.currentZoom
  }
  
  isZoomSupported(): boolean {
    const capabilities = this.getZoomCapabilities()
    return capabilities !== null && capabilities.max > capabilities.min
  }
  
  getCurrentCameraType(): 'rear' | 'front' | 'unknown' {
    if (!this.currentTrack) {
      return 'unknown'
    }
    
    try {
      const settings = this.currentTrack.getSettings() as any
      
      // facingModeから判定
      if (settings.facingMode === 'environment') {
        return 'rear'
      } else if (settings.facingMode === 'user') {
        return 'front'
      }
      
      // デバイスラベルから判定
      const currentCamera = this.getCurrentCamera()
      if (currentCamera) {
        const label = currentCamera.label.toLowerCase()
        if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          return 'rear'
        } else if (label.includes('front') || label.includes('user')) {
          return 'front'
        }
      }
      
      return 'unknown'
    } catch (error) {
      console.error('Get camera type error:', error)
      return 'unknown'
    }
  }
  
  getDeviceInfo(): { isMobile: boolean, cameraType: 'rear' | 'front' | 'unknown' } {
    return {
      isMobile: this.isMobile,
      cameraType: this.getCurrentCameraType()
    }
  }
  
  getAvailableZoomLevels(): number[] {
    // 背面物理カメラの倍率を取得
    const rearCameras = this.devices.filter(device => {
      const label = device.label.toLowerCase()
      return !(label.includes('front') || label.includes('user') || label.includes('facetime'))
    })
    const physicalZooms = rearCameras.map(device => device.zoom)
    
    // デジタルズームの最大値を取得
    const digitalCapabilities = this.getZoomCapabilities()
    const digitalMax = digitalCapabilities?.max || 1
    const digitalMin = digitalCapabilities?.min || 1
    
    // 0.5x, 1x, 2x, 3x のうち実現可能なものを返す
    const targetLevels = [0.5, 1, 2, 3]
    
    return targetLevels.filter(level => {
      // 背面物理カメラで対応可能
      if (physicalZooms.includes(level)) {
        return true
      }
      
      // デジタルズームで対応可能（ただし、物理カメラがない場合は1x未満は除外）
      if (level >= digitalMin && level <= digitalMax) {
        // 物理カメラが存在しない環境（主にPC）では1x未満のデジタルズームは提供しない
        if (physicalZooms.length === 0 && level < 1) {
          return false
        }
        return true
      }
      
      return false
    }).sort((a, b) => a - b)
  }
  
  async setZoomLevel(targetLevel: number): Promise<void> {
    if (!this.currentTrack) {
      throw new Error('カメラが起動していません')
    }
    
    this.log(`ズームレベル ${targetLevel}x に設定中...`, 'info')
    
    // 優先順位: 背面物理カメラ > デジタルズーム
    // 背面カメラのみを対象に物理カメラを検索
    const rearCameras = this.devices.filter(device => {
      const label = device.label.toLowerCase()
      return !(label.includes('front') || label.includes('user') || label.includes('facetime'))
    })
    
    
    const physicalCamera = rearCameras.find(device => device.zoom === targetLevel)
    
    if (physicalCamera) {
      this.log(`物理カメラ切り替えを実行: ${physicalCamera.label} (${physicalCamera.zoom}x)`, 'info')
      // 光学ズーム（背面物理カメラ切り替え）
      await this.selectCameraByZoom(targetLevel)
    } else {
      // デジタルズーム（現在のカメラでズーム）
      const currentCamera = this.getCurrentCamera()
      if (!currentCamera) {
        throw new Error('現在のカメラ情報が取得できません')
      }
      
      // 現在の物理カメラの倍率を考慮して、必要なデジタルズーム倍率を計算
      const requiredDigitalZoom = targetLevel / currentCamera.zoom
      this.log(`現在の物理カメラ: ${currentCamera.zoom}x, 目標: ${targetLevel}x, 必要なデジタルズーム: ${requiredDigitalZoom}x`, 'debug')
      
      const digitalCapabilities = this.getZoomCapabilities()
      
      if (!digitalCapabilities || requiredDigitalZoom > digitalCapabilities.max) {
        this.log(`${targetLevel}x ズームは対応していません (必要なデジタルズーム: ${requiredDigitalZoom}x, max: ${digitalCapabilities?.max}x)`, 'error')
        throw new Error(`${targetLevel}x ズームは対応していません`)
      }
      this.log(`デジタルズーム ${requiredDigitalZoom}x を適用して ${targetLevel}x を実現`, 'info')
      await this.applyZoom(requiredDigitalZoom)
      // 最終的なズーム倍率を記録
      this.currentZoom = targetLevel
    }
  }
  
  getCurrentZoomInfo(): { level: number, type: 'optical' | 'digital', isPhysicalCamera: boolean } {
    if (!this.currentTrack) {
      return { level: 1, type: 'optical', isPhysicalCamera: false }
    }
    
    try {
      const currentCamera = this.getCurrentCamera()
      if (!currentCamera) {
        this.log('getCurrentZoomInfo: 現在のカメラなし', 'warning')
        return { level: 1, type: 'optical', isPhysicalCamera: false }
      }
      
      // 背面物理カメラのリストを取得
      const rearCameras = this.devices.filter(device => {
        const label = device.label.toLowerCase()
        return !(label.includes('front') || label.includes('user') || label.includes('facetime'))
      })
      
      // 現在のカメラが背面物理カメラリストに含まれているかチェック
      const isPhysicalCamera = rearCameras.some(device => device.deviceId === currentCamera.deviceId)
      
      // 物理カメラの場合は、そのカメラのネイティブズーム倍率を使用
      // デジタルズームが適用されていない限り、currentZoomの値に関わらず物理カメラの倍率を返す
      if (isPhysicalCamera) {
        // デジタルズームが適用されているかチェック
        const settings = this.currentTrack.getSettings() as any
        const hasDigitalZoom = settings.zoom && settings.zoom !== 1
        
        // デバッグ用ログ（頻繁な呼び出しのため削除）
        // this.log(`getCurrentZoomInfo: camera=${currentCamera.label}(${currentCamera.zoom}x), currentZoom=${this.currentZoom}, settings.zoom=${settings.zoom}, hasDigitalZoom=${hasDigitalZoom}`, 'debug')
        
        if (hasDigitalZoom) {
          // デジタルズームが適用されている
          const digitalZoom = this.getCurrentZoom()
          const roundedZoom = Math.round(digitalZoom * 10) / 10
          const zoomRatio = roundedZoom / currentCamera.zoom
          
          if (zoomRatio < 1.5 && zoomRatio > 0.67) {
            // センサークロップ範囲内
            return {
              level: roundedZoom,
              type: 'optical',
              isPhysicalCamera: true
            }
          } else {
            // デジタル補間が必要
            return {
              level: roundedZoom,
              type: 'digital',
              isPhysicalCamera: false
            }
          }
        } else {
          // デジタルズームなし = 物理カメラのネイティブ倍率
          return {
            level: currentCamera.zoom,
            type: 'optical',
            isPhysicalCamera: true
          }
        }
      } else {
        // 単一カメラでのズーム
        const digitalZoom = this.getCurrentZoom()
        const roundedZoom = Math.round(digitalZoom * 10) / 10
        
        return {
          level: roundedZoom,
          type: roundedZoom === 1 ? 'optical' : 'digital',
          isPhysicalCamera: false
        }
      }
    } catch (error) {
      this.log(`Get zoom info error: ${error}`, 'error')
      return { level: 1, type: 'optical', isPhysicalCamera: false }
    }
  }
}

