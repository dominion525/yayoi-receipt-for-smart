import { emailSender } from '../lib/mail'
import { AppSettings } from './settings.service'
import { getErrorMessage } from '../utils/error'
import { ProgressCallback, SendResult } from '../types/progress.types'

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
    const errorMessages: string[] = []
    const sendResults: SendResult[] = []
    
    // 初期進捗状態を通知
    if (onProgress) {
      onProgress({
        total: uniqueRecipients.length,
        sent: 0,
        failed: 0,
        currentRecipients: uniqueRecipients,
        status: 'sending',
        percentage: 0
      })
    }
    
    try {
      // 並行送信の実装
      const promises = uniqueRecipients.map(async (recipient) => {
        addDebugLog(`${recipient}に送信中...`, 'info')
        
        try {
          const result = await emailSender.sendReceipt(recipient, photo)
          
          if (result.success) {
            const sendResult: SendResult = {
              recipient,
              success: true,
              messageId: result.messageId,
              timestamp: Date.now()
            }
            sendResults.push(sendResult)
            addDebugLog(`${recipient}への送信成功: ID=${result.messageId}`, 'success')
            return sendResult
          } else {
            let errorDetail = `${recipient}への送信失敗`
            if (result.error) {
              errorDetail += `: ${result.error}`
            }
            
            // RESEND APIのエラー詳細を解析
            if (result.details && typeof result.details === 'object' && 'name' in result.details) {
              const details = result.details as { name?: string; message?: string }
              if (details.name === 'validation_error') {
                errorDetail += '\n（メールアドレスが無効です）'
              } else if (details.name === 'invalid_to_address') {
                errorDetail += '\n（送信先アドレスが無効です）'
              } else if (details.message) {
                errorDetail += `\n（${details.message}）`
              }
            }
            
            const sendResult: SendResult = {
              recipient,
              success: false,
              error: errorDetail,
              timestamp: Date.now()
            }
            sendResults.push(sendResult)
            errorMessages.push(errorDetail)
            addDebugLog(`${recipient}への送信失敗: ${result.error}`, 'error')
            return sendResult
          }
        } catch (error) {
          const errorMsg = `${recipient}への送信エラー: ${getErrorMessage(error)}`
          const sendResult: SendResult = {
            recipient,
            success: false,
            error: errorMsg,
            timestamp: Date.now()
          }
          sendResults.push(sendResult)
          errorMessages.push(errorMsg)
          addDebugLog(errorMsg, 'error')
          return sendResult
        }
      })
      
      // すべての送信処理を並行実行し、結果を待つ
      const allResults = await Promise.allSettled(promises)
      
      // 結果を集計
      allResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const sendResult = result.value
          if (sendResult.success) {
            results.success++
          } else {
            results.failed++
          }
          
          // 進捗を更新
          if (onProgress) {
            const completed = results.success + results.failed
            onProgress({
              total: uniqueRecipients.length,
              sent: results.success,
              failed: results.failed,
              currentRecipients: uniqueRecipients.slice(completed),
              status: completed < uniqueRecipients.length ? 'sending' : 'completed',
              percentage: Math.round((completed / uniqueRecipients.length) * 100)
            })
          }
        } else {
          // Promise自体が reject された場合（通常はない）
          results.failed++
        }
      })
      
      // 最終進捗状態を通知
      if (onProgress) {
        onProgress({
          total: uniqueRecipients.length,
          sent: results.success,
          failed: results.failed,
          currentRecipients: [],
          status: results.failed > 0 ? 'error' : 'completed',
          percentage: 100
        })
      }
      
      // 結果を表示
      if (results.failed > 0) {
        // エラーメッセージをまとめて表示
        const summary = `送信結果: 成功${results.success}件, 失敗${results.failed}件`
        const fullError = summary + '\n\n' + errorMessages.join('\n\n')
        showError(fullError)
        return { success: false, shouldRetake: false }
      } else {
        // 全成功の場合（results.success > 0 && results.failed === 0）
        return { success: true, shouldRetake: true }
      }
      
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      addDebugLog(`予期しないエラー: ${errorMessage}`, 'error')
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
    const errorMessages: string[] = []
    const sendResults: SendResult[] = []
    
    // APIキーの事前確認
    if (!settings.apiKey) {
      addDebugLog('エラー: APIキーが設定されていません', 'error')
      showError('APIキーが設定されていません')
      return { success: false, shouldRetake: false }
    }
    
    // 初期進捗状態を通知
    if (onProgress) {
      onProgress({
        total: preset.recipients.length,
        sent: 0,
        failed: 0,
        currentRecipients: preset.recipients,
        status: 'sending',
        percentage: 0
      })
    }
    
    try {
      // 並行送信の実装
      const promises = preset.recipients.map(async (recipient) => {
        addDebugLog(`${recipient}に送信中...`, 'info')
        
        try {
          const result = await emailSender.sendReceipt(recipient, photo)
          
          if (result.success) {
            const sendResult: SendResult = {
              recipient,
              success: true,
              messageId: result.messageId,
              timestamp: Date.now()
            }
            sendResults.push(sendResult)
            addDebugLog(`${recipient}への送信成功: ID=${result.messageId}`, 'success')
            return sendResult
          } else {
            // エラーメッセージを構築
            let errorDetail = `${recipient}への送信失敗`
            if (result.error) {
              errorDetail += `: ${result.error}`
            }
            
            // RESEND APIのエラー詳細を解析
            if (result.details) {
              if (typeof result.details === 'object' && 'name' in result.details) {
                const details = result.details as { name?: string; message?: string }
                if (details.name === 'validation_error') {
                  errorDetail += '\n（メールアドレスが無効です）'
                } else if (details.name === 'invalid_to_address') {
                  errorDetail += '\n（送信先アドレスが無効です）'
                } else if (details.message) {
                  errorDetail += `\n（${details.message}）`
                }
              }
            }
            
            // Dropboxのメールアドレス形式を確認
            if (presetId === 'dropbox' && recipient.includes('@')) {
              if (!recipient.endsWith('@getdropbox.com') && !recipient.endsWith('@addtodropbox.com')) {
                errorDetail += '\n\n⚠️ ヒント: Dropboxのメールアドレスは通常 @getdropbox.com または @addtodropbox.com で終わります'
              }
            }
            
            const sendResult: SendResult = {
              recipient,
              success: false,
              error: errorDetail,
              timestamp: Date.now()
            }
            sendResults.push(sendResult)
            errorMessages.push(errorDetail)
            addDebugLog(`${recipient}への送信失敗: ${result.error}`, 'error')
            return sendResult
          }
        } catch (error) {
          const errorMsg = `${recipient}への送信エラー: ${getErrorMessage(error)}`
          const sendResult: SendResult = {
            recipient,
            success: false,
            error: errorMsg,
            timestamp: Date.now()
          }
          sendResults.push(sendResult)
          errorMessages.push(errorMsg)
          addDebugLog(errorMsg, 'error')
          return sendResult
        }
      })
      
      // すべての送信処理を並行実行し、結果を待つ
      const allResults = await Promise.allSettled(promises)
      
      // 結果を集計
      allResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const sendResult = result.value
          if (sendResult.success) {
            results.success++
          } else {
            results.failed++
          }
          
          // 進捗を更新
          if (onProgress) {
            const completed = results.success + results.failed
            onProgress({
              total: preset.recipients.length,
              sent: results.success,
              failed: results.failed,
              currentRecipients: preset.recipients.slice(completed),
              status: completed < preset.recipients.length ? 'sending' : 'completed',
              percentage: Math.round((completed / preset.recipients.length) * 100)
            })
          }
        } else {
          // Promise自体が reject された場合（通常はない）
          results.failed++
        }
      })
      
      // 最終進捗状態を通知
      if (onProgress) {
        onProgress({
          total: preset.recipients.length,
          sent: results.success,
          failed: results.failed,
          currentRecipients: [],
          status: results.failed > 0 ? 'error' : 'completed',
          percentage: 100
        })
      }
      
      // 結果を表示
      if (results.failed > 0) {
        // エラーメッセージをまとめて表示
        const summary = `送信結果: 成功${results.success}件, 失敗${results.failed}件`
        const fullError = summary + '\n\n' + errorMessages.join('\n\n')
        
        showError(fullError)
        return { success: false, shouldRetake: false }
      } else if (results.success > 0) {
        // 全成功の場合
        return { success: true, shouldRetake: true }
      } else {
        // 送信件数が0件の場合（空の受信者リスト等）
        return { success: true, shouldRetake: false }
      }
      
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      addDebugLog(`予期しないエラー: ${errorMessage}`, 'error')
      showError(`予期しないエラーが発生しました: ${errorMessage}`)
      return { success: false, shouldRetake: false }
    }
  }
}