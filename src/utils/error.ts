/**
 * エラーオブジェクトかどうかを判定する型ガード
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * エラーからメッセージを安全に取得
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message || '予期しないエラーが発生しました';
  }
  if (typeof error === 'string') {
    return error || '予期しないエラーが発生しました';
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || '予期しないエラーが発生しました';
  }
  return '予期しないエラーが発生しました';
}