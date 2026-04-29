import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CompleteAppData } from '../types/app'
import { SettingsService } from '../services/settings.service'
import { EmailService } from '../services/email.service'
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

describe('receiptApp - send', () => {
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

  describe('sendMail()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      app.photo = 'data:image/jpeg;base64,testImageData'
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('設定が不完全な場合はエラーを表示する', async () => {
      vi.mocked(SettingsService.isComplete).mockReturnValue(false)
      const openSettingsSpy = vi.spyOn(app, 'openSettings')
      const showErrorSpy = vi.spyOn(app, 'showError')

      await app.sendMail()

      expect(showErrorSpy).toHaveBeenCalledWith(
        'メール設定が完了していません。設定を行ってください。'
      )
      expect(openSettingsSpy).toHaveBeenCalledOnce()
      expect(app.isSendingMail).toBe(false)
    })

    it('メール送信が成功した場合', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      const retakeSpy = vi.spyOn(app, 'retake')
      const showSuccessSpy = vi.spyOn(app, 'showSuccess')

      await app.sendMail()

      expect(app.isSendingMail).toBe(false)
      expect(EmailService.sendMail).toHaveBeenCalledWith(
        'data:image/jpeg;base64,testImageData',
        mockSettings,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      )

      // 完了メッセージが設定される
      expect(app.completionMessage).toBe('送信が完了しました')

      // まだretakeは呼ばれていない
      expect(retakeSpy).not.toHaveBeenCalled()

      // 3秒後にretakeが呼ばれ、その後成功メッセージが表示される
      vi.advanceTimersByTime(3000)
      expect(app.completionMessage).toBe(null)
      expect(retakeSpy).toHaveBeenCalledOnce()

      // $nextTickの処理を待つ
      if (app.$nextTick) {
        await new Promise<void>((resolve) => app.$nextTick!(() => resolve()))
      } else {
        vi.advanceTimersByTime(100)
      }

      expect(showSuccessSpy).toHaveBeenCalledWith('レシートを送信しました')
    })

    it('メール送信が失敗した場合はretakeしない', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: false,
        shouldRetake: false
      })

      const retakeSpy = vi.spyOn(app, 'retake')

      await app.sendMail()

      expect(retakeSpy).not.toHaveBeenCalled()
    })

    it('成功メッセージは5秒後に自動クリアされる', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      await app.sendMail()

      // 3秒経過して、メイン画面に戻った後の成功メッセージ
      vi.advanceTimersByTime(3000)

      // $nextTickの処理を待つ
      if (app.$nextTick) {
        await new Promise<void>((resolve) => app.$nextTick!(() => resolve()))
      } else {
        vi.advanceTimersByTime(100)
      }

      expect(app.successMessage).toBe('レシートを送信しました')

      // 5秒経過
      vi.advanceTimersByTime(5000)
      expect(app.successMessage).toBe(null)
    })

    it('通常のエラーメッセージは自動クリアされない', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: false,
        shouldRetake: false
      })

      let errorDisplayFunction: (message: string) => void = () => {}

      vi.mocked(EmailService.sendMail).mockImplementation(
        async (_photo, _settings, _debugLog, showError) => {
          errorDisplayFunction = showError
          return { success: false, shouldRetake: false }
        }
      )

      await app.sendMail()

      // エラーメッセージを表示
      errorDisplayFunction('送信に失敗しました')
      expect(app.error).toBe('送信に失敗しました')

      // 3秒経過してもクリアされない
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe('送信に失敗しました')
    })
  })

  describe('成功メッセージの自動クリア', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // 設定が完了状態であることを確保
      vi.mocked(SettingsService.isComplete).mockReturnValue(true)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('成功メッセージが途中で変更された場合は自動クリアしない', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      app.photo = 'data:image/jpeg;base64,test'
      await app.sendMail()

      // 3秒経過して、メイン画面に戻った後
      vi.advanceTimersByTime(3000)
      expect(app.successMessage).toBe('レシートを送信しました')

      // メッセージを途中で変更
      app.successMessage = '別のメッセージ'

      // 5秒経過
      vi.advanceTimersByTime(5000)
      expect(app.successMessage).toBe('別のメッセージ')
    })
  })

  describe('handleEmailProgress', () => {
    beforeEach(() => {
      vi.clearAllTimers()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('進捗状態を設定する', () => {
      const app = makeApp()
      const progress = {
        total: 3,
        sent: 1,
        failed: 0,
        currentRecipients: ['test@example.com'],
        status: 'sending' as const,
        percentage: 33
      }

      app.handleEmailProgress(progress)

      expect(app.sendProgress).toBe(progress)
    })

    it('completed時に3秒後にクリアする', () => {
      const app = makeApp()
      const progress = {
        total: 2,
        sent: 2,
        failed: 0,
        currentRecipients: [],
        status: 'completed' as const,
        percentage: 100
      }

      app.handleEmailProgress(progress)
      expect(app.sendProgress).toBe(progress)

      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.sendProgress).toBe(null)
    })

    it('error時に3秒後にクリアする', () => {
      const app = makeApp()
      const progress = {
        total: 2,
        sent: 1,
        failed: 1,
        currentRecipients: [],
        status: 'error' as const,
        percentage: 100
      }

      app.handleEmailProgress(progress)
      expect(app.sendProgress).toBe(progress)

      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.sendProgress).toBe(null)
    })

    it('sending時は自動クリアしない', () => {
      const app = makeApp()
      const progress = {
        total: 3,
        sent: 1,
        failed: 0,
        currentRecipients: ['test2@example.com', 'test3@example.com'],
        status: 'sending' as const,
        percentage: 33
      }

      app.handleEmailProgress(progress)
      expect(app.sendProgress).toBe(progress)

      // 3秒経過してもクリアされない
      vi.advanceTimersByTime(3000)
      expect(app.sendProgress).toBe(progress)
    })

    it('completedクリアタイマー進行中に新しいsendingが来ても最新progressを消さない', () => {
      const app = makeApp()

      const completedProgress = {
        total: 2,
        sent: 2,
        failed: 0,
        currentRecipients: [],
        status: 'completed' as const,
        percentage: 100
      }

      const nextSendingProgress = {
        total: 3,
        sent: 1,
        failed: 0,
        currentRecipients: ['next@example.com'],
        status: 'sending' as const,
        percentage: 33
      }

      // completedを投入。3秒のクリアタイマーが開始される
      app.handleEmailProgress(completedProgress)
      expect(app.sendProgress).toBe(completedProgress)

      // 1秒経過（クリアタイマーは未発火）
      vi.advanceTimersByTime(1000)
      expect(app.sendProgress).toBe(completedProgress)

      // 新しいsendingが到来。前のクリアタイマーはキャンセルされる
      app.handleEmailProgress(nextSendingProgress)
      expect(app.sendProgress).toBe(nextSendingProgress)

      // さらに2秒経過（completed投入から合計3秒）。
      // タイマー管理がなければここで sendProgress が null になってしまう
      vi.advanceTimersByTime(2000)
      expect(app.sendProgress).toBe(nextSendingProgress)

      // さらに2秒経過（sending投入から3秒）。sendingは自動クリアしない
      vi.advanceTimersByTime(2000)
      expect(app.sendProgress).toBe(nextSendingProgress)
    })

    it('$nextTickが存在しない場合、setTimeoutで成功メッセージを表示する（sendMail・111-114行目カバー）', async () => {
      const mockLoadedSettings = {
        email: 'test@example.com',
        dropboxEmail: 'dropbox@example.com',
        apiKey: 'test-api-key',
        fromEmail: 'sender@example.com',
        sendPresets: []
      }

      vi.mocked(SettingsService.load).mockReturnValue(mockLoadedSettings)
      vi.mocked(SettingsService.isComplete).mockReturnValue(true)

      const app = makeApp()
      app.photo = 'data:image/jpeg;base64,test-photo'

      // showSuccessをスパイ
      const showSuccessSpy = vi.spyOn(app, 'showSuccess')

      // $nextTickを無効化
      app.$nextTick = undefined

      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      await app.sendMail()

      // 3秒 + 100msのsetTimeoutを進める
      vi.advanceTimersByTime(3100)

      expect(showSuccessSpy).toHaveBeenCalledWith('レシートを送信しました')
    })
  })

  describe('ユーザーフロー統合', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('設定不完全エラー → モーダル誘導 → 設定修正・保存 → 再送信成功', async () => {
      // 初期状態: 設定が不完全
      vi.mocked(SettingsService.isComplete).mockReturnValue(false)
      app.photo = 'data:image/jpeg;base64,testImageData'

      const showErrorSpy = vi.spyOn(app, 'showError')
      const openSettingsSpy = vi.spyOn(app, 'openSettings')

      // 1回目の送信試行 → エラー表示 + 設定モーダルへ誘導
      await app.sendMail()

      expect(showErrorSpy).toHaveBeenCalledWith(
        'メール設定が完了していません。設定を行ってください。'
      )
      expect(openSettingsSpy).toHaveBeenCalledOnce()
      expect(app.showSettings).toBe(true)
      expect(EmailService.sendMail).not.toHaveBeenCalled()

      // ユーザーが設定を入力
      app.tempSettings = {
        email: 'fixed@example.com',
        apiKey: 're_fixedapikey1234',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      // 保存後は設定が完了状態となる
      vi.mocked(SettingsService.isComplete).mockReturnValue(true)
      vi.mocked(SettingsService.save).mockReturnValue(true)

      // 設定保存 → モーダルが閉じる
      await app.saveSettings()

      expect(SettingsService.save).toHaveBeenCalled()
      expect(app.showSettings).toBe(false)
      expect(app.settings.email).toBe('fixed@example.com')
      expect(app.settings.apiKey).toBe('re_fixedapikey1234')

      // 再送信が成功
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      await app.sendMail()

      expect(EmailService.sendMail).toHaveBeenCalledOnce()
      expect(app.completionMessage).toBe('送信が完了しました')
    })
  })
})
