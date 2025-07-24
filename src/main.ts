import './style.css'
import './styles/main.css'
import Alpine from 'alpinejs'
import './app'
import { debugPanelTemplate } from './components/debug-panel'
import { settingsModalTemplate } from './components/settings-modal'

// Alpine.jsをwindowに登録
window.Alpine = Alpine

// DOMがロードされたら実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

function init() {
  // デバッグパネルを挿入
  const debugPanelContainer = document.getElementById('debug-panel')
  if (debugPanelContainer) {
    debugPanelContainer.innerHTML = debugPanelTemplate
  }
  
  // 設定モーダルを挿入
  const settingsModalContainer = document.getElementById('settings-modal')
  if (settingsModalContainer) {
    settingsModalContainer.innerHTML = settingsModalTemplate
  }
  
  // Alpine.jsを初期化
  Alpine.start()
}