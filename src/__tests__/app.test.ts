import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { receiptApp } from '../app'
import { CompleteAppData } from '../types/app'
import { SettingsService } from '../services/settings.service'
import { DebugService } from '../services/debug.service'
import { emailSender } from '../lib/mail'
import { mockSettings, setupAppDom, makeApp } from './__fixtures__/receiptApp'

// モック設定
vi.mock('../lib/mail', () => ({
  emailSender: {
    setApiKey: vi.fn(),
    setFromEmail: vi.fn()
  }
}))

vi.mock('../services/settings.service', () => ({
  SettingsService: {
    load: vi.fn(),
    save: vi.fn(),
    isComplete: vi.fn(),
    syncPresetsWithEmails: vi.fn(),
    updateAllPreset: vi.fn(),
    updatePresetsFromTempSettings: vi.fn()
  }
}))

vi.mock('../services/debug.service', () => ({
  DebugService: {
    add: vi.fn(),
    clear: vi.fn(),
    copyToClipboard: vi.fn()
  }
}))

vi.mock('../services/email.service', () => ({
  EmailService: {
    sendMail: vi.fn()
  }
}))

describe('receiptApp', () => {
  let app: CompleteAppData

  beforeEach(() => {
    vi.clearAllMocks()

    // デフォルトモック設定
    vi.mocked(SettingsService.load).mockReturnValue(mockSettings)
    vi.mocked(SettingsService.isComplete).mockReturnValue(true)
    vi.mocked(SettingsService.save).mockReturnValue(true)

    setupAppDom()
    app = makeApp()
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('初期状態', () => {
    it('初期値が正しく設定される', () => {
      expect(app.photo).toBe(null)
      expect(app.error).toBe(null)
      expect(app.isLoading).toBe(false)
      expect(app.showDebug).toBe(false)
      expect(app.debugLogs).toEqual([])
      expect(app.showSettings).toBe(false)
      expect(app.isSendingMail).toBe(false)
      expect(app.isCopyingLogs).toBe(false)
    })

    it('設定が正しく読み込まれる', () => {
      expect(app.settings).toEqual(mockSettings)
      expect(SettingsService.load).toHaveBeenCalledOnce()
    })

    it('tempSettingsが空の状態で初期化される', () => {
      expect(app.tempSettings).toEqual({
        email: '',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      })
    })

    it('isSettingsCompleteゲッターが正しく動作する', () => {
      expect(app.isSettingsComplete).toBe(true)
      expect(SettingsService.isComplete).toHaveBeenCalledWith(mockSettings)
    })

    it('maskedSavedApiKey ゲッターが保存済みキーをマスクして返す', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        apiKey: 're_savedkey1234abcd'
      })

      app = makeApp()

      expect(app.maskedSavedApiKey).toBe('re_••••abcd')
    })

    it('maskedSavedApiKey ゲッターは未保存時に空文字を返す', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        apiKey: ''
      })

      app = makeApp()

      expect(app.maskedSavedApiKey).toBe('')
    })
  })

  describe('init()メソッド', () => {
    it('APIキーと送信元アドレスが設定される', () => {
      app.init()

      expect(vi.mocked(emailSender).setApiKey).toHaveBeenCalledWith('test-api-key')
      expect(vi.mocked(emailSender).setFromEmail).toHaveBeenCalledWith('from@example.com')
    })

    it('APIキーが空の場合はsetApiKeyが呼ばれない', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        apiKey: ''
      })

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(vi.mocked(emailSender).setApiKey).not.toHaveBeenCalled()
    })

    it('送信元アドレスが空の場合はsetFromEmailが呼ばれない', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        fromEmail: ''
      })

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(vi.mocked(emailSender).setFromEmail).not.toHaveBeenCalled()
    })

    it('プリセットが空の場合は再生成される', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        sendPresets: []
      })

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(SettingsService.syncPresetsWithEmails).toHaveBeenCalledWith(app.settings)
    })

    it('プリセットが存在しない場合は再生成される', () => {
      const settingsWithNullPresets = {
        ...mockSettings,
        sendPresets: null as any
      }

      vi.mocked(SettingsService.load).mockReturnValue(settingsWithNullPresets)

      app = makeApp()
      // $nextTickをモック（再設定）
      app.$nextTick = vi.fn((callback: () => void) => callback())

      app.init()

      expect(SettingsService.syncPresetsWithEmails).toHaveBeenCalledWith(app.settings)
    })

    it('Dropboxプリセットが不足している場合の整合性チェック', () => {
      const settingsWithoutDropboxPreset = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['test@example.com'],
            isActive: true
          }
        ]
      }

      vi.mocked(SettingsService.load).mockReturnValue(settingsWithoutDropboxPreset)

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(SettingsService.syncPresetsWithEmails).toHaveBeenCalledWith(app.settings)
    })

    it('Dropboxプリセットが非アクティブの場合の修正', () => {
      const settingsWithInactiveDropbox = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['test@example.com'],
            isActive: true
          },
          {
            id: 'dropbox',
            name: 'Dropbox',
            recipients: [],
            isActive: false
          }
        ]
      }

      vi.mocked(SettingsService.load).mockReturnValue(settingsWithInactiveDropbox)

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(SettingsService.syncPresetsWithEmails).toHaveBeenCalledWith(app.settings)
    })

    it('メインプリセットのメールアドレス不一致の場合の修正', () => {
      const settingsWithMismatchedEmail = {
        ...mockSettings,
        email: 'new@example.com',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['old@example.com'],
            isActive: true
          },
          {
            id: 'dropbox',
            name: 'Dropbox',
            recipients: ['dropbox@getdropbox.com'],
            isActive: true
          }
        ]
      }

      vi.mocked(SettingsService.load).mockReturnValue(settingsWithMismatchedEmail)

      app = makeApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()

      expect(SettingsService.syncPresetsWithEmails).toHaveBeenCalledWith(app.settings)
    })

    it('プリセットが正常な場合はupdateAllPresetのみ呼ばれる', () => {
      // 既存のappを使用（$nextTickは既にbeforeEachで設定済み）
      app.init()

      expect(SettingsService.syncPresetsWithEmails).not.toHaveBeenCalled()
      expect(SettingsService.updateAllPreset).toHaveBeenCalledWith(mockSettings)
    })

    it('デバッグログが追加される', () => {
      const addDebugLogSpy = vi.spyOn(app, 'addDebugLog')

      app.init()

      expect(addDebugLogSpy).toHaveBeenCalledWith('プリセット数: 2個がアクティブ', 'info')
    })
  })

  describe('retake()メソッド', () => {
    it('写真とエラーをクリアする', () => {
      app.photo = 'data:image/jpeg;base64,test'
      app.error = 'テストエラー'

      app.retake()

      expect(app.photo).toBe(null)
      expect(app.error).toBe(null)
    })
  })

  describe('returnToHome()メソッド', () => {
    it('写真とエラーをクリアする', () => {
      app.photo = 'data:image/jpeg;base64,test'
      app.error = 'テストエラー'

      app.returnToHome()

      expect(app.photo).toBe(null)
      expect(app.error).toBe(null)
    })
  })







  describe('Alpine.js統合', () => {
    it('receiptApp関数が適切にエクスポートされている', () => {
      // receiptApp関数自体の存在を確認
      expect(receiptApp).toBeDefined()
      expect(typeof receiptApp).toBe('function')
    })

    it('receiptApp関数が適切なオブジェクトを返す', () => {
      const appInstance = makeApp()

      // 基本プロパティの存在確認
      expect(appInstance).toHaveProperty('init')
      expect(appInstance).toHaveProperty('sendMail')
      expect(appInstance).toHaveProperty('photo')
      expect(appInstance).toHaveProperty('settings')

      // 関数プロパティの確認
      expect(typeof appInstance.init).toBe('function')
      expect(typeof appInstance.sendMail).toBe('function')
    })

  })
})
