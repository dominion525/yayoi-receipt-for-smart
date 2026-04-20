import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DebugService, DebugLog } from '../debug.service'

// navigator.clipboardをモック
const clipboardMock = {
  writeText: vi.fn()
}

// documentをモック
const documentMock = {
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  },
  execCommand: vi.fn()
}

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: clipboardMock
  },
  writable: true
})

Object.defineProperty(global, 'document', {
  value: documentMock,
  writable: true
})

describe('DebugService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 各テスト前にログをクリア
    DebugService.clear()
    // 最大ログ数をデフォルトに戻す
    DebugService.setMaxLogs(100)
    // 時刻を固定するためのモック（JST 21:30:45.123相当のUTC時刻）
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T21:30:45.123+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('add()', () => {
    it('正常にログを追加できる', () => {
      DebugService.add('テストメッセージ', 'info')

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        message: 'テストメッセージ',
        type: 'info',
        time: expect.stringMatching(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
      })
    })

    it('デフォルトのタイプはinfoである', () => {
      DebugService.add('デフォルトメッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('info')
    })

    it('時刻フォーマットが正しい', () => {
      DebugService.add('時刻テスト')

      const logs = DebugService.getAll()
      expect(logs[0]?.time).toBe('21:30:45.123') // JST時刻
    })

    it('異なるログタイプを正常に処理する', () => {
      const types: DebugLog['type'][] = ['info', 'success', 'warning', 'error', 'debug']

      types.forEach((type) => {
        DebugService.add(`${type}メッセージ`, type)
      })

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(5)
      types.forEach((type, index) => {
        expect(logs[index]?.type).toBe(type)
        expect(logs[index]?.message).toBe(`${type}メッセージ`)
      })
    })

    it('最大ログ数を超えると古いログが削除される', () => {
      // 最大ログ数を3に設定
      DebugService.setMaxLogs(3)

      // 5つのログを追加
      for (let i = 1; i <= 5; i++) {
        DebugService.add(`ログ${i}`)
      }

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(3)
      expect(logs[0]?.message).toBe('ログ3')
      expect(logs[1]?.message).toBe('ログ4')
      expect(logs[2]?.message).toBe('ログ5')
    })
  })

  describe('getAll()', () => {
    it('空のログ配列を返す', () => {
      const logs = DebugService.getAll()
      expect(logs).toEqual([])
    })

    it('追加されたログをすべて返す', () => {
      DebugService.add('ログ1')
      DebugService.add('ログ2')

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[0]?.message).toBe('ログ1')
      expect(logs[1]?.message).toBe('ログ2')
    })

    it('配列のコピーを返す（元の配列を変更しても影響されない）', () => {
      DebugService.add('元のログ')

      const logs = DebugService.getAll()
      logs.push({
        time: '00:00:00.000',
        type: 'info',
        message: '追加されたログ'
      })

      const newLogs = DebugService.getAll()
      expect(newLogs).toHaveLength(1)
      expect(newLogs[0]?.message).toBe('元のログ')
    })
  })

  describe('clear()', () => {
    it('すべてのログをクリアする', () => {
      DebugService.add('ログ1')
      DebugService.add('ログ2')

      DebugService.clear()

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(0)
    })
  })

  describe('export()', () => {
    it('空のログの場合は空文字列を返す', () => {
      const exported = DebugService.export()
      expect(exported).toBe('')
    })

    it('ログをテキスト形式でエクスポートする', () => {
      DebugService.add('エラーメッセージ', 'error')
      DebugService.add('成功メッセージ', 'success')

      const exported = DebugService.export()
      const lines = exported.split('\n')

      expect(lines).toHaveLength(2)
      expect(lines[0]).toMatch(/^\[21:30:45\.123\] ERROR: エラーメッセージ$/)
      expect(lines[1]).toMatch(/^\[21:30:45\.123\] SUCCESS: 成功メッセージ$/)
    })

    it('タイプが大文字に変換される', () => {
      DebugService.add('デバッグ', 'debug')
      DebugService.add('警告', 'warning')

      const exported = DebugService.export()

      expect(exported).toContain('DEBUG: デバッグ')
      expect(exported).toContain('WARNING: 警告')
    })
  })

  describe('copyToClipboard()', () => {
    it('navigator.clipboardが利用可能な場合は正常にコピーする', async () => {
      DebugService.add('コピーテスト')
      clipboardMock.writeText.mockResolvedValueOnce(undefined)

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(true)
      expect(clipboardMock.writeText).toHaveBeenCalledWith('[21:30:45.123] INFO: コピーテスト')

      // 成功メッセージがログに追加されることを確認
      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[1]?.message).toBe('ログをクリップボードにコピーしました')
      expect(logs[1]?.type).toBe('success')
    })

    it('navigator.clipboardが失敗した場合はfalseを返す', async () => {
      DebugService.add('失敗テスト')
      clipboardMock.writeText.mockRejectedValueOnce(new Error('Clipboard access denied'))

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(false)

      // エラーメッセージがログに追加されることを確認
      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[1]?.message).toBe('ログのコピーに失敗しました')
      expect(logs[1]?.type).toBe('error')
    })

    it('navigator.clipboardが利用できない場合はフォールバックを使用する', async () => {
      DebugService.add('フォールバックテスト')

      // navigator.clipboardを無効にする
      const originalNavigator = global.navigator
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      })

      // textareaエレメントのモック
      const textareaMock = {
        value: '',
        style: {},
        select: vi.fn()
      }
      documentMock.createElement.mockReturnValueOnce(textareaMock)
      documentMock.execCommand.mockReturnValueOnce(true)

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(true)
      expect(documentMock.createElement).toHaveBeenCalledWith('textarea')
      expect(textareaMock.select).toHaveBeenCalled()
      expect(documentMock.execCommand).toHaveBeenCalledWith('copy')
      expect(documentMock.body.appendChild).toHaveBeenCalledWith(textareaMock)
      expect(documentMock.body.removeChild).toHaveBeenCalledWith(textareaMock)

      // 元に戻す
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      })
    })

    it('フォールバックのexecCommandが失敗した場合', async () => {
      DebugService.add('フォールバック失敗テスト')

      // navigator.clipboardを無効にする
      const originalNavigator = global.navigator
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      })

      const textareaMock = {
        value: '',
        style: {},
        select: vi.fn()
      }
      documentMock.createElement.mockReturnValueOnce(textareaMock)
      documentMock.execCommand.mockReturnValueOnce(false)

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(false)
      expect(documentMock.body.removeChild).toHaveBeenCalledWith(textareaMock)

      // エラーメッセージがログに追加されることを確認
      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[1]?.message).toBe('ログのコピーに失敗しました')
      expect(logs[1]?.type).toBe('error')

      // 元に戻す
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      })
    })

    it('フォールバックで例外が発生した場合', async () => {
      DebugService.add('フォールバック例外テスト')

      // navigator.clipboardを無効にする
      const originalNavigator = global.navigator
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      })

      const textareaMock = {
        value: '',
        style: {},
        select: vi.fn().mockImplementationOnce(() => {
          throw new Error('Select failed')
        })
      }
      documentMock.createElement.mockReturnValueOnce(textareaMock)

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(false)
      expect(documentMock.body.removeChild).toHaveBeenCalledWith(textareaMock)

      // 元に戻す
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      })
    })

    it('navigator.clipboardでawait時に例外が発生した場合（74-78行目catchブロック）', async () => {
      DebugService.add('clipboard例外テスト')

      // navigator.clipboardは存在するが、writeTextで例外を投げる
      clipboardMock.writeText.mockRejectedValueOnce(new Error('Clipboard permission denied'))

      const result = await DebugService.copyToClipboard()

      expect(result).toBe(false)

      // エラーメッセージがログに追加されることを確認
      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[1]?.message).toBe('ログのコピーに失敗しました')
      expect(logs[1]?.type).toBe('error')
    })
  })

  describe('リスナー機能', () => {
    it('リスナーを追加・削除できる', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      DebugService.addListener(listener1)
      DebugService.addListener(listener2)

      DebugService.add('リスナーテスト')

      expect(listener1).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'リスナーテスト'
        })
      ])
      expect(listener2).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'リスナーテスト'
        })
      ])

      // リスナーを削除
      DebugService.removeListener(listener1)

      DebugService.add('リスナーテスト2')

      expect(listener1).toHaveBeenCalledTimes(1) // 最初の呼び出しのみ
      expect(listener2).toHaveBeenCalledTimes(2) // 2回呼び出される
    })

    it('clearでもリスナーが呼ばれる', () => {
      const listener = vi.fn()
      DebugService.addListener(listener)

      DebugService.add('テスト')
      DebugService.clear()

      expect(listener).toHaveBeenCalledTimes(2)
      expect(listener).toHaveBeenLastCalledWith([])
    })

    it('存在しないリスナーを削除しても何も起こらない', () => {
      const listener = vi.fn()

      // 追加していないリスナーを削除
      DebugService.removeListener(listener)

      DebugService.add('テスト')
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('setMaxLogs()', () => {
    it('最大ログ数を設定できる', () => {
      DebugService.setMaxLogs(2)

      DebugService.add('ログ1')
      DebugService.add('ログ2')
      DebugService.add('ログ3')

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[0]?.message).toBe('ログ2')
      expect(logs[1]?.message).toBe('ログ3')
    })

    it('既存のログが最大数を超えている場合は削除される', () => {
      // 先に5つのログを追加
      for (let i = 1; i <= 5; i++) {
        DebugService.add(`既存ログ${i}`)
      }

      // 最大数を2に変更
      DebugService.setMaxLogs(2)

      const logs = DebugService.getAll()
      expect(logs).toHaveLength(2)
      expect(logs[0]?.message).toBe('既存ログ4')
      expect(logs[1]?.message).toBe('既存ログ5')
    })
  })

  describe('便利メソッド', () => {
    it('info()メソッドが正常に動作する', () => {
      DebugService.info('情報メッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('info')
      expect(logs[0]?.message).toBe('情報メッセージ')
    })

    it('success()メソッドが正常に動作する', () => {
      DebugService.success('成功メッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('success')
      expect(logs[0]?.message).toBe('成功メッセージ')
    })

    it('warning()メソッドが正常に動作する', () => {
      DebugService.warning('警告メッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('warning')
      expect(logs[0]?.message).toBe('警告メッセージ')
    })

    it('error()メソッドが正常に動作する', () => {
      DebugService.error('エラーメッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('error')
      expect(logs[0]?.message).toBe('エラーメッセージ')
    })

    it('debug()メソッドが正常に動作する', () => {
      DebugService.debug('デバッグメッセージ')

      const logs = DebugService.getAll()
      expect(logs[0]?.type).toBe('debug')
      expect(logs[0]?.message).toBe('デバッグメッセージ')
    })
  })

  describe('複合操作テスト', () => {
    it('複数のログタイプを追加してエクスポートできる', () => {
      DebugService.info('情報')
      DebugService.success('成功')
      DebugService.warning('警告')
      DebugService.error('エラー')
      DebugService.debug('デバッグ')

      const exported = DebugService.export()
      const lines = exported.split('\n')

      expect(lines).toHaveLength(5)
      expect(lines[0]).toContain('INFO: 情報')
      expect(lines[1]).toContain('SUCCESS: 成功')
      expect(lines[2]).toContain('WARNING: 警告')
      expect(lines[3]).toContain('ERROR: エラー')
      expect(lines[4]).toContain('DEBUG: デバッグ')
    })

    it('リスナーと最大ログ数制限が連携して動作する', () => {
      const listener = vi.fn()
      DebugService.addListener(listener)
      DebugService.setMaxLogs(2)

      DebugService.add('ログ1')
      DebugService.add('ログ2')
      DebugService.add('ログ3')

      // 最後のリスナー呼び出しでは、古いログが削除されて2つのログのみになっている
      expect(listener).toHaveBeenLastCalledWith([
        expect.objectContaining({ message: 'ログ2' }),
        expect.objectContaining({ message: 'ログ3' })
      ])
    })
  })
})
