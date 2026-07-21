#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo ">>> 预下载 FunASR 模型（首次约 1GB，视网速需 5–30 分钟）"
bash scripts/run-python.sh scripts/download_models.py
echo ">>> 模型已就绪，可正常转写"
