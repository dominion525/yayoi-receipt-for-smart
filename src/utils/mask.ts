/**
 * 文字列中の Resend API キー (`re_...`) を検出してマスクする。
 * 末尾 4 文字だけ残し、それ以外を `•` に置換する（例: `re_abc123def456` → `re_••••f456`）。
 *
 * - null / undefined 等の非文字列値はそのまま文字列化してから処理
 * - 複数箇所に出現しても全てマスク
 */
export function maskApiKey(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value)
  return text.replace(/re_[A-Za-z0-9_]{4,}/g, (match) => {
    const last4 = match.slice(-4)
    return `re_••••${last4}`
  })
}
