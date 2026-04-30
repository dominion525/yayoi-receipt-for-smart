import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CompleteAppData } from '../types/app'
import { SettingsService } from '../services/settings.service'
import { mockSettings, setupAppDom, makeApp } from './__fixtures__/receiptApp'

// vi.mock は hoist の都合で各 split ファイルで個別に宣言する必要がある
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

describe('receiptApp - settings', () => {
  let app: CompleteAppData

  beforeEach(() => {
    vi.clearAllMocks()

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

  describe('openSettings()メソッド', () => {
    it('設定モーダルを開く', () => {
      expect(app.showSettings).toBe(false)

      app.openSettings()

      expect(app.showSettings).toBe(true)
    })

    it('現在の設定を一時設定にコピーする', () => {
      const customSettings = {
        ...mockSettings,
        email: 'custom@example.com',
        dropboxEmail: 'custom@getdropbox.com'
      }
      app.settings = customSettings

      app.openSettings()

      expect(app.tempSettings).toEqual({
        email: 'custom@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: 'custom@getdropbox.com',
        fromEmail: 'from@example.com',
        sendPresets: customSettings.sendPresets
      })
    })

    it('dropboxEmailとfromEmailがundefinedの場合は空文字列にする', () => {
      const settingsWithUndefined = {
        ...mockSettings,
        dropboxEmail: undefined as any,
        fromEmail: undefined as any
      }
      app.settings = settingsWithUndefined

      app.openSettings()

      expect(app.tempSettings.dropboxEmail).toBe('')
      expect(app.tempSettings.fromEmail).toBe('')
    })

    it('sendPresetsの深いコピーが作成される', () => {
      app.openSettings()

      // 元の配列とは異なるインスタンス
      expect(app.tempSettings.sendPresets).not.toBe(app.settings.sendPresets)
      // 内容は同じ
      expect(app.tempSettings.sendPresets).toEqual(app.settings.sendPresets)

      // 変更しても元に影響しない
      app.tempSettings.sendPresets[0]!.name = '変更されたプリセット'
      expect(app.settings.sendPresets[0]?.name).toBe('メインアドレス')
    })
  })

  describe('closeSettings()メソッド', () => {
    it('設定モーダルを閉じる', () => {
      app.showSettings = true

      app.closeSettings()

      expect(app.showSettings).toBe(false)
    })

    it('一時設定をクリアする', () => {
      app.tempSettings = {
        email: 'temp@example.com',
        apiKey: 'temp-key',
        dropboxEmail: 'temp@dropbox.com',
        fromEmail: 'temp@from.com',
        sendPresets: [{ id: 'temp', name: 'temp', recipients: [], isActive: true }]
      }

      app.closeSettings()

      expect(app.tempSettings).toEqual({
        email: '',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      })
    })
  })

  describe('saveSettings()メソッド', () => {
    beforeEach(() => {
      app.tempSettings = {
        email: '  new@example.com  ',
        apiKey: '  re_newapikey1234  ',
        dropboxEmail: '  new@dropbox.com  ',
        fromEmail: '  new@from.com  ',
        sendPresets: [
          { id: 'new', name: 'New Preset', recipients: ['new@example.com'], isActive: true }
        ]
      }
    })

    it('一時設定から正式設定に保存する', async () => {
      vi.mocked(SettingsService.save).mockReturnValue(true)
      const closeSettingsSpy = vi.spyOn(app, 'closeSettings')

      await app.saveSettings()

      expect(SettingsService.updatePresetsFromTempSettings).toHaveBeenCalledWith({
        email: '  new@example.com  ',
        apiKey: '  re_newapikey1234  ',
        dropboxEmail: '  new@dropbox.com  ',
        fromEmail: '  new@from.com  ',
        sendPresets: [
          { id: 'new', name: 'New Preset', recipients: ['new@example.com'], isActive: true }
        ]
      })
      expect(SettingsService.save).toHaveBeenCalledWith({
        email: 'new@example.com',
        apiKey: 're_newapikey1234',
        dropboxEmail: 'new@dropbox.com',
        fromEmail: 'new@from.com',
        sendPresets: [
          { id: 'new', name: 'New Preset', recipients: ['new@example.com'], isActive: true }
        ]
      })
      expect(closeSettingsSpy).toHaveBeenCalledOnce()
    })

    it('設定値の前後の空白をトリムする', async () => {
      vi.mocked(SettingsService.save).mockReturnValue(true)

      await app.saveSettings()

      expect(app.settings.email).toBe('new@example.com')
      expect(app.settings.apiKey).toBe('re_newapikey1234')
      expect(app.settings.dropboxEmail).toBe('new@dropbox.com')
      expect(app.settings.fromEmail).toBe('new@from.com')
    })

    it('dropboxEmailとfromEmailがundefinedの場合は空文字列にする', async () => {
      app.tempSettings.dropboxEmail = undefined as any
      app.tempSettings.fromEmail = undefined as any
      vi.mocked(SettingsService.save).mockReturnValue(true)

      await app.saveSettings()

      expect(app.settings.dropboxEmail).toBe('')
      expect(app.settings.fromEmail).toBe('')
    })

    it('保存成功時にデバッグログを出力する', async () => {
      vi.mocked(SettingsService.save).mockReturnValue(true)
      const addDebugLogSpy = vi.spyOn(app, 'addDebugLog')

      await app.saveSettings()

      expect(addDebugLogSpy).toHaveBeenCalledWith('設定をlocalStorageに保存しました', 'success')
    })

    it('保存失敗時にエラーを表示する', async () => {
      vi.mocked(SettingsService.save).mockReturnValue(false)
      const showErrorSpy = vi.spyOn(app, 'showError')
      const addDebugLogSpy = vi.spyOn(app, 'addDebugLog')
      const closeSettingsSpy = vi.spyOn(app, 'closeSettings')

      await app.saveSettings()

      expect(showErrorSpy).toHaveBeenCalledWith(
        '設定の保存に失敗しました。ブラウザの設定を確認してください。'
      )
      expect(addDebugLogSpy).toHaveBeenCalledWith('localStorage保存エラー', 'error')
      expect(closeSettingsSpy).not.toHaveBeenCalled()
    })

    it('保存失敗時は元の設定を維持する', async () => {
      const originalSettings = { ...app.settings }
      vi.mocked(SettingsService.save).mockReturnValue(false)

      await app.saveSettings()

      expect(app.settings).toEqual(originalSettings)
    })

    it('APIキー形式が不正な場合は保存を拒否する', async () => {
      app.tempSettings.apiKey = 'invalid-api-key'
      const showErrorSpy = vi.spyOn(app, 'showError')
      const addDebugLogSpy = vi.spyOn(app, 'addDebugLog')

      const result = await app.saveSettings()

      expect(result).toBe(false)
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('APIキーの形式が正しくありません')
      )
      expect(addDebugLogSpy).toHaveBeenCalledWith('APIキー形式エラー', 'error')
      expect(SettingsService.save).not.toHaveBeenCalled()
    })

    it('APIキーが空白のみの場合は形式チェックをスキップする', async () => {
      app.tempSettings.apiKey = '   '
      vi.mocked(SettingsService.save).mockReturnValue(true)
      const showErrorSpy = vi.spyOn(app, 'showError')

      await app.saveSettings()

      expect(showErrorSpy).not.toHaveBeenCalled()
      expect(SettingsService.save).toHaveBeenCalled()
      expect(app.settings.apiKey).toBe('')
    })
  })
})
