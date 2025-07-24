// 共通のCORSヘッダー
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

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
        return {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: result.error.message || 'メール送信でエラーが発生しました',
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
      console.error('Email send error:', error)
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

// ES Modules export
export { handleRequest, CORS_HEADERS }