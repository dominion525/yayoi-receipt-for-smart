import { describe, it, expect } from 'vitest'
import { isValidApiKeyFormat } from '../validation'

describe('isValidApiKeyFormat', () => {
  it('正規の Resend API キー形式を受け入れる', () => {
    expect(isValidApiKeyFormat('re_abc123def456')).toBe(true)
    expect(isValidApiKeyFormat('re_AbCdEfGh1234')).toBe(true)
    expect(isValidApiKeyFormat('re_with_underscore_1234')).toBe(true)
  })

  it.each([
    ['空文字列', ''],
    ['re_ プレフィックスなし', 'abc123def456'],
    ['re_ のみ', 're_'],
    ['re_ の後が3文字以下', 're_abc'],
    ['英数字以外を含む', 're_abc-123-def'],
    ['全角文字を含む', 're_あいうえお123'],
    ['空白を含む', 're_abc 123 def'],
    ['前後に空白', '  re_abc123def456  '],
    ['異なるプレフィックス', 'sk_abc123def456']
  ])('%s は拒否する (%s)', (_label, value) => {
    expect(isValidApiKeyFormat(value)).toBe(false)
  })
})
