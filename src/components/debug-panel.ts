export const debugPanelTemplate = `
  <!-- デバッグパネル -->
  <div
    x-show="showDebug"
    x-transition
    class="fixed inset-x-0 bottom-0 bg-gray-900 text-white p-4 max-h-96 overflow-y-auto z-40"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold">デバッグ情報</h3>
      <button
        @click="toggleDebug"
        class="p-1 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all"
        title="閉じる"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    
    <!-- 送信プリセット情報 -->
    <div class="mb-6">
      <h4 class="text-sm font-semibold mb-2 text-yellow-400">送信プリセット</h4>
      <div class="text-xs space-y-1">
        <template x-for="preset in settings.sendPresets" :key="preset.id">
          <div class="ml-2 flex items-center gap-2">
            <span x-text="preset.isActive ? '✅' : '❌'" class="text-sm"></span>
            <span x-text="preset.name" class="font-semibold"></span>
            <span class="text-gray-400">
              <span x-text="'(' + preset.recipients.length + '件: '"></span>
              <span x-text="preset.recipients.join(', ')"></span>
              <span>)</span>
            </span>
          </div>
        </template>
        <div x-show="settings.sendPresets.length === 0" class="text-gray-500 ml-2">
          プリセットがありません
        </div>
      </div>
    </div>
    
    <!-- デバッグログ -->
    <div class="mb-4">
      <h4 class="text-sm font-semibold mb-2">デバッグログ</h4>
      <div class="bg-black rounded p-2 max-h-48 overflow-y-auto font-mono text-xs">
        <template x-for="(log, index) in debugLogs" :key="index">
          <div class="py-0.5" :class="{
            'text-green-400': log.type === 'success',
            'text-red-400': log.type === 'error',
            'text-yellow-400': log.type === 'warning',
            'text-blue-400': log.type === 'info',
            'text-gray-400': log.type === 'debug'
          }">
            <span class="text-gray-500" x-text="log.time"></span>
            <span x-text="' ' + log.message"></span>
          </div>
        </template>
        <div x-show="debugLogs.length === 0" class="text-gray-500">ログはまだありません</div>
      </div>
      <div class="mt-2 flex gap-2">
        <button
          @click="copyDebugLogs"
          :disabled="isCopyingLogs"
          class="px-3 py-1 text-white text-xs rounded transition-all duration-300"
          :class="isCopyingLogs ? 'bg-green-600' : 'bg-blue-700 hover:bg-blue-600'"
        >
          <span x-show="!isCopyingLogs">ログをコピー</span>
          <span x-show="isCopyingLogs" class="flex items-center">
            ✅ コピー完了！
          </span>
        </button>
        <button
          @click="clearDebugLogs"
          class="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
        >
          ログをクリア
        </button>
      </div>
    </div>
  </div>
`