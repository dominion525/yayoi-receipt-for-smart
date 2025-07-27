import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailSender } from '../mail'

// モック関数を外部で定義して共有
const mockSend = vi.fn()

// RESENDモジュールをモック
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => {
      return {
        emails: {
          send: mockSend
        }
      }
    })
  }
})

describe('EmailSender', () => {
  let emailSender: EmailSender

  beforeEach(() => {
    vi.clearAllMocks()
    emailSender = new EmailSender()
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
      const mockResponse = {
        data: { id: 'msg_123456' },
        error: null
      }
      mockSend.mockResolvedValue(mockResponse)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test HTML content</p>'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_123456')
      expect(result.error).toBeUndefined()
      
      expect(mockSend).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Email',
        html: '<p>Test HTML content</p>'
      })
    })

    it('テキストメールを正常に送信できる', async () => {
      const mockResponse = {
        data: { id: 'msg_789012' },
        error: null
      }
      mockSend.mockResolvedValue(mockResponse)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'Plain text content'
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_789012')
      
      expect(mockSend).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Email',
        text: 'Plain text content'
      })
    })

    it('複数の受信者に送信できる', async () => {
      const mockResponse = {
        data: { id: 'msg_multi_123' },
        error: null
      }
      mockSend.mockResolvedValue(mockResponse)

      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com']
      
      const result = await emailSender.send({
        from: 'sender@example.com',
        to: recipients,
        subject: 'Multi Recipients',
        text: 'Test content'
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: recipients,
        subject: 'Multi Recipients',
        text: 'Test content'
      })
    })

    it('HTMLもテキストも指定されていない場合はsubjectをテキストとして使用', async () => {
      const mockResponse = {
        data: { id: 'msg_default_123' },
        error: null
      }
      mockSend.mockResolvedValue(mockResponse)

      await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Subject as content'
      })

      expect(mockSend).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Subject as content',
        text: 'Subject as content'
      })
    })

    it('添付ファイル付きメールを送信できる', async () => {
      const mockResponse = {
        data: { id: 'msg_attach_123' },
        error: null
      }
      mockSend.mockResolvedValue(mockResponse)

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
      expect(mockSend).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'With Attachment',
        text: 'See attached',
        attachments
      })
    })

    it('APIエラーレスポンスを適切に処理する', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid API key',
          name: 'validation_error'
        }
      }
      mockSend.mockResolvedValue(mockResponse)

      const result = await emailSender.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
      expect(result.details).toEqual(mockResponse.error)
    })

    it('エラーメッセージがない場合のデフォルトメッセージ', async () => {
      const mockResponse = {
        data: null,
        error: { name: 'unknown_error' }
      }
      mockSend.mockResolvedValue(mockResponse)

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
      mockSend.mockRejectedValue(error)

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
      mockSend.mockRejectedValue(new Error())

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
      mockSend.mockResolvedValue({
        data: { id: 'test_123' },
        error: null
      })

      await emailSender.send({
        from: 'sender@example.com',
        to: '',
        subject: 'Test',
        text: 'Test'
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['']
        })
      )
    })
  })
})