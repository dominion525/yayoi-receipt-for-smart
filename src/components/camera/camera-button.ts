import { SettingsService } from '../../services/settings.service'

export interface CameraButtonData {
  isEnabled: boolean
  isSettingsComplete: boolean
  fileInputRef: HTMLInputElement | null
}

/**
 * カメラボタンコンポーネント
 * カメラ起動ボタンの状態管理とイベントハンドリング
 */
export function cameraButton(): CameraButtonData & Record<string, any> {
  return {
    isEnabled: true,
    isSettingsComplete: false,
    fileInputRef: null,
    
    init() {
      // 親コンポーネントの設定状態を監視
      this.$watch('$root.settings', () => {
        this.checkSettings()
      })
      
      this.checkSettings()
    },
    
    checkSettings() {
      const rootSettings = this.$root.settings
      this.isSettingsComplete = SettingsService.isComplete(rootSettings)
    },
    
    openCamera() {
      if (!this.isSettingsComplete) {
        this.$root.addDebugLog('設定が完了していないため、カメラを起動できません', 'warning')
        return
      }
      
      // ファイル入力要素をクリック
      if (this.fileInputRef) {
        this.fileInputRef.click()
      } else {
        const fileInput = this.$refs.fileInput as HTMLInputElement
        if (fileInput) {
          fileInput.click()
        }
      }
    },
    
    // ファイル入力の参照を設定
    setFileInputRef(ref: HTMLInputElement) {
      this.fileInputRef = ref
    }
  }
}

/**
 * カメラボタンのテンプレート
 */
export const cameraButtonTemplate = `
  <div class="bg-white rounded-lg shadow-md p-6">
    <p class="text-center text-gray-600 mb-4">レシートを撮影してください</p>
    
    <!-- 設定未完了時のメッセージ -->
    <div x-show="!isSettingsComplete" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <p class="text-sm text-yellow-800 text-center">
        設定を完了してからカメラを起動してください
      </p>
    </div>
    
    <!-- 標準カメラで撮影ボタン（モバイル推奨） -->
    <input 
      x-ref="fileInput"
      type="file" 
      accept="image/*" 
      capture="environment"
      @change="$root.handleNativeCamera($event)"
      class="hidden"
    />
    
    <button
      @click="openCamera"
      :disabled="!isSettingsComplete"
      class="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed mb-2 flex items-center justify-center gap-2 text-lg"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <span>標準カメラで撮影</span>
      <span class="text-xs bg-blue-600 px-2 py-1 rounded">推奨</span>
    </button>
    
    <!-- 設定ボタン -->
    <button
      @click="$root.openSettings"
      class="w-full bg-gray-500 hover:bg-gray-700 text-white font-bold py-4 px-4 rounded text-lg"
    >
      <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      設定
    </button>
  </div>
`