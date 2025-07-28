# ngrok QRコード生成

現在のngrok URLのQRコードを生成して表示します。ngrokが起動していない場合は自動的にバックグラウンドで起動します。

# qrencodeのインストール確認
!which qrencode || brew install qrencode

# ngrokの起動確認と自動起動
!if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then \
  echo "ngrokが起動していません。バックグラウンドで起動します..."; \
  nohup ngrok http 5173 > /tmp/ngrok.log 2>&1 & \
  NGROK_PID=$!; \
  echo "ngrok起動中 (PID: $NGROK_PID)..."; \
  for i in {1..20}; do \
    sleep 0.5; \
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then \
      echo "ngrokが起動しました！"; \
      break; \
    fi; \
    if [ $i -eq 20 ]; then \
      echo "エラー: ngrokの起動がタイムアウトしました"; \
      cat /tmp/ngrok.log; \
      exit 1; \
    fi; \
  done; \
else \
  echo "ngrokは既に起動しています"; \
fi

# ngrok URLを取得
!curl -s http://localhost:4040/api/tunnels | python3 -c "import json, sys; data = json.load(sys.stdin); tunnels = data.get('tunnels', []); https_tunnel = next((t for t in tunnels if t['proto'] == 'https'), tunnels[0] if tunnels else None); print(https_tunnel['public_url'] if https_tunnel else 'エラー: トンネルが見つかりません')" > /tmp/ngrok-url.txt

# URLチェック
!if grep -q "エラー" /tmp/ngrok-url.txt; then \
  echo "ngrok URLの取得に失敗しました"; \
  cat /tmp/ngrok-url.txt; \
  exit 1; \
fi

# QRコード生成
!qrencode -o ngrok-qr.png -s 10 "$(cat /tmp/ngrok-url.txt)"

# QRコードを表示
!open ngrok-qr.png

# URL表示
!echo "QRコードを生成しました: $(cat /tmp/ngrok-url.txt)"