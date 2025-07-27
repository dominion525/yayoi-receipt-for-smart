/**
 * localStorage操作を抽象化するサービス
 * 型安全な読み書きとエラーハンドリングを提供
 */
export class StorageService {
  /**
   * localStorageに値を保存
   * @param key ストレージキー
   * @param value 保存する値
   * @returns 保存に成功したかどうか
   */
  static set<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
      return true
    } catch (error) {
      console.error(`Failed to save to localStorage (key: ${key}):`, error)
      return false
    }
  }

  /**
   * localStorageから値を取得
   * @param key ストレージキー
   * @param defaultValue デフォルト値（キーが存在しない場合）
   * @returns 取得した値またはデフォルト値
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      if (item === null) {
        return defaultValue
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Failed to get from localStorage (key: ${key}):`, error)
      return defaultValue
    }
  }

  /**
   * localStorageから値を削除
   * @param key ストレージキー
   * @returns 削除に成功したかどうか
   */
  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Failed to remove from localStorage (key: ${key}):`, error)
      return false
    }
  }

  /**
   * localStorageのキーが存在するか確認
   * @param key ストレージキー
   * @returns キーが存在するかどうか
   */
  static has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null
    } catch (error) {
      console.error(`Failed to check localStorage (key: ${key}):`, error)
      return false
    }
  }

  /**
   * localStorageをクリア
   * @returns クリアに成功したかどうか
   */
  static clear(): boolean {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
      return false
    }
  }

  /**
   * localStorageの使用可能容量を推定
   * @returns 使用可能なバイト数（推定値）
   */
  static async getAvailableSpace(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return (estimate.quota || 0) - (estimate.usage || 0)
      } catch (error) {
        console.error('Failed to estimate storage:', error)
        return -1
      }
    }
    return -1
  }
}