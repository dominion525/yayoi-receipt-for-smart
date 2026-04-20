import { TIMEOUTS } from '../constants/timeouts'

export interface MessageComposable {
  error: string | null
  successMessage: string | null
  showMessage: (message: string, type: 'error' | 'success') => void
  showError: (message: string) => void
  showSuccess: (message: string) => void
  handleEmailMessage: (message: string) => void
  clearMessages: () => void
}

export function useMessage(): MessageComposable {
  return {
    // 状態
    error: null,
    successMessage: null,

    // 汎用メッセージ表示
    showMessage(message: string, type: 'error' | 'success') {
      if (type === 'error') {
        this.error = message
        setTimeout(() => {
          if (this.error === message) {
            this.error = null
          }
        }, TIMEOUTS.ERROR_MESSAGE)
      } else {
        this.successMessage = message
        setTimeout(() => {
          if (this.successMessage === message) {
            this.successMessage = null
          }
        }, TIMEOUTS.SUCCESS_MESSAGE)
      }
    },

    // エラーメッセージ表示
    showError(message: string) {
      this.showMessage(message, 'error')
    },

    // 成功メッセージ表示
    showSuccess(message: string) {
      this.showMessage(message, 'success')
    },

    // メール処理メッセージハンドラー
    handleEmailMessage(message: string) {
      // 成功メッセージとエラーメッセージを分けて処理
      if (message.startsWith('✅')) {
        // 成功メッセージは無視（app.tsのcompletionMessageで処理）
        return
      } else {
        // エラーメッセージは従来通り
        this.showError(message)
      }
    },

    // メッセージクリア
    clearMessages() {
      this.error = null
      this.successMessage = null
    }
  }
}
