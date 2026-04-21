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

    it('空文字・空白のみの宛先を除外して送信する', async () => {
      const settingsWithBlanks: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['valid@example.com', '', '   ', '\t\n'],
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
        settingsWithBlanks,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: true,
        shouldRetake: true
      })

      // 空文字・空白のみの要素が除外されて、有効な宛先のみ送信される
      expect(vi.mocked(emailSender).sendReceipt).toHaveBeenCalledWith(
        ['valid@example.com'],
        'data:image/jpeg;base64,test-photo'
      )
    })

    it('有効な宛先が全て空白のみならエラーを返す', async () => {
      const settingsWithAllBlanks: AppSettings = {
        ...mockSettings,
        sendPresets: [
          {
            id: 'main',
            name: 'メインアドレス',
            recipients: ['', '   ', '\t'],
            isActive: true
          }
        ]
      }

      const result = await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        settingsWithAllBlanks,
        mockDebugLogger,
        mockErrorDisplayer
      )

      expect(result).toEqual({
        success: false,
        shouldRetake: false
      })
      expect(mockErrorDisplayer).toHaveBeenCalledWith('送信先が設定されていません')
    })

    it('BYOK: エラー文言中の APIキー (re_...) をマスクして表示する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Authentication failed with key re_abc123def456ghi789jk',
        details: {
          name: 'authentication_error',
          message: 'Invalid api_key re_abc123def456ghi789jk supplied'
        }
      })

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      // APIキー がマスクされていること
      const displayCall = vi.mocked(mockErrorDisplayer).mock.calls[0]![0]
      expect(displayCall).not.toContain('re_abc123def456ghi789jk')
      expect(displayCall).toContain('re_••••89jk')
    })

    it('BYOK: 予期しないエラー文中の APIキー もマスクする', async () => {
      vi.mocked(emailSender).sendReceipt.mockRejectedValue(
        new Error('Network failed for Bearer re_supersecret1234abcd')
      )

      await EmailService.sendMail(
        'data:image/jpeg;base64,test-photo',
        mockSettings,
        mockDebugLogger,
        mockErrorDisplayer
      )

      const displayCall = vi.mocked(mockErrorDisplayer).mock.calls[0]![0]
      expect(displayCall).not.toContain('re_supersecret1234abcd')
      expect(displayCall).toContain('re_••••abcd')
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

    it('RESEND API エラー詳細（その他の name）の message を解析する', async () => {
      vi.mocked(emailSender).sendReceipt.mockResolvedValue({
        success: false,
        error: 'Custom API error',
        details: {
          name: 'custom_api_error',
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

      expect(mockDebugLogger).toHaveBeenCalledWith('レシート画像を2件の宛先に送信中...', 'info')
    })

  })

  describe('100%カバレッジのためのエッジケーステスト', () => {
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

      it('sendMail失敗時にonProgressがerror状態で呼ばれる（114-122行目カバー）', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockResolvedValue({
          success: false,
          error: 'API error'
        })

        const addDebugLog = vi.fn()
        const showError = vi.fn()
        const onProgress = vi.fn()

        const settings = {
          sendPresets: [
            {
              id: 'main',
              name: 'メイン',
              recipients: ['test@example.com', 'test2@example.com'],
              isActive: true
            }
          ]
        }

        await EmailService.sendMail(
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError,
          onProgress
        )

        // エラー時の進捗通知が呼ばれることを確認
        expect(onProgress).toHaveBeenCalledWith({
          total: 1,
          sent: 0,
          failed: 1,
          currentRecipients: [],
          status: 'error',
          percentage: 100
        })
      })

      it('sendMailで例外が発生した場合、onProgressがerror状態で呼ばれる（133-141行目カバー）', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockRejectedValue(new Error('Unexpected error'))

        const addDebugLog = vi.fn()
        const showError = vi.fn()
        const onProgress = vi.fn()

        const settings = {
          sendPresets: [
            {
              id: 'main',
              name: 'メイン',
              recipients: ['test@example.com', 'test2@example.com'],
              isActive: true
            }
          ]
        }

        await EmailService.sendMail(
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError,
          onProgress
        )

        // 例外時の進捗通知が呼ばれることを確認
        expect(onProgress).toHaveBeenCalledWith({
          total: 1,
          sent: 0,
          failed: 1,
          currentRecipients: [],
          status: 'error',
          percentage: 100
        })
      })

      it('sendMail失敗時にerrorがundefinedの場合、"不明なエラー"と表示される（96行目カバー）', async () => {
        const mockEmailSender = vi.mocked(emailSender)
        mockEmailSender.sendReceipt.mockResolvedValue({
          success: false
          // errorプロパティを指定しない
        })

        const addDebugLog = vi.fn()
        const showError = vi.fn()

        const settings = {
          sendPresets: [
            { id: 'main', name: 'メイン', recipients: ['test@example.com'], isActive: true }
          ]
        }

        await EmailService.sendMail(
          'data:image/jpeg;base64,test',
          settings as any,
          addDebugLog,
          showError
        )

        // "不明なエラー"が使用されることを確認
        expect(showError).toHaveBeenCalledWith(expect.stringContaining('不明なエラー'))
      })

    })
  })
})
