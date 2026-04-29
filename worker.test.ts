import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import worker from './worker'

// globalThis.fetch をモックして Resend API 呼び出しをキャプチャ
let fetchMock: ReturnType<typeof vi.fn>
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function makeEnv(overrides: Partial<{ ASSETS: unknown }> = {}) {
  const assetsFetch = vi.fn(async (req: Request) => {
    return new Response(`asset:${new URL(req.url).pathname}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  })
  return {
    ASSETS: { fetch: assetsFetch },
    ...overrides
  } as never
}

describe('worker.fetch', () => {
  describe('OPTIONS /api/*', () => {
    it('200 で CORS ヘッダーを返す', async () => {
      const req = new Request('https://example.com/api/send-email', { method: 'OPTIONS' })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    it('セキュリティヘッダーを付与する', async () => {
      const req = new Request('https://example.com/api/send-email', { method: 'OPTIONS' })
      const res = await worker.fetch(req, makeEnv())

      expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=')
    })
  })

  describe('GET /api/health', () => {
    it('200 と JSON の status:ok を返す', async () => {
      const req = new Request('https://example.com/api/health', { method: 'GET' })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(200)
      const body = (await res.json()) as { status: string }
      expect(body.status).toBe('ok')
    })
  })

  describe('POST /api/send-email - 入力バリデーション', () => {
    it('必須パラメータ欠損時は 400 を返す', async () => {
      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'a@example.com' }) // apiKey, to, subject が欠損
      })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(400)
      const body = (await res.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).toContain('必須パラメータ')
    })

    it('不正な JSON body は 500 を返す', async () => {
      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json'
      })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(500)
      const body = (await res.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })
  })

  describe('POST /api/send-email - 送信成功', () => {
    it('Resend API が成功を返したら 200 と data を返す', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'msg-id-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_test1234abcd',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: 'テスト本文'
        })
      })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; data: { id: string } }
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('msg-id-123')
    })

    it('text/html 両方未指定なら subject をフォールバックとして送る', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'msg-id' }), { status: 200 })
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_test',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'フォールバック件名'
          // text も html も指定しない
        })
      })
      await worker.fetch(req, makeEnv())

      const callArgs = fetchMock.mock.calls[0] as [string, RequestInit]
      const sentBody = JSON.parse(callArgs[1].body as string)
      expect(sentBody.text).toBe('フォールバック件名')
    })

    it('html 指定時は html をペイロードに含める', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'msg-id' }), { status: 200 })
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_test',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          html: '<p>本文HTML</p>'
        })
      })
      await worker.fetch(req, makeEnv())

      const callArgs = fetchMock.mock.calls[0] as [string, RequestInit]
      const sentBody = JSON.parse(callArgs[1].body as string)
      expect(sentBody.html).toBe('<p>本文HTML</p>')
      expect(sentBody.text).toBeUndefined()
    })

    it('attachments 指定時は snake_case に変換してペイロードに含める', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'msg-id' }), { status: 200 })
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_test',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文',
          attachments: [
            { filename: 'a.png', content: 'base64data', contentType: 'image/png' },
            { filename: 'b.bin', content: 'base64data2' } // contentType 省略
          ]
        })
      })
      await worker.fetch(req, makeEnv())

      const callArgs = fetchMock.mock.calls[0] as [string, RequestInit]
      const sentBody = JSON.parse(callArgs[1].body as string)
      expect(sentBody.attachments).toEqual([
        { filename: 'a.png', content: 'base64data', content_type: 'image/png' },
        { filename: 'b.bin', content: 'base64data2', content_type: 'application/octet-stream' }
      ])
    })

    it('Resend API へ Bearer トークンを送る', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'msg-id' }), { status: 200 })
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_abc1234',
          from: 'sender@example.com',
          to: ['a@example.com', 'b@example.com'],
          subject: 'テスト',
          text: '本文'
        })
      })
      await worker.fetch(req, makeEnv())

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_abc1234'
          })
        })
      )
    })
  })

  describe('POST /api/send-email - BYOK: APIキー漏洩耐性', () => {
    it('Resend API エラー中の APIキー がレスポンス error/details に露出しない', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'authentication_error',
            message: 'Invalid api_key re_leaksecret1234xyzw supplied'
          }),
          { status: 401 }
        )
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_leaksecret1234xyzw',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文'
        })
      })
      const res = await worker.fetch(req, makeEnv())

      const rawBody = await res.text()
      // 生の APIキー がレスポンスボディに含まれていないこと
      expect(rawBody).not.toContain('re_leaksecret1234xyzw')
      // マスク後の表記は許容
      expect(rawBody).toMatch(/re_••••xyzw|re_\*{4}xyzw/)
    })

    it('Resend 認証エラーを安全なメッセージに変換する', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'validation_error',
            message: 'Something with re_secret1234wxyz embedded'
          }),
          { status: 422 }
        )
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_secret1234wxyz',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文'
        })
      })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(400)
      const body = (await res.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).not.toContain('re_secret1234wxyz')
    })

    it('Resend API 呼び出し中の例外に APIキー が含まれてもマスクされる', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection failed to Bearer re_crash1234abcd'))

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_crash1234abcd',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文'
        })
      })
      const res = await worker.fetch(req, makeEnv())

      const rawBody = await res.text()
      expect(rawBody).not.toContain('re_crash1234abcd')
    })

    it('Resend API エラー時、サーバーログ (console.error) にも APIキー が露出しない', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'authentication_error',
            message: 'Invalid api_key re_logleak1234abcd supplied'
          }),
          { status: 401 }
        )
      )

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_logleak1234abcd',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文'
        })
      })
      await worker.fetch(req, makeEnv())

      expect(consoleErrorSpy).toHaveBeenCalled()
      const loggedText = consoleErrorSpy.mock.calls
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ')
      expect(loggedText).not.toContain('re_logleak1234abcd')
      expect(loggedText).toContain('re_••••abcd')
    })

    it('Resend API 呼び出し例外時、サーバーログ (console.error) にも APIキー が露出しない', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection failed to Bearer re_logcrash1234efgh'))

      const req = new Request('https://example.com/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 're_logcrash1234efgh',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'テスト',
          text: '本文'
        })
      })
      await worker.fetch(req, makeEnv())

      expect(consoleErrorSpy).toHaveBeenCalled()
      const loggedText = consoleErrorSpy.mock.calls
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ')
      // 生の APIキー がログに混入しないことだけを保証する。
      // fetch 例外は sendEmailWithFetch の内部 catch で Error オブジェクトとして
      // 包まれ、JSON.stringify で本文が消失するため、マスク表記の混入までは検証しない。
      expect(loggedText).not.toContain('re_logcrash1234efgh')
    })
  })

  describe('静的アセット', () => {
    it('env.ASSETS.fetch に委譲しセキュリティヘッダーを付与する', async () => {
      const req = new Request('https://example.com/', { method: 'GET' })
      const res = await worker.fetch(req, makeEnv())

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('env.ASSETS が無い場合は 404 を返す', async () => {
      const req = new Request('https://example.com/any-path', { method: 'GET' })
      const env = {} as never
      const res = await worker.fetch(req, env)

      expect(res.status).toBe(404)
    })
  })
})
