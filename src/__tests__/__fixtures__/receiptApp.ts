import { vi } from 'vitest'
import { receiptApp } from '../../app'
import { CompleteAppData } from '../../types/app'

/**
 * receiptApp を統合テストするときの既定の設定オブジェクト。
 * 各テストで一部上書きしたい場合は spread して使う。
 */
export const mockSettings = {
  email: 'test@example.com',
  apiKey: 'test-api-key',
  dropboxEmail: 'dropbox@getdropbox.com',
  fromEmail: 'from@example.com',
  sendPresets: [
    {
      id: 'main',
      name: 'メインアドレス',
      recipients: ['test@example.com'],
      isActive: true
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      recipients: ['dropbox@getdropbox.com'],
      isActive: true
    }
  ]
}

/**
 * デバッグパネルのスクロール対象 (`#debug-panel .bg-black`) が DOM に存在しないと
 * useDebugPanel の addDebugLog が DOM を触る部分でテストが失敗するため、
 * 最低限の DOM 構造を用意する。
 */
export function setupAppDom(): void {
  document.body.innerHTML = `
      <div id="debug-panel">
        <div class="bg-black"></div>
      </div>
    `
}

/**
 * `receiptApp()` で新規インスタンスを生成し、Alpine の `$nextTick` を
 * テスト用に同期実行モックへ差し替えて返す。
 */
export function makeApp(): CompleteAppData {
  const app = receiptApp()
  app.$nextTick = vi.fn((callback: () => void) => {
    callback()
  })
  return app
}
