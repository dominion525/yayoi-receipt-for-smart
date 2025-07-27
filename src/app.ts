import { emailSender } from './lib/mail'
import Alpine from 'alpinejs'

export interface DebugLog {
  time: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
  message: string
}

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

// localStorage管理用の定数とユーティリティ
const STORAGE_KEY = 'yayoi-receipt-settings'

function loadSettingsFromStorage(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('読み込まれた設定:', parsed)
      
      // プリセットが保存されていない場合は、メールアドレスから自動生成
      if (!parsed.sendPresets) {
        console.log('プリセットが存在しないため、自動生成します')
        const presets: SendPreset[] = []
        
        // メインアドレス
        if (parsed.email) {
          presets.push({
            id: 'main',
            name: 'メインアドレス',
            recipients: [parsed.email],
            isActive: true
          })
        }
        
        // Dropboxアドレス（バックアップ）
        if (parsed.dropboxEmail) {
          console.log('Dropboxアドレスを検出:', parsed.dropboxEmail)
          presets.push({
            id: 'dropbox',
            name: 'バックアップ（Dropbox）',
            recipients: [parsed.dropboxEmail],
            isActive: true
          })
        }
        
        // すべてに送信
        const allRecipients = [parsed.email, parsed.dropboxEmail].filter(email => email)
        if (allRecipients.length > 1) {
          presets.push({
            id: 'all',
            name: 'すべてに送信',
            recipients: allRecipients,
            isActive: true
          })
        }
        
        parsed.sendPresets = presets
        console.log('生成されたプリセット:', presets)
      }
      
      // プリセットが存在する場合も、メールアドレスの変更を反映
      if (parsed.sendPresets && parsed.sendPresets.length > 0) {
        // Dropboxプリセットの更新
        const dropboxPreset = parsed.sendPresets.find((p: SendPreset) => p.id === 'dropbox')
        if (dropboxPreset && parsed.dropboxEmail) {
          dropboxPreset.recipients = [parsed.dropboxEmail]
          dropboxPreset.isActive = true
        }
        
        // メインプリセットの更新
        const mainPreset = parsed.sendPresets.find((p: SendPreset) => p.id === 'main')
        if (mainPreset && parsed.email) {
          mainPreset.recipients = [parsed.email]
        }
      }
      
      const result = {
        email: parsed.email || '',
        apiKey: parsed.apiKey || '',
        dropboxEmail: parsed.dropboxEmail || '',
        fromEmail: parsed.fromEmail || 'smart-receipt@dominion525.com',
        sendPresets: parsed.sendPresets
      }
      console.log('最終的な設定:', result)
      return result
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error)
  }
  
  // デフォルト設定
  return {
    email: '',
    apiKey: '',
    dropboxEmail: '',
    fromEmail: 'smart-receipt@dominion525.com',
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

function saveSettingsToStorage(settings: AppSettings): boolean {
  try {
    console.log('保存する設定:', settings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('設定の保存に失敗しました:', error)
    return false
  }
}

export interface ReceiptAppData {
  photo: string | null
  error: string | null
  isLoading: boolean
  showDebug: boolean
  debugLogs: DebugLog[]
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  isSendingTestEmail: boolean
  showCaptureEffect: boolean
  isSendingMail: boolean
}

export function receiptApp(): ReceiptAppData & Record<string, any> {
  return {
    photo: null,
    error: null,
    isLoading: false,
    showDebug: false,
    debugLogs: [],
    showSettings: false,
    settings: loadSettingsFromStorage(),
    tempSettings: {
      email: '',
      apiKey: '',
      dropboxEmail: '',
      fromEmail: '',
      sendPresets: []
    },
    isSendingTestEmail: false,
    showCaptureEffect: false,
    isSendingMail: false,
    
    // 初期化時に設定完了状態をチェック
    get isSettingsComplete() {
      return this.checkSettingsComplete()
    },
    
    // 初期化処理
    init() {
      // 保存されたAPIキーと送信元アドレスがあれば設定
      if (this.settings.apiKey) {
        emailSender.setApiKey(this.settings.apiKey)
      }
      if (this.settings.fromEmail) {
        emailSender.setFromEmail(this.settings.fromEmail)
      }
      
      // プリセットが空の場合、または古い形式の場合は再生成
      if (!this.settings.sendPresets || this.settings.sendPresets.length === 0) {
        console.log('初期化時: プリセットが空なので再生成します')
        this.regeneratePresets()
      } else {
        // プリセットの整合性チェックと修正
        let needsUpdate = false
        
        // Dropboxプリセットのチェック
        const dropboxPreset = this.settings.sendPresets.find(p => p.id === 'dropbox')
        if (this.settings.dropboxEmail) {
          if (!dropboxPreset) {
            console.log('初期化時: Dropboxアドレスはあるがプリセットがないので再生成します')
            needsUpdate = true
          } else if (!dropboxPreset.isActive || dropboxPreset.recipients.length === 0) {
            console.log('初期化時: Dropboxプリセットが無効または空なので修正します')
            dropboxPreset.isActive = true
            dropboxPreset.recipients = [this.settings.dropboxEmail]
            needsUpdate = true
          }
        }
        
        // メインプリセットのチェック
        const mainPreset = this.settings.sendPresets.find(p => p.id === 'main')
        if (this.settings.email && mainPreset) {
          if (mainPreset.recipients[0] !== this.settings.email) {
            console.log('初期化時: メインアドレスが更新されているので修正します')
            mainPreset.recipients = [this.settings.email]
            needsUpdate = true
          }
        }
        
        if (needsUpdate) {
          console.log('初期化時: プリセットを再生成します')
          this.regeneratePresets()
        } else {
          // 「すべてに送信」プリセットの更新チェック
          this.updateAllPreset()
        }
      }
      
      // デバッグ用：現在のプリセット状態を表示
      console.log('初期化完了時のプリセット:', this.settings.sendPresets)
      this.addDebugLog(`プリセット数: ${this.settings.sendPresets.filter(p => p.isActive).length}個がアクティブ`, 'info')
    },
    
    // 「すべてに送信」プリセットを更新
    updateAllPreset() {
      const allRecipients = [
        this.settings.email,
        this.settings.dropboxEmail
      ].filter((email): email is string => !!email)
      
      let allPreset = this.settings.sendPresets.find(p => p.id === 'all')
      
      if (allRecipients.length > 1) {
        if (!allPreset) {
          // プリセットが存在しない場合は追加
          this.settings.sendPresets.push({
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
    },
    
    // プリセットを再生成
    regeneratePresets() {
      const presets: SendPreset[] = []
      
      // メインアドレス
      if (this.settings.email) {
        presets.push({
          id: 'main',
          name: 'メインアドレス',
          recipients: [this.settings.email],
          isActive: true
        })
      }
      
      // Dropboxアドレス
      if (this.settings.dropboxEmail) {
        presets.push({
          id: 'dropbox',
          name: 'Dropboxに保存',
          recipients: [this.settings.dropboxEmail],
          isActive: true
        })
      }
      
      
      // すべてに送信
      const allRecipients = [
        this.settings.email,
        this.settings.dropboxEmail
      ].filter((email): email is string => !!email)
      
      if (allRecipients.length > 1) {
        presets.push({
          id: 'all',
          name: 'すべてに送信',
          recipients: allRecipients,
          isActive: true
        })
      }
      
      this.settings.sendPresets = presets
      console.log('再生成されたプリセット:', presets)
      
      // 設定を保存
      saveSettingsToStorage(this.settings)
    },
    
    
    
    
    retake() {
      this.photo = null
      this.error = null
    },
    
    returnToHome() {
      this.photo = null
      this.error = null
    },
    
    // 標準カメラアプリでの撮影処理
    handleNativeCamera(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      
      if (file) {
        this.addDebugLog('標準カメラで撮影された画像を処理中...', 'info')
        
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
            }, 300)
            
            this.addDebugLog('標準カメラで撮影完了', 'success')
          }
        }
        
        reader.onerror = () => {
          this.showError('画像の読み込みに失敗しました')
          this.addDebugLog('画像読み込みエラー', 'error')
        }
        
        reader.readAsDataURL(file)
      }
      
      // inputをリセット（同じファイルを再選択できるように）
      input.value = ''
    },
    
    async sendMail() {
      if (!this.photo) {
        this.showError('写真が撮影されていません')
        return
      }
      
      // 設定が完了しているか確認
      if (!this.checkSettingsComplete()) {
        this.showError('メール設定が完了していません。設定を行ってください。')
        this.openSettings()
        return
      }
      
      this.isSendingMail = true
      this.addDebugLog('レシート画像をメール送信中...', 'info')
      
      try {
        // レシート画像を送信
        const result = await emailSender.sendReceipt(
          this.settings.email,
          this.photo!
        )
        
        if (result.success) {
          this.addDebugLog(`レシート画像を送信しました: messageId=${result.messageId}`, 'success')
          
          // 成功メッセージを表示
          const successMessage = 'レシート画像をメール送信しました'
          this.error = '✅ ' + successMessage
          setTimeout(() => {
            if (this.error === '✅ ' + successMessage) {
              this.error = null
            }
          }, 3000)
          
          // 写真をクリアしてカメラに戻る
          this.retake()
          
        } else {
          this.addDebugLog(`メール送信失敗: ${result.error}`, 'error')
          this.showError(`メール送信に失敗しました: ${result.error}`)
        }
        
      } catch (error: any) {
        this.addDebugLog(`メール送信エラー: ${error.message}`, 'error')
        this.showError(`予期しないエラーが発生しました: ${error.message}`)
        console.error('Send mail error:', error)
        
      } finally {
        this.isSendingMail = false
      }
    },
    
    
    
    
    
    toggleDebug() {
      this.showDebug = !this.showDebug
    },
    
    showError(message: string) {
      this.error = message
      // エラーメッセージを長めに表示（10秒）
      setTimeout(() => {
        if (this.error === message) {
          this.error = null
        }
      }, 10000)
    },
    
    
    
    addDebugLog(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
      
      this.debugLogs.push({ time, type, message })
      
      // 最大100件に制限
      if (this.debugLogs.length > 100) {
        this.debugLogs.shift()
      }
      
      // 最新のログが見えるようにスクロール
      this.$nextTick(() => {
        const logContainer = document.querySelector('#debug-panel .bg-black')
        if (logContainer) {
          logContainer.scrollTop = logContainer.scrollHeight
        }
      })
    },
    
    clearDebugLogs() {
      this.debugLogs = []
    },
    
    copyDebugLogs() {
      const logText = this.debugLogs
        .map(log => `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`)
        .join('\n')
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(logText)
          .then(() => {
            this.addDebugLog('ログをクリップボードにコピーしました', 'success')
          })
          .catch(err => {
            this.addDebugLog('ログのコピーに失敗しました', 'error')
            console.error('Copy failed:', err)
          })
      } else {
        // フォールバック: テキストエリアを使用
        const textarea = document.createElement('textarea')
        textarea.value = logText
        textarea.style.position = 'absolute'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          this.addDebugLog('ログをクリップボードにコピーしました', 'success')
        } catch (err) {
          this.addDebugLog('ログのコピーに失敗しました', 'error')
          console.error('Copy failed:', err)
        }
        document.body.removeChild(textarea)
      }
    },
    
    // 設定関連メソッド
    openSettings() {
      // 現在の設定を一時設定にコピー（深いコピー）
      this.tempSettings = {
        email: this.settings.email,
        apiKey: this.settings.apiKey,
        dropboxEmail: this.settings.dropboxEmail || '',
        fromEmail: this.settings.fromEmail || 'smart-receipt@dominion525.com',
        sendPresets: JSON.parse(JSON.stringify(this.settings.sendPresets))
      }
      this.showSettings = true
    },
    
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
    
    saveSettings() {
      // 簡単なバリデーション
      if (!this.tempSettings.email.trim() || !this.tempSettings.apiKey.trim()) {
        this.showError('メールアドレスとAPIキーを入力してください')
        return
      }
      
      // プリセットを更新
      this.updatePresetsFromTempSettings()
      
      // 設定データを準備
      const newSettings: AppSettings = {
        email: this.tempSettings.email.trim(),
        apiKey: this.tempSettings.apiKey.trim(),
        dropboxEmail: this.tempSettings.dropboxEmail?.trim() || '',
        fromEmail: this.tempSettings.fromEmail?.trim() || 'smart-receipt@dominion525.com',
        sendPresets: this.tempSettings.sendPresets
      }
      
      // localStorageに保存
      if (saveSettingsToStorage(newSettings)) {
        // 保存成功時のみ状態を更新
        this.settings = newSettings
        
        // EmailSenderにAPIキーと送信元アドレスを設定
        emailSender.setApiKey(newSettings.apiKey)
        if (newSettings.fromEmail) {
          emailSender.setFromEmail(newSettings.fromEmail)
        }
        
        this.closeSettings()
        this.addDebugLog('設定をlocalStorageに保存しました', 'success')
      } else {
        // 保存失敗時のエラー処理
        this.showError('設定の保存に失敗しました。ブラウザの設定を確認してください。')
        this.addDebugLog('localStorage保存エラー', 'error')
      }
    },
    
    // 設定完了チェック
    checkSettingsComplete() {
      return this.settings.email.trim() !== '' && this.settings.apiKey.trim() !== ''
    },
    
    // テストメール送信
    async sendTestEmail() {
      // バリデーション
      if (!this.tempSettings.email.trim() || !this.tempSettings.apiKey.trim()) {
        this.showError('メールアドレスとAPIキーを入力してください')
        return
      }
      
      this.isSendingTestEmail = true
      this.addDebugLog('テストメール送信を開始...', 'info')
      
      try {
        // テストメール送信
        const result = await emailSender.sendTestEmail(
          this.tempSettings.apiKey.trim(),
          this.tempSettings.email.trim(),
          this.tempSettings.email.trim()
        )
        
        if (result.success) {
          this.addDebugLog(`テストメール送信成功: messageId=${result.messageId}`, 'success')
          this.showError('') // エラーメッセージをクリア
          
          // 成功メッセージを表示
          const successMessage = 'テストメールを送信しました。指定したメールアドレスを確認してください。'
          this.addDebugLog(successMessage, 'success')
          
          // 一時的に成功メッセージを表示（3秒後に消える）
          const originalError = this.error
          this.error = '✅ ' + successMessage
          setTimeout(() => {
            if (this.error === '✅ ' + successMessage) {
              this.error = originalError
            }
          }, 5000)
          
        } else {
          this.addDebugLog(`テストメール送信失敗: ${result.error}`, 'error')
          this.showError(`テストメール送信に失敗しました: ${result.error}`)
          
          // 詳細なエラー情報をデバッグログに記録
          if (result.details) {
            this.addDebugLog(`エラー詳細: ${JSON.stringify(result.details)}`, 'debug')
          }
        }
        
      } catch (error: any) {
        this.addDebugLog(`テストメール送信エラー: ${error.message}`, 'error')
        this.showError(`予期しないエラーが発生しました: ${error.message}`)
        console.error('Test email error:', error)
        
      } finally {
        this.isSendingTestEmail = false
      }
    },
    
    // プリセットを設定から更新
    updatePresetsFromTempSettings() {
      // まずメインプリセットを確保
      let mainPreset = this.tempSettings.sendPresets.find(p => p.id === 'main')
      if (!mainPreset) {
        mainPreset = {
          id: 'main',
          name: 'メインアドレス',
          recipients: [],
          isActive: true
        }
        this.tempSettings.sendPresets.push(mainPreset)
      }
      mainPreset.recipients = this.tempSettings.email.trim() ? [this.tempSettings.email.trim()] : []
      mainPreset.isActive = mainPreset.recipients.length > 0
      
      // Dropboxプリセット
      let dropboxPreset = this.tempSettings.sendPresets.find(p => p.id === 'dropbox')
      if (this.tempSettings.dropboxEmail?.trim()) {
        if (!dropboxPreset) {
          dropboxPreset = {
            id: 'dropbox',
            name: 'バックアップ（Dropbox）',
            recipients: [],
            isActive: true
          }
          this.tempSettings.sendPresets.push(dropboxPreset)
        }
        dropboxPreset.recipients = [this.tempSettings.dropboxEmail.trim()]
        dropboxPreset.isActive = true
      } else if (dropboxPreset) {
        // メールアドレスが空の場合は無効化
        dropboxPreset.recipients = []
        dropboxPreset.isActive = false
      }
      
      // すべてに送信プリセット
      const allRecipients = [
        this.tempSettings.email,
        this.tempSettings.dropboxEmail
      ].filter((email): email is string => !!email?.trim())
      
      let allPreset = this.tempSettings.sendPresets.find(p => p.id === 'all')
      if (allRecipients.length > 1) {
        if (!allPreset) {
          allPreset = {
            id: 'all',
            name: 'すべてに送信',
            recipients: [],
            isActive: true
          }
          this.tempSettings.sendPresets.push(allPreset)
        }
        allPreset.recipients = allRecipients.map(e => e!.trim())
        allPreset.isActive = true
      } else if (allPreset) {
        // 複数宛先がない場合は無効化
        allPreset.recipients = []
        allPreset.isActive = false
      }
      
      // デバッグログ
      this.addDebugLog(`プリセット更新完了: ${this.tempSettings.sendPresets.filter(p => p.isActive).length}個のアクティブなプリセット`, 'debug')
    },
    
    // 複数宛先への送信
    async sendMailToPreset(presetId: string) {
      console.log(`sendMailToPreset呼び出し: presetId=${presetId}`)
      console.log('利用可能なプリセット:', this.settings.sendPresets)
      
      // デバッグ用：実際にこの関数が呼ばれているか確認
      this.addDebugLog(`sendMailToPreset開始: presetId=${presetId}`, 'info')
      
      const preset = this.settings.sendPresets.find(p => p.id === presetId)
      console.log('選択されたプリセット:', preset)
      
      if (!preset || !preset.isActive) {
        this.showError('送信先が見つかりません')
        this.addDebugLog(`プリセットが見つかりません: presetId=${presetId}`, 'error')
        return
      }
      
      // 送信先を明示的に表示
      this.addDebugLog(`送信先: ${preset.name} (${preset.recipients.length}件)`, 'info')
      preset.recipients.forEach(r => {
        this.addDebugLog(`  - ${r}`, 'debug')
      })
      
      this.isSendingMail = true
      const results = { success: 0, failed: 0 }
      const errorMessages: string[] = []
      
      try {
        for (const recipient of preset.recipients) {
          this.addDebugLog(`${recipient}に送信中...`, 'info')
          console.log(`送信処理: ${recipient}`)
          
          // APIキーの存在確認
          if (!this.settings.apiKey) {
            this.addDebugLog('エラー: APIキーが設定されていません', 'error')
            errorMessages.push('APIキーが設定されていません')
            results.failed++
            console.error('APIキーが設定されていません')
            continue
          }
          
          try {
            const result = await emailSender.sendReceipt(recipient, this.photo!)
            console.log(`送信結果 (${recipient}):`, result)
            
            if (result.success) {
              results.success++
              this.addDebugLog(`${recipient}への送信成功: ID=${result.messageId}`, 'success')
            } else {
              results.failed++
              // エラーメッセージを構築
              let errorDetail = `${recipient}への送信失敗`
              if (result.error) {
                errorDetail += `: ${result.error}`
              }
              
              // デバッグ用に完全な結果をログ出力
              console.error(`送信失敗 (${recipient}):`, {
                error: result.error,
                details: result.details,
                fullResult: result
              })
              
              // RESEND APIのエラー詳細を解析
              if (result.details) {
                console.error('送信エラー詳細:', result.details)
                if (result.details.name === 'validation_error') {
                  errorDetail += '\n（メールアドレスが無効です）'
                } else if (result.details.name === 'invalid_to_address') {
                  errorDetail += '\n（送信先アドレスが無効です）'
                } else if (result.details.message) {
                  errorDetail += `\n（${result.details.message}）`
                }
              }
              
              // Dropboxのメールアドレス形式を確認
              if (presetId === 'dropbox' && recipient.includes('@')) {
                if (!recipient.endsWith('@getdropbox.com') && !recipient.endsWith('@addtodropbox.com')) {
                  errorDetail += '\n\n⚠️ ヒント: Dropboxのメールアドレスは通常 @getdropbox.com または @addtodropbox.com で終わります'
                }
              }
              
              errorMessages.push(errorDetail)
              this.addDebugLog(`${recipient}への送信失敗: ${result.error || 'エラー内容不明'}`, 'error')
              console.log('エラーメッセージ追加:', errorDetail)
            }
          } catch (error: any) {
            results.failed++
            const errorMsg = `${recipient}への送信エラー: ${error.message}`
            errorMessages.push(errorMsg)
            this.addDebugLog(errorMsg, 'error')
            console.error(`送信例外 (${recipient}):`, error)
          }
        }
        
        // デバッグ用：収集したエラーメッセージを出力
        console.log('収集したエラーメッセージ:', errorMessages)
        console.log('エラーメッセージ数:', errorMessages.length)
        
        // 結果を表示
        if (results.success > 0 && results.failed === 0) {
          const successMessage = `${results.success}件の送信が完了しました`
          this.error = '✅ ' + successMessage
          setTimeout(() => {
            if (this.error === '✅ ' + successMessage) {
              this.error = null
            }
          }, 3000)
          
          // 写真をクリアしてカメラに戻る
          this.retake()
        } else if (results.failed > 0) {
          // エラーメッセージが空の場合の処理
          if (errorMessages.length === 0) {
            errorMessages.push('エラーの詳細情報を取得できませんでした')
            console.warn('エラーメッセージが空でした')
          }
          
          // エラーメッセージをまとめて表示
          const summary = `送信結果: 成功${results.success}件, 失敗${results.failed}件`
          const fullError = summary + '\n\n' + errorMessages.join('\n\n')
          
          console.log('最終的なエラーメッセージ:', fullError)
          this.showError(fullError)
        }
        
      } finally {
        this.isSendingMail = false
      }
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})