export interface AppLogoData {
  hasPhoto: boolean
}

/**
 * アプリケーションロゴコンポーネント
 */
export function appLogo(): AppLogoData & Record<string, any> {
  return {
    hasPhoto: false,
    
    init() {
      // 親コンポーネントの写真状態を監視
      this.$watch('$root.photo', (value: string | null) => {
        this.hasPhoto = !!value
      })
    }
  }
}

/**
 * アプリケーションロゴのテンプレート
 */
export const appLogoTemplate = `
  <div class="flex items-center justify-between" :class="hasPhoto ? 'mb-4' : 'mb-8'">
    <!-- メインロゴ -->
    <div class="flex-1 text-center">
      <div class="inline-flex items-center gap-2">
        <span class="text-5xl p-3 bg-gradient-to-r from-gray-800 to-gray-600 text-white rounded">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </span>
        <div class="text-left">
          <div>
            <span class="font-inter font-light text-3xl bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Smart</span>
            <span class="font-inter font-light text-3xl bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Receipt</span>
          </div>
          <div class="mt-1">
            <span class="text-xs bg-gradient-to-r from-gray-800 to-gray-600 text-white px-2 py-1 rounded">Scan & Send</span>
          </div>
        </div>
      </div>
    </div>
  </div>
`