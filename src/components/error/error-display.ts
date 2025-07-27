export interface ErrorDisplayData {
  error: string | null
}

/**
 * エラー表示コンポーネント
 * エラーメッセージの表示を管理
 */
export function errorDisplay(): ErrorDisplayData & Record<string, any> {
  return {
    error: null,
    
    init() {
      // 親コンポーネントのエラー状態を監視
      this.$watch('$root.error', (value: string | null) => {
        this.error = value
      })
    }
  }
}

/**
 * エラー表示のテンプレート
 */
export const errorDisplayTemplate = `
  <div 
    x-show="error" 
    x-transition 
    class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded max-h-48 overflow-y-auto"
  >
    <p x-html="error ? error.replace(/\\n/g, '<br>') : ''" class="whitespace-pre-wrap"></p>
  </div>
`