import Alpine from 'alpinejs'
import { SettingsService, AppSettings } from './services/settings.service'

import { useDebugPanel } from './composables/useDebugPanel'
import { useSettings } from './composables/useSettings'
import { usePWADetection } from './composables/usePWADetection'
import { usePhotoCapture } from './composables/usePhotoCapture'
import { useMessage } from './composables/useMessage'
import { useInitializer } from './composables/useInitializer'
import { EmailService } from './services/email.service'
import { SendProgress } from './types/progress.types'
import { TIMEOUTS } from './constants/timeouts'
import { CompleteAppData } from './types/app'
import { getBuildInfo, getShortVersion } from './utils/version'

export interface ReceiptAppData {
  photo: string | null
  error: string | null
  successMessage: string | null
  isLoading: boolean
  showSettings: boolean
  settings: AppSettings
  tempSettings: AppSettings
  isSettingsComplete: boolean
  isSendingMail: boolean

  isPWAMode: boolean
  userAgent: string
  screenInfo: string
  serviceWorkerStatus: string
  buildRevision: string
  buildTime: string
  sendProgress: SendProgress | null
}

export function receiptApp(): CompleteAppData {
  // デバッグパネル機能を統合
  const debug = useDebugPanel()
  // 設定管理機能を統合
  const settingsComposable = useSettings()
  // PWA検出機能を統合
  const pwaDetection = usePWADetection()
  // 写真撮影機能を統合
  const photoCapture = usePhotoCapture()
  // メッセージ管理機能を統合
  const messageHandler = useMessage()
  // 初期化処理を統合
  const initializer = useInitializer()

  // バージョン情報を取得
  const buildInfo = getBuildInfo()
  const shortVersion = getShortVersion()

  return {
    // デバッグ機能を展開
    ...debug,
    // 設定機能を展開
    ...settingsComposable,
    // PWA検出機能を展開
    ...pwaDetection,
    // 写真撮影機能を展開
    ...photoCapture,
    // メッセージ管理機能を展開
    ...messageHandler,
    // 初期化処理を展開
    ...initializer,

    // アプリケーション状態
    isLoading: false,
    isSendingMail: false,
    sendProgress: null,
    completionMessage: null,

    // バージョン情報
    appVersion: shortVersion,
    versionInfo: buildInfo,

    async sendMail() {
      // 設定が完了しているか確認
      if (!SettingsService.isComplete(this.settings)) {
        this.showError('メール設定が完了していません。設定を行ってください。')
        this.openSettings()
        return
      }

      this.isSendingMail = true
      this.sendProgress = null

      try {
        const result = await EmailService.sendMail(
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          this.handleEmailMessage.bind(this),
          this.handleEmailProgress.bind(this)
        )

        if (result.shouldRetake) {
          // 完了メッセージを3秒間表示してから撮影画面に戻る
          this.completionMessage = '送信が完了しました'
          setTimeout(() => {
            this.completionMessage = null
            this.retake()
            // DOM更新後に成功メッセージを表示
            if (this.$nextTick) {
              this.$nextTick(() => {
                this.showSuccess('レシートを送信しました')
              })
            } else {
              // $nextTickが使えない場合は少し遅延させて表示
              setTimeout(() => {
                this.showSuccess('レシートを送信しました')
              }, 100)
            }
          }, 3000)
        }
      } finally {
        this.isSendingMail = false
      }
    },

    // 共通進捗処理ハンドラー
    handleEmailProgress(progress: SendProgress) {
      this.sendProgress = progress
      // 完了時は3秒後に進捗表示をクリア
      if (progress.status === 'completed' || progress.status === 'error') {
        setTimeout(() => {
          this.sendProgress = null
        }, TIMEOUTS.PROGRESS_CLEAR)
      }
    },

    // 複数宛先への送信
    async sendMailToPreset(presetId: string) {
      this.isSendingMail = true
      this.sendProgress = null

      try {
        const result = await EmailService.sendMailToPreset(
          presetId,
          this.photo!,
          this.settings,
          this.addDebugLog.bind(this),
          this.handleEmailMessage.bind(this),
          this.handleEmailProgress.bind(this)
        )

        if (result.shouldRetake) {
          // 完了メッセージを3秒間表示してから撮影画面に戻る
          this.completionMessage = '送信が完了しました'
          setTimeout(() => {
            this.completionMessage = null
            this.retake()
            // DOM更新後に成功メッセージを表示
            if (this.$nextTick) {
              this.$nextTick(() => {
                this.showSuccess('レシートを送信しました')
              })
            } else {
              // $nextTickが使えない場合は少し遅延させて表示
              setTimeout(() => {
                this.showSuccess('レシートを送信しました')
              }, 100)
            }
          }, 3000)
        }
      } finally {
        this.isSendingMail = false
      }
    }
  }
}

// Alpine.jsにコンポーネントを登録
document.addEventListener('alpine:init', () => {
  Alpine.data('receiptApp', receiptApp)
})
