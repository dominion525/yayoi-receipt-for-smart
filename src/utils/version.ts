/**
 * アプリケーションバージョン情報管理
 */

// package.jsonのバージョン情報
// ビルド時にViteが自動的に置換される
import packageInfo from '../../package.json'

export interface BuildInfo {
  version: string
  buildTime: string
  gitCommit?: string
  environment: 'development' | 'production'
}

/**
 * ビルド情報を取得
 */
export function getBuildInfo(): BuildInfo {
  // ビルド時に取得された情報（定数として埋め込まれる）
  const buildTime =
    (globalThis as { __BUILD_TIME__?: string }).__BUILD_TIME__ || new Date().toISOString()
  const gitCommit =
    (globalThis as { __BUILD_REVISION__?: string }).__BUILD_REVISION__ ||
    import.meta.env.VITE_GIT_COMMIT

  return {
    version: packageInfo.version,
    buildTime: buildTime,
    gitCommit: gitCommit && gitCommit !== 'unknown' ? gitCommit : undefined,
    environment: import.meta.env.PROD ? 'production' : 'development'
  }
}

/**
 * 短縮バージョン文字列を取得 (フッター用)
 */
export function getShortVersion(): string {
  return `v${packageInfo.version}`
}
