import { StorageService } from './storage.service'
import { emailSender } from '../lib/mail'

export interface SendPreset {
  id: string
  name: string
  recipients: string[]
  isActive: boolean
}

export interface AppSettings {
  email: string
  apiKey: string
  dropboxEmail?: string
  fromEmail?: string
  sendPresets: SendPreset[]
}

const STORAGE_KEY = 'yayoi-receipt-settings'

/**
 * 設定管理サービス
 * アプリケーションの設定の読み込み、保存、更新を管理
 */
export class SettingsService {
  /**
   * デフォルト設定を取得
   */
  static getDefaultSettings(): AppSettings {
    return {
      email: '',
      apiKey: '',
      dropboxEmail: '',
      fromEmail: '',
      sendPresets: [
        {
          id: 'main',
          name: 'メインアドレス',
          recipients: [],
          isActive: true
        }
      ]
    }
  }

  /**
   * 設定を読み込む
   */
  static load(): AppSettings {
    const defaultSettings = this.getDefaultSettings()
    const stored = StorageService.get<AppSettings>(STORAGE_KEY, defaultSettings)
    
    
    // プリセットとメールアドレスを同期
    this.syncPresetsWithEmails(stored)
    
    // APIキーと送信元アドレスを設定
    if (stored.apiKey) {
      emailSender.setApiKey(stored.apiKey)
    }
    if (stored.fromEmail) {
      emailSender.setFromEmail(stored.fromEmail)
    }
    
    return stored
  }

  /**
   * 設定を保存する
   */
  static save(settings: AppSettings): boolean {
    
    // EmailSenderにAPIキーと送信元アドレスを設定
    if (settings.apiKey) {
      emailSender.setApiKey(settings.apiKey)
    }
    if (settings.fromEmail) {
      emailSender.setFromEmail(settings.fromEmail)
    }
    
    return StorageService.set(STORAGE_KEY, settings)
  }

  /**
   * 設定が完了しているかチェック
   */
  static isComplete(settings: AppSettings): boolean {
    return settings.email.trim() !== '' && settings.apiKey.trim() !== ''
  }

  /**
   * メールアドレスとプリセットを同期
   * - プリセットが存在しない場合は新規生成
   * - 既存プリセットがある場合は更新
   */
  static syncPresetsWithEmails(settings: AppSettings): void {
    if (!settings.sendPresets || settings.sendPresets.length === 0) {
      // プリセットが空の場合は新規生成
      const presets: SendPreset[] = []
      
      // メインアドレス
      if (settings.email) {
        presets.push({
          id: 'main',
          name: 'メインアドレス',
          recipients: [settings.email],
          isActive: true
        })
      }
      
      // Dropboxアドレス
      if (settings.dropboxEmail) {
        presets.push({
          id: 'dropbox',
          name: 'バックアップ（Dropbox）',
          recipients: [settings.dropboxEmail],
          isActive: true
        })
      }
      
      // すべてに送信
      const allRecipients = [settings.email, settings.dropboxEmail].filter((email): email is string => !!email)
      if (allRecipients.length > 1) {
        presets.push({
          id: 'all',
          name: 'すべてに送信',
          recipients: allRecipients,
          isActive: true
        })
      }
      
      settings.sendPresets = presets
    } else {
      // 既存プリセットを更新
      this.updatePresetsWithCurrentEmails(settings)
    }
    
    // 設定を保存
    this.save(settings)
  }

  /**
   * 既存プリセットを現在のメールアドレスで更新
   */
  static updatePresetsWithCurrentEmails(settings: AppSettings): void {
    if (!settings.sendPresets || settings.sendPresets.length === 0) {
      return
    }
    
    // Dropboxプリセットの更新
    const dropboxPreset = settings.sendPresets.find(p => p.id === 'dropbox')
    if (settings.dropboxEmail) {
      if (!dropboxPreset) {
        settings.sendPresets.push({
          id: 'dropbox',
          name: 'バックアップ（Dropbox）',
          recipients: [settings.dropboxEmail],
          isActive: true
        })
      } else if (!dropboxPreset.isActive || dropboxPreset.recipients.length === 0) {
        dropboxPreset.isActive = true
        dropboxPreset.recipients = [settings.dropboxEmail]
      }
    }
    
    // メインプリセットの更新
    const mainPreset = settings.sendPresets.find(p => p.id === 'main')
    if (settings.email && mainPreset) {
      if (mainPreset.recipients[0] !== settings.email) {
        mainPreset.recipients = [settings.email]
      }
    }
    
    // すべてに送信プリセットの更新
    this.updateAllPreset(settings)
  }

  /**
   * 「すべてに送信」プリセットを更新
   */
  static updateAllPreset(settings: AppSettings): void {
    const allRecipients = [
      settings.email,
      settings.dropboxEmail
    ].filter((email): email is string => !!email)
    
    const allPreset = settings.sendPresets.find(p => p.id === 'all')
    
    if (allRecipients.length > 1) {
      if (!allPreset) {
        // プリセットが存在しない場合は追加
        settings.sendPresets.push({
          id: 'all',
          name: 'すべてに送信',
          recipients: allRecipients,
          isActive: true
        })
      } else {
        // 既存のプリセットを更新
        allPreset.recipients = allRecipients
        allPreset.isActive = true
      }
    } else if (allPreset) {
      // 複数宛先がない場合は無効化
      allPreset.isActive = false
    }
  }

  /**
   * 一時設定からプリセットを更新
   */
  static updatePresetsFromTempSettings(tempSettings: AppSettings): void {
    // メインプリセット
    let mainPreset = tempSettings.sendPresets.find(p => p.id === 'main')
    if (!mainPreset) {
      mainPreset = {
        id: 'main',
        name: 'メインアドレス',
        recipients: [],
        isActive: true
      }
      tempSettings.sendPresets.push(mainPreset)
    }
    mainPreset.recipients = tempSettings.email.trim() ? [tempSettings.email.trim()] : []
    mainPreset.isActive = mainPreset.recipients.length > 0
    
    // Dropboxプリセット
    let dropboxPreset = tempSettings.sendPresets.find(p => p.id === 'dropbox')
    if (tempSettings.dropboxEmail?.trim()) {
      if (!dropboxPreset) {
        dropboxPreset = {
          id: 'dropbox',
          name: 'バックアップ（Dropbox）',
          recipients: [],
          isActive: true
        }
        tempSettings.sendPresets.push(dropboxPreset)
      }
      dropboxPreset.recipients = [tempSettings.dropboxEmail.trim()]
      dropboxPreset.isActive = true
    } else if (dropboxPreset) {
      // メールアドレスが空の場合は無効化
      dropboxPreset.recipients = []
      dropboxPreset.isActive = false
    }
    
    // すべてに送信プリセット
    this.updateAllPreset(tempSettings)
    
  }


}