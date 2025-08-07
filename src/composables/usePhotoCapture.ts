import { CompleteAppData } from '../types/app'

export interface PhotoCaptureComposable {
  photo: string | null
  handleNativeCamera: (event: Event) => void
  retake: () => void
  returnToHome: () => void
}

export function usePhotoCapture(): PhotoCaptureComposable {
  return {
    // 状態
    photo: null,
    
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
            // 画像を設定（標準カメラアプリ自体がフィードバックを提供するのでエフェクトは不要）
            this.photo = result
            
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