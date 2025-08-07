# 技術スタック

## フロントエンド
- **フレームワーク**: Alpine.js v3.14.9
  - 軽量（gzip後約5KB）
  - HTMLに直接記述可能
  - リアクティブな機能
- **言語**: TypeScript v5.7.3
  - strictモード有効
  - 厳密な型定義
- **スタイリング**: TailwindCSS v4.1.11
  - PostCSS + Autoprefixer

## ビルドツール
- **Vite** v6.0.6
  - 高速なホットリロード
  - TypeScriptサポート
  - 本番ビルド最適化

## テスト
- **Vitest** v3.2.4
  - happy-dom環境
  - カバレッジレポート（v8）
  - UIモード対応

## バックエンド/API
- **Express.js** v5.1.0（プロキシサーバー）
- **RESEND API**（メール送信）
- **Cloudflare Workers**（本番環境）

## 依存関係管理
- npm（package.json）
- TypeScript設定（tsconfig.json）
  - ES2020ターゲット
  - bundlerモード