import { AppSettings, SendProgress } from './env'
import { DebugPanelData } from '../composables/useDebugPanel'
import { SettingsComposable } from '../composables/useSettings'
import { PWADetectionComposable } from '../composables/usePWADetection'
import { PhotoCaptureComposable } from '../composables/usePhotoCapture'
import { MessageComposable } from '../composables/useMessage'
import { InitializerComposable } from '../composables/useInitializer'
import { BuildInfo } from '../utils/version'

/**
 * 全てのComposableを統合したAlpine.jsアプリケーション型
 */
export type CompleteAppData = DebugPanelData & 
                              SettingsComposable & 
                              PWADetectionComposable & 
                              PhotoCaptureComposable & 
                              MessageComposable & 
                              InitializerComposable & {
  // アプリケーション固有の状態
  isLoading: boolean
  isSendingMail: boolean
  sendProgress: SendProgress | null
  completionMessage: string | null
  
  // バージョン情報
  appVersion: string
  versionInfo: BuildInfo
  
  // Alpine.js固有のメソッド
  $nextTick?: (callback: () => void) => void
  
  // アプリケーション固有のメソッド
  sendMail(): Promise<void>
  sendMailToPreset(presetId: string): Promise<void>
  handleEmailProgress(progress: SendProgress): void
}