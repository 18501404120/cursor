from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ProgressSnapshot:
    system_name: str
    path: Path
    text: str
    exists: bool

    @property
    def looks_complete(self) -> bool:
        if not self.exists:
            return False
        text = self.text
        markers = (
            "全部构建完成",
            "current_step: ✅ 全部构建完成",
            "| **总计** | **全部完成**",
        )
        if any(m in text for m in markers):
            return True
        # 表格型：构建进度区标注全部完成
        if "构建进度" in text and "**全部完成**" in text:
            return True
        return False

    def fingerprint(self) -> str:
        """用于停滞检测：优先抓关键进度字段，否则用全文 hash。"""
        if not self.exists:
            return "missing"
        keys = []
        for line in self.text.splitlines():
            s = line.strip()
            if s.startswith(
                (
                    "current_step",
                    "current_module",
                    "current_page",
                    "last_updated",
                    "web_synced_commit",
                    "backend_synced_commit",
                    "last_sync_time",
                )
            ):
                keys.append(re.sub(r"\s+", " ", s))
        payload = "\n".join(keys) if keys else self.text
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def load_progress(path: Path, system_name: str) -> ProgressSnapshot:
    if path.is_file():
        return ProgressSnapshot(
            system_name=system_name,
            path=path,
            text=path.read_text(encoding="utf-8"),
            exists=True,
        )
    return ProgressSnapshot(system_name=system_name, path=path, text="", exists=False)


def load_optional_text(path: Path) -> str | None:
    if path.is_file():
        return path.read_text(encoding="utf-8")
    return None


def summarize_progress(snapshot: ProgressSnapshot) -> str:
    if not snapshot.exists:
        return "尚未初始化"
    lines = [ln.strip() for ln in snapshot.text.splitlines() if ln.strip()]
    interesting = []
    for ln in lines:
        if ln.startswith(("current_step", "current_module", "current_page", "last_updated")):
            interesting.append(ln)
    if not interesting:
        # 质量系统等表格型进度：不把全文塞进摘要
        if snapshot.looks_complete:
            return "全部完成"
        return "已有进度文件"
    return " | ".join(interesting[:6])


def status_label(snapshot: ProgressSnapshot | None, *, has_kb: bool) -> str:
    """左侧列表用的短状态，避免展示大段进度原文。"""
    if not has_kb:
        return "未建库"
    if snapshot is None or not snapshot.exists:
        return "未初始化"
    if snapshot.looks_complete:
        return "已完成"
    # 尽量抽出当前阶段/页面
    for line in snapshot.text.splitlines():
        s = line.strip()
        if s.startswith("current_step:"):
            value = s.split(":", 1)[-1].strip()
            value = value.replace("✅", "").strip()
            return value[:24] if value else "进行中"
        if s.startswith("current_page:"):
            value = s.split(":", 1)[-1].strip()
            if value and "全部" not in value:
                return f"页面·{value[:18]}"
    if "进行中" in snapshot.text:
        return "进行中"
    return "进行中"
