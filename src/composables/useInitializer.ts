import { emailSender } from '../lib/mail'
import { SettingsService, AppSettings } from '../services/settings.service'

export interface InitializerComposable {
  _initialized: boolean
  init: () => void
  initializePWA: () => void
  initializeEmailSettings: () => void
  initializePresets: () => void
  shouldUpdatePresets: () => boolean
  checkDropboxPreset: () => boolean
  checkMainPreset: () => boolean
  logInitializationStatus: () => void
}

export function useInitializer(): InitializerComposable {
  return {
    _initialized: false,
    
    // メイン初期化処理
    init() {
      // 重複実行を防ぐ
      if (this._initialized) {
        return
      }
      this._initialized = true
      
      // 各初期化処理を順次実行
      this.initializePWA()
      this.initializeEmailSettings()
      this.initializePresets()
      this.logInitializationStatus()
    },
    
    // PWA関連の初期化
    initializePWA() {
      // Alpine.jsコンテキストで呼び出される
      if ((this as any).initPWADetection) {
        (this as any).initPWADetection()
      }
    },
    
    // メール設定の初期化
    initializeEmailSettings() {
      // Alpine.jsコンテキストから設定を取得
      const settings = (this as any).settings as AppSettings
      
      // APIキーの設定
      if (settings.apiKey) {
        emailSender.setApiKey(settings.apiKey)
      }
      
      // 送信元アドレスの設定
      if (settings.fromEmail) {
        emailSender.setFromEmail(settings.fromEmail)
      }
    },
    
    // プリセットの初期化
    initializePresets() {
      const settings = (this as any).settings as AppSettings
      
      // プリセットが空の場合は新規生成
      if (!settings.sendPresets || settings.sendPresets.length === 0) {
        SettingsService.syncPresetsWithEmails(settings)
        return
      }
      
      // プリセットの更新が必要かチェック
      if (this.shouldUpdatePresets()) {
        SettingsService.syncPresetsWithEmails(settings)
      } else {
        // 「すべてに送信」プリセットの更新チェック
        SettingsService.updateAllPreset(settings)
      }
    },
    
    // プリセット更新が必要かチェック
    shouldUpdatePresets(): boolean {
      // Dropboxプリセットのチェック
      if (this.checkDropboxPreset()) {
        return true
      }
      
      // メインプリセットのチェック
      if (this.checkMainPreset()) {
        return true
      }
      
      return false
    },
    
    // Dropboxプリセットのチェック
    checkDropboxPreset(): boolean {
      const settings = (this as any).settings as AppSettings
      
      // Dropboxメールが設定されていない場合はチェック不要
      if (!settings.dropboxEmail) {
        return false
      }
      
      const dropboxPreset = settings.sendPresets.find(p => p.id === 'dropbox')
      
      // プリセットが存在しない場合
      if (!dropboxPreset) {
        return true
      }
      
      // プリセットが無効または宛先が空の場合
      if (!dropboxPreset.isActive || dropboxPreset.recipients.length === 0) {
        // 直接修正（Alpine.jsコンテキストで動作）
        dropboxPreset.isActive = true
        dropboxPreset.recipients = [settings.dropboxEmail]
        return true
      }
      
      return false
    },
    
    // メインプリセットのチェック
    checkMainPreset(): boolean {
      const settings = (this as any).settings as AppSettings
      
      // メインメールが設定されていない場合はチェック不要
      if (!settings.email) {
        return false
      }
      
      const mainPreset = settings.sendPresets.find(p => p.id === 'main')
      
      // プリセットが存在し、宛先が異なる場合
      if (mainPreset && mainPreset.recipients[0] !== settings.email) {
        mainPreset.recipients = [settings.email]
        return true
      }
      
      return false
    },
    
    // 初期化状態のログ出力
    logInitializationStatus() {
      const settings = (this as any).settings as AppSettings
      const activeCount = settings.sendPresets?.filter(p => p.isActive).length || 0
      
      // Alpine.jsコンテキストでデバッグログを記録
      if ((this as any).addDebugLog) {
        (this as any).addDebugLog(`プリセット数: ${activeCount}個がアクティブ`, 'info')
      }
    }
  }
}