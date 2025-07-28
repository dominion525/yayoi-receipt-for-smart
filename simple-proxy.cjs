const http = require('http')
const { Resend } = require('resend')
const { handleRequest } = require('./proxy-core.cjs')

const PORT = 3001

// Node.js用のメール送信関数（Resend SDK使用）
async function sendEmailWithResend({ apiKey, from, to, subject, text, html, attachments }) {
  try {
    const resend = new Resend(apiKey)
    
    const emailParams = {
      from,
      to,
      subject,
      text,
      html
    }
    
    if (attachments && attachments.length > 0) {
      emailParams.attachments = attachments
    }
    
    const response = await resend.emails.send(emailParams)
    return response
  } catch (error) {
    return { error }
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  
  // リクエストボディを取得する関数
  const getBody = () => new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      resolve(body)
    })
  })
  
  // 共通ロジックを呼び出し
  const response = await handleRequest(
    req.method,
    req.url,
    getBody,
    sendEmailWithResend
  )
  
  // レスポンスを送信
  Object.entries(response.headers).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  res.writeHead(response.status)
  res.end(response.body)
})

server.listen(PORT, () => {
  console.log(`Simple proxy server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Email endpoint: http://localhost:${PORT}/api/send-email`)
})