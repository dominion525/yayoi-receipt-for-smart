import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebugPanel } from '../useDebugPanel'
import { DebugService } from '../../services/debug.service'
import { TIMEOUTS } from '../../constants/timeouts'

vi.mock('../../services/debug.service', () => ({
  DebugService: {
    add: vi.fn(),
    clear: vi.fn(),
    copyToClipboard: vi.fn()
  }
}))

describe('useDebugPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('toggleDebug', () => {
    it('showDebug を反転する', () => {
      const panel = useDebugPanel()
      expect(panel.showDebug).toBe(false)

      panel.toggleDebug.call(panel)
      expect(panel.showDebug).toBe(true)

      panel.toggleDebug.call(panel)
      expect(panel.showDebug).toBe(false)
    })
  })

  describe('addDebugLog', () => {
    it('ログを追加し DebugService にも記録する', () => {
      const panel = useDebugPanel()
      panel.addDebugLog.call(panel, 'テストメッセージ', 'info')

      expect(panel.debugLogs).toHaveLength(1)
      expect(panel.debugLogs[0]?.message).toBe('テストメッセージ')
      expect(panel.debugLogs[0]?.type).toBe('info')
      expect(DebugService.add).toHaveBeenCalledWith('テストメッセージ', 'info')
    })

    it('type 省略時は info になる', () => {
      const panel = useDebugPanel()
      panel.addDebugLog.call(panel, 'デフォルトタイプ')

      expect(panel.debugLogs[0]?.type).toBe('info')
    })

    it('100件を超えると古いログから削除される', () => {
      const panel = useDebugPanel()
      for (let i = 0; i < 105; i++) {
        panel.addDebugLog.call(panel, `log-${i}`)
      }

      expect(panel.debugLogs).toHaveLength(100)
      expect(panel.debugLogs[0]?.message).toBe('log-5')
      expect(panel.debugLogs[99]?.message).toBe('log-104')
    })

    it('$nextTick が提供されていれば呼ばれる', () => {
      const panel = useDebugPanel()
      const nextTick = vi.fn((cb: () => void) => cb())
      const mockThis = { ...panel, $nextTick: nextTick }

      panel.addDebugLog.call(mockThis, 'スクロールテスト')

      expect(nextTick).toHaveBeenCalled()
    })

    it('$nextTick が無くてもエラーにならない', () => {
      const panel = useDebugPanel()
      expect(() => panel.addDebugLog.call(panel, 'noTick')).not.toThrow()
    })
  })

  describe('clearDebugLogs', () => {
    it('ログ配列を空にし DebugService もクリアする', () => {
      const panel = useDebugPanel()
      panel.addDebugLog.call(panel, 'a')
      panel.addDebugLog.call(panel, 'b')
      expect(panel.debugLogs).toHaveLength(2)

      panel.clearDebugLogs.call(panel)

      expect(panel.debugLogs).toHaveLength(0)
      expect(DebugService.clear).toHaveBeenCalled()
    })
  })

  describe('copyDebugLogs', () => {
    it('コピー成功時に isCopyingLogs が true → false になる', async () => {
      const panel = useDebugPanel()
      vi.mocked(DebugService.copyToClipboard).mockResolvedValue(true)

      expect(panel.isCopyingLogs).toBe(false)

      const promise = panel.copyDebugLogs.call(panel)
      expect(panel.isCopyingLogs).toBe(true)
      await promise

      // setTimeout 分を進める
      vi.advanceTimersByTime(TIMEOUTS.COPY_FEEDBACK)
      expect(panel.isCopyingLogs).toBe(false)
    })

    it('DebugService.copyToClipboard が reject しても isCopyingLogs が false に戻る', async () => {
      const panel = useDebugPanel()
      vi.mocked(DebugService.copyToClipboard).mockRejectedValue(new Error('clipboard failed'))

      // reject を吸収（例外は上位に伝播してよいが、状態は必ず戻る）
      await expect(panel.copyDebugLogs.call(panel)).rejects.toThrow('clipboard failed')

      // setTimeout 分を進める（try/finally により reject でも setTimeout がスケジュールされる）
      vi.advanceTimersByTime(TIMEOUTS.COPY_FEEDBACK)
      expect(panel.isCopyingLogs).toBe(false)
    })
  })
})
