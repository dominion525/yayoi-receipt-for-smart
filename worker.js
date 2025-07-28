// 環境に応じたCORSヘッダー
function getCorsHeaders() {
  // 本番環境（Cloudflare Workers）では特定ドメインのみ許可
  const isProduction = typeof globalThis.ENVIRONMENT === 'undefined' && 
                      typeof window === 'undefined' && 
                      typeof process === 'undefined'
  
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

// ルーティング処理
async function handleRequest(method, pathname, getBody, sendEmailFunc) {
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
      const data = JSON.parse(body)
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
        if (result.error.message) {
          errorMessage = result.error.message
        } else if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (result.message) {
          errorMessage = result.message
        } else if (result.error.name === 'validation_error') {
          errorMessage = 'メールアドレスまたはAPIキーが無効です'
        } else if (result.error.name === 'invalid_to_address') {
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
      console.error('Email send error:', error.message || error)
      return {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: error.message || '予期しないエラーが発生しました',
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
async function sendEmailWithFetch({ apiKey, from, to, subject, text, html, attachments }) {
  try {
    const emailData = {
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
    
    const data = await response.json()
    
    if (!response.ok) {
      // 本番環境でも重要なエラーはログに残す（簡潔に）
      console.error('RESEND API error:', response.status)
      return { error: data }
    }
    
    return { data }
  } catch (error) {
    // 本番環境でも重要なエラーはログに残す（簡潔に）
    console.error('Send email error:', error.message || error)
    return { error }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    // APIエンドポイントの処理
    if (url.pathname.startsWith('/api/')) {
      // リクエストボディを取得する関数
      const getBody = () => request.text()
      
      // 共通ロジックを呼び出し
      const response = await handleRequest(
        request.method,
        url.pathname,
        getBody,
        sendEmailWithFetch
      )
      
      // レスポンスを返す
      return new Response(response.body, {
        status: response.status,
        headers: response.headers
      })
    }
    
    // 静的アセットの処理
    // env.ASSETSが利用可能な場合はそれを使用
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }
    
    // フォールバック
    return new Response('Not Found', { status: 404 })
  }
}