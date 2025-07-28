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

      await emailSender.send({
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

  describe('エンドポイントURL正規化', () => {
    beforeEach(() => {
      emailSender.setApiKey('re_test_123456')
    })

    it('プロキシURLが/apiで終わる場合は/send-emailを追加', async () => {
      emailSender.setProxyUrl('http://example.com/api')
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'endpoint_test_123' } 
        })
      } as Response)

      await emailSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://example.com/api/send-email',
        expect.any(Object)
      )
    })

    it('プロキシURLが/apiで終わらない場合は/api/send-emailを追加', async () => {
      emailSender.setProxyUrl('http://example.com')
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          data: { id: 'endpoint_test_456' } 
        })
      } as Response)

      await emailSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test'
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://example.com/api/send-email',
        expect.any(Object)
      )
    })
  })

  describe('fetchエラー詳細処理', () => {
    beforeEach(() => {
      emailSender.setApiKey('re_test_123456')
    })

    it('fetchエラーメッセージに"fetch"が含まれる場合（118-123行目カバー）', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error: fetch request failed'))

      const result = await emailSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test email'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('プロキシサーバーに接続できません。proxy-server.jsが起動していることを確認してください。')
      expect(result.details).toBeInstanceOf(Error)
    })

    it('fetchを含まないエラーの場合は通常のエラーメッセージを返す', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection timeout'))

      const result = await emailSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test email'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection timeout')
      expect(result.details).toBeInstanceOf(Error)
    })

    it('大文字小文字混在でfetchが含まれる場合の処理', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to FETCH resource'))

      const result = await emailSender.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test email'
      })

      expect(result.success).toBe(false)
      // 大文字の"FETCH"は小文字の"fetch"にマッチしないため、通常のエラーメッセージになる
      expect(result.error).toBe('Failed to FETCH resource')
    })
  })

  describe('sendReceipt()メソッド', () => {
    beforeEach(() => {
      emailSender.setApiKey('re_test_123456')
      // 時刻を固定するためのモック
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T14:30:45.123Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('レシート画像を正常に送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'receipt_msg_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD'
      const result = await emailSender.sendReceipt('receipt@example.com', imageData)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('receipt_msg_123')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/send-email',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"subject":"レシート画像 - 2024/01/15 23:30"')
        })
      )
    })

    it('HTMLメール内容が正しく生成される', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'html_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testbase64data'
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.html).toContain('<h2>レシート画像</h2>')
      expect(requestBody.html).toContain('<p>撮影日時: 2024/01/15 23:30</p>')
      expect(requestBody.html).toContain('<p><small>スマート レシート</small></p>')
    })

    it('テキストメール内容が正しく生成される', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'text_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testbase64data'
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.text).toContain('レシート画像を送信します。')
      expect(requestBody.text).toContain('撮影日時: 2024/01/15 23:30')
      expect(requestBody.text).toContain('スマート レシート')
    })

    it('コメント付きでレシート画像を送信できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'comment_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testbase64data'
      const comment = 'ランチ代の領収書'
      await emailSender.sendReceipt('test@example.com', imageData, comment)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.html).toContain(`<p>コメント: ${comment}</p>`)
      expect(requestBody.text).toContain(`コメント: ${comment}`)
    })

    it('添付ファイルが正しく設定される', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'attachment_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testbase64content'
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.attachments).toHaveLength(1)
      expect(requestBody.attachments[0]).toEqual({
        filename: 'receipt_2024-01-15_23-30.jpg',
        content: 'testbase64content',
        contentType: 'image/jpeg'
      })
    })

    it('Base64データからヘッダーを正しく除去する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'base64_test_123' }
        })
      } as Response)

      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.attachments[0].content).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
      expect(requestBody.attachments[0].content).not.toContain('data:image')
    })

    it('送信元メールアドレスが設定される', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'from_test_123' }
        })
      } as Response)

      emailSender.setFromEmail('sender@example.com')
      const imageData = 'data:image/jpeg;base64,testdata'
      await emailSender.sendReceipt('recipient@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.from).toBe('sender@example.com')
    })

    it('送信元メールアドレスが未設定の場合は空文字列', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'no_from_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testdata'
      await emailSender.sendReceipt('recipient@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.from).toBe('')
    })

    it('空のBase64データでも処理できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'empty_data_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,'
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.attachments[0].content).toBe('')
    })

    it('日時フォーマットが正しく動作する（異なる時刻）', async () => {
      vi.setSystemTime(new Date('2024-12-25T09:15:30.456Z'))
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'time_format_test_123' }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testdata'
      await emailSender.sendReceipt('test@example.com', imageData)

      const callArgs = vi.mocked(fetch).mock.calls[0]?.[1]
      const requestBody = JSON.parse(callArgs?.body as string)

      expect(requestBody.subject).toBe('レシート画像 - 2024/12/25 18:15')
      expect(requestBody.attachments[0].filename).toBe('receipt_2024-12-25_18-15.jpg')
    })

    it('送信エラーの場合は適切にエラーを返す', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid recipient address',
          details: {
            name: 'validation_error',
            message: 'Email validation failed'
          }
        })
      } as Response)

      const imageData = 'data:image/jpeg;base64,testdata'
      const result = await emailSender.sendReceipt('invalid@example.com', imageData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid recipient address')
      expect(result.details).toEqual({
        name: 'validation_error',
        message: 'Email validation failed'
      })
    })
  })

  describe('determineProxyUrl()メソッド（設計改善後）', () => {
    const originalEnv = import.meta.env

    beforeEach(() => {
      // 全体的なsetupとは独立して、この描述ブロック用の初期化
      vi.unstubAllGlobals()
      vi.clearAllMocks()
      // 環境変数を完全にクリア
      Object.defineProperty(import.meta, 'env', {
        value: {},
        configurable: true
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      // 環境変数を元に戻す
      Object.defineProperty(import.meta, 'env', {
        value: originalEnv,
        configurable: true
      })
      vi.clearAllMocks()
    })

    it('環境変数VITE_PROXY_URLが設定されている場合はそれを使用', () => {
      // 環境変数を明示的に設定してテスト
      vi.stubEnv('VITE_PROXY_URL', 'https://api.example.com')
      
      const testSender = new EmailSender()
      const proxyUrl = testSender['determineProxyUrl']()
      
      expect(proxyUrl).toBe('https://api.example.com')
    })

    it('本番環境（receipt.dominion525.com）では空文字列を返す', () => {
      // 環境変数をクリアして本番環境をテスト
      vi.stubEnv('VITE_PROXY_URL', undefined)
      vi.stubGlobal('window', { location: { hostname: 'receipt.dominion525.com' } })
      
      const testSender = new EmailSender()
      const proxyUrl = testSender['determineProxyUrl']()
      
      expect(proxyUrl).toBe('')
      
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    })

    it('localhost以外のホスト名では空文字列を返す', () => {
      // 環境変数をクリアして他のホスト名をテスト
      vi.stubEnv('VITE_PROXY_URL', undefined)
      vi.stubGlobal('window', { location: { hostname: 'example.com' } })
      
      const testSender = new EmailSender()
      const proxyUrl = testSender['determineProxyUrl']()
      
      expect(proxyUrl).toBe('')
      
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    })

    it('Node.js環境（windowがundefined）では開発環境URLを返す', () => {
      // 環境変数をクリアしてNode.js環境をテスト
      vi.stubEnv('VITE_PROXY_URL', undefined)
      vi.stubGlobal('window', undefined)
      
      const testSender = new EmailSender()
      const proxyUrl = testSender['determineProxyUrl']()
      
      expect(proxyUrl).toBe('http://localhost:3001')
      
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    })

    it('開発環境（localhost）では開発環境URLを返す', () => {
      // 環境変数をクリアしてlocalhost環境をテスト
      vi.stubEnv('VITE_PROXY_URL', undefined)
      vi.stubGlobal('window', { location: { hostname: 'localhost' } })
      
      const testSender = new EmailSender()
      const proxyUrl = testSender['determineProxyUrl']()
      
      expect(proxyUrl).toBe('http://localhost:3001')
      
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    })
  })
})