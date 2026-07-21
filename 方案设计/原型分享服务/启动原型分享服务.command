#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8787}"
URL="http://127.0.0.1:${PORT}/"

if lsof -tiTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  open "$URL"
  osascript -e 'display notification "已在浏览器中打开" with title "ERP 原型分享"'
  exit 0
fi

cd "$ROOT"
chmod +x start.sh 2>/dev/null || true
osascript -e 'display notification "正在启动服务…" with title "ERP 原型分享"' 
./start.sh &
SERVER_PID=$!

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    open "$URL"
    osascript -e 'display notification "服务已启动" with title "ERP 原型分享"'
    break
  fi
  sleep 0.3
done

wait "$SERVER_PID"
