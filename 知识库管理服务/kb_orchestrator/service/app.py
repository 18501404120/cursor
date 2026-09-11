from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ..env import load_dotenv, project_root, resolve_api_key
from ..orchestrator import OrchestratorConfig
from .git_sync import GitSyncError, git_sync_manager
from .jobs import (
    JobManager,
    create_system,
    list_system_tree,
    list_systems,
    read_system_file,
    system_detail,
)
from .settings_store import AppSettings, load_settings, save_settings

STATIC_DIR = Path(__file__).resolve().parent / "static"

load_dotenv(override=True)

app = FastAPI(title="ERP 知识库管理服务", version="0.1.0")
manager = JobManager()


class SettingsUpdate(BaseModel):
    model: str | None = None
    max_turns_per_session: int | None = Field(default=None, ge=1, le=100)
    max_total_turns: int | None = Field(default=None, ge=1, le=500)
    max_stagnant_turns: int | None = Field(default=None, ge=1, le=50)
    max_total_tokens: int | None = Field(default=None, ge=0)
    default_system: str | None = None
    default_mode: Literal["init", "resume", "sync"] | None = None
    favorite_systems: list[str] | None = None


class StartJobRequest(BaseModel):
    system_name: str
    mode: Literal["init", "resume", "sync"] = "sync"
    model: str | None = None
    max_turns_per_session: int | None = Field(default=None, ge=1, le=100)
    max_total_turns: int | None = Field(default=None, ge=1, le=500)
    max_stagnant_turns: int | None = Field(default=None, ge=1, le=50)
    max_total_tokens: int | None = Field(default=None, ge=0)
    dry_run: bool = False


class CreateSystemRequest(BaseModel):
    name: str
    start_init: bool = False


def _merge_config(body: StartJobRequest) -> OrchestratorConfig:
    defaults = load_settings()
    return OrchestratorConfig(
        system_name=body.system_name.strip(),
        mode=body.mode,
        model=body.model or defaults.model,
        max_turns_per_session=body.max_turns_per_session
        if body.max_turns_per_session is not None
        else defaults.max_turns_per_session,
        max_total_turns=body.max_total_turns
        if body.max_total_turns is not None
        else defaults.max_total_turns,
        max_stagnant_turns=body.max_stagnant_turns
        if body.max_stagnant_turns is not None
        else defaults.max_stagnant_turns,
        max_total_tokens=body.max_total_tokens
        if body.max_total_tokens is not None
        else defaults.max_total_tokens,
        dry_run=body.dry_run,
    )


@app.get("/api/health")
def health() -> dict[str, Any]:
    key_ok = bool(resolve_api_key())
    return {
        "ok": True,
        "api_key_configured": key_ok,
        "project_root": str(project_root()),
    }


@app.get("/api/systems")
def api_systems() -> dict[str, Any]:
    return {"items": list_systems()}


@app.post("/api/systems")
def api_create_system(body: CreateSystemRequest) -> dict[str, Any]:
    try:
        info = create_system(body.name)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    job = None
    if body.start_init:
        try:
            defaults = load_settings()
            job = manager.start(
                OrchestratorConfig(
                    system_name=info["name"],
                    mode="init",
                    model=defaults.model,
                    max_turns_per_session=defaults.max_turns_per_session,
                    max_total_turns=defaults.max_total_turns,
                    max_stagnant_turns=defaults.max_stagnant_turns,
                    max_total_tokens=defaults.max_total_tokens,
                )
            )
        except RuntimeError as exc:
            raise HTTPException(409, str(exc)) from exc
    return {"system": info, "job": job.to_dict() if job else None}


@app.get("/api/systems/{system_name}")
def api_system_detail(system_name: str) -> dict[str, Any]:
    return system_detail(system_name)


@app.get("/api/systems/{system_name}/tree")
def api_system_tree(system_name: str) -> dict[str, Any]:
    try:
        return list_system_tree(system_name)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/systems/{system_name}/file")
def api_system_file(
    system_name: str,
    path: str = Query(..., min_length=1, description="相对系统根的文件路径"),
) -> dict[str, Any]:
    try:
        return read_system_file(system_name, path)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/settings")
def api_get_settings() -> dict[str, Any]:
    return load_settings().to_dict()


@app.put("/api/settings")
def api_put_settings(body: SettingsUpdate) -> dict[str, Any]:
    current = load_settings()
    data = current.to_dict()
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            data[key] = value
    saved = save_settings(AppSettings.from_dict(data))
    return saved.to_dict()


@app.get("/api/jobs/current")
def api_current_job() -> dict[str, Any]:
    job = manager.current_job()
    return {"job": job.to_dict() if job else None}


@app.post("/api/jobs/start")
def api_start_job(body: StartJobRequest) -> dict[str, Any]:
    if not body.system_name.strip():
        raise HTTPException(400, "system_name 不能为空")
    try:
        config = _merge_config(body)
        job = manager.start(config)
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"job": job.to_dict()}


@app.post("/api/jobs/stop")
def api_stop_job() -> dict[str, Any]:
    job = manager.stop()
    return {"job": job.to_dict() if job else None}


@app.get("/api/jobs/logs")
def api_logs(after: int = Query(0, ge=0)) -> dict[str, Any]:
    events = manager.list_logs(after_seq=after)
    return {"events": [e.to_dict() for e in events]}


@app.get("/api/git/systems")
def api_git_systems() -> dict[str, Any]:
    try:
        return git_sync_manager.list_systems()
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/git/{system_key}/pull")
def api_git_pull(system_key: str) -> dict[str, Any]:
    try:
        return git_sync_manager.pull_latest(system_key)
    except GitSyncError as exc:
        status = 409 if exc.code == "busy" else 400
        if exc.code == "conflict":
            status = 409
        raise HTTPException(status, {"message": str(exc), "details": exc.details, "code": exc.code}) from exc


@app.post("/api/git/{system_key}/push")
def api_git_push(system_key: str) -> dict[str, Any]:
    try:
        return git_sync_manager.push_git(system_key)
    except GitSyncError as exc:
        if exc.code == "forbidden":
            raise HTTPException(403, str(exc)) from exc
        status = 409 if exc.code in {"busy", "conflict"} else 400
        raise HTTPException(status, {"message": str(exc), "details": exc.details, "code": exc.code}) from exc


@app.post("/api/git/{system_key}/merge-request")
def api_git_merge_request(system_key: str) -> dict[str, Any]:
    try:
        return git_sync_manager.request_merge_main(system_key)
    except GitSyncError as exc:
        if exc.code == "forbidden":
            raise HTTPException(403, str(exc)) from exc
        status = 409 if exc.code in {"busy", "conflict"} else 400
        raise HTTPException(status, {"message": str(exc), "details": exc.details, "code": exc.code}) from exc


@app.post("/api/git/{system_key}/fix-preview")
def api_git_fix_preview(system_key: str) -> dict[str, Any]:
    if system_key.strip() != "本地":
        raise HTTPException(403, "仅「本地」支持解决预览")
    try:
        return git_sync_manager.fix_local_preview()
    except GitSyncError as exc:
        if exc.code == "forbidden":
            raise HTTPException(403, str(exc)) from exc
        status = 409 if exc.code in {"busy", "conflict"} else 400
        raise HTTPException(status, {"message": str(exc), "details": exc.details, "code": exc.code}) from exc


@app.get("/api/jobs/stream")
async def api_stream(after: int = Query(0, ge=0)):
    async def gen():
        cursor = after
        # 先推当前任务快照
        job = manager.current_job()
        yield f"event: job\ndata: {json.dumps({'job': job.to_dict() if job else None}, ensure_ascii=False)}\n\n"
        while True:
            events = await asyncio.to_thread(manager.wait_logs, cursor, 12.0)
            if events:
                for event in events:
                    cursor = event.seq
                    yield f"event: log\ndata: {json.dumps(event.to_dict(), ensure_ascii=False)}\n\n"
                job = manager.current_job()
                yield f"event: job\ndata: {json.dumps({'job': job.to_dict() if job else None}, ensure_ascii=False)}\n\n"
            else:
                yield "event: ping\ndata: {}\n\n"
                job = manager.current_job()
                yield f"event: job\ndata: {json.dumps({'job': job.to_dict() if job else None}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run(
        "kb_orchestrator.service.app:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
    )


if __name__ == "__main__":
    main()
