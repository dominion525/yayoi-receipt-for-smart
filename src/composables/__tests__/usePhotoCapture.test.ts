import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePhotoCapture } from '../usePhotoCapture'
import { CompleteAppData } from '../../types/app'

describe('usePhotoCapture', () => {
  beforeEach(() => {
    // DOMをクリーンアップ
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handleCameraClick', () => {
    it('カメラ入力要素をクリックしてプレースホルダーを設定する（20-36行目カバー）', () => {
      // カメラinput要素を作成
      const mockInput = document.createElement('input')
      mockInput.id = 'camera-input'
      mockInput.type = 'file'
      mockInput.accept = 'image/*'
      mockInput.capture = 'environment'
      document.body.appendChild(mockInput)

      const clickSpy = vi.spyOn(mockInput, 'click')

      const mockApp: Partial<CompleteAppData> = {
        photo: null,
        addDebugLog: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)

      // Alpine.jsのようにプロパティをマージ
      const merged = Object.assign(mockApp, composable)

      merged.handleCameraClick()

      // カメラinputがクリックされた
      expect(clickSpy).toHaveBeenCalled()

      // プレースホルダー画像が設定された
      expect(merged.photo).toBe('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')

      // カメラがアクティブ状態になった
      expect(merged.isCameraActive).toBe(true)

      // デバッグログが呼ばれた
      expect(mockApp.addDebugLog).toHaveBeenCalledWith('カメラ起動中...', 'info')
    })

    it('カメラ入力要素が存在しない場合は何もしない', () => {
      const mockApp: Partial<CompleteAppData> = {
        photo: null,
        addDebugLog: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)

      merged.handleCameraClick()

      // プレースホルダーは設定されない
      expect(merged.photo).toBeNull()

      // カメラはアクティブにならない
      expect(merged.isCameraActive).toBe(false)

      // デバッグログは呼ばれる
      expect(mockApp.addDebugLog).toHaveBeenCalledWith('カメラ起動中...', 'info')
    })

    it('addDebugLogが存在しない場合でもエラーにならない', () => {
      const mockInput = document.createElement('input')
      mockInput.id = 'camera-input'
      mockInput.type = 'file'
      document.body.appendChild(mockInput)

      const mockApp: Partial<CompleteAppData> = {
        photo: null,
        addDebugLog: undefined
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)

      expect(() => {
        merged.handleCameraClick()
      }).not.toThrow()

      expect(merged.isCameraActive).toBe(true)
    })
  })

  describe('handleNativeCamera', () => {
    it('画像ファイルが選択された場合、base64に変換してphotoに設定する', async () => {
      const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' })
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'test.jpg'
        }
      } as unknown as Event

      const mockApp: Partial<CompleteAppData> = {
        photo: null,
        addDebugLog: vi.fn(),
        showError: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)
      merged.isCameraActive = true

      // FileReaderをモック
      const mockReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: vi.fn(function(this: any) {
          // readAsDataURLが呼ばれたら即座にonloadを発火
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: 'data:image/jpeg;base64,test-data' } })
            }
          }, 0)
        })
      }

      global.FileReader = vi.fn(() => mockReader) as any

      merged.handleNativeCamera(mockEvent)

      // FileReaderの非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(merged.photo).toBe('data:image/jpeg;base64,test-data')
      expect(merged.isCameraActive).toBe(false)
      expect(mockApp.addDebugLog).toHaveBeenCalledWith('標準カメラで撮影完了', 'success')
    })

    it('ファイルが選択されなかった場合（キャンセル）、状態をリセットする', () => {
      const mockEvent = {
        target: {
          files: [],
          value: ''
        }
      } as unknown as Event

      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/gif;base64,placeholder',
        addDebugLog: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)
      merged.isCameraActive = true

      merged.handleNativeCamera(mockEvent)

      expect(merged.photo).toBeNull()
      expect(merged.isCameraActive).toBe(false)
    })

    it('画像読み込みエラー時、状態をリセットしてエラーを表示する', async () => {
      const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' })
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'test.jpg'
        }
      } as unknown as Event

      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/gif;base64,placeholder',
        addDebugLog: vi.fn(),
        showError: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)
      merged.isCameraActive = true

      // FileReaderをモック（エラーを発生させる）
      const mockReader = {
        onload: null as any,
        onerror: null as any,
        readAsDataURL: vi.fn(function(this: any) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror()
            }
          }, 0)
        })
      }

      global.FileReader = vi.fn(() => mockReader) as any

      merged.handleNativeCamera(mockEvent)

      // FileReaderの非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(merged.photo).toBeNull()
      expect(merged.isCameraActive).toBe(false)
      expect(mockApp.showError).toHaveBeenCalledWith('画像の読み込みに失敗しました')
      expect(mockApp.addDebugLog).toHaveBeenCalledWith('画像読み込みエラー', 'error')
    })
  })

  describe('retake', () => {
    it('写真とカメラアクティブ状態をリセットする', () => {
      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/jpeg;base64,test',
        error: 'エラーメッセージ'
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)
      merged.isCameraActive = true

      merged.retake()

      expect(merged.photo).toBeNull()
      expect(merged.isCameraActive).toBe(false)
      expect(mockApp.error).toBeNull()
    })

    it('エラーが無い状態でも正常に動作する', () => {
      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/jpeg;base64,test',
        error: null
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)

      expect(() => {
        merged.retake()
      }).not.toThrow()

      expect(merged.photo).toBeNull()
    })
  })

  describe('returnToHome', () => {
    it('全ての状態をリセットしてメッセージをクリアする', () => {
      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/jpeg;base64,test',
        clearMessages: vi.fn()
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)
      merged.isCameraActive = true

      merged.returnToHome()

      expect(merged.photo).toBeNull()
      expect(merged.isCameraActive).toBe(false)
      expect(mockApp.clearMessages).toHaveBeenCalled()
    })

    it('clearMessagesが存在しない場合でもエラーにならない', () => {
      const mockApp: Partial<CompleteAppData> = {
        photo: 'data:image/jpeg;base64,test',
        clearMessages: undefined
      }

      const composable = usePhotoCapture.call(mockApp as CompleteAppData)
      const merged = Object.assign(mockApp, composable)

      expect(() => {
        merged.returnToHome()
      }).not.toThrow()

      expect(merged.photo).toBeNull()
    })
  })
})
