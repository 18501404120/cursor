#!/usr/bin/env python3
"""FunASR 本地转写：输出 JSON 到 stdout 最后一行。"""

from __future__ import annotations

import json
import os
import sys
import traceback


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def ms_from_value(value) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        # FunASR 有的字段是毫秒，有的是秒
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
        start_ms = ms_from_value(sent.get("start") or sent.get("start_time") or sent.get("ts_list", [0])[0] if sent.get("ts_list") else 0)
        out.append(
            {
                "start_ms": start_ms,
                "spk": sent.get("spk", 0),
                "text": text,
            }
        )
    if out:
        return out

    # 兜底：整段文本无 sentence_info 时
    text = (result_item.get("text") or "").strip()
    if text:
        return [{"start_ms": 0, "spk": 0, "text": text}]
    return []


def main() -> int:
    if len(sys.argv) < 2:
        eprint("用法: transcribe.py <audio.wav>")
        return 2

    audio_path = sys.argv[1]
    if not os.path.isfile(audio_path):
        eprint(f"文件不存在: {audio_path}")
        return 2

    model_name = os.environ.get("FUNASR_MODEL", "paraformer-zh")

    try:
        from funasr import AutoModel
    except ImportError:
        eprint("未安装 funasr，请运行: npm run setup:python")
        return 3

    eprint(f"加载 FunASR 模型（首次较慢）: {model_name}")
    model = AutoModel(
        model=model_name,
        vad_model="fsmn-vad",
        punc_model="ct-punc",
        spk_model="cam++",
    )

    eprint(f"开始转写: {audio_path}")
    raw = model.generate(input=audio_path, batch_size_s=300, sentence_timestamp=True)

    sentences: list[dict] = []
    if isinstance(raw, list) and raw:
        first = raw[0] if isinstance(raw[0], dict) else {}
        sentences = normalize_sentences(first)
    elif isinstance(raw, dict):
        sentences = normalize_sentences(raw)

    speakers = sorted({s.get("spk", 0) for s in sentences})
    payload = {
        "ok": True,
        "sentences": sentences,
        "speaker_count": len(speakers),
        "model": model_name,
    }
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        eprint(traceback.format_exc())
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        raise SystemExit(1)
