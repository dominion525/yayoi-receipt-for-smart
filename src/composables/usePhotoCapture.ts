import { CompleteAppData } from '../types/app'

export interface PhotoCaptureComposable {
  photo: string | null
  isCameraActive: boolean
  handleCameraClick: () => void
  handleNativeCamera: (event: Event) => void
  retake: () => void
  returnToHome: () => void
}

export function usePhotoCapture(): PhotoCaptureComposable {
  return {
    // 状態
    photo: null,
    isCameraActive: false,

    // カメラボタンクリック時の処理
    handleCameraClick() {
      const app = this as CompleteAppData

      if (app.addDebugLog) {
        app.addDebugLog('カメラ起動中...', 'info')
      }

      // カメラを即座に起動
      const cameraInput = document.getElementById('camera-input') as HTMLInputElement
      if (cameraInput) {
        cameraInput.click()

        // カメラが起動したら即座に画面を切り替え（iOS/Androidで遅延なし）
        // プレースホルダー画像をセット（透明な1x1のbase64画像）
        this.photo =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        this.isCameraActive = true
      }
    },

    // 標準カメラアプリでの撮影処理
    handleNativeCamera(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]

      if (file) {
        // デバッグログ（Alpine.jsコンテキストで参照）
        const app = this as CompleteAppData

        if (app.addDebugLog) {
          app.addDebugLog('標準カメラで撮影された画像を処理中...', 'info')
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (result && typeof result === 'string') {
            // 実際の画像に置き換え
            this.photo = result
            // カメラアクティブフラグをオフ
            this.isCameraActive = false

            if (app.addDebugLog) {
              app.addDebugLog('標準カメラで撮影完了', 'success')
            }
          }
        }

        reader.onerror = () => {
          // エラー時はカメラアクティブフラグをオフにして元に戻す
          this.isCameraActive = false
          this.photo = null

          if (app.showError) {
            app.showError('画像の読み込みに失敗しました')
          }
          if (app.addDebugLog) {
            app.addDebugLog('画像読み込みエラー', 'error')
          }
        }

        reader.readAsDataURL(file)
      } else {
        // ファイルが選択されなかった場合（キャンセル）
        this.isCameraActive = false
        this.photo = null
      }

      // inputをリセット（同じファイルを再選択できるように）
      input.value = ''
    },

    // 再撮影
    retake() {
      const app = this as CompleteAppData
      app.photo = null
      this.isCameraActive = false

      // エラーメッセージをクリア
      if (app.error) {
        app.error = null
      }
    },

    // ホームに戻る
    returnToHome() {
      this.photo = null
      this.isCameraActive = false
      // すべてのメッセージをクリア
      const app = this as CompleteAppData
      if (app.clearMessages) {
        app.clearMessages()
      }
    }
  }
}
