import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CompleteAppData } from '../types/app'
import { SettingsService } from '../services/settings.service'
import { DebugService } from '../services/debug.service'
import { mockSettings, setupAppDom, makeApp } from './__fixtures__/receiptApp'

// vi.mock は hoist の都合で各 split ファイルで個別に宣言する必要がある
vi.mock('../lib/mail', () => ({
  emailSender: {
    setApiKey: vi.fn(),
    setFromEmail: vi.fn()
  }
}))

vi.mock('../services/settings.service', () => ({
  SettingsService: {
    load: vi.fn(),
    save: vi.fn(),
    isComplete: vi.fn(),
    syncPresetsWithEmails: vi.fn(),
    updateAllPreset: vi.fn(),
    updatePresetsFromTempSettings: vi.fn()
  }
}))

vi.mock('../services/debug.service', () => ({
  DebugService: {
    add: vi.fn(),
    clear: vi.fn(),
    copyToClipboard: vi.fn()
  }
}))

vi.mock('../services/email.service', () => ({
  EmailService: {
    sendMail: vi.fn()
  }
}))

describe('receiptApp - debug', () => {
  let app: CompleteAppData

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(SettingsService.load).mockReturnValue(mockSettings)
    vi.mocked(SettingsService.isComplete).mockReturnValue(true)
    vi.mocked(SettingsService.save).mockReturnValue(true)

    setupAppDom()
    app = makeApp()
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('toggleDebug()メソッド', () => {
    it('デバッグ表示をトグルする', () => {
      expect(app.showDebug).toBe(false)

      app.toggleDebug()
      expect(app.showDebug).toBe(true)

      app.toggleDebug()
      expect(app.showDebug).toBe(false)
    })
  })

  describe('addDebugLog()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T23:30:45.123+09:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('デバッグログが正しく追加される', () => {
      // JST時刻でシステム時刻を固定（UTC時刻でJST 23:30:45.123相当）
      vi.setSystemTime(new Date('2024-12-25T23:30:45.123+09:00'))

      const message = 'テストメッセージ'
      const type = 'info'

      app.addDebugLog(message, type)

      expect(app.debugLogs).toHaveLength(1)
      expect(app.debugLogs[0]).toEqual({
        time: '23:30:45.123',
        type: 'info',
        message: 'テストメッセージ'
      })
    })

    it('デフォルトのタイプはinfoになる', () => {
      app.addDebugLog('テストメッセージ')

      expect(app.debugLogs[0]?.type).toBe('info')
    })

    it('各タイプのログが正しく記録される', () => {
      const types: Array<'info' | 'success' | 'warning' | 'error' | 'debug'> = [
        'info',
        'success',
        'warning',
        'error',
        'debug'
      ]

      types.forEach((type, index) => {
        app.addDebugLog(`メッセージ${index}`, type)
      })

      expect(app.debugLogs).toHaveLength(5)
      types.forEach((type, index) => {
        expect(app.debugLogs[index]?.type).toBe(type)
        expect(app.debugLogs[index]?.message).toBe(`メッセージ${index}`)
      })
    })

    it('DebugServiceにも記録される', () => {
      app.addDebugLog('テストメッセージ', 'success')

      expect(DebugService.add).toHaveBeenCalledWith('テストメッセージ', 'success')
    })

    it('100件を超えるログは古いものから削除される', () => {
      // 100件のログを追加
      for (let i = 0; i < 100; i++) {
        app.addDebugLog(`ログ${i}`)
      }

      expect(app.debugLogs).toHaveLength(100)
      expect(app.debugLogs[0]?.message).toBe('ログ0')
      expect(app.debugLogs[99]?.message).toBe('ログ99')

      // 101件目を追加
      app.addDebugLog('ログ100')

      expect(app.debugLogs).toHaveLength(100)
      expect(app.debugLogs[0]?.message).toBe('ログ1') // 最初のログが削除される
      expect(app.debugLogs[99]?.message).toBe('ログ100')
    })

    it('時刻が正しくフォーマットされる', () => {
      // 異なる時刻でテスト（UTC時刻でJST 18:05:03.045相当）
      vi.setSystemTime(new Date('2024-12-25T18:05:03.045+09:00'))
      app.addDebugLog('時刻テスト')

      expect(app.debugLogs[0]?.time).toBe('18:05:03.045')
    })

    it('DOM要素が存在しない場合もエラーにならない', () => {
      // debug-panel要素を削除
      document.getElementById('debug-panel')?.remove()

      expect(() => {
        app.addDebugLog('DOM要素なしテスト')
      }).not.toThrow()
    })

    it('bg-black要素が存在しない場合もエラーにならない', () => {
      // bg-black要素を削除
      document.querySelector('#debug-panel .bg-black')?.remove()

      expect(() => {
        app.addDebugLog('bg-black要素なしテスト')
      }).not.toThrow()
    })
  })

  describe('clearDebugLogs()メソッド', () => {
    it('ログをクリアする', () => {
      // 複数のログを追加
      app.addDebugLog('ログ1')
      app.addDebugLog('ログ2')
      app.addDebugLog('ログ3')

      expect(app.debugLogs).toHaveLength(3)

      app.clearDebugLogs()

      expect(app.debugLogs).toHaveLength(0)
    })

    it('DebugServiceもクリアされる', () => {
      app.clearDebugLogs()

      expect(DebugService.clear).toHaveBeenCalledOnce()
    })
  })

  describe('copyDebugLogs()メソッド', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('ログをクリップボードにコピーする', async () => {
      vi.mocked(DebugService.copyToClipboard).mockResolvedValue(true)

      expect(app.isCopyingLogs).toBe(false)

      const copyPromise = app.copyDebugLogs()

      expect(app.isCopyingLogs).toBe(true)
      expect(DebugService.copyToClipboard).toHaveBeenCalledOnce()

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(DebugService.copyToClipboard).toHaveBeenCalled()
      })

      // 2秒経過
      vi.advanceTimersByTime(2000)
      await copyPromise

      expect(app.isCopyingLogs).toBe(false)
    })
  })
})
