/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Viteの?rawインポート用の型定義
declare module "*.html?raw" {
  const content: string;
  export default content;
}

declare module "*.txt?raw" {
  const content: string;
  export default content;
}