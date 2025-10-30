# プロジェクト固有の開発ガイドライン

## スマート レシート for 弥生

### プロジェクト概要
- iPhoneで動作するレシート撮影・送信Webアプリケーション
- Alpine.js + TypeScript + Viteの軽量構成
- カメラ機能はHTTPS環境必須
- 本番環境URL: https://receipt.dominion525.com

### 開発環境

#### サーバー起動
```bash
pkill -f "vite" || true && nohup npm run dev > /dev/null 2>&1 &
```

**重要**: Viteはホットリロードに対応しているため、以下のファイルを変更してもサーバーの再起動は不要です：
- `.html`, `.ts`, `.js`, `.css`ファイル
- `src/`配下のすべてのソースコード

サーバー再起動が必要なケース：
- `vite.config.ts`の変更
- `package.json`の変更（依存関係の追加など）
- その他の設定ファイルの変更

#### iPhone実機テスト
ngrokを使用してHTTPS環境を構築：
```bash
ngrok http 5173
```

### 技術的な注意事項
- 標準カメラアプリ使用のためgetUserMedia不要
- レスポンシブデザイン（モバイルファースト）
- ngrok使用時はvite.config.tsのallowedHostsに`.ngrok-free.app`を設定済み

### コーディング規約
- Alpine.jsのx-data, x-show, @clickなどを活用
- TypeScriptの型定義を厳密に
- テストはVitestで記述

### デプロイメント

**重要**: このプロジェクトはCloudflare **Worker**として構成されています（Pagesではありません）

#### 本番環境デプロイ
```bash
# ビルド
npm run build

# Cloudflare Workerとしてデプロイ
npx wrangler deploy --env production
```

**絶対にやってはいけない**:
- `npx wrangler pages deploy` は使用しない（これはPages用）
- `--project-name yayoi-receipt-for-smart` オプションは不要

#### 構成詳細
- **Worker**: `worker.js` - API処理 + 静的ファイル配信
- **Assets**: `dist/` - ビルドされた静的ファイル  
- **Domain**: `receipt.dominion525.com`
- **Config**: `wrangler.toml` (Worker用設定)

#### デプロイ確認
- URL: https://receipt.dominion525.com
- Version IDで確認可能