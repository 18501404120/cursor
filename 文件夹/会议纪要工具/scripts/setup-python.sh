#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/scripts/.venv"

echo "==> 创建 Python 虚拟环境: $VENV"
python3 -m venv "$VENV"

# shellcheck disable=SC1091
source "$VENV/bin/activate"

echo "==> 升级 pip"
pip install -U pip wheel setuptools

echo "==> 安装 FunASR 依赖（首次可能较久，需下载 PyTorch 与模型）"
pip install -r "$ROOT/scripts/requirements.txt"

echo ""
echo "✅ Python 转写环境已就绪。"
echo "   下一步："
echo "   cd \"$ROOT\""
echo "   npm install"
echo "   npm start"
echo ""
echo "   首次转写会自动下载 FunASR 模型（约 1～2 GB），请保持网络畅通。"
