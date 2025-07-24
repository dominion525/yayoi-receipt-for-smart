# スマート レシート for 弥生

iPhoneで動作するレシート撮影・送信Webアプリケーション

## 概要

このアプリケーションは、スマートフォン（特にiPhone）でレシートを撮影し、メール添付で送信することで、会計・経理業務の効率化を支援するWebアプリケーションです。

## 主な機能

- レシート写真撮影
- 物理カメラの自動切り替え（1x、2x、3x - iOS対応）
- トーチ（フラッシュライト）機能
- 撮影画像のプレビュー
- メール添付形式での送信（RESEND API使用）
- 設定情報のローカル保存
- デバッグパネル（開発用）

## 技術スタック

- **フレームワーク**: Alpine.js（軽量でシンプル）
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: TailwindCSS
- **メール送信**: RESEND API + Express.js（プロキシサーバー）
- **データ保存**: localStorage（設定情報）

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

## 使い方

1. アプリケーションを起動後、ブラウザで http://localhost:5173 を開く
2. 設定ボタンをクリックして、以下を入力：
   - 送信先メールアドレス
   - RESEND APIキー
3. 「テストメール送信」で動作確認
4. カメラを起動
5. レシートを撮影
6. 「メール送信」ボタンでメール送信

## プロキシサーバーについて

RESEND APIはブラウザから直接呼び出すことができないため（CORS制限）、プロキシサーバーを使用しています。

### ローカル開発

- **ポート**: 3001
- **エンドポイント**: 
  - `/health` - ヘルスチェック
  - `/api/send-email` - メール送信
- **ファイル**: `simple-proxy.cjs`

### Cloudflare Workersへのデプロイ

1. Cloudflareアカウントを作成
2. Wranglerをインストール:
   ```bash
   npm install -g wrangler
   ```

3. Cloudflareにログイン:
   ```bash
   wrangler login
   ```

4. Workerをデプロイ:
   ```bash
   wrangler deploy
   ```

5. デプロイされたWorkerのURLを`.env`ファイルに設定:
   ```
   VITE_PROXY_URL=https://yayoi-receipt-proxy.workers.dev
   ```

6. フロントエンドをビルドしてCloudflare Pagesにデプロイ:
   ```bash
   npm run build
   # distフォルダをCloudflare Pagesにアップロード
   ```

### セキュリティ上の注意

- APIキーはHTTPS環境で送信されますが、より安全な方法を検討することを推奨します
- 本番環境では、特定のオリジンのみを許可するようCORS設定を調整してください

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. RESEND APIキーの取得

1. [RESEND](https://resend.com)でアカウントを作成
2. APIキーを取得

### 3. アプリケーションの起動

**重要: メール送信機能を使用するには、プロキシサーバーとViteサーバーの両方を起動する必要があります。**

#### 方法1: 別々のターミナルで起動（推奨）

ターミナル1:
```bash
npm run proxy  # プロキシサーバー（ポート3001）
```

ターミナル2:
```bash
npm run dev    # Vite開発サーバー（ポート5173）
```

#### 方法2: 1つのコマンドで起動

```bash
npm run dev:all  # 両方のサーバーを同時起動
```

### 4. その他のコマンド

```bash
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