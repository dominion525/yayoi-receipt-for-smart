/**
 * Resend API キーの形式を検証する。
 * `re_` プレフィックスに続けて英数字またはアンダースコアが 4 文字以上続くものを正規とみなす。
 * `src/utils/mask.ts` の `maskApiKey` が認識する形式と整合させている。
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return /^re_[A-Za-z0-9_]{4,}$/.test(apiKey)
}
