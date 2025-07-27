import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailSender } from '../mail'

// グローバルfetchをモック
global.fetch = vi.fn()

describe('EmailSender', () => {
  let emailSender: EmailSender

  beforeEach(() => {
    vi.clearAllMocks()
    emailSender = new EmailSender()
    // デフォルトで本番環境のプロキシURLを使用しないようにする
    emailSender.setProxyUrl('http://localhost:3001')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初期化とAPIキー設定', () => {
    it('初期状態ではAPIキーが設定されていない', () => {
      expect(emailSender['apiKey']).toBe('')
      expect(emailSender['apiKey']).toBe('')
    })

    it('setApiKeyでAPIキーを設定できる', () => {
      const apiKey = 're_test_123456'
      emailSender.setApiKey(apiKey)
      
      expect(emailSender['apiKey']).toBe(apiKey)
      expect(emailSender['apiKey']).toBe(apiKey)
    })
  })

  describe('send()メソッド', () => {
    beforeEach(() => {
      emailSender.setApiKey('re_test_123456')
    })

    it('APIキーが設定されていない場合はエラーを返す', async () => {
      const uninitializedSender = new EmailSender()
      
      const result = await uninitializedSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test email'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('APIキーが設定されていません')
    })

    it('HTMLメールを正常に送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'msg_123456' } 
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test HTML content</p>'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_123456')
      expect(result.error).toBeUndefined()
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey: 're_test_123456',
            from: 'sender@example.com',
            to: 'recipient@example.com',
            subject: 'Test Email',
            html: '<p>Test HTML content</p>'
          })
        })
      )
    })

    it('テキストメールを正常に送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'msg_789012' } 
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'Plain text content'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_789012')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"text":"Plain text content"')
        })
      )
    })

    it('複数の受信者に送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'msg_multi_123' } 
        })
      } as Response)

      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com']
      
      const result = await emailSender.send({
        from: 'sender@example.com',
        to: recipients,
        subject: 'Multi Recipients',
        text: 'Test content'
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(JSON.stringify(recipients))
        })
      )
    })

    it('HTMLもテキストも指定されていない場合でも送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'msg_default_123' } 
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject only email'
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            apiKey: 're_test_123456',
            from: 'sender@example.com',
            to: 'recipient@example.com',
            subject: 'Subject only email'
          })
        })
      )
    })

    it('添付ファイル付きメールを送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'msg_attach_123' } 
        })
      } as Response)

      const attachments = [{
        filename: 'test.pdf',
        content: 'base64content',
        contentType: 'application/pdf'
      }]

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'With Attachment',
        text: 'See attached',
        attachments
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"attachments"')
        })
      )
    })

    it('APIエラーレスポンスを適切に処理する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          success: false,
          error: 'Invalid API key',
          details: {
            message: 'Invalid API key',
            name: 'validation_error'
          }
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
      expect(result.details).toEqual({
        message: 'Invalid API key',
        name: 'validation_error'
      })
    })

    it('エラーメッセージがない場合のデフォルトメッセージ', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          success: false,
          details: { name: 'unknown_error' }
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('メール送信でエラーが発生しました')
    })

    it('例外をキャッチしてエラーを返す', async () => {
      const error = new Error('Network error')
      vi.mocked(fetch).mockRejectedValueOnce(error)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.details).toEqual(error)
    })

    it('エラーメッセージがない例外の場合', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error())

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('予期しないエラーが発生しました')
    })
  })


  describe('エッジケース', () => {
    it('空文字列の受信者でも配列に変換される', async () => {
      emailSender.setApiKey('re_test_key')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          success: false,
          error: '必須パラメータが不足しています'
        })
      } as Response)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: '',
        subject: 'Test',
        text: 'Test'
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"to":""')
        })
      )
    })
  })
})