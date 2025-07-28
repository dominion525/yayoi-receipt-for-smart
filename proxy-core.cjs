// 環境に応じたCORSヘッダー
function getCorsHeaders() {
  // 本番環境（Cloudflare Workers）では特定ドメインのみ許可
  const isProduction = typeof globalThis === 'undefined' || 
                      (typeof globalThis.ENVIRONMENT === 'undefined' && 
                       typeof window === 'undefined' && 
                       typeof process === 'undefined')
  
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

// CommonJSとES Modulesの両方に対応
module.exports = { handleRequest, CORS_HEADERS }