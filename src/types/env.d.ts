/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// ビルド時に埋め込まれる定数
declare const __BUILD_REVISION__: string
declare const __BUILD_TIME__: string

// Viteの?rawインポート用の型定義
declare module '*.html?raw' {
  const content: string
  export default content
}

declare module '*.txt?raw' {
  const content: string
  export default content
}
