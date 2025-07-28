// Cloudflare Workers用プロキシサーバー
import { handleRequest, CORS_HEADERS } from './proxy-core.mjs'

// RESEND APIを使用してメールを送信
async function sendEmail(data) {
  const resendApiKey = data.apiKey
  const { from, to, subject, text, html, attachments } = data
  
  // 添付ファイルの処理
  const attachmentData = attachments?.map(att => ({
    filename: att.filename,
    content: att.content,
    content_type: att.contentType || 'application/octet-stream'
  }))
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      attachments: attachmentData
    }),
  })
  
  const result = await response.json()
  return result
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const pathname = url.pathname
    const method = request.method
    
    // handleRequestに必要な関数を定義
    const getBody = async () => await request.text()
    
    const response = await handleRequest(method, pathname, getBody, sendEmail)
    
    return new Response(response.body, {
      status: response.status,
      headers: response.headers
    })
  },
}