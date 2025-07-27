export interface EmailOptions {
  apiKey: string
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  details?: any
}

/**
 * プロキシサーバー経由でRESEND APIを使用するメール送信クラス
 */
export class EmailSender {
  private apiKey: string = ''
  private proxyUrl: string = (import.meta as any).env?.VITE_PROXY_URL || 'http://localhost:3001'

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * プロキシサーバーのURLを設定（デフォルト: http://localhost:3001）
   */
  setProxyUrl(url: string): void {
    this.proxyUrl = url
  }

  /**
   * メールを送信
   */
  async send(options: Omit<EmailOptions, 'apiKey'>): Promise<EmailResult> {
    try {
      // APIキーが設定されていない場合
      if (!this.apiKey) {
        return {
          success: false,
          error: 'APIキーが設定されていません'
        }
      }

      // プロキシサーバーにリクエスト（URLを正規化）
      const endpoint = this.proxyUrl.endsWith('/api') 
        ? `${this.proxyUrl}/send-email` 
        : `${this.proxyUrl}/api/send-email`
      
      console.log('メール送信リクエスト:', {
        endpoint: endpoint,
        to: options.to,
        subject: options.subject
      })
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          ...options
        })
      })

      const result = await response.json()
      
      console.log('プロキシサーバーレスポンス:', {
        status: response.status,
        ok: response.ok,
        success: result.success,
        error: result.error,
        message: result.message,
        details: result.details,
        fullResult: result
      })

      if (!response.ok || !result.success) {
        console.error('Email send error:', {
          status: response.status,
          error: result.error,
          message: result.message,
          details: result.details,
          fullResult: result
        })
        return {
          success: false,
          error: result.error || result.message || 'メール送信でエラーが発生しました',
          details: result.details || result
        }
      }

      return {
        success: true,
        messageId: result.data?.id
      }

    } catch (error: any) {
      // ネットワークエラーなどの場合
      if (error.message?.includes('fetch')) {
        return {
          success: false,
          error: 'プロキシサーバーに接続できません。proxy-server.jsが起動していることを確認してください。',
          details: error
        }
      }
      
      return {
        success: false,
        error: error.message || '予期しないエラーが発生しました',
        details: error
      }
    }
  }

  /**
   * テストメールを送信（設定確認用）
   */
  async sendTestEmail(apiKey: string, _fromEmail: string, toEmail: string): Promise<EmailResult> {
    // 一時的にAPIキーを設定
    const originalApiKey = this.apiKey
    
    try {
      this.apiKey = apiKey
      
      const result = await this.send({
        from: 'smart-receipt@dominion525.com',  // 検証済みドメインの送信元アドレス
        to: toEmail,
        subject: 'スマート レシート - テストメール',
        html: `
          <h2>テストメール送信成功</h2>
          <p>このメールは「スマート レシート for 弥生」アプリからのテスト送信です。</p>
          <p><strong>送信時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
          <p>設定が正常に完了しました。レシート撮影機能をご利用いただけます。</p>
          <hr>
          <p><small>このメールはテスト用です。</small></p>
        `,
        text: `テストメール送信成功

このメールは「スマート レシート for 弥生」アプリからのテスト送信です。

送信時刻: ${new Date().toLocaleString('ja-JP')}

設定が正常に完了しました。レシート撮影機能をご利用いただけます。

このメールはテスト用です。`
      })
      
      return result
      
    } finally {
      // 元のAPIキー設定を復元
      this.apiKey = originalApiKey
    }
  }

  /**
   * レシート画像を送信
   */
  async sendReceipt(toEmail: string, imageData: string, comment?: string): Promise<EmailResult> {
    console.log(`sendReceipt呼び出し: 宛先=${toEmail}`)
    
    const now = new Date()
    const dateStr = now.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const timeStr = now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Base64画像データから添付ファイルを作成
    const base64Data = imageData.split(',')[1] // data:image/jpeg;base64, を除去
    
    return await this.send({
      from: 'smart-receipt@dominion525.com',  // 検証済みドメインの送信元アドレス
      to: toEmail,
      subject: `レシート画像 - ${dateStr} ${timeStr}`,
      html: `
        <h2>レシート画像</h2>
        <p>撮影日時: ${dateStr} ${timeStr}</p>
        ${comment ? `<p>コメント: ${comment}</p>` : ''}
        <hr>
        <p><small>スマート レシート for 弥生</small></p>
      `,
      text: `レシート画像を送信します。

撮影日時: ${dateStr} ${timeStr}
${comment ? `\nコメント: ${comment}` : ''}

----
スマート レシート for 弥生`,
      attachments: [{
        filename: `receipt_${dateStr.replace(/\//g, '-')}_${timeStr.replace(/:/g, '-')}.jpg`,
        content: base64Data || '',
        contentType: 'image/jpeg'
      }]
    })
  }
}

// シングルトンインスタンス
export const emailSender = new EmailSender()