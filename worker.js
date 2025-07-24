import { handleRequest } from './proxy-core.mjs'

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
    
    console.log('Sending to RESEND API:', JSON.stringify(emailData, null, 2))
    
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
      console.error('RESEND API error:', response.status, data)
      return { error: data }
    }
    
    return { data }
  } catch (error) {
    console.error('Send email error:', error)
    return { error }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
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
}