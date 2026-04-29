import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SettingsService, AppSettings } from '../settings.service'

// StorageServiceをモック
vi.mock('../storage.service', () => ({
  StorageService: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

// emailSenderをモック
vi.mock('../../lib/mail', () => ({
  emailSender: {
    setApiKey: vi.fn(),
    setFromEmail: vi.fn()
  }
}))

import { StorageService } from '../storage.service'
import { emailSender } from '../../lib/mail'

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getDefaultSettings()', () => {
    it('デフォルト設定を正しく返す', () => {
      const defaultSettings = SettingsService.getDefaultSettings()

      expect(defaultSettings).toEqual({
        email: '',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: [],
            isActive: true
          }
        ]
      })
    })

    it('デフォルト設定は毎回新しいオブジェクトを返す', () => {
      const settings1 = SettingsService.getDefaultSettings()
      const settings2 = SettingsService.getDefaultSettings()

      expect(settings1).not.toBe(settings2)
      expect(settings1.sendPresets).not.toBe(settings2.sendPresets)
      expect(settings1).toEqual(settings2)
    })
  })

  describe('load()', () => {
    it('StorageServiceからデフォルト設定で設定を読み込む', () => {
      const mockSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: 'from@example.com',
        sendPresets: []
      }

      vi.mocked(StorageService.get).mockReturnValueOnce(mockSettings)
      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      const result = SettingsService.load()

      expect(StorageService.get).toHaveBeenCalledWith(
        'yayoi-receipt-settings',
        SettingsService.getDefaultSettings()
      )
      expect(result).toEqual(mockSettings)
    })

    it('APIキーが設定されている場合はemailSenderに設定する', () => {
      const mockSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.get).mockReturnValueOnce(mockSettings)
      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      SettingsService.load()

      expect(vi.mocked(emailSender).setApiKey).toHaveBeenCalledWith('test-api-key')
    })

    it('送信元メールが設定されている場合はemailSenderに設定する', () => {
      const mockSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: 'from@example.com',
        sendPresets: []
      }

      vi.mocked(StorageService.get).mockReturnValueOnce(mockSettings)
      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      SettingsService.load()

      expect(vi.mocked(emailSender).setFromEmail).toHaveBeenCalledWith('from@example.com')
    })

    it('APIキーが空の場合はemailSenderに設定しない', () => {
      const mockSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.get).mockReturnValueOnce(mockSettings)
      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      SettingsService.load()

      expect(vi.mocked(emailSender).setApiKey).not.toHaveBeenCalled()
    })
  })

  describe('save()', () => {
    it('設定をStorageServiceに保存する', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      const result = SettingsService.save(settings)

      expect(StorageService.set).toHaveBeenCalledWith('yayoi-receipt-settings', settings)
      expect(result).toBe(true)
    })

    it('APIキーが設定されている場合はemailSenderに設定する', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      SettingsService.save(settings)

      expect(vi.mocked(emailSender).setApiKey).toHaveBeenCalledWith('test-api-key')
    })

    it('送信元メールが設定されている場合はemailSenderに設定する', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: 'from@example.com',
        sendPresets: []
      }

      vi.mocked(StorageService.set).mockReturnValueOnce(true)

      SettingsService.save(settings)

      expect(vi.mocked(emailSender).setFromEmail).toHaveBeenCalledWith('from@example.com')
    })

    it('保存に失敗した場合はfalseを返す', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.set).mockReturnValueOnce(false)

      const result = SettingsService.save(settings)

      expect(result).toBe(false)
    })
  })

  describe('isComplete()', () => {
    it('emailとapiKeyが設定されている場合はtrueを返す', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const result = SettingsService.isComplete(settings)
      expect(result).toBe(true)
    })

    it('emailが空の場合はfalseを返す', () => {
      const settings: AppSettings = {
        email: '',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const result = SettingsService.isComplete(settings)
      expect(result).toBe(false)
    })

    it('apiKeyが空の場合はfalseを返す', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: '',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const result = SettingsService.isComplete(settings)
      expect(result).toBe(false)
    })

    it('emailが空白のみの場合はfalseを返す', () => {
      const settings: AppSettings = {
        email: '   ',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const result = SettingsService.isComplete(settings)
      expect(result).toBe(false)
    })

    it('apiKeyが空白のみの場合はfalseを返す', () => {
      const settings: AppSettings = {
        email: 'test@example.com',
        apiKey: '   ',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const result = SettingsService.isComplete(settings)
      expect(result).toBe(false)
    })
  })

  describe('syncPresetsWithEmails()', () => {
    beforeEach(() => {
      vi.mocked(StorageService.set).mockReturnValue(true)
    })

    it('プリセットが空の場合は新規生成する（メインアドレスのみ）', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.syncPresetsWithEmails(settings)

      expect(settings.sendPresets).toHaveLength(1)
      expect(settings.sendPresets[0]).toEqual({
        id: 'main',
        name: 'メインアドレス',
        recipients: ['main@example.com'],
        isActive: true
      })
    })

    it('プリセットが空の場合は新規生成する（メイン+Dropbox）', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.syncPresetsWithEmails(settings)

      expect(settings.sendPresets).toHaveLength(3)

      expect(settings.sendPresets[0]).toEqual({
        id: 'main',
        name: 'メインアドレス',
        recipients: ['main@example.com'],
        isActive: true
      })

      expect(settings.sendPresets[1]).toEqual({
        id: 'dropbox',
        name: 'バックアップ（Dropbox）',
        recipients: ['dropbox@example.com'],
        isActive: true
      })

      expect(settings.sendPresets[2]).toEqual({
        id: 'all',
        name: 'すべてに送信',
        recipients: ['main@example.com', 'dropbox@example.com'],
        isActive: true
      })
    })

    it('プリセットが空の場合でメールアドレスが両方空の場合はプリセットを作らない', () => {
      const settings: AppSettings = {
        email: '',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.syncPresetsWithEmails(settings)

      expect(settings.sendPresets).toHaveLength(0)
    })

    it('既存プリセットがある場合は更新処理を呼ぶ', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['old@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.syncPresetsWithEmails(settings)

      // メインプリセットが更新されることを確認
      const mainPreset = settings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset?.recipients).toEqual(['main@example.com'])
    })
  })

  describe('updatePresetsWithCurrentEmails()', () => {
    it('プリセットが空の場合は何もしない', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      expect(settings.sendPresets).toHaveLength(0)
    })

    it('Dropboxメールが設定されている場合はDropboxプリセットを追加する', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['main@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      const dropboxPreset = settings.sendPresets.find((p) => p.id === 'dropbox')
      expect(dropboxPreset).toEqual({
        id: 'dropbox',
        name: 'バックアップ（Dropbox）',
        recipients: ['dropbox@example.com'],
        isActive: true
      })
    })

    it('既存のDropboxプリセットが無効な場合は有効化する', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['main@example.com'],
            isActive: true
          },
          {
            id: 'dropbox',
            name: 'バックアップ（Dropbox）',
            recipients: [],
            isActive: false
          }
        ]
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      const dropboxPreset = settings.sendPresets.find((p) => p.id === 'dropbox')
      expect(dropboxPreset?.isActive).toBe(true)
      expect(dropboxPreset?.recipients).toEqual(['dropbox@example.com'])
    })

    it('dropboxEmailが変更され既存プリセットが無効な場合、recipientsを新値で置き換えて有効化する', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'new@dropbox.com',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['main@example.com'],
            isActive: true
          },
          {
            id: 'dropbox',
            name: 'バックアップ（Dropbox）',
            recipients: ['old@dropbox.com'],
            isActive: false
          }
        ]
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      const dropboxPreset = settings.sendPresets.find((p) => p.id === 'dropbox')
      expect(dropboxPreset?.recipients).toEqual(['new@dropbox.com'])
      expect(dropboxPreset?.isActive).toBe(true)
    })

    it('メインプリセットのメールアドレスを更新する', () => {
      const settings: AppSettings = {
        email: 'new-main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['old-main@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      const mainPreset = settings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset?.recipients).toEqual(['new-main@example.com'])
    })

    it('メインプリセットが存在しない場合は更新しない', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'other',
            name: 'その他',
            recipients: ['other@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsWithCurrentEmails(settings)

      // メインプリセットは追加されない
      const mainPreset = settings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset).toBeUndefined()
    })
  })

  describe('updateAllPreset()', () => {
    it('複数の宛先がある場合は「すべてに送信」プリセットを追加する', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updateAllPreset(settings)

      const allPreset = settings.sendPresets.find((p) => p.id === 'all')
      expect(allPreset).toEqual({
        id: 'all',
        name: 'すべてに送信',
        recipients: ['main@example.com', 'dropbox@example.com'],
        isActive: true
      })
    })

    it('既存の「すべてに送信」プリセットを更新する', () => {
      const settings: AppSettings = {
        email: 'new-main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'new-dropbox@example.com',
        fromEmail: '',
        sendPresets: [
          {
            id: 'all',
            name: 'すべてに送信',
            recipients: ['old-main@example.com', 'old-dropbox@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updateAllPreset(settings)

      const allPreset = settings.sendPresets.find((p) => p.id === 'all')
      expect(allPreset?.recipients).toEqual(['new-main@example.com', 'new-dropbox@example.com'])
      expect(allPreset?.isActive).toBe(true)
    })

    it('宛先が1つ以下の場合は「すべてに送信」プリセットを無効化する', () => {
      const settings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'all',
            name: 'すべてに送信',
            recipients: ['main@example.com', 'dropbox@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updateAllPreset(settings)

      const allPreset = settings.sendPresets.find((p) => p.id === 'all')
      expect(allPreset?.isActive).toBe(false)
    })

    it('空のメールアドレスをフィルタリングする', () => {
      const settings: AppSettings = {
        email: '',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updateAllPreset(settings)

      // メールアドレスが1つしかないので、「すべてに送信」プリセットは作られない
      const allPreset = settings.sendPresets.find((p) => p.id === 'all')
      expect(allPreset).toBeUndefined()
    })
  })

  describe('updatePresetsFromTempSettings()', () => {
    it('メインプリセットを作成・更新する', () => {
      const tempSettings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const mainPreset = tempSettings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset).toEqual({
        id: 'main',
        name: 'メインアドレス',
        recipients: ['main@example.com'],
        isActive: true
      })
    })

    it('メインプリセットが既に存在する場合は更新する', () => {
      const tempSettings: AppSettings = {
        email: '  updated@example.com  ',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['old@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const mainPreset = tempSettings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset?.recipients).toEqual(['updated@example.com'])
    })

    it('メインメールが空の場合はプリセットを無効化する', () => {
      const tempSettings: AppSettings = {
        email: '',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['old@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const mainPreset = tempSettings.sendPresets.find((p) => p.id === 'main')
      expect(mainPreset?.recipients).toEqual([])
      expect(mainPreset?.isActive).toBe(false)
    })

    it('Dropboxプリセットを作成・更新する', () => {
      const tempSettings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '  dropbox@example.com  ',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const dropboxPreset = tempSettings.sendPresets.find((p) => p.id === 'dropbox')
      expect(dropboxPreset).toEqual({
        id: 'dropbox',
        name: 'バックアップ（Dropbox）',
        recipients: ['dropbox@example.com'],
        isActive: true
      })
    })

    it('Dropboxメールが空の場合は既存プリセットを無効化する', () => {
      const tempSettings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: [
          {
            id: 'dropbox',
            name: 'バックアップ（Dropbox）',
            recipients: ['old-dropbox@example.com'],
            isActive: true
          }
        ]
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const dropboxPreset = tempSettings.sendPresets.find((p) => p.id === 'dropbox')
      expect(dropboxPreset?.recipients).toEqual([])
      expect(dropboxPreset?.isActive).toBe(false)
    })

    it('「すべてに送信」プリセットを更新する', () => {
      const tempSettings: AppSettings = {
        email: 'main@example.com',
        apiKey: 'test-key',
        dropboxEmail: 'dropbox@example.com',
        fromEmail: '',
        sendPresets: []
      }

      SettingsService.updatePresetsFromTempSettings(tempSettings)

      const allPreset = tempSettings.sendPresets.find((p) => p.id === 'all')
      expect(allPreset).toEqual({
        id: 'all',
        name: 'すべてに送信',
        recipients: ['main@example.com', 'dropbox@example.com'],
        isActive: true
      })
    })
  })

  describe('複合操作テスト', () => {
    it('load → save の一連の処理が正常に動作する', () => {
      const mockLoadedSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-api-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      vi.mocked(StorageService.get).mockReturnValueOnce(mockLoadedSettings)
      vi.mocked(StorageService.set).mockReturnValue(true)

      // load
      const loadedSettings = SettingsService.load()

      // save
      loadedSettings.email = 'updated@example.com'
      const saveResult = SettingsService.save(loadedSettings)

      expect(loadedSettings.email).toBe('updated@example.com')
      expect(saveResult).toBe(true)
      expect(StorageService.set).toHaveBeenCalledWith('yayoi-receipt-settings', loadedSettings)
    })

    it('設定完了チェックが正常に動作する', () => {
      const incompleteSettings: AppSettings = {
        email: '',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      const completeSettings: AppSettings = {
        email: 'test@example.com',
        apiKey: 'test-key',
        dropboxEmail: '',
        fromEmail: '',
        sendPresets: []
      }

      expect(SettingsService.isComplete(incompleteSettings)).toBe(false)
      expect(SettingsService.isComplete(completeSettings)).toBe(true)
    })

    it.each([
      {
        label: 'isActive=false',
        dropboxPresetOverride: { recipients: ['dropbox@example.com'], isActive: false }
      },
      {
        label: 'recipients=[]',
        dropboxPresetOverride: { recipients: [], isActive: true }
      }
    ])(
      'dropboxPreset の $label の場合に dropboxEmail で有効化・同期される',
      ({ dropboxPresetOverride }) => {
        const settings: AppSettings = {
          email: 'main@example.com',
          apiKey: 'test-key',
          dropboxEmail: 'dropbox@example.com',
          fromEmail: '',
          sendPresets: [
            {
              id: 'main',
              name: 'メインアドレス',
              recipients: ['main@example.com'],
              isActive: true
            },
            {
              id: 'dropbox',
              name: 'Dropbox',
              ...dropboxPresetOverride
            }
          ]
        }

        SettingsService.syncPresetsWithEmails(settings)

        const dropboxPreset = settings.sendPresets.find((p) => p.id === 'dropbox')
        expect(dropboxPreset?.isActive).toBe(true)
        expect(dropboxPreset?.recipients).toEqual(['dropbox@example.com'])
      }
    )
  })
})
