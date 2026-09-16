#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# 把本机 uv 加入 PATH（若已安装）
if [[ -f "$HOME/.local/bin/env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.local/bin/env"
fi

# 优先使用 uv 管理的 Python（cursor-sdk 需要 >=3.10；系统自带常为 3.9）
resolve_python() {
  if command -v uv >/dev/null 2>&1; then
    if uv python find 3.11 >/dev/null 2>&1; then
      uv python find 3.11
      return
    fi
    if uv python find 3.12 >/dev/null 2>&1; then
      uv python find 3.12
      return
    fi
  fi
  for cand in python3.12 python3.11 python3.10; do
    if command -v "$cand" >/dev/null 2>&1; then
      command -v "$cand"
      return
    fi
  done
  command -v python3
}

PY="$(resolve_python)"
if ! "$PY" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "需要 Python >= 3.10（当前: $("$PY" -V 2>&1)）。" >&2
  echo "可先安装 uv 后执行: curl -LsSf https://astral.sh/uv/install.sh | sh && uv python install 3.11" >&2
  exit 1
fi

# 旧 venv 可能指向其他机器的 Python，或版本过低，需重建
need_recreate=0
if [[ ! -x .venv/bin/python ]]; then
  need_recreate=1
elif ! .venv/bin/python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null; then
  need_recreate=1
fi

if [[ "$need_recreate" -eq 1 ]]; then
  rm -rf .venv
  if command -v uv >/dev/null 2>&1; then
    uv venv --python "$PY" .venv
  else
    "$PY" -m venv .venv
  fi
fi

if command -v uv >/dev/null 2>&1; then
  uv pip install -q -r requirements.txt --python .venv/bin/python
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -m pip install -q -r requirements.txt
fi

export PYTHONPATH=.
echo "知识库管理服务: http://127.0.0.1:8765"
exec .venv/bin/python -m kb_orchestrator.service.app

# ./start-web.sh
