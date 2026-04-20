/// <reference types="@cloudflare/workers-types" />

// 添付ファイル
interface Attachment {
  filename: string
  content: string // Base64文字列
  contentType?: string
}

// メール送信リクエスト（クライアント → Worker）
interface SendEmailRequest {
  apiKey: string
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Attachment[]
}

// Resend API のエラー詳細
interface ResendErrorDetails {
  name?: string
  message?: string
  statusCode?: number
}

// Resend API 呼び出し結果
interface SendEmailResult {
  data?: unknown
  error?: ResendErrorDetails | string | unknown
  message?: string
}

// Resend API へ送信するペイロード
interface ResendApiPayload {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string
    content_type: string
  }>
}

// ハンドラー戻り値
interface HandleRequestResponse {
  status: number
  headers: Record<string, string>
  body: string | null
}

// メール送信関数の型
type SendEmailFunc = (params: SendEmailRequest) => Promise<SendEmailResult>

// Cloudflare Workers 環境
interface Env {
  ASSETS?: Fetcher
}

// 環境に応じたCORSヘッダー
function getCorsHeaders(): Record<string, string> {
  // 本番環境（Cloudflare Workers）では特定ドメインのみ許可
  const g = globalThis as { ENVIRONMENT?: unknown; window?: unknown; process?: unknown }
  const isProduction = typeof g.ENVIRONMENT === 'undefined' &&
                      typeof g.window === 'undefined' &&
                      typeof g.process === 'undefined'

  if (isProduction) {
    return {
      'Access-Control-Allow-Origin': 'https://receipt.dominion525.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  }

  // 開発環境では全て許可
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

// 共通のCORSヘッダー
const CORS_HEADERS = getCorsHeaders()

// セキュリティヘッダー
// 注: 'unsafe-eval' は Alpine.js 3.x が式評価に new Function() を使うため必要。
//     CSP build への移行は別タスク。
//     'unsafe-inline' (style-src) は Alpine.js の :style バインディング
//     および offline.html の <style> ブロックのため必要。
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

// 応答にセキュリティヘッダーを付与
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// result.error が ResendErrorDetails 形式か判定
function isResendErrorDetails(x: unknown): x is ResendErrorDetails {
  return typeof x === 'object' && x !== null
}

// ルーティング処理
async function handleRequest(
  method: string,
  pathname: string,
  getBody: () => Promise<string>,
  sendEmailFunc: SendEmailFunc
): Promise<HandleRequestResponse> {
  // OPTIONS request
  if (method === 'OPTIONS') {
    return {
      status: 200,
      headers: CORS_HEADERS,
      body: null
    }
  }

  // Health check endpoint
  if ((pathname === '/health' || pathname === '/api/health') && method === 'GET') {
    return {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ok',
        message: 'Proxy server is running',
        timestamp: new Date().toISOString()
      })
    }
  }

  // Email sending endpoint (両方のパスに対応)
  if ((pathname === '/api/send-email' || pathname === '/send-email') && method === 'POST') {
    try {
      const body = await getBody()
      const data = JSON.parse(body) as Partial<SendEmailRequest>
      const { apiKey, from, to, subject, text, html, attachments } = data

      // Validation
      if (!apiKey || !from || !to || !subject) {
        return {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: '必須パラメータが不足しています'
          })
        }
      }

      // Send email
      const result = await sendEmailFunc({
        apiKey,
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text: text || subject,
        html,
        attachments
      })

      if (result.error) {
        // 本番環境でも重要なエラーはログに残す（簡潔に）
        console.error('Email send error:', result.error)

        // エラーメッセージを詳細に
        let errorMessage = 'メール送信でエラーが発生しました'

        // エラーオブジェクトの様々なフィールドをチェック
        if (isResendErrorDetails(result.error) && typeof result.error.message === 'string') {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (typeof result.message === 'string') {
          errorMessage = result.message
        } else if (isResendErrorDetails(result.error) && result.error.name === 'validation_error') {
          errorMessage = 'メールアドレスまたはAPIキーが無効です'
        } else if (isResendErrorDetails(result.error) && result.error.name === 'invalid_to_address') {
          errorMessage = '送信先メールアドレスが無効です'
        }

        // 開発環境のみ詳細ログ
        // console.error('Parsed error message:', errorMessage)

        return {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: errorMessage,
            details: result.error
          })
        }
      }

      return {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: result.data
        })
      }

    } catch (error) {
      // 本番環境でも重要なエラーはログに残す（簡潔に）
      const message = error instanceof Error ? error.message : String(error)
      console.error('Email send error:', message)
      return {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
          details: error
        })
      }
    }
  }

  // 404 for other routes
  return {
    status: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' })
  }
}

// Cloudflare Workers用のメール送信関数（fetch API使用）
async function sendEmailWithFetch({
  apiKey,
  from,
  to,
  subject,
  text,
  html,
  attachments
}: SendEmailRequest): Promise<SendEmailResult> {
  try {
    const emailData: ResendApiPayload = {
      from,
      to,
      subject
    }

    // textまたはhtmlを設定（RESEND APIは少なくともどちらか1つが必要）
    if (html) {
      emailData.html = html
    } else if (text) {
      emailData.text = text
    } else {
      emailData.text = subject // フォールバック
    }

    // 添付ファイルがある場合の処理
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content, // Base64文字列
        content_type: att.contentType || 'application/octet-stream'
      }))
    }

    // 開発環境のみログ出力
    // console.log('Sending to RESEND API:', JSON.stringify(emailData, null, 2))

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    const data: unknown = await response.json()

    if (!response.ok) {
      return { error: data }
    }

    return { data }
  } catch (error) {
    return { error }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // APIエンドポイントの処理
    if (url.pathname.startsWith('/api/')) {
      // リクエストボディを取得する関数
      const getBody = (): Promise<string> => request.text()

      // 共通ロジックを呼び出し
      const response = await handleRequest(
        request.method,
        url.pathname,
        getBody,
        sendEmailWithFetch
      )

      // レスポンスを返す（セキュリティヘッダー付与）
      return withSecurityHeaders(new Response(response.body, {
        status: response.status,
        headers: response.headers
      }))
    }

    // 静的アセットの処理（セキュリティヘッダー付与）
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request)
      return withSecurityHeaders(assetResponse)
    }

    // フォールバック
    return withSecurityHeaders(new Response('Not Found', { status: 404 }))
  }
}
