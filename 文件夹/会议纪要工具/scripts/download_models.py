#!/usr/bin/env python3
"""预下载 FunASR 模型（首次约 1GB，避免录音结束后长时间无反馈）。"""

from __future__ import annotations

import os
import sys

# 与 transcribe.py 同目录，便于复用 load_model
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from transcribe import eprint, load_model  # noqa: E402


def main() -> int:
    model_name = os.environ.get("FUNASR_MODEL", "paraformer-zh")
    eprint(f"开始下载/加载模型: {model_name}（首次约 1GB，请保持网络畅通）")
    eprint("PROGRESS:prepare")
    try:
        load_model(model_name)
    except Exception as exc:  # noqa: BLE001
        eprint(f"模型下载失败: {exc}", file=sys.stderr)
        return 1
    eprint("PROGRESS:done")
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
