export const settingsModalTemplate = `
  <!-- 設定モーダル -->
  <div
    x-show="showSettings"
    x-transition:enter="transition ease-out duration-300"
    x-transition:enter-start="opacity-0"
    x-transition:enter-end="opacity-100"
    x-transition:leave="transition ease-in duration-200"
    x-transition:leave-start="opacity-100"
    x-transition:leave-end="opacity-0"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="closeSettings"
  >
    <div
      x-transition:enter="transition ease-out duration-300"
      x-transition:enter-start="opacity-0 scale-95"
      x-transition:enter-end="opacity-100 scale-100"
      x-transition:leave="transition ease-in duration-200"
      x-transition:leave-start="opacity-100 scale-100"
      x-transition:leave-end="opacity-0 scale-95"
      class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
    >
      <!-- ヘッダー -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-900">設定</h2>
        <button
          @click="closeSettings"
          class="p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="閉じる"
        >
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- フォーム -->
      <form @submit.prevent="saveSettings" class="space-y-4">
        <!-- 送信先メールアドレス -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            送信先メールアドレス
          </label>
          <input
            id="email"
            type="email"
            x-model="tempSettings.email"
            placeholder="example@example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
        </div>

        <!-- Dropboxメールアドレス -->
        <div>
          <label for="dropboxEmail" class="block text-sm font-medium text-gray-700 mb-1">
            Dropbox Email-to-Dropbox
          </label>
          <input
            id="dropboxEmail"
            type="email"
            x-model="tempSettings.dropboxEmail"
            placeholder="xxxx@getdropbox.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <p class="mt-1 text-xs text-gray-500">
            Dropboxの専用メールアドレス（オプション）
          </p>
        </div>

        <!-- バックアップメールアドレス -->
        <div>
          <label for="backupEmail" class="block text-sm font-medium text-gray-700 mb-1">
            バックアップ用メールアドレス
          </label>
          <input
            id="backupEmail"
            type="email"
            x-model="tempSettings.backupEmail"
            placeholder="backup@example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <p class="mt-1 text-xs text-gray-500">
            追加のバックアップ先（オプション）
          </p>
        </div>

        <!-- RESEND APIキー -->
        <div>
          <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">
            RESEND APIキー
          </label>
          <input
            id="apiKey"
            type="password"
            x-model="tempSettings.apiKey"
            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
          <p class="mt-1 text-xs text-gray-500">
            RESENDのAPIキーを入力してください
          </p>
        </div>

        <!-- テストメール送信ボタン -->
        <div class="pt-2">
          <button
            type="button"
            @click="sendTestEmail"
            :disabled="!tempSettings.email.trim() || !tempSettings.apiKey.trim() || isSendingTestEmail"
            class="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg x-show="isSendingTestEmail" class="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span x-text="isSendingTestEmail ? 'テスト送信中...' : 'テストメール送信'"></span>
          </button>
          <p class="mt-1 text-xs text-gray-500 text-center">
            設定した内容でテストメールを送信します
          </p>
        </div>

        <!-- プロキシサーバー情報 -->
        <div class="bg-green-50 border border-green-200 rounded-md p-3 text-xs text-green-800">
          <p class="font-semibold mb-1">✅ セキュアなメール送信</p>
          <p>メール送信はCloudflare Workers経由で安全に処理されます。</p>
          <p class="text-gray-600 mt-1">本番環境: <a href="https://receipt.dominion525.com" class="underline">receipt.dominion525.com</a></p>
        </div>

        <!-- アクションボタン -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="closeSettings"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  </div>
`