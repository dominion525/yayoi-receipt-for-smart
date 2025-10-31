import { emailSender } from '../lib/mail'
import { AppSettings } from './settings.service'
import { getErrorMessage } from '../utils/error'
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
   * レシート画像を全アクティブプリセットに送信
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
    
    // 送信先を収集（アクティブなプリセットの全宛先）
    const recipients: string[] = []
    for (const preset of settings.sendPresets) {
      if (preset.isActive && preset.recipients.length > 0) {
        recipients.push(...preset.recipients)
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
      const errorMessage = getErrorMessage(error)
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
  
  
  /**
   * 指定したプリセットの宛先に送信
   */
  static async sendMailToPreset(
    presetId: string,
    photo: string,
    settings: AppSettings,
    addDebugLog: DebugLogger,
    showError: ErrorDisplayer,
    onProgress?: ProgressCallback
  ): Promise<{ success: boolean; shouldRetake: boolean }> {
    
    // デバッグ用：実際にこの関数が呼ばれているか確認
    addDebugLog(`sendMailToPreset開始: presetId=${presetId}`, 'info')
    
    const preset = settings.sendPresets.find(p => p.id === presetId)
    
    if (!preset || !preset.isActive) {
      showError('送信先が見つかりません')
      addDebugLog(`プリセットが見つかりません: presetId=${presetId}`, 'error')
      return { success: false, shouldRetake: false }
    }
    
    // 送信先を明示的に表示
    addDebugLog(`送信先: ${preset.name} (${preset.recipients.length}件)`, 'info')
    preset.recipients.forEach(r => {
      addDebugLog(`  - ${r}`, 'debug')
    })

    const results = { success: 0, failed: 0 }
    
    // APIキーの事前確認
    if (!settings.apiKey) {
      addDebugLog('エラー: APIキーが設定されていません', 'error')
      showError('APIキーが設定されていません')
      return { success: false, shouldRetake: false }
    }
    
    // 初期進捗状態を通知
    if (onProgress) {
      onProgress({
        total: 1,
        sent: 0,
        failed: 0,
        currentRecipients: preset.recipients,
        status: 'sending',
        percentage: 0
      })
    }
    
    try {
      addDebugLog(`${preset.recipients.length}件の宛先に一括送信中...`, 'info')

      const result = await emailSender.sendReceipt(preset.recipients, photo)

      if (result.success) {
        results.success = preset.recipients.length
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
        results.failed = preset.recipients.length
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

        // Dropboxのメールアドレス形式を確認
        if (presetId === 'dropbox' && preset.recipients.some(r => r.includes('@'))) {
          const invalidDropboxEmails = preset.recipients.filter(r =>
            r.includes('@') &&
            !r.endsWith('@getdropbox.com') &&
            !r.endsWith('@addtodropbox.com')
          )
          if (invalidDropboxEmails.length > 0) {
            errorMsg += '\n\n⚠️ ヒント: Dropboxのメールアドレスは通常 @getdropbox.com または @addtodropbox.com で終わります'
          }
        }

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
      const errorMessage = getErrorMessage(error)
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