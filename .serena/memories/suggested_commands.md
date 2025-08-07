# 開発コマンド

## 開発サーバー
```bash
# 通常の起動
npm run dev

# バックグラウンド起動（推奨）
pkill -f "vite" || true && nohup npm run dev > /dev/null 2>&1 &

# プロキシサーバー起動
npm run proxy

# 両方同時起動
npm run dev:all
```

## ビルド
```bash
# TypeScriptチェック + ビルド
npm run build

# プレビュー
npm run preview
```

## テスト
```bash
# テスト実行
npm test

# UIモードでテスト
npm run test:ui

# カバレッジレポート生成
npm run test:coverage
```

## デプロイ（Cloudflare Workers）
```bash
# 本番環境デプロイ
npm run build
npx wrangler deploy --env production

# ログイン（初回のみ）
wrangler login
```

## iPhone実機テスト
```bash
# ngrok起動（HTTPS環境）
ngrok http 5173

# QRコード生成（Claude Codeの場合）
/qr
```

## Git操作
```bash
# ステータス確認
git status

# ブランチ作成
git checkout -b feature/branch-name

# コミット
git add .
git commit -m "feat: message"

# プッシュ
git push origin branch-name
```

## 注意事項
- Viteはホットリロード対応（ソースコード変更時の再起動不要）
- vite.config.tsやpackage.json変更時は再起動必要
- デプロイは必ずWorkerとして（Pagesではない）