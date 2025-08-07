# スマート レシート for 弥生

[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/dominion525/yayoi-receipt-for-smart)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF.svg)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

iPhoneで動作するレシート撮影・送信Webアプリケーション

## 概要

このアプリケーションは、スマートフォン（特にiPhone）でレシートを撮影し、メール添付で送信することで、会計・経理業務の効率化を支援するWebアプリケーションです。

### 品質指標
- **テストカバレッジ**: 100% 達成
- **TypeScript**: Strictモード完全準拠
- **CI/CD**: GitHub Actions による自動テスト・デプロイ
- **コード規模**: 実装 約2,200行 / テスト 約6,060行

## 主な機能

- 標準カメラアプリを使用したレシート撮影
- 撮影画像のプレビュー
- 複数宛先への一括送信（プリセット機能）
- メール添付形式での送信（RESEND API使用）
- 設定情報のローカル保存
- デバッグパネル（ログ記録・コピー機能）
- PWA対応（Progressive Web App）
- アクセシビリティ対応（ARIA属性）

## 技術スタック

- **フレームワーク**: Alpine.js v3.14.9（軽量でシンプル）
- **言語**: TypeScript v5.7.3（Strictモード）
- **ビルドツール**: Vite v6.0.6
- **スタイリング**: TailwindCSS v4.1.11 + PostCSS
- **テスト**: Vitest v3.2.4 + happy-dom（カバレッジ100%）
- **CI/CD**: GitHub Actions（3つのワークフロー）
- **ホスティング**: Cloudflare Workers
- **メール送信**: RESEND API v3.2.0
- **データ保存**: localStorage（設定情報）
- **品質管理**: ESLint v8.57.1 + TypeScript ESLint

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
├── style.css               # TailwindCSS
├── composables/            # Vue3風コンポジション関数（5個）
│   ├── useDebugPanel.ts    # デバッグパネル機能
│   ├── useInitializer.ts   # 初期化処理
│   ├── useMessage.ts       # メッセージ管理
│   ├── usePhotoCapture.ts  # 写真撮影機能
│   ├── usePWADetection.ts  # PWA検出
│   ├── useSettings.ts      # 設定管理
│   └── __tests__/          # Composablesテスト
├── components/             # UIコンポーネント（3個）
│   ├── debug-panel.*       # デバッグパネル
│   ├── footer.*            # フッター
│   └── settings-modal.*    # 設定モーダル
├── services/               # ビジネスロジック（4個）
│   ├── debug.service.ts    # デバッグログ管理
│   ├── email.service.ts    # メール送信サービス
│   ├── settings.service.ts # 設定管理
│   ├── storage.service.ts  # ストレージ管理
│   └── __tests__/          # サービステスト
├── lib/                    # ライブラリ
│   ├── mail.ts             # RESEND API通信
│   └── __tests__/          # ライブラリテスト
├── constants/              # 定数定義
│   ├── api.ts              # API関連定数
│   ├── service-worker.ts   # SW関連定数
│   ├── timeouts.ts         # タイムアウト定数
│   └── ui.ts               # UI関連定数
├── utils/                  # ユーティリティ
│   ├── error.ts            # エラーハンドリング
│   ├── version.ts          # バージョン管理
│   └── __tests__/          # ユーティリティテスト
├── types/                  # TypeScript型定義
│   ├── alpine.d.ts         # Alpine.js型拡張
│   ├── app.d.ts            # アプリケーション型
│   ├── env.d.ts            # 環境変数型
│   ├── error.d.ts          # エラー型
│   └── progress.types.ts   # 進捗型
├── styles/                 # スタイルシート
│   ├── main.css            # メインスタイル
│   └── logo.css            # ロゴスタイル
└── __tests__/              # アプリケーションテスト
    └── app.test.ts         # メインアプリテスト
```

### プロジェクト統計
- **総ファイル数**: 82ファイル
- **コンポーネント数**: 3個
- **サービス数**: 4個
- **Composables数**: 5個
- **テストファイル**: 9個

## 使い方

1. アプリケーションを起動後、ブラウザで http://localhost:5173 を開く
2. 設定ボタンをクリックして、以下を入力：
   - 送信先メールアドレス
   - Dropbox送信用メールアドレス（オプション）
   - RESEND APIキー
   - 送信元メールアドレス
3. 「写真を撮る」ボタンをタップして標準カメラアプリで撮影
4. 撮影した画像をプレビューで確認
5. 「送信する」ボタンをタップしてメール送信
   - 設定された全てのメールアドレスに一括送信されます

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

5. フロントエンドをビルドしてデプロイ:
   ```bash
   npm run build
   # distフォルダをホスティングサービスにアップロード
   ```

### 本番環境URL
- **カスタムドメイン**: https://receipt.dominion525.com
- カメラアクセス許可は初回のみで、以降は自動的に許可されます

### セキュリティ上の注意

- APIキーはHTTPS環境で送信されますが、より安全な方法を検討することを推奨します
- CORS設定は本番環境用に既に最適化済み（receipt.dominion525.comのみ許可）

## 品質保証

### CI/CDパイプライン

本プロジェクトではGitHub Actionsによる自動化を実現：

1. **テストワークフロー** (`test.yml`)
   - プッシュ時に自動テスト実行
   - カバレッジレポート生成
   - 複数Node.jsバージョンでの検証

2. **CI/CDワークフロー** (`ci.yml`)
   - コードの品質チェック
   - ビルドの成功確認
   - 型チェックの実行

3. **デプロイワークフロー** (`deploy.yml`)
   - mainブランチへのマージで自動デプロイ
   - Cloudflare Workersへの自動配信

### テストカバレッジ

- **カバレッジ率**: 100%達成
- **テスト実行**: `npm test`
- **カバレッジ確認**: `npm run test:coverage`
- **UIテスト**: `npm run test:ui`

## 開発プロセス

### AI支援開発

本プロジェクトはClaudeCodeを活用した高効率開発により実現：

- **生産性向上**: 従来比12-18倍の開発速度
- **品質担保**: テストカバレッジ100%を同時達成
- **ベストプラクティス**: 自動的に最新の開発手法を適用

### 開発手法の特徴

1. **高速プロトタイピング**
   - コンセプトから実装まで迅速に展開
   - リアルタイムでの品質チェック

2. **継続的な品質改善**
   - コード生成と同時にテスト作成
   - 型安全性の自動担保

3. **モジュール設計**
   - Composablesパターンによる機能分離
   - 保守性と拡張性を重視

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

## PWA対応

このアプリケーションはProgressive Web App（PWA）として動作します。

### PWA機能

- **インストール可能**: ホーム画面に追加してネイティブアプリのように使用可能
- **オフライン対応**: 基本的なオフラインページを表示（完全なオフライン動作は未対応）
- **自動更新**: アプリ起動時に最新版を自動チェック
- **スタンドアローンモード**: URLバーを非表示にしてアプリらしい外観を実現

### ホーム画面への追加方法

#### iOS（iPhone/iPad）
1. Safariでアプリを開く
2. 共有ボタン（□に↑のアイコン）をタップ
3. 「ホーム画面に追加」を選択
4. 名前を確認して「追加」をタップ

#### Android
1. Chromeでアプリを開く
2. メニュー（⋮）をタップ
3. 「ホーム画面に追加」を選択
4. インストールダイアログで「インストール」をタップ

### 技術仕様

- **manifest.json**: アプリ名、アイコン、表示モードなどを定義
- **Service Worker**: キャッシュ戦略と更新チェックを実装
  - 内部リソース: Network First（常に最新版を取得）
  - 外部リソース（フォント等）: Cache First（キャッシュを優先）
- **アイコン**: 各種サイズ（96x96〜512x512）に対応
- **デバッグ情報**: PWAモード/ブラウザモード、リビジョン、ビルド日時を表示

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

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。