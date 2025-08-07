import { getErrorMessage } from '../utils/error'
import { API } from '../constants/api'

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
  details?: unknown
}

/**
 * プロキシサーバー経由でRESEND APIを使用するメール送信クラス
 */
export class EmailSender {
  private apiKey: string = ''
  private proxyUrl: string
  private fromEmail: string = ''

  constructor() {
    this.proxyUrl = this.determineProxyUrl()
  }

  /**
   * プロキシURLを決定する（テスト可能なメソッド）
   */
  private determineProxyUrl(): string {
    // 環境変数が設定されている場合はそれを使用
    if (import.meta.env?.VITE_PROXY_URL) {
      return import.meta.env.VITE_PROXY_URL;
    }
    
    // 本番環境（receipt.dominion525.com）や他の環境では空文字列
    if (typeof window !== 'undefined' && 
        window.location.hostname !== 'localhost') {
      return '';
    }
    
    // 開発環境
    return API.DEFAULT_PROXY_URL;
  }

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * 送信元メールアドレスを設定
   */
  setFromEmail(fromEmail: string): void {
    this.fromEmail = fromEmail
  }

  /**
   * プロキシサーバーのURLを設定（デフォルト: ${API.DEFAULT_PROXY_URL}）
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
        : `${this.proxyUrl}${API.ENDPOINTS.SEND_EMAIL}`
      
      
      const response = await fetch(endpoint, {
        method: API.METHOD.POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          ...options
        })
      })

      const result = await response.json()
      

      if (!response.ok || !result.success) {
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

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      // ネットワークエラーなどの場合
      if (errorMessage.includes('fetch')) {
        return {
          success: false,
          error: 'プロキシサーバーに接続できません。proxy-server.jsが起動していることを確認してください。',
          details: error
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error
      }
    }
  }


  /**
   * レシート画像を送信
   */
  async sendReceipt(toEmail: string, imageData: string, comment?: string): Promise<EmailResult> {
    
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
      from: this.fromEmail || '',  // 検証済みドメインの送信元アドレス
      to: toEmail,
      subject: `レシート画像 - ${dateStr} ${timeStr}`,
      html: `
        <h2>レシート画像</h2>
        <p>撮影日時: ${dateStr} ${timeStr}</p>
        ${comment ? `<p>コメント: ${comment}</p>` : ''}
        <hr>
        <p><small>スマート レシート</small></p>
      `,
      text: `レシート画像を送信します。

撮影日時: ${dateStr} ${timeStr}
${comment ? `\nコメント: ${comment}` : ''}

----
スマート レシート`,
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