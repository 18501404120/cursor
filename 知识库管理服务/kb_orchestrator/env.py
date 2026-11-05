from __future__ import annotations

import os
from pathlib import Path


def project_root() -> Path:
    # .../本地/知识库管理服务/kb_orchestrator/env.py → .../本地/知识库管理服务
    return Path(__file__).resolve().parents[1]


def load_dotenv(path: Path | None = None, *, override: bool = False) -> Path | None:
    """
    从本地 .env 加载环境变量（不依赖 python-dotenv）。
    默认读取 本地/知识库管理服务/.env；已存在于 os.environ 的键默认不覆盖。
    """
    env_path = path or (project_root() / ".env")
    if not env_path.is_file():
        return None

    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if not key:
            continue
        if not override and key in os.environ and os.environ[key]:
            continue
        os.environ[key] = value
    return env_path


def _is_placeholder_key(value: str) -> bool:
    v = value.strip()
    if not v:
        return True
    lowered = v.lower()
    if lowered in {
        "cursor_...",
        "crsr_...",
        "your_api_key",
        "changeme",
        "xxx",
        "todo",
    }:
        return True
    # 中文/说明性占位，尚未填入真实密钥
    for hint in ("填自己", "请填写", "请替换", "your key", "api key here"):
        if hint in lowered or hint in v:
            return True
    if v.endswith("..."):
        return True
    # 真实 Cursor 用户/服务密钥通常以 cursor_ / crsr_ 开头
    if not (v.startswith("cursor_") or v.startswith("crsr_")):
        return True
    return False


def resolve_api_key(explicit: str | None = None) -> str | None:
    if explicit:
        value = explicit.strip()
        return None if _is_placeholder_key(value) else value

    value = os.environ.get("CURSOR_API_KEY", "").strip()
    # shell 里若是占位符/空值，用项目 .env 覆盖后再读
    if _is_placeholder_key(value):
        load_dotenv(override=True)
        value = os.environ.get("CURSOR_API_KEY", "").strip()
    return None if _is_placeholder_key(value) else value
