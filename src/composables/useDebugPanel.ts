import { DebugService, DebugLog } from '../services/debug.service'
import { TIMEOUTS } from '../constants/timeouts'
import { CompleteAppData } from '../types/app'

export interface DebugPanelData {
  showDebug: boolean
  debugLogs: DebugLog[]
  isCopyingLogs: boolean
  toggleDebug: () => void
  addDebugLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error' | 'debug') => void
  clearDebugLogs: () => void
  copyDebugLogs: () => Promise<void>
}

export function useDebugPanel(): DebugPanelData {
  return {
    // 状態
    showDebug: false,
    debugLogs: [],
    isCopyingLogs: false,
    
    // デバッグパネルの表示切り替え
    toggleDebug() {
      this.showDebug = !this.showDebug
    },
    
    // デバッグログの追加
    addDebugLog(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info') {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`
      
      const log: DebugLog = { time, type, message }
      this.debugLogs.push(log)
      
      // DebugServiceにも記録
      DebugService.add(message, type)
      
      // 最大100件に制限
      if (this.debugLogs.length > 100) {
        this.debugLogs.shift()
      }
      
      // 最新のログが見えるようにスクロール
      // Alpine.jsのコンテキストで$nextTickを使用
      const app = this as CompleteAppData
      if (app.$nextTick) {
        app.$nextTick(() => {
          const logContainer = document.querySelector('#debug-panel .bg-black')
          if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight
          }
        })
      }
    },
    
    // デバッグログのクリア
    clearDebugLogs() {
      this.debugLogs = []
      DebugService.clear()
    },
    
    // デバッグログのクリップボードへのコピー
    async copyDebugLogs() {
      this.isCopyingLogs = true
      await DebugService.copyToClipboard()
      
      // 成功/失敗に関わらず、視覚的フィードバックのために一定時間待つ
      setTimeout(() => {
        this.isCopyingLogs = false
      }, TIMEOUTS.COPY_FEEDBACK)
    }
  }
}