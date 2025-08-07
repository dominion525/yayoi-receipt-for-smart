/**
 * メール送信の進捗状況を管理する型定義
 */

/**
 * 送信進捗の状態
 */
export type SendProgressStatus = 'preparing' | 'sending' | 'completed' | 'error'

/**
 * 送信進捗情報
 */
export interface SendProgress {
  /** 送信先の総数 */
  total: number
  
  /** 送信完了数 */
  sent: number
  
  /** 送信失敗数 */
  failed: number
  
  /** 現在送信中の宛先（並行送信時は複数） */
  currentRecipients: string[]
  
  /** 進捗状態 */
  status: SendProgressStatus
  
  /** 進捗率（0-100） */
  percentage: number
}

/**
 * 進捗更新コールバック関数の型
 */
export type ProgressCallback = (progress: SendProgress) => void

/**
 * 送信結果の詳細
 */
export interface SendResult {
  recipient: string
  success: boolean
  messageId?: string
  error?: string
  timestamp: number
}