#!/usr/bin/env bash
# 批量从转写 txt 重新生成场景梳理 HTML
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TXT_FILES=("$@")
if [ ${#TXT_FILES[@]} -eq 0 ]; then
  echo "用法: batch-scenario-from-txt.sh /path/a.txt /path/b.txt ..."
  exit 2
fi

ok=0
fail=0
for txt in "${TXT_FILES[@]}"; do
  echo ""
  echo "========================================"
  echo ">>> $(basename "$txt")"
  echo "========================================"
  if npm run scenario:from-txt -- --html-only "$txt"; then
    ok=$((ok + 1))
  else
    echo "❌ 失败: $txt" >&2
    fail=$((fail + 1))
  fi
done

echo ""
echo "完成: 成功 $ok, 失败 $fail"
