import { TIMEOUTS } from '../constants/timeouts'
import { CompleteAppData } from '../types/app'

export interface PhotoCaptureComposable {
  photo: string | null
  showCaptureEffect: boolean
  handleNativeCamera: (event: Event) => void
  retake: () => void
  returnToHome: () => void
}

export function usePhotoCapture(): PhotoCaptureComposable {
  return {
    // 状態
    photo: null,
    showCaptureEffect: false,
    
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
            // キャプチャエフェクトを表示
            this.showCaptureEffect = true
            
            // 画像を設定
            this.photo = result
            
            // エフェクトを非表示
            setTimeout(() => {
              this.showCaptureEffect = false
            }, TIMEOUTS.CAPTURE_EFFECT)
            
            if (app.addDebugLog) {
              app.addDebugLog('標準カメラで撮影完了', 'success')
            }
          }
        }
        
        reader.onerror = () => {
          if (app.showError) {
            app.showError('画像の読み込みに失敗しました')
          }
          if (app.addDebugLog) {
            app.addDebugLog('画像読み込みエラー', 'error')
          }
        }
        
        reader.readAsDataURL(file)
      }
      
      // inputをリセット（同じファイルを再選択できるように）
      input.value = ''
    },
    
    // 再撮影
    retake() {
      const app = this as CompleteAppData
      app.photo = null
      app.showCaptureEffect = false
      
      // エラーメッセージをクリア
      if (app.error) {
        app.error = null
      }
    },
    
    // ホームに戻る
    returnToHome() {
      this.photo = null
      // すべてのメッセージをクリア
      const app = this as CompleteAppData
      if (app.clearMessages) {
        app.clearMessages()
      }
    }
  }
}