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
    it.each([
      ['空文字列', ''],
      ['null', null],
      ['undefined', undefined]
    ])('Dropboxメールが %s の場合はfalseを返す', (_label, dropboxEmail) => {
      const initializer = useInitializer()

      const mockThis = {
        settings: {
          dropboxEmail,
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
    it.each([
      ['空文字列', ''],
      ['null', null],
      ['undefined', undefined]
    ])('メインメールが %s の場合はfalseを返す', (_label, email) => {
      const initializer = useInitializer()

      const mockThis = {
        settings: {
          email,
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

})
