# タスク完了時の確認事項

## 必須確認項目

### 1. TypeScriptビルド
```bash
npm run build
```
- エラーがないこと
- 型チェックが通ること

### 2. テスト実行
```bash
npm test
```
- 全テストが通ること
- 新機能には対応するテストを追加

### 3. コード品質
- TypeScript strictモードの警告なし
- 未使用の変数・パラメータなし
- 適切なエラーハンドリング

## 推奨確認項目

### 1. テストカバレッジ
```bash
npm run test:coverage
```
- カバレッジ100%を目標
- 新規コードは必ずテスト

### 2. ローカル動作確認
```bash
npm run dev
```
- ブラウザで正常動作
- コンソールエラーなし

### 3. iPhone実機テスト（カメラ機能変更時）
```bash
ngrok http 5173
```
- HTTPS環境での動作確認
- カメラ権限の取得確認

## デプロイ前確認

### 1. ビルド成功
```bash
npm run build
```

### 2. dist/ディレクトリ生成確認
- index.html
- assets/ディレクトリ
- その他必要ファイル

### 3. Worker設定確認（本番デプロイ時）
- wrangler.toml設定
- 環境変数設定

## Git操作前確認

### 1. 変更内容確認
```bash
git status
git diff
```

### 2. コミットメッセージ
- feat: 新機能
- fix: 不具合修正
- refactor: リファクタリング
- test: テスト追加・修正
- docs: ドキュメント更新

### 3. ブランチ確認
- 適切なブランチで作業
- mainブランチへの直接コミット禁止