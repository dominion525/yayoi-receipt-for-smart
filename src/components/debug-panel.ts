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
    
    <!-- デバイス情報 -->
    <div x-show="deviceInfo" class="mb-6">
      <h4 class="text-sm font-semibold mb-2">デバイス情報</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="flex items-center gap-2">
          <span class="font-mono">Device:</span>
          <span class="font-mono text-blue-400" x-text="deviceInfo?.isMobile ? 'Mobile' : 'PC'"></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono">Camera:</span>
          <span class="font-mono text-blue-400">
            <span x-text="deviceInfo?.cameraType === 'rear' ? '背面' : deviceInfo?.cameraType === 'front' ? '前面' : '不明'"></span>
            <span x-text="'(' + deviceInfo?.cameraType + ')'"></span>
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono">Zoom:</span>
          <span class="font-mono text-green-400">
            <span x-text="currentZoomLevel.toFixed(1) + 'x'"></span>
            <span class="text-xs ml-1" x-text="'(' + (currentZoomType === 'optical' ? '光学' : 'デジタル') + ')'"></span>
          </span>
        </div>
        <div class="flex items-center gap-2" x-show="currentCamera">
          <span class="font-mono">Current:</span>
          <span class="font-mono text-purple-400 text-xs" x-text="currentCamera?.label || '不明'"></span>
        </div>
        <div class="flex items-center gap-2" x-show="currentCamera">
          <span class="font-mono">ID:</span>
          <span class="font-mono text-gray-400 text-xs" x-text="currentCamera?.deviceId?.substring(0, 8) + '...' || '不明'"></span>
        </div>
      </div>
    </div>
    
    <!-- ズーム情報 -->
    <div x-show="availableZoomLevels.length > 0" class="mb-6">
      <h4 class="text-sm font-semibold mb-2">ズーム情報</h4>
      <div class="text-xs space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-mono">利用可能:</span>
          <span class="font-mono text-yellow-400" x-text="availableZoomLevels.map(l => l + 'x').join(', ')"></span>
        </div>
        <div class="flex items-center gap-2" x-show="availableCameras.length > 0">
          <span class="font-mono">背面物理:</span>
          <span class="font-mono text-purple-400" x-text="availableCameras.filter(c => !c.label.toLowerCase().includes('front') && !c.label.toLowerCase().includes('user')).map(c => c.zoom + 'x').join(', ')"></span>
        </div>
        <div class="flex items-center gap-2" x-show="availableCameras.length > 0">
          <span class="font-mono">検出カメラ数:</span>
          <span class="font-mono text-cyan-400" x-text="availableCameras.length + '台'"></span>
        </div>
        <div class="flex items-center gap-2" x-show="zoomCapabilities">
          <span class="font-mono">デジタル:</span>
          <span class="font-mono text-orange-400" x-text="'1x-' + (zoomCapabilities?.max || 1).toFixed(1) + 'x'"></span>
        </div>
      </div>
    </div>
    
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
          <div class="text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2" x-text="currentCamera && currentCamera.deviceId === camera.deviceId ? '▶' : ' '"></span>
              <span class="flex-1" x-text="camera.label"></span>
              <span class="text-yellow-400" x-text="camera.zoom + 'x'"></span>
              <span class="text-xs text-gray-400" x-text="camera.deviceId.substring(0, 6) + '...'"></span>
            </div>
          </div>
        </template>
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
          class="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-600"
        >
          ログをコピー
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