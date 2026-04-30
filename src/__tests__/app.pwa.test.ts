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

describe('receiptApp - pwa', () => {
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

  describe('detectPWAMode()メソッド', () => {
    beforeEach(() => {
      app = makeApp()
      // $nextTickをモック
      app.$nextTick = vi.fn((cb) => cb())
      // addDebugLogをspy
      vi.spyOn(app, 'addDebugLog')
    })

    it('display-mode: standaloneの場合はPWAモードになる', () => {
      // matchMediaをモック
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true
      })
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      })

      app.detectPWAMode()

      expect(mockMatchMedia).toHaveBeenCalledWith('(display-mode: standalone)')
      expect(app.isPWAMode).toBe(true)
      expect(app.addDebugLog).toHaveBeenCalledWith('🎯 PWAモードで起動しました', 'success')
    })

    it('iOS Safariのstandaloneプロパティがtrueの場合はPWAモードになる', () => {
      // matchMediaをモック（falseを返す）
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false
      })
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      })

      // navigator.standaloneをモック
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true
      })

      app.detectPWAMode()

      expect(app.isPWAMode).toBe(true)
      expect(app.addDebugLog).toHaveBeenCalledWith('🎯 PWAモード（iOS）で起動しました', 'success')

      // クリーンアップ
      delete (window.navigator as any).standalone
    })

    it('どちらの条件も満たさない場合はブラウザモードになる', () => {
      // matchMediaをモック（falseを返す）
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false
      })
      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true
      })

      // navigator.standaloneが存在しない状態
      delete (window.navigator as any).standalone

      app.detectPWAMode()

      expect(app.isPWAMode).toBe(false)
      expect(app.addDebugLog).toHaveBeenCalledWith('🌐 ブラウザモードで起動しました', 'info')
    })
  })

  describe('init()メソッド内のPWA関連処理', () => {
    let originalBuildRevision: any
    let originalBuildTime: any

    beforeEach(() => {
      // グローバル変数を保存
      originalBuildRevision = (global as any).__BUILD_REVISION__
      originalBuildTime = (global as any).__BUILD_TIME__

      app = makeApp()
      // $nextTickをモック
      app.$nextTick = vi.fn((cb) => cb())
      // addDebugLogとdetectPWAModeをspy
      vi.spyOn(app, 'addDebugLog')
      vi.spyOn(app, 'detectPWAMode')
    })

    afterEach(() => {
      // グローバル変数を復元
      if (originalBuildRevision !== undefined) {
        ;(global as any).__BUILD_REVISION__ = originalBuildRevision
      } else {
        delete (global as any).__BUILD_REVISION__
      }
      if (originalBuildTime !== undefined) {
        ;(global as any).__BUILD_TIME__ = originalBuildTime
      } else {
        delete (global as any).__BUILD_TIME__
      }
    })

    it('ビルド情報が利用可能な場合は正しく設定される', () => {
      // ビルド情報をモック
      Object.defineProperty(global, '__BUILD_REVISION__', {
        value: 'abc123',
        writable: true,
        configurable: true
      })
      Object.defineProperty(global, '__BUILD_TIME__', {
        value: '2025-01-29T10:00:00Z',
        writable: true,
        configurable: true
      })

      app.init()

      expect(app.buildRevision).toBe('abc123')
      expect(app.buildTime).toBe('2025-01-29T10:00:00Z')
    })

    it('ビルド情報が利用できない場合はデフォルト値が設定される', () => {
      // ビルド情報を削除
      delete (global as any).__BUILD_REVISION__
      delete (global as any).__BUILD_TIME__

      app.init()

      expect(app.buildRevision).toBe('dev')
      expect(app.buildTime).toBe('development')
    })

    it('Service Workerが利用可能な場合は登録される', async () => {
      // Service WorkerのモックをsetUp
      const mockRegistration = {
        update: vi.fn()
      }
      const mockServiceWorker = {
        ready: Promise.resolve(),
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn()
      }
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      app.init()

      // Service Worker readyを待つ
      await mockServiceWorker.ready

      expect(app.serviceWorkerStatus).toBe('✅ 有効')
      expect(app.addDebugLog).toHaveBeenCalledWith('Service Worker: 有効', 'success')

      // 更新チェックを待つ
      await vi.waitFor(() => {
        expect(mockServiceWorker.getRegistration).toHaveBeenCalled()
      })

      expect(mockRegistration.update).toHaveBeenCalled()
      expect(app.addDebugLog).toHaveBeenCalledWith('最新版をチェック中...', 'info')

      // クリーンアップ
      delete (navigator as any).serviceWorker
    })

    it('Service Workerが利用できない場合は未対応と表示される', () => {
      // Service Workerを削除
      delete (navigator as any).serviceWorker

      app.init()

      expect(app.serviceWorkerStatus).toBe('❌ 未対応')
    })

    it('Service Workerからのメッセージを受信できる', async () => {
      // Service WorkerのモックをsetUp
      const mockServiceWorker = {
        ready: Promise.resolve(),
        getRegistration: vi.fn().mockResolvedValue(null),
        addEventListener: vi.fn()
      }
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      app.init()

      // Service Worker readyを待つ
      await mockServiceWorker.ready

      // addEventListenerが呼ばれたことを確認
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )

      // メッセージイベントをシミュレート
      const messageHandler = mockServiceWorker.addEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        data: {
          type: 'SW_ACTIVATED',
          version: 12345
        }
      }
      messageHandler(mockEvent)

      expect(app.addDebugLog).toHaveBeenCalledWith('🔄 Service Worker更新完了', 'success')

      // クリーンアップ
      delete (navigator as any).serviceWorker
    })
  })
})
