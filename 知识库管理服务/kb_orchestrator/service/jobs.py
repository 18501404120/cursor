from __future__ import annotations

import threading
import time
import uuid
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..env import load_dotenv, resolve_api_key
from ..orchestrator import KnowledgeBaseOrchestrator, OrchestratorConfig
from ..paths import WorkspacePaths
from ..progress import load_progress, summarize_progress
from ..state import load_state


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


@dataclass
class LogEvent:
    seq: int
    ts: str
    kind: str  # info | stream | result | error
    text: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class JobRecord:
    id: str
    system_name: str
    mode: str
    status: str = "queued"  # queued|running|finished|failed|stopped|wait_user
    exit_code: int | None = None
    created_at: str = field(default_factory=_now)
    started_at: str | None = None
    finished_at: str | None = None
    config: dict[str, Any] = field(default_factory=dict)
    result_summary: str = ""
    error: str = ""
    agent_id: str | None = None
    run_turns: int = 0
    cumulative_tokens: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class JobManager:
    """单任务管理器：后台线程跑编排器，日志缓冲供 SSE 拉取。"""

    def __init__(self, *, max_log_events: int = 5000) -> None:
        self._lock = threading.RLock()
        self._cond = threading.Condition(self._lock)
        self._job: JobRecord | None = None
        self._orchestrator: KnowledgeBaseOrchestrator | None = None
        self._thread: threading.Thread | None = None
        self._logs: deque[LogEvent] = deque(maxlen=max_log_events)
        self._seq = 0

    def current_job(self) -> JobRecord | None:
        with self._lock:
            return self._job

    def list_logs(self, after_seq: int = 0) -> list[LogEvent]:
        with self._lock:
            return [e for e in self._logs if e.seq > after_seq]

    def wait_logs(self, after_seq: int, timeout: float = 15.0) -> list[LogEvent]:
        deadline = time.time() + timeout
        with self._cond:
            while True:
                events = [e for e in self._logs if e.seq > after_seq]
                if events:
                    return events
                remaining = deadline - time.time()
                if remaining <= 0:
                    return []
                self._cond.wait(timeout=remaining)

    def _append(self, kind: str, text: str) -> None:
        with self._cond:
            self._seq += 1
            event = LogEvent(seq=self._seq, ts=_now(), kind=kind, text=text)
            self._logs.append(event)
            if self._job is not None:
                if kind == "error" and not self._job.error:
                    self._job.error = text[:500]
            self._cond.notify_all()

    def start(self, config: OrchestratorConfig) -> JobRecord:
        with self._lock:
            if self._job and self._job.status in {"queued", "running"}:
                raise RuntimeError("已有任务在运行，请先停止或等待结束")
            job = JobRecord(
                id=str(uuid.uuid4())[:8],
                system_name=config.system_name,
                mode=config.mode,
                status="queued",
                config={
                    "model": config.model,
                    "max_turns_per_session": config.max_turns_per_session,
                    "max_total_turns": config.max_total_turns,
                    "max_stagnant_turns": config.max_stagnant_turns,
                    "max_total_tokens": config.max_total_tokens,
                    "dry_run": config.dry_run,
                },
            )
            self._job = job
            self._logs.clear()
            self._seq = 0

        self._append("info", f"任务已创建 id={job.id} system={job.system_name} mode={job.mode}")
        self._thread = threading.Thread(
            target=self._run_job,
            args=(job.id, config),
            name=f"kb-job-{job.id}",
            daemon=True,
        )
        self._thread.start()
        return job

    def stop(self) -> JobRecord | None:
        with self._lock:
            job = self._job
            orch = self._orchestrator
            if job is None or job.status not in {"queued", "running"}:
                return job
            self._append("info", "收到停止请求…")
            if orch is not None:
                orch.request_stop()
            return job

    def _run_job(self, job_id: str, config: OrchestratorConfig) -> None:
        load_dotenv(override=True)
        if not resolve_api_key() and not config.dry_run:
            with self._lock:
                if self._job and self._job.id == job_id:
                    self._job.status = "failed"
                    self._job.exit_code = 1
                    self._job.finished_at = _now()
                    self._job.error = "未设置 CURSOR_API_KEY（请配置 .env）"
            self._append("error", "未设置 CURSOR_API_KEY（请配置 本地/知识库管理服务/.env）")
            return

        with self._lock:
            if self._job and self._job.id == job_id:
                self._job.status = "running"
                self._job.started_at = _now()

        orch = KnowledgeBaseOrchestrator(
            config,
            log=lambda msg: self._append("info", msg),
            on_stream=lambda chunk: self._append("stream", chunk),
            echo_stdout=False,
            install_signals=False,
        )
        with self._lock:
            self._orchestrator = orch

        exit_code = 1
        try:
            exit_code = orch.run()
        except Exception as exc:  # noqa: BLE001
            self._append("error", f"任务异常: {exc}")
            exit_code = 1
        finally:
            with self._lock:
                self._orchestrator = None
                if self._job and self._job.id == job_id:
                    self._job.exit_code = exit_code
                    self._job.finished_at = _now()
                    self._job.agent_id = orch.state.agent_id
                    self._job.run_turns = orch.state.run_turns
                    self._job.cumulative_tokens = orch.state.cumulative_tokens
                    if exit_code == 0:
                        self._job.status = "finished"
                        self._job.result_summary = "任务完成"
                    elif exit_code == 3:
                        self._job.status = "wait_user"
                        self._job.result_summary = "等待人工确认（未识别标准反问或需介入）"
                    elif exit_code == 4:
                        self._job.status = "failed"
                        self._job.result_summary = "熔断停止"
                    elif exit_code == 130:
                        self._job.status = "stopped"
                        self._job.result_summary = "用户停止"
                    else:
                        self._job.status = "failed"
                        self._job.result_summary = f"失败 exit={exit_code}"
            self._append(
                "result",
                f"任务结束 status={self._job.status if self._job else '?'} "
                f"exit={exit_code} turns={orch.state.run_turns} "
                f"tokens≈{orch.state.cumulative_tokens}",
            )


def list_systems(erp_root=None) -> list[dict[str, Any]]:
    from ..progress import status_label

    paths = WorkspacePaths.resolve(erp_root)
    product = paths.erp_root / "ERP_product"
    items: list[dict[str, Any]] = []
    if not product.is_dir():
        return items
    for child in sorted(product.iterdir(), key=lambda p: p.name):
        if not child.is_dir() or child.name.startswith("."):
            continue
        # 跳过非系统目录（如 README 旁的杂项）
        if child.name in {"README.md"} or child.suffix:
            continue
        kb = child / "知识库"
        progress = load_progress(kb / "run-progress.md", child.name) if kb.is_dir() else None
        state = load_state(kb / ".kb-orchestrator-state.json") if kb.is_dir() else None
        last_sync = None
        if progress and progress.exists:
            for line in progress.text.splitlines():
                if line.strip().startswith("last_sync_time"):
                    last_sync = line.split(":", 1)[-1].strip()
                    break
        items.append(
            {
                "name": child.name,
                "has_kb": kb.is_dir(),
                "status": status_label(progress, has_kb=kb.is_dir()),
                "progress_summary": summarize_progress(progress)
                if progress
                else "尚未初始化",
                "looks_complete": bool(progress and progress.looks_complete),
                "orchestrator_status": state.status if state else None,
                "last_sync": last_sync,
            }
        )
    return items


_SKIP_NAMES = {
    ".git",
    ".github",
    "__pycache__",
    ".DS_Store",
    "node_modules",
    ".venv",
}


def list_system_tree(
    system_name: str,
    *,
    erp_root=None,
    max_depth: int = 4,
    max_entries: int = 800,
) -> dict[str, Any]:
    """列出系统目录下的文件夹/文件树（默认看 ERP_product/系统名）。"""
    name = system_name.strip()
    if not name or "/" in name or "\\" in name:
        raise ValueError("系统名不合法")

    paths = WorkspacePaths.resolve(erp_root)
    root = paths.system_dir(name)
    if not root.exists():
        raise FileNotFoundError(f"系统目录不存在: {name}")
    if not root.is_dir():
        raise ValueError(f"不是目录: {name}")

    root = root.resolve()
    count = 0

    def walk(path: Path, depth: int) -> list[dict[str, Any]]:
        nonlocal count
        nodes: list[dict[str, Any]] = []
        if depth > max_depth or count >= max_entries:
            return nodes
        try:
            children = sorted(
                path.iterdir(),
                key=lambda p: (not p.is_dir(), p.name.lower()),
            )
        except OSError:
            return nodes
        for child in children:
            if count >= max_entries:
                break
            if child.name in _SKIP_NAMES:
                continue
            # 隐藏目录默认跳过；编排状态文件保留可见
            if child.name.startswith(".") and child.name != ".kb-orchestrator-state.json":
                continue
            count += 1
            rel = str(child.relative_to(root)).replace("\\", "/")
            if child.is_dir():
                nodes.append(
                    {
                        "name": child.name,
                        "path": rel,
                        "type": "dir",
                        "children": walk(child, depth + 1),
                    }
                )
            else:
                try:
                    size = child.stat().st_size
                except OSError:
                    size = 0
                nodes.append(
                    {
                        "name": child.name,
                        "path": rel,
                        "type": "file",
                        "size": size,
                        "ext": child.suffix.lower(),
                    }
                )
        return nodes

    return {
        "system": name,
        "root": str(root),
        "truncated": count >= max_entries,
        "tree": walk(root, 0),
    }


def read_system_file(
    system_name: str,
    rel_path: str,
    *,
    erp_root=None,
    max_bytes: int = 200_000,
) -> dict[str, Any]:
    """安全读取系统目录内文本文件。"""
    name = system_name.strip()
    if not name or "/" in name or "\\" in name:
        raise ValueError("系统名不合法")
    paths = WorkspacePaths.resolve(erp_root)
    root = paths.system_dir(name).resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"系统目录不存在: {name}")

    rel = (rel_path or "").strip().lstrip("/").replace("\\", "/")
    if not rel or ".." in rel.split("/"):
        raise ValueError("文件路径不合法")
    target = (root / rel).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError("禁止访问系统目录之外的路径") from exc
    if not target.is_file():
        raise FileNotFoundError(f"文件不存在: {rel}")

    raw = target.read_bytes()
    truncated = len(raw) > max_bytes
    data = raw[:max_bytes]
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = data.decode("utf-8", errors="replace")
        binary = True
    else:
        binary = False
    return {
        "system": name,
        "path": rel,
        "size": target.stat().st_size,
        "truncated": truncated,
        "binary": binary,
        "content": text,
    }


def create_system(system_name: str, erp_root=None) -> dict[str, Any]:
    """在 ERP_product 下创建新系统目录，便于随后 init。"""
    name = system_name.strip()
    if not name:
        raise ValueError("系统名不能为空")
    if "/" in name or "\\" in name or name in {".", ".."}:
        raise ValueError("系统名不合法")
    if name.startswith("."):
        raise ValueError("系统名不能以 . 开头")

    paths = WorkspacePaths.resolve(erp_root)
    system_dir = paths.system_dir(name)
    created = False
    if not system_dir.exists():
        system_dir.mkdir(parents=True, exist_ok=False)
        created = True
    elif not system_dir.is_dir():
        raise ValueError(f"已存在同名文件，无法创建目录: {name}")

    # 不预先建知识库子目录：交给 step0 按规范创建
    return {
        "name": name,
        "path": str(system_dir),
        "created": created,
        "has_kb": (system_dir / "知识库").is_dir(),
        "message": "已创建系统目录，可选择 init 启动初始化"
        if created
        else "系统目录已存在，可直接 init / resume / sync",
    }


def system_detail(system_name: str, erp_root=None) -> dict[str, Any]:
    from ..progress import status_label

    paths = WorkspacePaths.resolve(erp_root)
    progress = load_progress(paths.progress_file(system_name), system_name)
    state = load_state(paths.orchestrator_state_file(system_name))
    has_kb = paths.kb_root(system_name).is_dir()
    return {
        "name": system_name,
        "progress_path": str(paths.progress_file(system_name)),
        "status": status_label(progress, has_kb=has_kb),
        "progress_summary": summarize_progress(progress),
        "progress_text": progress.text if progress.exists else "",
        "looks_complete": progress.looks_complete,
        "orchestrator_state": state.to_dict() if state else None,
        "has_kb": has_kb,
    }
