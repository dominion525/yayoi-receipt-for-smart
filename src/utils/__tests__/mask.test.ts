import { describe, it, expect } from 'vitest'
import { maskApiKey } from '../mask'

describe('maskApiKey', () => {
  it('Resend API キー (re_...) を末尾4文字を除いてマスクする', () => {
    expect(maskApiKey('re_abc123def456ghi789jk')).toBe('re_••••89jk')
  })

  it('文字列中に混じったキーもマスクする', () => {
    expect(maskApiKey('API key re_secret12345abcd was rejected')).toBe(
      'API key re_••••abcd was rejected'
    )
  })

  it('複数箇所に出現しても全てマスクする', () => {
    expect(maskApiKey('re_first1234xxxx and re_second5678yyyy')).toBe(
      're_••••xxxx and re_••••yyyy'
    )
  })

  it('APIキーを含まない文字列はそのまま返す', () => {
    expect(maskApiKey('Resend API error: validation failed')).toBe(
      'Resend API error: validation failed'
    )
  })

  it('re_ だけの短い文字列（キーに見えないもの）はマスクしない', () => {
    expect(maskApiKey('re_a')).toBe('re_a')
  })

  it('非文字列は文字列化してから処理する', () => {
    expect(maskApiKey(null)).toBe('null')
    expect(maskApiKey(undefined)).toBe('undefined')
    expect(maskApiKey(12345)).toBe('12345')
  })

  it('空文字列は空文字列を返す', () => {
    expect(maskApiKey('')).toBe('')
  })
})
