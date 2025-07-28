import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StorageService } from '../storage.service'

// localStorageをモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// グローバルlocalStorageをモック
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// navigator.storageをモック
const navigatorStorageMock = {
  estimate: vi.fn()
}

Object.defineProperty(global, 'navigator', {
  value: {
    storage: navigatorStorageMock
  },
  writable: true
})

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('set()', () => {
    it('正常に値を保存できる', () => {
      const testData = { name: 'test', value: 123 }
      
      const result = StorageService.set('test-key', testData)
      
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      )
    })

    it('文字列データを保存できる', () => {
      const testString = 'test string'
      
      const result = StorageService.set('string-key', testString)
      
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'string-key',
        JSON.stringify(testString)
      )
    })

    it('数値データを保存できる', () => {
      const testNumber = 42
      
      const result = StorageService.set('number-key', testNumber)
      
      expect(result).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'number-key',
        JSON.stringify(testNumber)
      )
    })

    it('JSON.stringify失敗時はfalseを返す', () => {
      // 循環参照を作成してJSON.stringifyを失敗させる
      const circularData: any = { name: 'test' }
      circularData.self = circularData
      
      const result = StorageService.set('circular-key', circularData)
      
      expect(result).toBe(false)
    })

    it('localStorage.setItem失敗時はfalseを返す', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const result = StorageService.set('error-key', 'test')
      
      expect(result).toBe(false)
    })
  })

  describe('get()', () => {
    it('存在するキーの値を正常に取得できる', () => {
      const testData = { name: 'test', value: 123 }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testData))
      
      const result = StorageService.get('test-key', null)
      
      expect(result).toEqual(testData)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
    })

    it('存在しないキーの場合はデフォルト値を返す', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      const defaultValue = { default: true }
      
      const result = StorageService.get('missing-key', defaultValue)
      
      expect(result).toEqual(defaultValue)
    })

    it('文字列のデフォルト値を正常に処理する', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      const result = StorageService.get('missing-key', 'default string')
      
      expect(result).toBe('default string')
    })

    it('数値のデフォルト値を正常に処理する', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      const result = StorageService.get('missing-key', 42)
      
      expect(result).toBe(42)
    })

    it('JSON.parse失敗時はデフォルト値を返す', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json')
      const defaultValue = { error: 'fallback' }
      
      const result = StorageService.get('broken-key', defaultValue)
      
      expect(result).toEqual(defaultValue)
    })

    it('localStorage.getItem失敗時はデフォルト値を返す', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })
      const defaultValue = { error: 'access denied' }
      
      const result = StorageService.get('error-key', defaultValue)
      
      expect(result).toEqual(defaultValue)
    })
  })

  describe('remove()', () => {
    it('正常にキーを削除できる', () => {
      const result = StorageService.remove('test-key')
      
      expect(result).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('localStorage.removeItem失敗時はfalseを返す', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })
      
      const result = StorageService.remove('error-key')
      
      expect(result).toBe(false)
    })
  })

  describe('has()', () => {
    it('存在するキーに対してtrueを返す', () => {
      localStorageMock.getItem.mockReturnValueOnce('some value')
      
      const result = StorageService.has('existing-key')
      
      expect(result).toBe(true)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('existing-key')
    })

    it('存在しないキーに対してfalseを返す', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      
      const result = StorageService.has('missing-key')
      
      expect(result).toBe(false)
    })

    it('localStorage.getItem失敗時はfalseを返す', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })
      
      const result = StorageService.has('error-key')
      
      expect(result).toBe(false)
    })
  })

  describe('clear()', () => {
    it('正常にlocalStorageをクリアできる', () => {
      const result = StorageService.clear()
      
      expect(result).toBe(true)
      expect(localStorageMock.clear).toHaveBeenCalled()
    })

    it('localStorage.clear失敗時はfalseを返す', () => {
      localStorageMock.clear.mockImplementationOnce(() => {
        throw new Error('Storage access denied')
      })
      
      const result = StorageService.clear()
      
      expect(result).toBe(false)
    })
  })

  describe('getAvailableSpace()', () => {
    it('navigator.storage.estimateが利用可能な場合は容量を返す', async () => {
      navigatorStorageMock.estimate.mockResolvedValueOnce({
        quota: 1000000,
        usage: 250000
      })
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(750000)
      expect(navigatorStorageMock.estimate).toHaveBeenCalled()
    })

    it('quotaが未定義の場合は使用量のマイナス値を返す', async () => {
      navigatorStorageMock.estimate.mockResolvedValueOnce({
        usage: 100000
      })
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(-100000)
    })

    it('usageが未定義の場合はquota値を返す', async () => {
      navigatorStorageMock.estimate.mockResolvedValueOnce({
        quota: 2000000
      })
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(2000000)
    })

    it('両方とも未定義の場合は0を返す', async () => {
      navigatorStorageMock.estimate.mockResolvedValueOnce({})
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(0)
    })

    it('navigator.storage.estimate失敗時は-1を返す', async () => {
      navigatorStorageMock.estimate.mockRejectedValueOnce(new Error('API not available'))
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(-1)
    })

    it('navigator.storageが利用不可の場合は-1を返す', async () => {
      // navigatorから一時的にstorageを削除
      const originalNavigator = global.navigator
      delete (global as any).navigator.storage
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(-1)
      
      // 元に戻す
      global.navigator = originalNavigator
    })

    it('navigator自体が存在しない場合は-1を返す', async () => {
      // navigatorを一時的に無効にする
      const originalNavigator = global.navigator
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true
      })
      
      const result = await StorageService.getAvailableSpace()
      
      expect(result).toBe(-1)
      
      // 元に戻す
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      })
    })
  })

  describe('複合操作テスト', () => {
    it('set → get → remove の一連の操作が正常に動作する', () => {
      const testData = { test: 'integration' }
      
      // 保存
      localStorageMock.setItem.mockImplementationOnce(() => {})
      const setResult = StorageService.set('integration-key', testData)
      expect(setResult).toBe(true)
      
      // 取得
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testData))
      const getData = StorageService.get('integration-key', null)
      expect(getData).toEqual(testData)
      
      // 削除前の存在確認
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testData))
      const hasResult = StorageService.has('integration-key')
      expect(hasResult).toBe(true)
      
      // 削除
      localStorageMock.removeItem.mockImplementationOnce(() => {})
      const removeResult = StorageService.remove('integration-key')
      expect(removeResult).toBe(true)
      
      // 削除後の存在確認
      localStorageMock.getItem.mockReturnValueOnce(null)
      const hasAfterRemove = StorageService.has('integration-key')
      expect(hasAfterRemove).toBe(false)
    })
  })
})