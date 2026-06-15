#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/scripts/.venv"

pick_python() {
  local candidates=(python3.12 python3.11 python3.10 python3)
  for bin in "${candidates[@]}"; do
    if ! command -v "$bin" >/dev/null 2>&1; then
      continue
    fi
    local ver
    ver="$("$bin" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    local major minor
    major="${ver%%.*}"
    minor="${ver#*.}"
    if [ "$major" -eq 3 ] && [ "$minor" -ge 9 ]; then
      echo "$bin"
      return 0
    fi
  done
  return 1
}

PYTHON_BIN="$(pick_python || true)"
if [ -z "${PYTHON_BIN:-}" ]; then
  echo "❌ 未找到 Python 3.9+。macOS 请先安装 Xcode Command Line Tools 或 Python 3.11。"
  exit 1
fi

PY_VER="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')"
echo "==> 使用 Python: $PYTHON_BIN ($PY_VER)"

if "$PYTHON_BIN" -c 'import sys; sys.exit(0 if sys.version_info < (3, 10) else 1)'; then
  echo "==> 提示：当前为 Python 3.9，已锁定 funasr==1.1.18 以确保兼容。"
fi

if [ -d "$VENV" ]; then
  echo "==> 删除旧虚拟环境: $VENV"
  rm -rf "$VENV"
fi

MACHINE="$(uname -m)"
echo "==> 创建 Python 虚拟环境: $VENV"
if [ "$MACHINE" = "arm64" ]; then
  echo "==> Apple Silicon：使用 arch -arm64 创建环境（与 PyTorch 架构一致）"
  arch -arm64 "$PYTHON_BIN" -m venv "$VENV"
else
  "$PYTHON_BIN" -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

echo "==> 升级 pip"
pip install -U pip wheel setuptools

echo "==> 安装 FunASR 依赖（首次可能较久，需下载 PyTorch 与模型）"
# 新版 funasr 在 pip 预编译 .pyc 时会因 sense_voice/triton_ops 语法失败；
# 跳过字节码预编译即可正常安装（不影响运行）。
export PIP_NO_COMPILE=1
pip install -r "$ROOT/scripts/requirements.txt"

echo "==> 验证 funasr 可导入"
if [ "$MACHINE" = "arm64" ]; then
  arch -arm64 python -c "import torch; from funasr import AutoModel; print('funasr import ok', torch.__version__)"
else
  python -c "import torch; from funasr import AutoModel; print('funasr import ok', torch.__version__)"
fi

echo ""
echo "✅ Python 转写环境已就绪。"
echo "   下一步："
echo "   cd \"$ROOT\""
echo "   npm start"
echo ""
echo "   首次转写会自动下载 FunASR 模型（约 1～2 GB），请保持网络畅通。"
