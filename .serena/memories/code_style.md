# コーディング規約

## TypeScript規約
### 厳密モード設定
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`

### 型定義
- 明示的な型定義を推奨
- インターフェース定義は`types/`ディレクトリに配置
- `env.d.ts`で環境変数の型定義
- `alpine.d.ts`でAlpine.js拡張の型定義

## Alpine.js規約
### ディレクティブ使用
- `x-data`: コンポーネントのステート定義
- `x-show`: 条件付き表示
- `x-if`: 条件付きレンダリング
- `@click`: イベントハンドリング
- `x-model`: 双方向データバインディング

### コンポーネント構成
- HTMLテンプレートは別ファイル（`.html`）
- ロジックはTypeScriptファイル（`.ts`）
- `Alpine.data()`でコンポーネント登録

## ファイル構成
### ディレクトリ構造
```
src/
├── components/  # UIコンポーネント
├── services/    # ビジネスロジック
├── lib/         # ユーティリティライブラリ  
├── utils/       # 汎用ユーティリティ
├── types/       # TypeScript型定義
└── styles/      # CSS/スタイル
```

### ネーミング規則
- ファイル名: kebab-case（例: `settings-modal.ts`）
- サービス: `.service.ts`サフィックス
- テスト: `__tests__/`ディレクトリ、`.test.ts`サフィックス

## テスト規約
- Vitestを使用
- `describe`でグループ化
- `it`で個別テストケース
- モック使用時は`vi.mock()`
- カバレッジ100%を目標

## その他の規約
- コメントは必要最小限
- エラーハンドリングを適切に実装
- localStorage使用時は例外処理を含める
- セキュリティ: APIキーはクライアントに露出しない