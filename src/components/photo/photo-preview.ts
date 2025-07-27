export interface PhotoPreviewData {
  showCaptureEffect: boolean
  isSendingMail: boolean
}

/**
 * 写真プレビューコンポーネント
 * 撮影した写真の表示と送信機能
 */
export function photoPreview(): PhotoPreviewData & Record<string, any> {
  return {
    showCaptureEffect: false,
    isSendingMail: false,
    
    init() {
      // 親コンポーネントの状態を監視
      this.$watch('$root.showCaptureEffect', (value: boolean) => {
        this.showCaptureEffect = value
      })
      
      this.$watch('$root.isSendingMail', (value: boolean) => {
        this.isSendingMail = value
      })
    },
    
    retake() {
      this.$root.retake()
    },
    
    returnToHome() {
      this.$root.returnToHome()
    },
    
    async sendMail() {
      await this.$root.sendMail()
    }
  }
}

/**
 * 写真プレビューのテンプレート
 */
export const photoPreviewTemplate = `
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <div class="relative max-w-md mx-auto">
      <img :src="$root.photo" alt="撮影したレシート" class="w-full h-auto max-h-96 object-contain bg-gray-50">
      <!-- キャプチャエフェクト -->
      <div
        x-show="showCaptureEffect"
        x-transition:enter="transition-opacity duration-200"
        x-transition:leave="transition-opacity duration-100"
        class="absolute inset-0 bg-white pointer-events-none camera-flash"
      ></div>
    </div>
    <div class="p-4 space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <button
          @click="retake"
          class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded text-base"
        >
          撮り直す
        </button>
        <button
          @click="returnToHome"
          class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded text-base"
        >
          ホームに戻る
        </button>
      </div>
      <!-- 送信ボタン -->
      <button
        @click="sendMail"
        :disabled="isSendingMail"
        class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
      >
        <svg x-show="isSendingMail" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg x-show="!isSendingMail" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <span x-text="isSendingMail ? '送信中...' : '送信する'"></span>
      </button>
    </div>
  </div>
`