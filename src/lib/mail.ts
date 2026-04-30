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
      return import.meta.env.VITE_PROXY_URL
    }

    // 本番環境（receipt.dominion525.com）や他の環境では空文字列
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return ''
    }

    // 開発環境
    return API.DEFAULT_PROXY_URL
  }

  /**
   * APIキーをインスタンスに保持する。BYOK モデルではユーザー入力のキーを
   * シングルトン (`emailSender`) に都度書き換える前提のため、複数の `EmailSender`
   * インスタンスを共存させない。送信時は `send()` 内でリクエストボディに含めて
   * Worker に渡される（Worker から先で Resend に Bearer 認証として転送）。
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * 送信元メールアドレス（Resend 側で検証済みのドメインのアドレス）を保持する。
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
   * Worker の `/api/send-email` 経由で Resend にメールを送信する。
   *
   * - `apiKey` は `setApiKey` 経由で事前にインスタンスへ設定する必要がある（未設定なら即座に失敗）。
   * - 戻り値 `EmailResult.details` には Resend API のエラー詳細オブジェクトがそのまま入る
   *   ことがあり、APIキー文字列が紛れる可能性がある。呼び出し元でクライアント表示や
   *   ログ出力する前に `maskApiKey` 適用が必須。
   * - ネットワーク到達不能（fetch 失敗）は固有のエラーメッセージで分岐する。
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
          'Content-Type': 'application/json'
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
      const errorMessage = getErrorMessage(error)
      // ネットワークエラーなどの場合
      if (errorMessage.includes('fetch')) {
        return {
          success: false,
          error:
            'プロキシサーバーに接続できません。proxy-server.jsが起動していることを確認してください。',
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
   * レシート画像を 1 通のメールにまとめて送信する。
   *
   * - `imageData` は `data:image/jpeg;base64,...` 形式の data URI を必須とする。
   *   先頭の MIME 部分は内部で剥がされて Base64 部分のみを添付ファイル本体に流し込む。
   *   data URI 以外（生 Base64 や URL）を渡した場合の挙動は未定義。
   * - 件名・本文には現在時刻（JST 表示）が含まれる。テスト時に時刻を固定したい場合は
   *   `vi.useFakeTimers()` 等で `Date` を制御する。
   * - 添付ファイル名はタイムスタンプから生成され、コロン・スラッシュをハイフンに置換する。
   */
  async sendReceipt(
    toEmail: string | string[],
    imageData: string,
    comment?: string
  ): Promise<EmailResult> {
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
      from: this.fromEmail || '', // 検証済みドメインの送信元アドレス
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
      attachments: [
        {
          filename: `receipt_${dateStr.replace(/\//g, '-')}_${timeStr.replace(/:/g, '-')}.jpg`,
          content: base64Data || '',
          contentType: 'image/jpeg'
        }
      ]
    })
  }
}

// シングルトンインスタンス
export const emailSender = new EmailSender()
