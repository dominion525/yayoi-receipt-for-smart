# プロジェクト固有の開発ガイドライン

## スマート レシート for 弥生

### プロジェクト概要
- iPhoneで動作するレシート撮影・送信Webアプリケーション
- Alpine.js + TypeScript + Viteの軽量構成
- カメラ機能はHTTPS環境必須

### 開発環境

#### サーバー起動
```bash
pkill -f "vite" || true && nohup npm run dev > /dev/null 2>&1 &
```

#### iPhone実機テスト
ngrokを使用してHTTPS環境を構築：
```bash
ngrok http 5173
```

QRコード生成：
```
/qr
```

### 技術的な注意事項
- iOS SafariのgetUserMedia制限を考慮
- レスポンシブデザイン（モバイルファースト）
- リアカメラ優先設定（facingMode: "environment"）
- ngrok使用時はvite.config.tsのallowedHostsに`.ngrok-free.app`を設定済み

### コーディング規約
- Alpine.jsのx-data, x-show, @clickなどを活用
- TypeScriptの型定義を厳密に
- テストはVitestで記述

### プロジェクト固有のスラッシュコマンド
- `/qr` - ngrokのQRコードを生成・表示