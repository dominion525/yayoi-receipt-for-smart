import { TIMEOUTS } from '../constants/timeouts'

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
        if ((this as any).addDebugLog) {
          (this as any).addDebugLog('標準カメラで撮影された画像を処理中...', 'info')
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
            
            if ((this as any).addDebugLog) {
              (this as any).addDebugLog('標準カメラで撮影完了', 'success')
            }
          }
        }
        
        reader.onerror = () => {
          if ((this as any).showError) {
            (this as any).showError('画像の読み込みに失敗しました')
          }
          if ((this as any).addDebugLog) {
            (this as any).addDebugLog('画像読み込みエラー', 'error')
          }
        }
        
        reader.readAsDataURL(file)
      }
      
      // inputをリセット（同じファイルを再選択できるように）
      input.value = ''
    },
    
    // 再撮影
    retake() {
      this.photo = null
      if ((this as any).error) {
        (this as any).error = null
      }
      // successMessageは保持（撮影画面に戻っても表示を続ける）
    },
    
    // ホームに戻る
    returnToHome() {
      this.photo = null
      if ((this as any).error) {
        (this as any).error = null
      }
    }
  }
}