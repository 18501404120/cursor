#!/usr/bin/env python3
"""FunASR 常驻转写服务：启动时加载模型一次，通过 stdin/stdout 收发 JSON 任务。"""

from __future__ import annotations

import json
import os
import sys
import traceback

from transcribe import load_model, transcribe_with_model, eprint


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main() -> int:
    model_name = os.environ.get("FUNASR_MODEL", "paraformer-zh")
    try:
        eprint(f"正在加载模型（仅首次较慢）: {model_name}")
        model = load_model(model_name)
        emit({"type": "ready", "ok": True, "model": model_name})
    except Exception as exc:  # noqa: BLE001
        emit({"type": "ready", "ok": False, "error": str(exc)})
        eprint(traceback.format_exc())
        return 1

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            audio_path = req.get("audio")
            if not audio_path or not os.path.isfile(audio_path):
                raise FileNotFoundError(f"音频不存在: {audio_path}")
            eprint(f"转写任务: {audio_path}")
            result = transcribe_with_model(model, audio_path, model_name)
            emit({"type": "result", "id": req_id, **result})
        except Exception as exc:  # noqa: BLE001
            eprint(traceback.format_exc())
            emit({"type": "result", "id": req_id, "ok": False, "error": str(exc)})

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
