#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT_ROOT="${PRODUCT_ROOT:-${ROOT_DIR}/../../../ERP_product}"
DESIGN_FOLDER="${DESIGN_FOLDER:-${ROOT_DIR}/../文件夹}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8787}"

if [[ ! -d "${PRODUCT_ROOT}" ]]; then
  echo "[error] 未找到 ERP_product 目录: ${PRODUCT_ROOT}"
  exit 1
fi

if [[ ! -d "${DESIGN_FOLDER}" ]]; then
  echo "[error] 未找到方案设计文件夹: ${DESIGN_FOLDER}"
  exit 1
fi

# 端口被占用时，尝试结束本服务遗留进程（避免 Address already in use）
if command -v lsof >/dev/null 2>&1; then
  OCCUPY_PIDS="$(lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${OCCUPY_PIDS}" ]]; then
    echo "[warn] 端口 ${PORT} 已被占用，PID: ${OCCUPY_PIDS}"
    if [[ "${FORCE_KILL:-1}" == "1" ]]; then
      echo "[warn] 正在结束占用进程后重启..."
      # shellcheck disable=SC2086
      kill ${OCCUPY_PIDS} 2>/dev/null || true
      sleep 0.4
    else
      echo "[error] 可换端口：PORT=8788 ./start.sh"
      echo "[error] 或强制释放：FORCE_KILL=1 ./start.sh"
      exit 1
    fi
  fi
fi

echo "[start] 启动原型分享服务..."
echo "[start] ERP_product: ${PRODUCT_ROOT}"
echo "[start] 方案设计文件夹: ${DESIGN_FOLDER}"
echo "[start] 端口: ${PORT}"
echo "[tip] 浏览器打开本机地址后，点「分享目录」复制给同事即可。"
echo

exec python3 "${ROOT_DIR}/server.py" \
  --root "ERP_product:${PRODUCT_ROOT}" \
  --root "文件夹:${DESIGN_FOLDER}" \
  --host "${HOST}" \
  --port "${PORT}"
