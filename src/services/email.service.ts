import { emailSender } from '../lib/mail'
import { AppSettings } from './settings.service'
import { getErrorMessage } from '../utils/error'
import { maskApiKey } from '../utils/mask'
import { ProgressCallback } from '../types/progress.types'

export interface EmailResult {
  success: number
  failed: number
  errorMessages: string[]
}

export interface DebugLogger {
  (message: string, type?: 'info' | 'success' | 'warning' | 'error' | 'debug'): void
}

export interface ErrorDisplayer {
  (message: string): void
}

/**
 * メール送信を管理するサービス
 */
export class EmailService {
  /**
   * レシート画像を全アクティブプリセットの宛先に一括送信する。
   *
   * - `settings.sendPresets` のうち `isActive=true` かつ `recipients` が空でないものを集約し、
   *   重複を除去した上で 1 回の Resend 送信にまとめる。
   * - 送信先が 0 件なら `showError` を呼んで早期 return する。
   * - `onProgress` は最低 2 回呼ばれる: 開始時に `status='sending'`、終了時に `status='completed'` か `'error'`。
   * - エラーメッセージは BYOK 観点でクライアントに渡す前に `maskApiKey` を必ず適用する
   *   （Resend レスポンスや例外オブジェクトに APIキー文字列が紛れる可能性があるため）。
   *
   * @returns `success`: 送信成功フラグ、`shouldRetake`: 成功時のみ true（呼び出し元で撮影画面に戻すか判断する）
   */
  static async sendMail(
    photo: string,
    settings: AppSettings,
    addDebugLog: DebugLogger,
    showError: ErrorDisplayer,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; shouldRetake: boolean }> {
    if (!photo) {
      showError('写真が撮影されていません')
      return { success: false, shouldRetake: false }
    }

    // 送信先を収集（アクティブなプリセットの全宛先、空文字・空白除外）
    const recipients: string[] = []
    for (const preset of settings.sendPresets) {
      if (preset.isActive && preset.recipients.length > 0) {
        for (const recipient of preset.recipients) {
          const trimmed = recipient.trim()
          if (trimmed !== '') {
            recipients.push(trimmed)
          }
        }
      }
    }

    // 重複を除去
    const uniqueRecipients = [...new Set(recipients)]

    if (uniqueRecipients.length === 0) {
      showError('送信先が設定されていません')
      return { success: false, shouldRetake: false }
    }

    addDebugLog(`レシート画像を${uniqueRecipients.length}件の宛先に送信中...`, 'info')

    const results = { success: 0, failed: 0 }

    // 初期進捗状態を通知
    if (onProgress) {
      onProgress({
        total: 1,
        sent: 0,
        failed: 0,
        currentRecipients: uniqueRecipients,
        status: 'sending',
        percentage: 0
      })
    }

    try {
      addDebugLog(`${uniqueRecipients.length}件の宛先に一括送信中...`, 'info')

      const result = await emailSender.sendReceipt(uniqueRecipients, photo)

      if (result.success) {
        results.success = uniqueRecipients.length
        addDebugLog(`送信成功: ID=${result.messageId}`, 'success')

        // 最終進捗状態を通知
        if (onProgress) {
          onProgress({
            total: 1,
            sent: 1,
            failed: 0,
            currentRecipients: [],
            status: 'completed',
            percentage: 100
          })
        }

        return { success: true, shouldRetake: true }
      } else {
        results.failed = uniqueRecipients.length
        let errorMsg = `送信失敗: ${result.error || '不明なエラー'}`

        // RESEND APIのエラー詳細を解析
        if (result.details && typeof result.details === 'object' && 'name' in result.details) {
          const details = result.details as { name?: string; message?: string }
          if (details.name === 'validation_error') {
            errorMsg += '\n（メールアドレスが無効です）'
          } else if (details.name === 'invalid_to_address') {
            errorMsg += '\n（送信先アドレスが無効です）'
          } else if (details.message) {
            errorMsg += `\n（${details.message}）`
          }
        }

        // BYOK: エラー文中に APIキー が紛れた場合の漏洩防止
        errorMsg = maskApiKey(errorMsg)

        addDebugLog(errorMsg, 'error')

        // 最終進捗状態を通知
        if (onProgress) {
          onProgress({
            total: 1,
            sent: 0,
            failed: 1,
            currentRecipients: [],
            status: 'error',
            percentage: 100
          })
        }

        showError(errorMsg)
        return { success: false, shouldRetake: false }
      }
    } catch (error) {
      // BYOK: 予期しないエラーにも APIキー が紛れ込む可能性があるためマスク
      const errorMessage = maskApiKey(getErrorMessage(error))
      addDebugLog(`予期しないエラー: ${errorMessage}`, 'error')

      // 最終進捗状態を通知
      if (onProgress) {
        onProgress({
          total: 1,
          sent: 0,
          failed: 1,
          currentRecipients: [],
          status: 'error',
          percentage: 100
        })
      }

      showError(`予期しないエラーが発生しました: ${errorMessage}`)
      return { success: false, shouldRetake: false }
    }
  }
}
