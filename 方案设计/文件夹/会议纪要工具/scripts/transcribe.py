#!/usr/bin/env python3
"""FunASR 本地转写：单次模式（fallback）或供 transcribe_service 复用。"""

from __future__ import annotations

import json
import os
import sys
import traceback

_MODEL_CACHE = {}


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def ms_from_value(value) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        if value < 1000:
            return int(value * 1000)
        return int(value)
    return 0


def normalize_sentences(result_item: dict) -> list[dict]:
    sentences = result_item.get("sentence_info") or []
    out: list[dict] = []
    for sent in sentences:
        if not isinstance(sent, dict):
            continue
        text = (sent.get("text") or "").strip()
        if not text:
            continue
        start_ms = ms_from_value(
            sent.get("start")
            or sent.get("start_time")
            or (sent.get("ts_list", [0])[0] if sent.get("ts_list") else 0)
        )
        out.append({"start_ms": start_ms, "spk": sent.get("spk", 0), "text": text})
    if out:
        return out
    text = (result_item.get("text") or "").strip()
    if text:
        return [{"start_ms": 0, "spk": 0, "text": text}]
    return []


def load_model(model_name: str):
    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]
    try:
        from funasr import AutoModel
    except ImportError as exc:
        raise ImportError("未安装 funasr，请运行: npm run setup:python") from exc
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        if "incompatible architecture" in msg or "have 'arm64', need 'x86_64'" in msg:
            raise RuntimeError(
                "PyTorch 架构不匹配：请退出应用后重新打开，或执行 npm run setup:python 重装转写环境"
            ) from exc
        raise

    eprint("PROGRESS:load")
    model = AutoModel(
        model=model_name,
        vad_model="fsmn-vad",
        punc_model="ct-punc",
        spk_model="cam++",
        disable_update=True,
    )
    _MODEL_CACHE[model_name] = model
    return model


def transcribe_with_model(model, audio_path: str, model_name: str) -> dict:
    raw = model.generate(input=audio_path, batch_size_s=600, sentence_timestamp=True)
    sentences: list[dict] = []
    if isinstance(raw, list) and raw:
        first = raw[0] if isinstance(raw[0], dict) else {}
        sentences = normalize_sentences(first)
    elif isinstance(raw, dict):
        sentences = normalize_sentences(raw)
    speakers = sorted({s.get("spk", 0) for s in sentences})
    return {
        "ok": True,
        "sentences": sentences,
        "speaker_count": len(speakers),
        "model": model_name,
    }


def main() -> int:
    if len(sys.argv) < 2:
        eprint("用法: transcribe.py <audio.m4a|wav>")
        return 2

    audio_path = sys.argv[1]
    if not os.path.isfile(audio_path):
        eprint(f"文件不存在: {audio_path}")
        return 2

    model_name = os.environ.get("FUNASR_MODEL", "paraformer-zh")
    try:
        eprint("PROGRESS:prepare")
        eprint(f"加载 FunASR 模型: {model_name}")
        model = load_model(model_name)
        eprint("PROGRESS:transcribe")
        eprint(f"开始转写: {audio_path}")
        payload = transcribe_with_model(model, audio_path, model_name)
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    except Exception as exc:  # noqa: BLE001
        eprint(traceback.format_exc())
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
