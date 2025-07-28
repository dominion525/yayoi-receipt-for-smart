import { emailSender } from '../lib/mail'
import { AppSettings } from './settings.service'
import { getErrorMessage } from '../utils/error'

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
    showError: ErrorDisplayer
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
    
    try {
      for (const recipient of uniqueRecipients) {
        addDebugLog(`${recipient}に送信中...`, 'info')
        
        try {
          const result = await emailSender.sendReceipt(recipient, photo)
          
          if (result.success) {
            results.success++
            addDebugLog(`${recipient}への送信成功: ID=${result.messageId}`, 'success')
          } else {
            results.failed++
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
            
            errorMessages.push(errorDetail)
            addDebugLog(`${recipient}への送信失敗: ${result.error}`, 'error')
          }
        } catch (error) {
          results.failed++
          const errorMsg = `${recipient}への送信エラー: ${getErrorMessage(error)}`
          errorMessages.push(errorMsg)
          addDebugLog(errorMsg, 'error')
        }
      }
      
      // 結果を表示
      if (results.success > 0 && results.failed === 0) {
        const successMessage = `${results.success}件の送信が完了しました`
        showError('✅ ' + successMessage)
        return { success: true, shouldRetake: true }
      } else if (results.failed > 0) {
        // エラーメッセージをまとめて表示
        const summary = `送信結果: 成功${results.success}件, 失敗${results.failed}件`
        const fullError = summary + '\n\n' + errorMessages.join('\n\n')
        showError(fullError)
        return { success: false, shouldRetake: false }
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
    showError: ErrorDisplayer
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
    
    try {
      for (const recipient of preset.recipients) {
        addDebugLog(`${recipient}に送信中...`, 'info')
        
        // APIキーの存在確認
        if (!settings.apiKey) {
          addDebugLog('エラー: APIキーが設定されていません', 'error')
          errorMessages.push('APIキーが設定されていません')
          results.failed++
          continue
        }
        
        try {
          const result = await emailSender.sendReceipt(recipient, photo)
          
          if (result.success) {
            results.success++
            addDebugLog(`${recipient}への送信成功: ID=${result.messageId}`, 'success')
          } else {
            results.failed++
            // エラーメッセージを構築
            let errorDetail = `${recipient}への送信失敗`
            if (result.error) {
              errorDetail += `: ${result.error}`
            }
            
            // デバッグ用に完全な結果をログ出力
            
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
            
            errorMessages.push(errorDetail)
            addDebugLog(`${recipient}への送信失敗: ${result.error}`, 'error')
          }
        } catch (error) {
          results.failed++
          const errorMsg = `${recipient}への送信エラー: ${getErrorMessage(error)}`
          errorMessages.push(errorMsg)
          addDebugLog(errorMsg, 'error')
        }
      }
      
      // デバッグ用：収集したエラーメッセージを出力
      
      // 結果を表示
      if (results.success > 0 && results.failed === 0) {
        const successMessage = `${results.success}件の送信が完了しました`
        showError('✅ ' + successMessage)
        return { success: true, shouldRetake: true }
      } else if (results.failed > 0) {
        // エラーメッセージをまとめて表示
        // 削除された不要な防御コード: failed++される際は必ずerrorMessages.push()も実行されるため、
        // errorMessages.length === 0 の条件は成立しない
        const summary = `送信結果: 成功${results.success}件, 失敗${results.failed}件`
        const fullError = summary + '\n\n' + errorMessages.join('\n\n')
        
        showError(fullError)
        return { success: false, shouldRetake: false }
      }
      
      return { success: true, shouldRetake: false }
      
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      addDebugLog(`予期しないエラー: ${errorMessage}`, 'error')
      showError(`予期しないエラーが発生しました: ${errorMessage}`)
      return { success: false, shouldRetake: false }
    }
  }
}