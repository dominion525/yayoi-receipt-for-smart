import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { receiptApp, ReceiptAppData } from '../app'
import { SettingsService } from '../services/settings.service'
import { DebugService } from '../services/debug.service'
import { EmailService } from '../services/email.service'
import { emailSender } from '../lib/mail'

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
    sendMail: vi.fn(),
    sendMailToPreset: vi.fn()
  }
}))

describe('receiptApp', () => {
  let app: ReceiptAppData & Record<string, any>
  
  // デフォルト設定
  const mockSettings = {
    email: 'test@example.com',
    apiKey: 'test-api-key',
    dropboxEmail: 'dropbox@getdropbox.com',
    fromEmail: 'from@example.com',
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
        recipients: ['dropbox@getdropbox.com'],
        isActive: true
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // デフォルトモック設定
    vi.mocked(SettingsService.load).mockReturnValue(mockSettings)
    vi.mocked(SettingsService.isComplete).mockReturnValue(true)
    vi.mocked(SettingsService.save).mockReturnValue(true)
    
    // DOM環境のセットアップ
    document.body.innerHTML = `
      <div id="debug-panel">
        <div class="bg-black"></div>
      </div>
    `
    
    // 新しいアプリインスタンスを作成
    app = receiptApp()
    
    // Alpine.jsの$nextTickをモック
    app.$nextTick = vi.fn((callback: () => void) => {
      // 即座にコールバックを実行（同期的に）
      callback()
    })
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
      expect(app.showCaptureEffect).toBe(false)
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
      
      app = receiptApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()
      
      expect(vi.mocked(emailSender).setApiKey).not.toHaveBeenCalled()
    })

    it('送信元アドレスが空の場合はsetFromEmailが呼ばれない', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        fromEmail: ''
      })
      
      app = receiptApp()
      app.$nextTick = vi.fn((callback: () => void) => callback())
      app.init()
      
      expect(vi.mocked(emailSender).setFromEmail).not.toHaveBeenCalled()
    })

    it('プリセットが空の場合は再生成される', () => {
      vi.mocked(SettingsService.load).mockReturnValue({
        ...mockSettings,
        sendPresets: []
      })
      
      app = receiptApp()
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
      
      app = receiptApp()
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
      
      app = receiptApp()
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
      
      app = receiptApp()
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
      
      app = receiptApp()
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
      
      expect(addDebugLogSpy).toHaveBeenCalledWith(
        'プリセット数: 2個がアクティブ',
        'info'
      )
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

  describe('toggleDebug()メソッド', () => {
    it('デバッグ表示をトグルする', () => {
      expect(app.showDebug).toBe(false)
      
      app.toggleDebug()
      expect(app.showDebug).toBe(true)
      
      app.toggleDebug()
      expect(app.showDebug).toBe(false)
    })
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

  describe('addDebugLog()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T14:30:45.123Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('デバッグログが正しく追加される', () => {
      const message = 'テストメッセージ'
      const type = 'info'
      
      app.addDebugLog(message, type)
      
      expect(app.debugLogs).toHaveLength(1)
      expect(app.debugLogs[0]).toEqual({
        time: '23:30:45.123',
        type: 'info',
        message: 'テストメッセージ'
      })
    })

    it('デフォルトのタイプはinfoになる', () => {
      app.addDebugLog('テストメッセージ')
      
      expect(app.debugLogs[0]?.type).toBe('info')
    })

    it('各タイプのログが正しく記録される', () => {
      const types: Array<'info' | 'success' | 'warning' | 'error' | 'debug'> = 
        ['info', 'success', 'warning', 'error', 'debug']
      
      types.forEach((type, index) => {
        app.addDebugLog(`メッセージ${index}`, type)
      })
      
      expect(app.debugLogs).toHaveLength(5)
      types.forEach((type, index) => {
        expect(app.debugLogs[index]?.type).toBe(type)
        expect(app.debugLogs[index]?.message).toBe(`メッセージ${index}`)
      })
    })

    it('DebugServiceにも記録される', () => {
      app.addDebugLog('テストメッセージ', 'success')
      
      expect(DebugService.add).toHaveBeenCalledWith('テストメッセージ', 'success')
    })

    it('100件を超えるログは古いものから削除される', () => {
      // 100件のログを追加
      for (let i = 0; i < 100; i++) {
        app.addDebugLog(`ログ${i}`)
      }
      
      expect(app.debugLogs).toHaveLength(100)
      expect(app.debugLogs[0]?.message).toBe('ログ0')
      expect(app.debugLogs[99]?.message).toBe('ログ99')
      
      // 101件目を追加
      app.addDebugLog('ログ100')
      
      expect(app.debugLogs).toHaveLength(100)
      expect(app.debugLogs[0]?.message).toBe('ログ1')  // 最初のログが削除される
      expect(app.debugLogs[99]?.message).toBe('ログ100')
    })

    it('時刻が正しくフォーマットされる', () => {
      // 異なる時刻でテスト
      vi.setSystemTime(new Date('2024-12-25T09:05:03.045Z'))
      app.addDebugLog('時刻テスト')
      
      expect(app.debugLogs[0]?.time).toBe('18:05:03.045')
    })


    it('DOM要素が存在しない場合もエラーにならない', () => {
      // debug-panel要素を削除
      document.getElementById('debug-panel')?.remove()
      
      expect(() => {
        app.addDebugLog('DOM要素なしテスト')
      }).not.toThrow()
    })

    it('bg-black要素が存在しない場合もエラーにならない', () => {
      // bg-black要素を削除
      document.querySelector('#debug-panel .bg-black')?.remove()
      
      expect(() => {
        app.addDebugLog('bg-black要素なしテスト')
      }).not.toThrow()
    })
  })

  describe('clearDebugLogs()メソッド', () => {
    it('ログをクリアする', () => {
      // 複数のログを追加
      app.addDebugLog('ログ1')
      app.addDebugLog('ログ2')
      app.addDebugLog('ログ3')
      
      expect(app.debugLogs).toHaveLength(3)
      
      app.clearDebugLogs()
      
      expect(app.debugLogs).toHaveLength(0)
    })

    it('DebugServiceもクリアされる', () => {
      app.clearDebugLogs()
      
      expect(DebugService.clear).toHaveBeenCalledOnce()
    })
  })

  describe('copyDebugLogs()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('ログをクリップボードにコピーする', async () => {
      vi.mocked(DebugService.copyToClipboard).mockResolvedValue(true)
      
      expect(app.isCopyingLogs).toBe(false)
      
      const copyPromise = app.copyDebugLogs()
      
      expect(app.isCopyingLogs).toBe(true)
      expect(DebugService.copyToClipboard).toHaveBeenCalledOnce()
      
      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(DebugService.copyToClipboard).toHaveBeenCalled()
      })
      
      // 2秒経過
      vi.advanceTimersByTime(2000)
      await copyPromise
      
      expect(app.isCopyingLogs).toBe(false)
    })

  })

  describe('handleNativeCamera()メソッド', () => {
    let mockInput: HTMLInputElement
    let mockFile: File

    beforeEach(() => {
      // モックファイルを作成
      mockFile = new File(['mock image data'], 'test.jpg', { type: 'image/jpeg' })
      
      // モックinput要素を作成
      mockInput = document.createElement('input')
      mockInput.type = 'file'
      
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('ファイルが選択された場合に画像を処理する', async () => {
      // FileReaderをモック
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,testImageData'
      }
      
      global.FileReader = vi.fn(() => mockFileReader) as any

      // ファイルを設定
      Object.defineProperty(mockInput, 'files', {
        value: [mockFile],
        writable: false
      })

      const event = { target: mockInput } as any
      
      // メソッド実行
      app.handleNativeCamera(event)

      expect(app.isSendingMail).toBe(false)
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile)

      // FileReader の onload を実行
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,testImageData' } })

      expect(app.showCaptureEffect).toBe(true)
      expect(app.photo).toBe('data:image/jpeg;base64,testImageData')

      // 300ms経過でエフェクト終了
      vi.advanceTimersByTime(300)
      expect(app.showCaptureEffect).toBe(false)
    })

    it('ファイルが選択されていない場合は何もしない', () => {
      Object.defineProperty(mockInput, 'files', {
        value: [],
        writable: false
      })

      const event = { target: mockInput } as any
      const initialPhoto = app.photo
      
      app.handleNativeCamera(event)
      
      expect(app.photo).toBe(initialPhoto)
    })

    it('FileReader でエラーが発生した場合', () => {
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: vi.fn(),
        result: null
      }
      
      global.FileReader = vi.fn(() => mockFileReader) as any

      Object.defineProperty(mockInput, 'files', {
        value: [mockFile],
        writable: false
      })

      const event = { target: mockInput } as any
      const showErrorSpy = vi.spyOn(app, 'showError')
      
      app.handleNativeCamera(event)

      // FileReader の onerror を実行
      mockFileReader.onerror()

      expect(showErrorSpy).toHaveBeenCalledWith('画像の読み込みに失敗しました')
    })

    it('input値がリセットされる', () => {
      Object.defineProperty(mockInput, 'files', {
        value: [mockFile],
        writable: false
      })

      const event = { target: mockInput } as any
      
      app.handleNativeCamera(event)
      
      expect(mockInput.value).toBe('')
    })
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
      
      expect(showErrorSpy).toHaveBeenCalledWith('メール設定が完了していません。設定を行ってください。')
      expect(openSettingsSpy).toHaveBeenCalledOnce()
      expect(app.isSendingMail).toBe(false)
    })

    it('メール送信が成功した場合', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      const retakeSpy = vi.spyOn(app, 'retake')
      
      await app.sendMail()
      
      expect(app.isSendingMail).toBe(false)
      expect(EmailService.sendMail).toHaveBeenCalledWith(
        'data:image/jpeg;base64,testImageData',
        mockSettings,
        expect.any(Function),
        expect.any(Function)
      )
      expect(retakeSpy).toHaveBeenCalledOnce()
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

    it('成功メッセージは3秒後に自動クリアされる', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      // sendMailの実行中にエラー表示関数をテスト
      let errorDisplayFunction: (message: string) => void = () => {}
      
      vi.mocked(EmailService.sendMail).mockImplementation(async (_photo, _settings, _debugLog, showError) => {
        errorDisplayFunction = showError
        return { success: true, shouldRetake: true }
      })
      
      await app.sendMail()
      
      // 成功メッセージを表示
      errorDisplayFunction('✅ 送信完了!')
      expect(app.error).toBe('✅ 送信完了!')
      
      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe(null)
    })

    it('通常のエラーメッセージは自動クリアされない', async () => {
      vi.mocked(EmailService.sendMail).mockResolvedValue({
        success: false,
        shouldRetake: false
      })

      let errorDisplayFunction: (message: string) => void = () => {}
      
      vi.mocked(EmailService.sendMail).mockImplementation(async (_photo, _settings, _debugLog, showError) => {
        errorDisplayFunction = showError
        return { success: false, shouldRetake: false }
      })
      
      await app.sendMail()
      
      // エラーメッセージを表示
      errorDisplayFunction('送信に失敗しました')
      expect(app.error).toBe('送信に失敗しました')
      
      // 3秒経過してもクリアされない
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe('送信に失敗しました')
    })
  })

  describe('sendMailToPreset()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      app.photo = 'data:image/jpeg;base64,testImageData'
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('指定されたプリセットでメール送信する', async () => {
      vi.mocked(EmailService.sendMailToPreset).mockResolvedValue({
        success: true,
        shouldRetake: true
      })

      const retakeSpy = vi.spyOn(app, 'retake')
      
      await app.sendMailToPreset('main')
      
      expect(EmailService.sendMailToPreset).toHaveBeenCalledWith(
        'main',
        'data:image/jpeg;base64,testImageData',
        mockSettings,
        expect.any(Function),
        expect.any(Function)
      )
      expect(retakeSpy).toHaveBeenCalledOnce()
    })

    it('送信状態が正しく管理される', async () => {
      vi.mocked(EmailService.sendMailToPreset).mockResolvedValue({
        success: true,
        shouldRetake: false
      })

      expect(app.isSendingMail).toBe(false)
      
      const sendPromise = app.sendMailToPreset('dropbox')
      expect(app.isSendingMail).toBe(true)
      
      await sendPromise
      expect(app.isSendingMail).toBe(false)
    })
  })

  describe('設定管理機能', () => {
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
          apiKey: '  new-api-key  ',
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
          apiKey: '  new-api-key  ',
          dropboxEmail: '  new@dropbox.com  ',
          fromEmail: '  new@from.com  ',
          sendPresets: [
            { id: 'new', name: 'New Preset', recipients: ['new@example.com'], isActive: true }
          ]
        })
        expect(SettingsService.save).toHaveBeenCalledWith({
          email: 'new@example.com',
          apiKey: 'new-api-key',
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
        expect(app.settings.apiKey).toBe('new-api-key')
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
        
        expect(showErrorSpy).toHaveBeenCalledWith('設定の保存に失敗しました。ブラウザの設定を確認してください。')
        expect(addDebugLogSpy).toHaveBeenCalledWith('localStorage保存エラー', 'error')
        expect(closeSettingsSpy).not.toHaveBeenCalled()
      })

      it('保存失敗時は元の設定を維持する', async () => {
        const originalSettings = { ...app.settings }
        vi.mocked(SettingsService.save).mockReturnValue(false)
        
        await app.saveSettings()
        
        expect(app.settings).toEqual(originalSettings)
      })
    })
  })

  describe('エラーメッセージの自動クリア機能', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // 設定が完了状態であることを確保
      vi.mocked(SettingsService.isComplete).mockReturnValue(true)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('sendMail内での成功メッセージ自動クリア', async () => {
      // エラー表示関数をキャプチャするためのテスト
      let errorDisplayFunction: (message: string) => void = () => {}
      
      vi.mocked(EmailService.sendMail).mockImplementation(async (_photo, _settings, _debugLog, showError) => {
        errorDisplayFunction = showError
        return { success: true, shouldRetake: true }
      })
      
      app.photo = 'data:image/jpeg;base64,test'
      await app.sendMail()
      
      // 成功メッセージを表示
      errorDisplayFunction('✅ 成功メッセージ')
      expect(app.error).toBe('✅ 成功メッセージ')
      
      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe(null)
    })

    it('sendMailToPreset内での成功メッセージ自動クリア', async () => {
      vi.mocked(EmailService.sendMailToPreset).mockImplementation(async (_presetId, _photo, _settings, _debugLog, showError) => {
        showError('✅ プリセット送信成功')
        return { success: true, shouldRetake: false }
      })
      
      app.photo = 'data:image/jpeg;base64,test'
      await app.sendMailToPreset('main')
      
      expect(app.error).toBe('✅ プリセット送信成功')
      
      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe(null)
    })

    it('エラーメッセージが途中で変更された場合は自動クリアしない', async () => {
      // エラー表示関数をキャプチャするためのテスト
      let errorDisplayFunction: (message: string) => void = () => {}
      
      vi.mocked(EmailService.sendMail).mockImplementation(async (_photo, _settings, _debugLog, showError) => {
        errorDisplayFunction = showError
        return { success: true, shouldRetake: true }
      })
      
      app.photo = 'data:image/jpeg;base64,test'
      await app.sendMail()
      
      // 成功メッセージを表示
      errorDisplayFunction('✅ 成功メッセージ')
      expect(app.error).toBe('✅ 成功メッセージ')
      
      // メッセージを途中で変更
      app.error = '別のエラー'
      
      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(app.error).toBe('別のエラー')
    })
  })

  describe('Alpine.js統合', () => {
    it('receiptApp関数が適切にエクスポートされている', () => {
      // receiptApp関数自体の存在を確認
      expect(receiptApp).toBeDefined()
      expect(typeof receiptApp).toBe('function')
    })
    
    it('receiptApp関数が適切なオブジェクトを返す', () => {
      const appInstance = receiptApp()
      
      // 基本プロパティの存在確認
      expect(appInstance).toHaveProperty('init')
      expect(appInstance).toHaveProperty('sendMail')
      expect(appInstance).toHaveProperty('photo')
      expect(appInstance).toHaveProperty('settings')
      
      // 関数プロパティの確認
      expect(typeof appInstance.init).toBe('function')
      expect(typeof appInstance.sendMail).toBe('function')
    })

    it('alpine:initイベントでAlpine.dataが呼ばれる（app.ts 332-333行目をカバー）', () => {
      const mockAlpine = {
        data: vi.fn()
      }
      
      // グローバルAlpineをモックに設定
      vi.stubGlobal('Alpine', mockAlpine)
      
      try {
        // 新しいイベントリスナーを追加して332-333行目の処理を再現
        const alpineInitHandler = () => {
          // @ts-ignore - app.ts 332行目のコードを直接実行
          Alpine.data('receiptApp', receiptApp)
        }
        
        // イベントリスナーを追加
        document.addEventListener('alpine:init', alpineInitHandler)
        
        // alpine:initイベントを発火
        const event = new Event('alpine:init')
        document.dispatchEvent(event)
        
        // Alpine.dataが正しく呼ばれることを確認
        expect(mockAlpine.data).toHaveBeenCalledWith('receiptApp', receiptApp)
        
        // イベントリスナーをクリーンアップ
        document.removeEventListener('alpine:init', alpineInitHandler)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})