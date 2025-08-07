import { SettingsService, AppSettings } from '../services/settings.service'
import { emailSender } from '../lib/mail'

export interface SettingsComposable {
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  openSettings: () => void
  closeSettings: () => void
  saveSettings: () => Promise<boolean>
}

export function useSettings(): SettingsComposable {
  return {
    // 状態
    showSettings: false,
    settings: SettingsService.load(),
    tempSettings: {
      email: '',
      apiKey: '',
      dropboxEmail: '',
      fromEmail: '',
      sendPresets: []
    },
    
    // 設定が完了しているかチェック
    get isSettingsComplete() {
      return SettingsService.isComplete(this.settings)
    },
    
    // 設定モーダルを開く
    openSettings() {
      // 現在の設定を一時設定にコピー（深いコピー）
      this.tempSettings = {
        email: this.settings.email,
        apiKey: this.settings.apiKey,
        dropboxEmail: this.settings.dropboxEmail || '',
        fromEmail: this.settings.fromEmail || '',
        sendPresets: JSON.parse(JSON.stringify(this.settings.sendPresets))
      }
      this.showSettings = true
    },
    
    // 設定モーダルを閉じる
    closeSettings() {
      this.showSettings = false
      // 一時設定をクリア
      this.tempSettings = {
        email: '',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }
    },
    
    // 設定を保存
    async saveSettings() {
      // プリセットを更新
      SettingsService.updatePresetsFromTempSettings(this.tempSettings)
      
      // 設定データを準備
      const newSettings: AppSettings = {
        email: this.tempSettings.email.trim(),
        apiKey: this.tempSettings.apiKey.trim(),
        dropboxEmail: this.tempSettings.dropboxEmail?.trim() || '',
        fromEmail: this.tempSettings.fromEmail?.trim() || '',
        sendPresets: this.tempSettings.sendPresets
      }
      
      // localStorageに保存
      if (SettingsService.save(newSettings)) {
        // 保存成功時のみ状態を更新
        this.settings = newSettings
        
        // APIキーと送信元アドレスを設定
        if (newSettings.apiKey) {
          emailSender.setApiKey(newSettings.apiKey)
        }
        if (newSettings.fromEmail) {
          emailSender.setFromEmail(newSettings.fromEmail)
        }
        
        this.closeSettings()
        
        // デバッグログ記録（Alpine.jsコンテキストで呼び出される）
        if ((this as any).addDebugLog) {
          (this as any).addDebugLog('設定をlocalStorageに保存しました', 'success')
        }
        
        return true
      } else {
        // 保存失敗時のエラー処理
        if ((this as any).showError) {
          (this as any).showError('設定の保存に失敗しました。ブラウザの設定を確認してください。')
        }
        if ((this as any).addDebugLog) {
          (this as any).addDebugLog('localStorage保存エラー', 'error')
        }
        
        return false
      }
    }
  }
}