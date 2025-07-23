# スマート レシート for 弥生

iPhoneで動作するレシート撮影・送信Webアプリケーション

## 概要

このアプリケーションは、スマートフォン（特にiPhone）でレシートを撮影し、メール添付で送信することで、会計・経理業務の効率化を支援するWebアプリケーションです。

## 主な機能

- レシート写真撮影
- 撮影画像のプレビュー
- メール添付形式での送信
- 認証情報のローカル保存
- 画像編集機能（今後実装予定）
  - トリミング
  - 明度・コントラスト調整
  - ホワイトバランス調整

## 技術スタック

- **フレームワーク**: Alpine.js（軽量でシンプル）
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: TailwindCSS
- **デプロイ**: Cloudflare Pages
- **データ保存**: IndexedDB（ローカルストレージ）

## 選定理由

シンプルなアプリケーションのため、Reactなどの大規模フレームワークではなく、Alpine.jsを採用しました。

- **軽量**: gzip後約5KBと非常に小さい
- **学習コスト**: HTMLに直接記述でき、学習が容易
- **開発効率**: リアクティブな機能を持ちながらシンプル
- **保守性**: コードベースが小さく、理解しやすい

## プロジェクト構成

```
src/
├── index.html       # メインHTML（Alpine.jsで拡張）
├── main.ts         # エントリーポイント
├── styles.css      # TailwindCSS
├── lib/
│   ├── camera.ts   # カメラ制御ロジック
│   ├── storage.ts  # ローカルストレージ管理
│   └── mail.ts     # メール送信機能
└── types/          # TypeScript型定義
```

## 開発ロードマップ

### Phase 1: MVP（基本機能）
- [x] プロジェクトセットアップ
- [x] Alpine.js + TypeScript環境構築
- [ ] カメラアクセス機能
- [ ] 画像キャプチャ・プレビュー
- [ ] メール送信機能
- [ ] 認証情報の安全な保存

### Phase 2: 画像編集機能
- [ ] トリミング機能
- [ ] 明度・コントラスト調整
- [ ] 画像の自動補正

### Phase 3: 高度な機能
- [ ] ホワイトバランス調整
- [ ] 複数レシート管理
- [ ] 送信履歴機能
- [ ] PWA対応（オフライン機能）

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# バックグラウンドで開発サーバーを起動（推奨）
pkill -f "vite" || true && nohup npm run dev > /dev/null 2>&1 &

# ビルド
npm run build

# プレビュー
npm run preview

# テストの実行
npm test

# テストUI
npm run test:ui

# カバレッジレポート
npm run test:coverage
```

## セキュリティについて

- APIキーや認証情報はWeb Crypto APIで暗号化してIndexedDBに保存
- HTTPSでの通信は必須（Cloudflareで自動対応）
- ローカルデバイスにのみデータを保存

## iOS Safari対応

- getUserMedia APIの制限を考慮した実装
- PWAとしてホーム画面への追加を推奨
- viewport設定によるiOS特有の問題への対処

## iPhone実機テスト手順

カメラ機能はHTTPS環境でのみ動作するため、実機テストにはngrokを使用します。

### 1. ngrokのセットアップ

```bash
# ngrokのインストール（初回のみ）
brew install ngrok

# ngrokアカウントの作成と認証トークンの設定（初回のみ）
# https://dashboard.ngrok.com/signup でアカウント作成
# https://dashboard.ngrok.com/get-started/your-authtoken から認証トークンを取得
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 2. 実機テストの実行

```bash
# 開発サーバーを起動
npm run dev

# 別ターミナルでngrokを起動
ngrok http 5173

# 生成されたHTTPS URLをiPhoneのSafariで開く
# 例: https://xxxxxxxxxxxx.ngrok-free.app
```

### 3. QRコードでの共有

#### 自動生成機能（推奨）

Claude Codeで開発中の場合、以下のコマンドで自動的にQRコードを生成・表示できます：

```
/qr
```

または単に「QRコードください」と言うだけでも動作します。

#### 手動生成

```bash
# qrencodeのインストール
brew install qrencode

# QRコード生成
qrencode -o qr.png YOUR_NGROK_URL
```

### 注意事項

- ngrokの無料プランでは8時間でセッションが切断されます
- URLは起動毎に変更されます
- 初回アクセス時にngrokの警告画面が表示されますが、「Visit Site」をクリックして進んでください

## ライセンス

[ライセンスを後で決定]