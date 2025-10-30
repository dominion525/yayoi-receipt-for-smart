import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService, DebugLogger, ErrorDisplayer } from '../email.service'
import { AppSettings } from '../settings.service'
import { emailSender } from '../../lib/mail'

// emailSenderをモック
vi.mock('../../lib/mail', () => ({
  emailSender: {
    sendReceipt: vi.fn()
  }
}))

// getErrorMessageをモック
vi.mock('../../utils/error', () => ({
  getErrorMessage: vi.fn((error: any) => {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return '予期しないエラーが発生しました'
  })
}))

describe('EmailService', () => {
  let mockDebugLogger: DebugLogger
  let mockErrorDisplayer: ErrorDisplayer
  let mockSettings: AppSettings

  beforeEach(() => {
    vi.clearAllMocks()
    
    // モック関数を作成
    mockDebugLogger = vi.fn()
    mockErrorDisplayer = vi.fn()
    
    // デフォルト設定
    mockSettings = {
      email: 'main@example.com',
      apiKey: 'test-api-key',
      dropboxEmail: 'dropbox@example.com',
      fromEmail: 'from@example.com',
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
          recipients: ['dropbox@example.com'],
          isActive: true
        },
        {
          id: 'all',
          name: 'すべてに送信',
          recipients: ['main@example.com', 'dropbox@example.com'],
          isActive: true
        }
      ]
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMail()', () => {
    it('写真が空の場合はエラーを返す', async () => {
      const result = await EmailService.sendMail(
        '',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('写真が撮影されていません')
      expect(vi.mocked(emailSender).sendReceipt).not.toHaveBeenCalled()
    })

    it('写真がnullの場合はエラーを返す', async () => {
      const result = await EmailService.sendMail(
        null as any,
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('写真が撮影されていません')
    })

    it('送信先が設定されていない場合はエラーを返す', async () => {
      const settingsWithoutRecipients: AppSettings = {
        ...mockSettings,
        sendPresets: []
      }

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        settingsWithoutRecipients,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が設定されていません')
    })

    it('すべてのプリセットが無効な場合はエラーを返す', async () => {
      const settingsWithInactivePresets: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['main@example.com'],
            isActive: false
          }
        ]
      }

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        settingsWithInactivePresets,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が設定されていません')
    })

    it('重複する宛先を排除して送信する', async () => {
      const settingsWithDuplicates: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['test@example.com'],
            isActive: true
          },
          {
            id: 'backup',
            name: 'バックアップ',
            recipients: ['test@example.com', 'other@example.com'],
            isActive: true
          }
        ]
      }

      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        settingsWithDuplicates,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: true,
        shouldRetake: true
      })

      // 一括送信：重複排除後の配列で1回だけ呼ばれる
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledTimes(1)
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledWith(
        ['test@example.com', 'other@example.com'],
        'data:image/jpeg;base64,test-photo'
      )
    })

    it('全ての送信が成功した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: true,
        shouldRetake: true
      })

      // 一括送信なので1回だけ呼ばれる
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledTimes(1)
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledWith(
        ['main@example.com', 'dropbox@example.com'],
        'data:image/jpeg;base64,test-photo'
      )
      // 成功メッセージは表示されない（app.tsで処理）
      expect(mockErrorDisplayer).not.toHaveBeenCalledWith(expect.stringContaining('✅'))
    })

    it('全ての送信が失敗した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'API key invalid'
      })

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('送信失敗: API key invalid')
      )
    })

    it('送信中に例外が発生した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockRejectedValue(new Error('Network error'))

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      expect(mockDebugLogger).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error'
      )
    })


    it('RESEND APIエラーの詳細を正しく解析する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        details: {
          name: 'validation_error',
          message: 'Email format is invalid'
        }
      })

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（メールアドレスが無効です）')
      )
    })

    it('invalid_to_address エラーの詳細を正しく解析する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Invalid recipient',
        details: {
          name: 'invalid_to_address',
          message: 'Recipient address is not valid'
        }
      })

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（送信先アドレスが無効です）')
      )
    })
  })

  describe('sendMailToPreset()', () => {
    it('プリセットが見つからない場合はエラーを返す', async () => {
      const result = await EmailService.sendMailToPreset(
        'nonexistent',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が見つかりません')
      expect(mockDebugLogger).toHaveBeenCalledWith(
        'プリセットが見つかりません: presetId=nonexistent',
        'error'
      )
    })

    it('プリセットが無効な場合はエラーを返す', async () => {
      const settingsWithInactivePreset: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'inactive',
            name: '無効なプリセット',
            recipients: ['test@example.com'],
            isActive: false
          }
        ]
      }

      const result = await EmailService.sendMailToPreset(
        'inactive',
        'data:image/jpeg;base64,test-photo',
        settingsWithInactivePreset,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が見つかりません')
    })

    it('APIキーが設定されていない場合は継続してエラーを記録する', async () => {
      const settingsWithoutApiKey: AppSettings = {
        ...mockSettings,
        apiKey: ''
      }

      const result = await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        settingsWithoutApiKey,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      expect(mockDebugLogger).toHaveBeenCalledWith(
        'エラー: APIキーが設定されていません',
        'error'
      )
      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('APIキーが設定されていません')
      )
    })

    it('正常に送信が完了した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      const result = await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: true,
        shouldRetake: true
      })

      // 成功メッセージは表示されない（app.tsで処理）
      expect(mockErrorDisplayer).not.toHaveBeenCalledWith(expect.stringContaining('✅'))
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledWith(
        ['main@example.com'],
        'data:image/jpeg;base64,test-photo'
      )
    })

    it('Dropboxプリセットでアドレス形式の警告を表示する', async () => {
      const settingsWithInvalidDropbox: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'dropbox',
            name: 'Dropbox',
            recipients: ['invalid@gmail.com'],
            isActive: true
          }
        ]
      }

      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Invalid dropbox address'
      })

      await EmailService.sendMailToPreset(
        'dropbox',
        'data:image/jpeg;base64,test-photo',
        settingsWithInvalidDropbox,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ ヒント: Dropboxのメールアドレスは通常 @getdropbox.com または @addtodropbox.com で終わります')
      )
    })

    it('Dropboxプリセットで正しいアドレス形式の場合は警告を表示しない', async () => {
      const settingsWithValidDropbox: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'dropbox',
            name: 'Dropbox',
            recipients: ['test@getdropbox.com'],
            isActive: true
          }
        ]
      }

      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Some other error'
      })

      await EmailService.sendMailToPreset(
        'dropbox',
        'data:image/jpeg;base64,test-photo',
        settingsWithValidDropbox,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.not.stringContaining('⚠️ ヒント:')
      )
    })

    it('エラーメッセージが空の場合のデフォルト処理', async () => {
      // APIキーが空でかつ、追加のエラーメッセージも生成されない場合
      const settingsWithoutApiKey: AppSettings = {
        ...mockSettings,
        apiKey: '',
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: [], // 空の受信者リスト
            isActive: true
          }
        ]
      }

      const result = await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        settingsWithoutApiKey,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      // recipients が空なので何も送信されず、APIキーが空のためfalseを返す
      expect(vi.mocked(emailSender).sendReceipt).not.toHaveBeenCalled()
    })

    it('エラーメッセージが正しく表示される', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'APIエラーが発生しました'
      })

      await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('送信失敗: APIエラーが発生しました')
      )
    })

    it('送信中に例外が発生した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockRejectedValue(new Error('Connection failed'))

      const result = await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      expect(mockDebugLogger).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed'),
        'error'
      )
    })

    it('予期しない例外が発生した場合', async () => {
      vi.mocked(emailSender).sendReceipt.mockRejectedValue(new Error('Unexpected error'))

      const result = await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })

      // 予期しないエラーメッセージが表示される
      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('予期しないエラーが発生しました: Unexpected error')
      )
      expect(mockDebugLogger).toHaveBeenCalledWith(
        '予期しないエラー: Unexpected error',
        'error'
      )
    })

    it('RESEND APIエラー詳細の解析（validation_error）', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Validation error',
        details: {
          name: 'validation_error',
          message: 'Email validation failed'
        }
      })

      await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（メールアドレスが無効です）')
      )
    })

    it('RESEND APIエラー詳細の解析（invalid_to_address）', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Invalid address',
        details: {
          name: 'invalid_to_address',
          message: 'The recipient address is invalid'
        }
      })

      await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（送信先アドレスが無効です）')
      )
    })

    it('RESEND APIエラー詳細の解析（その他のエラー）', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Some error',
        details: {
          name: 'other_error',
          message: 'Some detailed message'
        }
      })

      await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（Some detailed message）')
      )
    })

    it('sendMail()でのRESEND APIエラー詳細解析（84-85行目カバー）', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Custom API error',
        details: {
          name: 'custom_api_error', // validation_error, invalid_to_address以外
          message: 'Custom detailed error information'
        }
      })

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockErrorDisplayer).toHaveBeenCalledWith(
        expect.stringContaining('（Custom detailed error information）')
      )
    })
  })

  describe('DebugLoggerとErrorDisplayerの呼び出し', () => {
    it('送信開始時に適切なログを出力する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockDebugLogger).toHaveBeenCalledWith(
        'レシート画像を2件の宛先に送信中...',
        'info'
      )
    })

    it('一括送信開始時にログを出力する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      await EmailService.sendMailToPreset(
        'main',
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(mockDebugLogger).toHaveBeenCalledWith(
        'sendMailToPreset開始: presetId=main',
        'info'
      )
      expect(mockDebugLogger).toHaveBeenCalledWith(
        '1件の宛先に一括送信中...',
        'info'
      )
    })
  })

  describe('100%カバレッジのためのエッジケーステスト', () => {
    describe('sendMailToPreset() - 空の受信者リストケース', () => {
      it('受信者リストが空の場合でも送信を試みる', async () => {
        const settingsWithEmptyRecipients: AppSettings = {
          ...mockSettings,
          sendPresets: [
            {
              id: 'empty',
              name: '空のプリセット',
              recipients: [], // 空の受信者リスト
              isActive: true
            }
          ]
        }

        // 空の配列でも送信成功とする
        vi.mocked(emailSender).sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-empty'
        })

        const result = await EmailService.sendMailToPreset(
          'empty',
          'data:image/jpeg;base64,test-photo',
          settingsWithEmptyRecipients,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result).toEqual({
          success: true,
          shouldRetake: true
        })

        // 一括送信では空の配列でも呼ばれる
        expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledWith(
          [],
          'data:image/jpeg;base64,test-photo'
        )
      })
    })

    describe('sendMail() - 空の受信者リストケース', () => {
      it('すべてのプリセットの受信者リストが空の場合（49行目エラー）', async () => {
        const settingsWithAllEmptyRecipients: AppSettings = {
          ...mockSettings,
          sendPresets: [
            {
              id: 'empty1',
              name: '空のプリセット1',
              recipients: [],
              isActive: true
            },
            {
              id: 'empty2', 
              name: '空のプリセット2',
              recipients: [],
              isActive: true
            }
          ]
        }

        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          settingsWithAllEmptyRecipients,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result).toEqual({
          success: false,
          shouldRetake: false
        })

        expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が設定されていません')
      })

      it('送信処理でundefinedが返されるケース', async () => {
        // emailSenderがundefinedを返すケース
        vi.mocked(emailSender).sendReceipt.mockResolvedValue(undefined as any)

        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result).toEqual({
          success: false,
          shouldRetake: false
        })
      })
    })

    describe('カバレッジ改善のための追加テスト', () => {
      it('複数件送信成功時のメッセージを確認', async () => {
        const mockSettings = {
          email: 'main@example.com',
          dropboxEmail: 'dropbox@example.com',
          apiKey: 'test-key',
          fromEmail: 'sender@example.com',
          sendPresets: [
            {
              id: 'all',
              name: 'すべてに送信',
              recipients: ['main@example.com', 'dropbox@example.com', 'third@example.com'],
              isActive: true
            }
          ]
        }

        const mockDebugLogger = vi.fn()
        const mockErrorDisplayer = vi.fn()

        // 一括送信で成功
        vi.mocked(emailSender).sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })

        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result.success).toBe(true)
        expect(result.shouldRetake).toBe(true)

        // 一括送信なので1回だけ呼ばれる
        expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledTimes(1)
        // 成功メッセージは表示されない（app.tsで処理）
        expect(mockErrorDisplayer).not.toHaveBeenCalledWith(expect.stringContaining('✅'))
      })

      it('進捗コールバックが提供された場合、初期状態を通知する', async () => {
        const mockSettings = {
          email: 'test@example.com',
          apiKey: 'test-key',
          fromEmail: 'sender@example.com',
          sendPresets: [
            {
              id: 'main',
              name: 'メイン',
              recipients: ['test@example.com'],
              isActive: true
            }
          ]
        }

        const mockDebugLogger = vi.fn()
        const mockErrorDisplayer = vi.fn()
        const mockProgressCallback = vi.fn()

        vi.mocked(emailSender).sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })

        await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer,
          mockProgressCallback
        )

        // 初期状態の進捗通知を確認
        expect(mockProgressCallback).toHaveBeenCalledWith({
          total: 1,
          sent: 0,
          failed: 0,
          currentRecipients: ['test@example.com'],
          status: 'sending',
          percentage: 0
        })
      })


      it('進捗コールバックなしでの送信処理', async () => {
        const mockSettings = {
          email: 'test@example.com',
          apiKey: 'test-key',
          fromEmail: 'sender@example.com',
          sendPresets: [
            {
              id: 'main',
              name: 'メイン',
              recipients: ['test@example.com'],
              isActive: true
            }
          ]
        }

        const mockDebugLogger = vi.fn()
        const mockErrorDisplayer = vi.fn()

        vi.mocked(emailSender).sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })

        // 進捗コールバックを渡さない（undefined）
        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer,
          undefined // 進捗コールバックなし
        )

        expect(result.success).toBe(true)
        expect(result.shouldRetake).toBe(true)
      })

      it('1件送信成功時の処理', async () => {
        const mockSettings = {
          email: 'single@example.com',
          apiKey: 'test-key',
          fromEmail: 'sender@example.com',
          sendPresets: [
            {
              id: 'main',
              name: 'メイン',
              recipients: ['single@example.com'],
              isActive: true
            }
          ]
        }

        const mockDebugLogger = vi.fn()
        const mockErrorDisplayer = vi.fn()

        vi.mocked(emailSender).sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-single'
        })

        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result.success).toBe(true)
        expect(result.shouldRetake).toBe(true)
        expect(mockErrorDisplayer).not.toHaveBeenCalledWith(expect.stringContaining('✅'))
      })

      it('送信対象0件の稀なケース（理論的エッジケース）', async () => {
        // この関数を直接テストするため、内部的に0件になるようなケースを作る
        const mockSettings = {
          email: '',
          apiKey: 'test-key',
          fromEmail: 'sender@example.com',
          sendPresets: [
            {
              id: 'empty',
              name: '空',
              recipients: [], // 空の受信者リスト
              isActive: false // 非アクティブ
            }
          ]
        }

        const mockDebugLogger = vi.fn()
        const mockErrorDisplayer = vi.fn()

        const result = await EmailService.sendMail(
          'data:image/jpeg;base64,test-photo',
          mockSettings,
          mockDebugLogger,
          mockErrorDisplayer
        )

        expect(result.success).toBe(false)
        expect(result.shouldRetake).toBe(false)
        expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が設定されていません')
      })

    })

    describe('残りの未カバー行対応テスト', () => {
      it('複数件送信成功時の処理', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })
        
        const addDebugLog = vi.fn()
        const showError = vi.fn()
        
        const preset = { 
          id: 'test', 
          name: 'テスト', 
          recipients: ['test1@example.com', 'test2@example.com', 'test3@example.com'], 
          isActive: true 
        }
        const settings = {
          apiKey: 'test-key',
          sendPresets: [preset]
        }
        
        const result = await EmailService.sendMailToPreset(
          'test',
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError
        )
        
        expect(result).toEqual({ success: true, shouldRetake: true })
        // 成功メッセージは表示されない（app.tsで処理）
        expect(showError).not.toHaveBeenCalledWith(expect.stringContaining('✅'))
      })

      it('sendMail: 最終進捗通知のテスト（169行目カバー）', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })
        
        const addDebugLog = vi.fn()
        const showError = vi.fn()
        const onProgress = vi.fn()
        
        const settings = {
          sendPresets: [
            { id: 'main', name: 'メイン', recipients: ['test@example.com'], isActive: true }
          ]
        }
        
        await EmailService.sendMail(
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError,
          onProgress
        )
        
        // 最終進捗通知が呼ばれることを確認（169行目をカバー）
        expect(onProgress).toHaveBeenLastCalledWith({
          total: 1,
          sent: 1,
          failed: 0,
          currentRecipients: [],
          status: 'completed',
          percentage: 100
        })
      })

      it('sendMailToPreset: 最終進捗通知のテスト（361-369行目カバー）', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockResolvedValue({
          success: true,
          messageId: 'msg-123'
        })
        
        const addDebugLog = vi.fn()
        const showError = vi.fn()
        const onProgress = vi.fn()
        
        const preset = { 
          id: 'test', 
          name: 'テスト', 
          recipients: ['test@example.com'], 
          isActive: true 
        }
        const settings = {
          apiKey: 'test-key',
          sendPresets: [preset]
        }
        
        await EmailService.sendMailToPreset(
          'test',
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError,
          onProgress
        )
        
        // 最終進捗通知が呼ばれることを確認（361-369行目をカバー）
        expect(onProgress).toHaveBeenLastCalledWith({
          total: 1,
          sent: 1,
          failed: 0,
          currentRecipients: [],
          status: 'completed',
          percentage: 100
        })
      })

    })

  })
})