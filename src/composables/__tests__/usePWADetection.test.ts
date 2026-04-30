import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePWADetection } from '../usePWADetection'

describe('usePWADetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Service Workerのモックをリセット
    delete (navigator as any).serviceWorker
  })

  afterEach(() => {
    // クリーンアップ
    delete (navigator as any).serviceWorker
    delete (global as any).window
  })

  describe('initServiceWorker', () => {
    it('Service Worker ready がエラーの場合、エラーステータスを設定する', async () => {
      const pwa = usePWADetection()
      const mockAddDebugLog = vi.fn()

      // Alpine.jsコンテキストをモック
      const mockThis = {
        serviceWorkerStatus: 'checking...',
        addDebugLog: mockAddDebugLog
      }

      // Service Workerが利用可能で、readyがエラーになるケース
      const mockServiceWorker = {
        ready: Promise.reject(new Error('SW Error')),
        addEventListener: vi.fn()
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      // thisコンテキストを設定してメソッドを呼び出し
      pwa.initServiceWorker.call(mockThis)

      // readyのPromiseが解決されるのを待つ
      await vi.waitFor(() => {
        expect(mockThis.serviceWorkerStatus).toBe('❌ エラー')
      })

      expect(mockAddDebugLog).toHaveBeenCalledWith('Service Worker: エラー', 'error')
    })

    it('Service Workerが利用できない場合、未対応ステータスを設定する', () => {
      const pwa = usePWADetection()

      const mockThis = {
        serviceWorkerStatus: 'checking...'
      }

      // Service Workerが利用できない環境をシミュレート
      delete (navigator as any).serviceWorker

      pwa.initServiceWorker.call(mockThis)

      expect(mockThis.serviceWorkerStatus).toBe('❌ 未対応')
    })

    it('Service Workerメッセージで更新確認ダイアログが表示される（Yes選択）', async () => {
      const pwa = usePWADetection()
      const mockAddDebugLog = vi.fn()
      const mockConfirm = vi.fn(() => true)
      const mockReload = vi.fn()

      const mockThis = {
        serviceWorkerStatus: 'checking...',
        addDebugLog: mockAddDebugLog
      }

      // globalのモック設定
      vi.stubGlobal('confirm', mockConfirm)
      vi.stubGlobal('window', { location: { reload: mockReload } })

      vi.useFakeTimers()

      const mockServiceWorker = {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        getRegistration: vi.fn().mockResolvedValue({
          update: vi.fn()
        })
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      pwa.initServiceWorker.call(mockThis)

      // readyが解決されるのを待つ
      await mockServiceWorker.ready

      // addEventListenerに渡されたメッセージハンドラーを取得
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
      const messageHandler = mockServiceWorker.addEventListener.mock.calls[0]?.[1]

      // SW_ACTIVATEDメッセージをシミュレート
      const mockEvent = {
        data: {
          type: 'SW_ACTIVATED',
          version: 12345
        }
      }

      messageHandler(mockEvent)

      expect(mockAddDebugLog).toHaveBeenCalledWith('🔄 Service Worker更新完了', 'success')

      // 1秒後にconfirmダイアログが表示される
      vi.advanceTimersByTime(1000)

      expect(mockConfirm).toHaveBeenCalledWith(
        '新しいバージョンが利用可能です。ページをリロードしますか？'
      )
      expect(mockReload).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('Service Workerメッセージで更新確認ダイアログが表示される（No選択）', async () => {
      const pwa = usePWADetection()
      const mockAddDebugLog = vi.fn()
      const mockConfirm = vi.fn(() => false) // No選択
      const mockReload = vi.fn()

      const mockThis = {
        serviceWorkerStatus: 'checking...',
        addDebugLog: mockAddDebugLog
      }

      // globalのモック設定
      vi.stubGlobal('confirm', mockConfirm)
      vi.stubGlobal('window', { location: { reload: mockReload } })

      vi.useFakeTimers()

      const mockServiceWorker = {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        getRegistration: vi.fn().mockResolvedValue({
          update: vi.fn()
        })
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      pwa.initServiceWorker.call(mockThis)

      await mockServiceWorker.ready

      const messageHandler = mockServiceWorker.addEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        data: {
          type: 'SW_ACTIVATED',
          version: 12345
        }
      }

      messageHandler(mockEvent)

      // 1秒後にconfirmダイアログが表示される
      vi.advanceTimersByTime(1000)

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockReload).not.toHaveBeenCalled() // リロードされない

      vi.useRealTimers()
    })

    it('Service Worker ready成功時の正常処理', async () => {
      const pwa = usePWADetection()
      const mockAddDebugLog = vi.fn()

      const mockThis = {
        serviceWorkerStatus: 'checking...',
        addDebugLog: mockAddDebugLog
      }

      const mockRegistration = {
        update: vi.fn()
      }

      const mockServiceWorker = {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        getRegistration: vi.fn().mockResolvedValue(mockRegistration)
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      })

      pwa.initServiceWorker.call(mockThis)

      // readyのPromiseを待つ
      await mockServiceWorker.ready

      // 少し待ってからアサーション（非同期処理の完了を待つ）
      await vi.waitFor(() => {
        expect(mockThis.serviceWorkerStatus).toBe('✅ 有効')
      })

      expect(mockAddDebugLog).toHaveBeenCalledWith('Service Worker: 有効', 'success')
      expect(mockServiceWorker.getRegistration).toHaveBeenCalled()

      // getRegistrationも非同期なので待つ
      await vi.waitFor(() => {
        expect(mockRegistration.update).toHaveBeenCalled()
      })

      expect(mockAddDebugLog).toHaveBeenCalledWith('最新版をチェック中...', 'info')
    })

    it('ビルド情報アクセス時のエラー処理', () => {
      const pwa = usePWADetection()
      const mockAddDebugLog = vi.fn()

      const mockThis = {
        buildRevision: '',
        buildTime: '',
        userAgent: '',
        screenInfo: '',
        isPWAMode: false,
        addDebugLog: mockAddDebugLog,
        detectPWAMode: vi.fn(),
        initServiceWorker: vi.fn()
      }

      // windowオブジェクトをモック
      const mockWindow = {
        get __BUILD_REVISION__() {
          throw new Error('Access denied to build revision')
        },
        get __BUILD_TIME__() {
          throw new Error('Access denied to build time')
        },
        innerWidth: 1024,
        innerHeight: 768,
        devicePixelRatio: 1
      }

      vi.stubGlobal('window', mockWindow)
      vi.stubGlobal('navigator', {
        userAgent: 'test-agent'
      })

      try {
        pwa.initPWADetection.call(mockThis)

        // エラー発生時のフォールバック値が設定されることを確認
        expect(mockThis.buildRevision).toBe('dev')
        expect(mockThis.buildTime).toBe('development')
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})
