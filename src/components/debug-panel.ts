export const debugPanelTemplate = `
  <!-- デバッグパネルトグルボタン -->
  <div class="fixed bottom-4 right-4 z-50">
    <button
      @click="toggleDebug"
      class="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 shadow-lg"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>
  </div>
  
  <!-- デバッグパネル -->
  <div
    x-show="showDebug"
    x-transition
    class="fixed inset-x-0 bottom-0 bg-gray-900 text-white p-4 max-h-96 overflow-y-auto z-40"
  >
    <h3 class="text-lg font-bold mb-4">デバッグ情報</h3>
    
    <!-- API対応状況 -->
    <div x-show="apiSupport" class="mb-6">
      <h4 class="text-sm font-semibold mb-2">API対応状況</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <template x-for="[key, supported] in Object.entries(apiSupport || {})" :key="key">
          <div class="flex items-center gap-2">
            <span x-text="supported ? '✅' : '❌'"></span>
            <span x-text="key"></span>
          </div>
        </template>
      </div>
    </div>
    
    <!-- カメラパラメータ -->
    <div x-show="cameraParams" class="mb-4">
      <h4 class="text-sm font-semibold mb-2">現在のカメラパラメータ</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <template x-for="[key, value] in Object.entries(cameraParams || {})" :key="key">
          <div class="flex items-center gap-2" x-show="value !== undefined">
            <span class="font-mono" x-text="key + ':'"></span>
            <span class="font-mono text-green-400" x-text="value"></span>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 利用可能なカメラ -->
    <div x-show="availableCameras.length > 0" class="mb-4">
      <h4 class="text-sm font-semibold mb-2">利用可能なカメラ</h4>
      <div class="text-xs space-y-1">
        <template x-for="camera in availableCameras" :key="camera.deviceId">
          <div class="flex items-center gap-2">
            <span x-text="currentCamera && currentCamera.deviceId === camera.deviceId ? '▶' : ' '"></span>
            <span x-text="camera.label + ' (' + camera.zoom + 'x)'"></span>
          </div>
        </template>
      </div>
    </div>
  </div>
`