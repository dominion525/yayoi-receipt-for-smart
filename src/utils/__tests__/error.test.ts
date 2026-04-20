import { describe, it, expect } from 'vitest'
import { isError, getErrorMessage } from '../error'

describe('error utils', () => {
  describe('isError()', () => {
    it('Error オブジェクトに対してtrueを返す', () => {
      const error = new Error('test error')
      expect(isError(error)).toBe(true)
    })

    it('Error のサブクラスに対してtrueを返す', () => {
      const typeError = new TypeError('type error')
      const rangeError = new RangeError('range error')

      expect(isError(typeError)).toBe(true)
      expect(isError(rangeError)).toBe(true)
    })

    it('文字列に対してfalseを返す', () => {
      expect(isError('error string')).toBe(false)
    })

    it('nullに対してfalseを返す', () => {
      expect(isError(null)).toBe(false)
    })

    it('undefinedに対してfalseを返す', () => {
      expect(isError(undefined)).toBe(false)
    })

    it('数値に対してfalseを返す', () => {
      expect(isError(123)).toBe(false)
    })

    it('オブジェクトに対してfalseを返す', () => {
      expect(isError({})).toBe(false)
      expect(isError({ message: 'not an error' })).toBe(false)
    })
  })

  describe('getErrorMessage()', () => {
    describe('Error オブジェクトの場合', () => {
      it('Error オブジェクトのメッセージを返す', () => {
        const error = new Error('test error message')
        expect(getErrorMessage(error)).toBe('test error message')
      })

      it('Error オブジェクトのメッセージが空の場合はデフォルトメッセージを返す', () => {
        const error = new Error('')
        expect(getErrorMessage(error)).toBe('予期しないエラーが発生しました')
      })

      it('Error オブジェクトのメッセージがundefinedの場合はデフォルトメッセージを返す', () => {
        const error = new Error()
        error.message = undefined as any
        expect(getErrorMessage(error)).toBe('予期しないエラーが発生しました')
      })

      it('TypeError のメッセージを正しく返す', () => {
        const error = new TypeError('type error occurred')
        expect(getErrorMessage(error)).toBe('type error occurred')
      })
    })

    describe('文字列の場合', () => {
      it('文字列をそのまま返す', () => {
        expect(getErrorMessage('string error')).toBe('string error')
      })

      it('空文字列の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage('')).toBe('予期しないエラーが発生しました')
      })

      it('空白のみの文字列の場合はそのまま返す', () => {
        expect(getErrorMessage('   ')).toBe('   ')
      })
    })

    describe('messageプロパティを持つオブジェクトの場合', () => {
      it('オブジェクトのmessageプロパティを返す', () => {
        const errorLike = { message: 'object error message' }
        expect(getErrorMessage(errorLike)).toBe('object error message')
      })

      it('messageが空文字列の場合はデフォルトメッセージを返す', () => {
        const errorLike = { message: '' }
        expect(getErrorMessage(errorLike)).toBe('予期しないエラーが発生しました')
      })

      it('messageがnullの場合はデフォルトメッセージを返す', () => {
        const errorLike = { message: null }
        expect(getErrorMessage(errorLike)).toBe('予期しないエラーが発生しました')
      })

      it('messageがundefinedの場合はデフォルトメッセージを返す', () => {
        const errorLike = { message: undefined }
        expect(getErrorMessage(errorLike)).toBe('予期しないエラーが発生しました')
      })

      it('messageが文字列でない場合はデフォルトメッセージを返す', () => {
        const errorLike = { message: 123 }
        expect(getErrorMessage(errorLike)).toBe('予期しないエラーが発生しました')
      })

      it('複雑なオブジェクトのmessageプロパティを返す', () => {
        const errorLike = {
          name: 'CustomError',
          message: 'custom error occurred',
          code: 500
        }
        expect(getErrorMessage(errorLike)).toBe('custom error occurred')
      })
    })

    describe('その他の値の場合', () => {
      it('nullの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(null)).toBe('予期しないエラーが発生しました')
      })

      it('undefinedの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(undefined)).toBe('予期しないエラーが発生しました')
      })

      it('数値の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(123)).toBe('予期しないエラーが発生しました')
      })

      it('booleanの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(true)).toBe('予期しないエラーが発生しました')
        expect(getErrorMessage(false)).toBe('予期しないエラーが発生しました')
      })

      it('配列の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage([])).toBe('予期しないエラーが発生しました')
        expect(getErrorMessage(['error'])).toBe('予期しないエラーが発生しました')
      })

      it('関数の場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(() => {})).toBe('予期しないエラーが発生しました')
      })

      it('messageプロパティを持たないオブジェクトの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage({})).toBe('予期しないエラーが発生しました')
        expect(getErrorMessage({ name: 'test' })).toBe('予期しないエラーが発生しました')
      })

      it('Symbolの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage(Symbol('error'))).toBe('予期しないエラーが発生しました')
      })
    })

    describe('エッジケース', () => {
      it('Errorライクオブジェクトでmessageがgetter関数の場合', () => {
        const errorLike = {
          get message() {
            return 'dynamic message'
          }
        }
        expect(getErrorMessage(errorLike)).toBe('dynamic message')
      })

      it('循環参照を持つオブジェクトの場合', () => {
        const errorLike: any = { message: 'circular error' }
        errorLike.self = errorLike
        expect(getErrorMessage(errorLike)).toBe('circular error')
      })

      it('プロトタイプチェーンのmessageプロパティの場合', () => {
        const proto = { message: 'prototype message' }
        const errorLike = Object.create(proto)
        expect(getErrorMessage(errorLike)).toBe('prototype message')
      })

      it('frozen オブジェクトの場合', () => {
        const errorLike = Object.freeze({ message: 'frozen error' })
        expect(getErrorMessage(errorLike)).toBe('frozen error')
      })
    })
  })
})
