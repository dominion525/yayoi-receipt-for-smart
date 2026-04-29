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

describe('receiptApp - message', () => {
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

  describe('showError()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('エラーメッセージを設定する', () => {
      const message = 'テストエラー'

      app.showError(message)

      expect(app.error).toBe(message)
    })

    it('10秒後にエラーメッセージをクリアする', () => {
      const message = 'テストエラー'

      app.showError(message)
      expect(app.error).toBe(message)

      vi.advanceTimersByTime(10000)
      expect(app.error).toBe(null)
    })

    it('エラーメッセージが変更された場合は自動クリアしない', () => {
      const message1 = 'テストエラー1'
      const message2 = 'テストエラー2'

      app.showError(message1)
      app.error = message2

      vi.advanceTimersByTime(10000)
      expect(app.error).toBe(message2)
    })
  })

  describe('handleEmailMessage()メソッド', () => {
    it('✅付きメッセージは無視される', () => {
      const showSuccessSpy = vi.spyOn(app, 'showSuccess')
      const showErrorSpy = vi.spyOn(app, 'showError')

      app.handleEmailMessage('✅ レシートを送信しました')

      expect(showSuccessSpy).not.toHaveBeenCalled()
      expect(showErrorSpy).not.toHaveBeenCalled()
      expect(app.successMessage).toBe(null)
      expect(app.error).toBe(null)
    })

    it('通常のメッセージはエラーとして表示される', () => {
      const showErrorSpy = vi.spyOn(app, 'showError')

      app.handleEmailMessage('送信に失敗しました')

      expect(showErrorSpy).toHaveBeenCalledWith('送信に失敗しました')
      expect(app.error).toBe('送信に失敗しました')
    })
  })
})
