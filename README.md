# スマート レシート for 弥生

iPhoneで動作するレシート撮影・送信Webアプリケーション

## 概要

このアプリケーションは、スマートフォン（特にiPhone）でレシートを撮影し、メール添付で送信することで、会計・経理業務の効率化を支援するWebアプリケーションです。

## 主な機能

- 標準カメラアプリを使用したレシート撮影
- 撮影画像のプレビュー
- 複数宛先への一括送信（プリセット機能）
- メール添付形式での送信（RESEND API使用）
- 設定情報のローカル保存
- デバッグパネル（ログ記録・コピー機能）
- アクセシビリティ対応（ARIA属性）

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
├── index.html              # メインHTML（Alpine.jsで拡張）
├── main.ts                 # エントリーポイント
├── app.ts                  # メインアプリケーションロジック
├── styles.css              # TailwindCSS
├── components/             # UIコンポーネント
│   └── settings-modal.ts   # 設定モーダル
├── services/               # ビジネスロジック
│   ├── settings.service.ts # 設定管理
│   ├── debug.service.ts    # デバッグログ管理
│   └── email.service.ts    # メール送信サービス
├── lib/                    # ユーティリティライブラリ
│   ├── storage.ts          # ローカルストレージ管理
│   └── mail.ts             # RESEND API通信
├── utils/                  # 汎用ユーティリティ
│   └── error.ts            # エラーハンドリング
└── types/                  # TypeScript型定義
    ├── env.d.ts            # 環境変数型定義
    ├── error.d.ts          # エラー型定義
    └── alpine.d.ts         # Alpine.js型拡張
```

## 使い方

1. アプリケーションを起動後、ブラウザで http://localhost:5173 を開く
2. 設定ボタンをクリックして、以下を入力：
   - メイン送信先メールアドレス
   - Dropbox送信用メールアドレス（オプション）
   - RESEND APIキー
   - 送信元メールアドレス
3. 「写真を撮る」ボタンをタップして標準カメラアプリで撮影
4. 撮影した画像をプレビューで確認
5. 送信方法を選択：
   - 「メイン送信先へ送信」：設定したメインアドレスに送信
   - 「Dropboxへ送信」：Dropboxアドレスに送信（設定時のみ表示）
   - 「すべてに送信」：全ての設定済みアドレスに一括送信

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
   VITE_PROXY_URL=https://yayoi-receipt-for-smart.dominion525.workers.dev
   ```

6. フロントエンドをビルドしてデプロイ:
   ```bash
   npm run build
   # distフォルダをホスティングサービスにアップロード
   ```

### 本番環境URL
- **カスタムドメイン**: https://receipt.dominion525.com
- カメラアクセス許可は初回のみで、以降は自動的に許可されます

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

- 設定情報（APIキー含む）はlocalStorageに保存
- HTTPSでの通信は必須（Cloudflareで自動対応）
- ローカルデバイスにのみデータを保存
- 個人情報や画像データは一時的にのみメモリに保持

## iOS Safari対応

- 標準カメラアプリとの連携による撮影機能
- FileReader APIによる画像読み込み処理
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