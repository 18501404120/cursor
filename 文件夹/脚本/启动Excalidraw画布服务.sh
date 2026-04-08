#!/bin/bash
# 生成手绘图前自动启动 Excalidraw 画布服务（localhost:3000）
# 若 3000 端口已有服务则跳过，否则在后台启动并等待就绪。

EXCALIDRAW_DIR="/Users/ckw/.cursor/mcp_excalidraw-main"
PORT=3000

if command -v lsof &>/dev/null && lsof -i :$PORT -sTCP:LISTEN -t &>/dev/null; then
  echo "Excalidraw 画布服务已在运行 (端口 $PORT)"
  exit 0
fi

cd "$EXCALIDRAW_DIR" || exit 1
node dist/server.js &
PID=$!
echo "正在启动 Excalidraw 画布服务 (PID $PID) ..."

for i in {1..15}; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" 2>/dev/null | grep -q 200; then
    echo "Excalidraw 画布服务已就绪: http://localhost:$PORT"
    exit 0
  fi
done

echo "启动超时，请检查 $EXCALIDRAW_DIR 与端口 $PORT"
exit 1
