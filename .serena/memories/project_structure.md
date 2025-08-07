# プロジェクト構造

## ルートディレクトリ
```
yayoi-receipt-for-smart/
├── .claude/          # Claude設定
├── .github/          # GitHub Actions CI/CD
├── .serena/          # Serenaメモリ
├── .wrangler/        # Cloudflare Worker設定
├── dist/             # ビルド出力
├── public/           # 静的ファイル
│   ├── icons/        # PWAアイコン
│   ├── manifest.json # PWAマニフェスト
│   └── sw.js         # Service Worker
└── src/              # ソースコード
```

## src/ディレクトリ詳細
```
src/
├── components/           # UIコンポーネント
│   ├── debug-panel.ts   # デバッグパネル
│   ├── debug-panel.html
│   ├── footer.ts        # フッター
│   ├── footer.html
│   ├── settings-modal.ts    # 設定モーダル
│   └── settings-modal.html
│
├── services/            # ビジネスロジック
│   ├── debug.service.ts    # デバッグログ管理
│   ├── email.service.ts    # メール送信
│   ├── settings.service.ts # 設定管理
│   ├── storage.service.ts  # ストレージ管理
│   └── __tests__/      # サービステスト
│
├── lib/                 # ライブラリ
│   ├── mail.ts         # RESEND API通信
│   └── __tests__/
│
├── utils/              # ユーティリティ
│   ├── error.ts        # エラーハンドリング
│   └── __tests__/
│
├── types/              # 型定義
│   ├── alpine.d.ts    # Alpine.js拡張
│   ├── env.d.ts       # 環境変数
│   ├── error.d.ts     # エラー型
│   └── progress.types.ts # 進捗型
│
├── styles/             # スタイル
│   ├── main.css       # メインCSS
│   └── logo.css       # ロゴCSS
│
├── __tests__/          # アプリテスト
│   └── app.test.ts
│
├── app.ts              # アプリケーションロジック
├── main.ts             # エントリーポイント
├── style.css           # TailwindCSS
└── index.html          # メインHTML
```

## 重要ファイル
- `index.html`: アプリケーションのメインHTML
- `worker.js`: Cloudflare Worker（API + 静的配信）
- `wrangler.toml`: Cloudflare Worker設定
- `vite.config.ts`: Vite設定
- `tsconfig.json`: TypeScript設定
- `vitest.config.ts`: テスト設定
- `package.json`: 依存関係・スクリプト
- `CLAUDE.md`: プロジェクト固有ガイドライン