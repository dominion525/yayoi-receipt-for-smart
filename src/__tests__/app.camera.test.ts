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

describe('receiptApp - camera', () => {
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

      expect(app.photo).toBe('data:image/jpeg;base64,testImageData')
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
})
