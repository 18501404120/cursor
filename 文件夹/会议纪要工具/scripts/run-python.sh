#!/usr/bin/env bash
# Apple Silicon 上强制 arm64 运行 venv Python（避免 PyTorch 架构不匹配）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/.venv/bin/python3"
if [ ! -x "$PY" ]; then
  PY="$(command -v python3)"
fi
# FunASR 加载模型时会 subprocess 调用 `pip`，须把 venv/bin 加入 PATH
VENV_BIN="$(dirname "$PY")"
export PATH="$VENV_BIN:${PATH:-/usr/bin:/bin:/usr/sbin:/sbin}"
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
  exec arch -arm64 "$PY" "$@"
fi
exec "$PY" "$@"