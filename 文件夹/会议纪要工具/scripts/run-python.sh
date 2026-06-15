#!/usr/bin/env bash
# Apple Silicon 上强制 arm64 运行 venv Python（避免 PyTorch 架构不匹配）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="$ROOT/.venv/bin/python3"
if [ ! -x "$PY" ]; then
  PY="$(command -v python3)"
fi
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
  exec arch -arm64 "$PY" "$@"
fi
exec "$PY" "$@"