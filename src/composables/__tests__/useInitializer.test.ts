import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInitializer } from '../useInitializer'

// モック設定
vi.mock('../../services/settings.service')
vi.mock('../../lib/mail')

describe('useInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkDropboxPreset', () => {
    it('Dropboxメールが未設定の場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      // Alpine.jsコンテキストをモック
      const mockThis = {
        settings: {
          dropboxEmail: '', // 空文字列
          sendPresets: []
        }
      }
      
      const result = initializer.checkDropboxPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('Dropboxメールがnullの場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          dropboxEmail: null,
          sendPresets: []
        }
      }
      
      const result = initializer.checkDropboxPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('Dropboxメールがundefinedの場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          dropboxEmail: undefined,
          sendPresets: []
        }
      }
      
      const result = initializer.checkDropboxPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('Dropboxプリセットが存在しない場合はtrueを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          dropboxEmail: 'dropbox@example.com',
          sendPresets: [
            { id: 'main', name: 'メイン', recipients: ['main@example.com'], isActive: true }
          ]
        }
      }
      
      const result = initializer.checkDropboxPreset.call(mockThis)
      expect(result).toBe(true)
    })

    it('Dropboxプリセットが無効な場合はtrueを返し、修正する', () => {
      const initializer = useInitializer()
      
      const dropboxPreset = {
        id: 'dropbox',
        name: 'Dropbox',
        recipients: [],
        isActive: false
      }
      
      const mockThis = {
        settings: {
          dropboxEmail: 'dropbox@example.com',
          sendPresets: [dropboxPreset]
        }
      }
      
      const result = initializer.checkDropboxPreset.call(mockThis)
      
      expect(result).toBe(true)
      expect(dropboxPreset.isActive).toBe(true)
      expect(dropboxPreset.recipients).toEqual(['dropbox@example.com'])
    })
  })

  describe('checkMainPreset', () => {
    it('メインメールが未設定の場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          email: '', // 空文字列
          sendPresets: []
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('メインメールがnullの場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          email: null,
          sendPresets: []
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('メインメールがundefinedの場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          email: undefined,
          sendPresets: []
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('メインプリセットの宛先が異なる場合はtrueを返し、修正する', () => {
      const initializer = useInitializer()
      
      const mainPreset = {
        id: 'main',
        name: 'メイン',
        recipients: ['old@example.com'],
        isActive: true
      }
      
      const mockThis = {
        settings: {
          email: 'new@example.com',
          sendPresets: [mainPreset]
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      
      expect(result).toBe(true)
      expect(mainPreset.recipients).toEqual(['new@example.com'])
    })

    it('メインプリセットが存在しない場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          email: 'test@example.com',
          sendPresets: [
            { id: 'dropbox', name: 'Dropbox', recipients: ['dropbox@example.com'], isActive: true }
          ]
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      expect(result).toBe(false)
    })

    it('メインプリセットの宛先が一致する場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          email: 'test@example.com',
          sendPresets: [
            { 
              id: 'main', 
              name: 'メイン', 
              recipients: ['test@example.com'], 
              isActive: true 
            }
          ]
        }
      }
      
      const result = initializer.checkMainPreset.call(mockThis)
      expect(result).toBe(false)
    })
  })

  describe('shouldUpdatePresets', () => {
    it('checkDropboxPresetがtrueの場合はtrueを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          dropboxEmail: 'dropbox@example.com',
          email: 'main@example.com',
          sendPresets: []
        },
        // メソッドもthisコンテキストに含める
        checkDropboxPreset: initializer.checkDropboxPreset,
        checkMainPreset: initializer.checkMainPreset
      }
      
      const result = initializer.shouldUpdatePresets.call(mockThis)
      expect(result).toBe(true)
    })

    it('checkMainPresetがtrueの場合はtrueを返す', () => {
      const initializer = useInitializer()
      
      const mainPreset = {
        id: 'main',
        name: 'メイン',
        recipients: ['old@example.com'],
        isActive: true
      }
      
      const mockThis = {
        settings: {
          dropboxEmail: '', // Dropboxチェックはfalse
          email: 'new@example.com',
          sendPresets: [mainPreset]
        },
        checkDropboxPreset: initializer.checkDropboxPreset,
        checkMainPreset: initializer.checkMainPreset
      }
      
      const result = initializer.shouldUpdatePresets.call(mockThis)
      expect(result).toBe(true)
    })

    it('両方falseの場合はfalseを返す', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        settings: {
          dropboxEmail: '', // false
          email: '', // false
          sendPresets: []
        },
        checkDropboxPreset: initializer.checkDropboxPreset,
        checkMainPreset: initializer.checkMainPreset
      }
      
      const result = initializer.shouldUpdatePresets.call(mockThis)
      expect(result).toBe(false)
    })
  })

  describe('init', () => {
    it('重複初期化を防ぐ', () => {
      const initializer = useInitializer()
      
      const mockThis = {
        _initialized: false,
        settings: {
          apiKey: 'test-key',
          fromEmail: 'test@example.com',
          sendPresets: []
        },
        // 必要なメソッドをモック
        initPWADetection: vi.fn(),
        initializePWA: vi.fn(),
        initializeEmailSettings: vi.fn(),
        initializePresets: vi.fn(),
        logInitializationStatus: vi.fn(),
        addDebugLog: vi.fn()
      }
      
      // 1回目の初期化
      initializer.init.call(mockThis)
      expect(mockThis._initialized).toBe(true)
      expect(mockThis.initializePWA).toHaveBeenCalledTimes(1)
      
      // 2回目の初期化は早期リターンされる
      vi.clearAllMocks()
      initializer.init.call(mockThis)
      
      // 2回目は初期化処理がスキップされることを確認
      expect(mockThis.initializePWA).not.toHaveBeenCalled()
      expect(mockThis.initializeEmailSettings).not.toHaveBeenCalled()
      expect(mockThis.initializePresets).not.toHaveBeenCalled()
      expect(mockThis.logInitializationStatus).not.toHaveBeenCalled()
    })
  })
})