export interface DebugLog {
  time: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
  message: string
}

/**
 * デバッグログ管理サービス
 * ログの追加、削除、エクスポート機能を提供
 */
export class DebugService {
  private static logs: DebugLog[] = []
  private static maxLogs = 100
  private static listeners: ((logs: DebugLog[]) => void)[] = []

  /**
   * ログを追加
   */
  static add(message: string, type: DebugLog['type'] = 'info'): void {
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
    
    const log: DebugLog = { time, type, message }
    this.logs.push(log)
    
    // 最大件数を超えたら古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
    
    // リスナーに通知
    this.notifyListeners()
  }

  /**
   * すべてのログを取得
   */
  static getAll(): DebugLog[] {
    return [...this.logs]
  }

  /**
   * ログをクリア
   */
  static clear(): void {
    this.logs = []
    this.notifyListeners()
  }

  /**
   * ログをテキスト形式でエクスポート
   */
  static export(): string {
    return this.logs
      .map(log => `[${log.time}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n')
  }

  /**
   * ログをクリップボードにコピー
   */
  static async copyToClipboard(): Promise<boolean> {
    const logText = this.export()
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(logText)
        this.add('ログをクリップボードにコピーしました', 'success')
        return true
      } else {
        // フォールバック: テキストエリアを使用
        return this.copyToClipboardFallback(logText)
      }
    } catch (error) {
      this.add('ログのコピーに失敗しました', 'error')
      // Copy failed
      return false
    }
  }

  /**
   * クリップボードコピーのフォールバック実装
   */
  private static copyToClipboardFallback(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'absolute'
    textarea.style.left = '-999999px'
    document.body.appendChild(textarea)
    
    try {
      textarea.select()
      const successful = document.execCommand('copy')
      if (successful) {
        this.add('ログをクリップボードにコピーしました', 'success')
      } else {
        this.add('ログのコピーに失敗しました', 'error')
      }
      return successful
    } catch (error) {
      this.add('ログのコピーに失敗しました', 'error')
      // Copy failed
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }

  /**
   * ログ変更リスナーを追加
   */
  static addListener(listener: (logs: DebugLog[]) => void): void {
    this.listeners.push(listener)
  }

  /**
   * ログ変更リスナーを削除
   */
  static removeListener(listener: (logs: DebugLog[]) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * リスナーに変更を通知
   */
  private static notifyListeners(): void {
    const logs = this.getAll()
    this.listeners.forEach(listener => listener(logs))
  }

  /**
   * 最大ログ数を設定
   */
  static setMaxLogs(max: number): void {
    this.maxLogs = max
    // 現在のログ数が最大値を超えている場合は削除
    while (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  /**
   * 便利メソッド: info
   */
  static info(message: string): void {
    this.add(message, 'info')
  }

  /**
   * 便利メソッド: success
   */
  static success(message: string): void {
    this.add(message, 'success')
  }

  /**
   * 便利メソッド: warning
   */
  static warning(message: string): void {
    this.add(message, 'warning')
  }

  /**
   * 便利メソッド: error
   */
  static error(message: string): void {
    this.add(message, 'error')
  }

  /**
   * 便利メソッド: debug
   */
  static debug(message: string): void {
    this.add(message, 'debug')
  }
}