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
  }
}

export class Camera {
  private stream: MediaStream | null = null
  private video: HTMLVideoElement
  private canvas: HTMLCanvasElement
  private width: number
  private height: number

  constructor(options: CameraOptions) {
    this.video = options.video
    this.canvas = options.canvas
    this.width = options.width || 640
    this.height = options.height || 480
  }

  async start(): Promise<void> {
    try {
      const constraints: CameraConstraints = {
        audio: false,
        video: {
          facingMode: 'environment', // リアカメラを優先
          width: { ideal: this.width },
          height: { ideal: this.height }
        }
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video.srcObject = this.stream

      // ビデオのメタデータが読み込まれるのを待つ
      return new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
          resolve()
        }
      })
    } catch (error) {
      throw this.handleError(error)
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
      this.video.srcObject = null
    }
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
}