/**
 * アプリケーション内で使用するエラー型の定義
 */
export interface AppError {
  message: string
  name?: string
  stack?: string
  cause?: unknown
}
