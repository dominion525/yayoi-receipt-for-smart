# /qr - ngrok QRコード生成

## 概要
ngrokで公開中のHTTPS URLをQRコード化して表示します。

## 実行内容

1. qrencodeがインストールされているか確認（未インストールの場合は自動インストール）
2. ngrok APIから現在のHTTPS URLを取得
3. QRコードを生成（ngrok-qr.png）
4. 生成したQRコードを自動的に開く

## 使用方法
```
/qr
```

または

```
QRコードください
```

## 実装詳細

```bash
# qrencodeの確認とインストール
which qrencode || brew install qrencode

# ngrokのURLを取得
URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import json, sys; data = json.load(sys.stdin); print(data['tunnels'][0]['public_url'])")

# QRコード生成
qrencode -o ngrok-qr.png -s 10 "$URL"

# QRコードを表示
open ngrok-qr.png
```

## 注意事項
- ngrokが起動していない場合はエラーになります
- macOSのみ対応（brewとopenコマンドを使用）
- 生成されたQRコードファイルは上書きされます