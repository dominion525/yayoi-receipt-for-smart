/**
 * アプリケーション全体で使用するタイムアウト値の定数
 * 単位: ミリ秒
 */
export const TIMEOUTS = {
  /** 写真撮影エフェクトの表示時間 */
  CAPTURE_EFFECT: 300,

  /** PWA更新後の確認ダイアログ表示までの遅延 */
  PWA_UPDATE_DIALOG: 1000,

  /** デバッグログコピー完了メッセージの表示時間 */
  COPY_FEEDBACK: 2000,

  /** 送信進捗表示のクリア時間 */
  PROGRESS_CLEAR: 3000,

  /** 成功メッセージの表示時間 */
  SUCCESS_MESSAGE: 5000,

  /** エラーメッセージの表示時間 */
  ERROR_MESSAGE: 10000
} as const
