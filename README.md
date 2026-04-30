# スマート レシート for 弥生

[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://github.com/dominion525/yayoi-receipt-for-smart)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF.svg)](https://github.com/features/actions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**デモ**: https://receipt.dominion525.com

## 概要

弥生の[スマート証憑管理](https://www.yayoi-kk.co.jp/products/smart-syohyo/)サービス向けレシート送信アプリ。

スマート証憑管理は公式モバイルアプリを提供していないため、レシート撮影からメール送信までのプロセスを効率化する目的で作成。スマートフォンで撮影したレシートを指定メールアドレスに送信し、スマート証憑管理に自動取り込みさせる。

## 主な機能

- レシート撮影
- 撮影画像プレビュー
- RESEND APIを使ったメール送信
- 設定情報のローカル保存
- PWA対応

## 技術スタック

- **フレームワーク**: Alpine.js v3
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: TailwindCSS v4 + PostCSS
- **テスト**: Vitest + happy-dom
- **ホスティング**: Cloudflare Workers
- **メール送信**: RESEND API
- **データ保存**: localStorage

## 使い方

設定からRESEND APIキー、送信先メールアドレス、送信元メールアドレスを設定。レシートを撮影して送信。

## アーキテクチャ

CORS制限回避のため、サーバーサイドでメール送信処理を実行。APIキーはlocalStorageに保存し、HTTPS通信で送信。

### ローカル開発

`npm run proxy`でサーバーサイド処理を起動（ポート3001）。

### 本番環境

サーバーサイド処理（`worker.js`）をCloudflare Workersなどにデプロイ。フロントエンドは`npm run build`でビルドし、任意のホスティングサービスで配信。

## セットアップ

### 事前準備

[RESEND](https://resend.com)でアカウントを作成し、APIキーを取得。

### 起動

```bash
npm install
npm run dev:all  # または npm run proxy と npm run dev を別ターミナルで実行
```

アプリ起動後、設定画面でRESEND APIキー、送信先、送信元メールアドレスを入力。

## ライセンス

MIT License
