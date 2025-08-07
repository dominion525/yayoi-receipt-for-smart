# プロジェクト概要

## スマート レシート for 弥生

### 概要
iPhoneで動作するレシート撮影・送信Webアプリケーション。
会計・経理業務の効率化を支援するツール。

### 主な機能
- 標準カメラアプリを使用したレシート撮影
- 撮影画像のプレビュー
- 複数宛先への一括送信（プリセット機能）
- メール添付形式での送信（RESEND API使用）
- 設定情報のローカル保存
- デバッグパネル（ログ記録・コピー機能）
- アクセシビリティ対応（ARIA属性）
- PWA対応（Progressive Web App）

### 本番環境
- URL: https://receipt.dominion525.com
- ホスティング: Cloudflare Workers
- カスタムドメイン設定済み

### 開発環境
- システム: Darwin (macOS)
- Node.js環境
- HTTPS環境（ngrok利用）