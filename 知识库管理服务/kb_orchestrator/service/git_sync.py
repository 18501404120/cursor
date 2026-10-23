from __future__ import annotations

import http.client
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from ..env import load_dotenv, project_root
from ..paths import WorkspacePaths
from .preview_tree import refresh_preview_trees

LOCAL_SYSTEM_KEY = "本地"
CODE_REPO_BACKEND = "ERP_backend"
CODE_REPO_FRONTEND = "ERP_frontend"
CODE_REPO_KEYS = frozenset({CODE_REPO_BACKEND, CODE_REPO_FRONTEND})
ERP_PRODUCT_PUSH_BRANCH = "feature-chengkaiwu-xiaoshou"
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")
VS_MAIN_COMPARE_HOUR = 10
_VS_MAIN_IO_LOCK = threading.Lock()

GIT_PUSH_SYSTEMS = frozenset(
    {
        "销售系统",
        "GTM系统",
        "自营系统",
        "商超系统",
        "分销系统",
        "产品系统",
        LOCAL_SYSTEM_KEY,
    }
)

# 各系统知识库均推送到同一分支（与 ERP_product 当前工作分支一致）
SYSTEM_BRANCH_MAP: dict[str, str] = {
    name: ERP_PRODUCT_PUSH_BRANCH
    for name in GIT_PUSH_SYSTEMS
    if name != LOCAL_SYSTEM_KEY
}

LOCAL_PREVIEW_BASE_URL = "https://18501404120.github.io/cursor/"
LOCAL_PAGES_STAMP_URL = f"{LOCAL_PREVIEW_BASE_URL}.pages-deploy-stamp"
LOCAL_PREVIEW_WAIT_SEC = 180
LOCAL_PREVIEW_POLL_SEC = 8


def _is_sensitive_git_path(rel_path: str) -> bool:
    """排除真实密钥文件，不误伤 *.env.example 等模板。"""
    name = Path(rel_path).name.lower()
    if name in {".env", "credentials.json"}:
        return True
    if name.endswith(".pem"):
        return True
    if name.endswith(".env") and not name.endswith(".env.example"):
        return True
    return False


class GitSyncError(Exception):
    def __init__(self, message: str, *, details: str = "", code: str = "git_error") -> None:
        super().__init__(message)
        self.details = details
        self.code = code


@dataclass
class GitCommandResult:
    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0

    @property
    def text(self) -> str:
        return (self.stdout or self.stderr).strip()


def _now_label() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _now_shanghai() -> datetime:
    return datetime.now(SHANGHAI_TZ)


def _vs_main_snapshot_path() -> Path:
    return project_root() / "data" / "vs-main-snapshot.json"


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=SHANGHAI_TZ)
    return parsed.astimezone(SHANGHAI_TZ)


def _vs_main_slot_start(now: datetime | None = None) -> datetime:
    """当前应展示的对比窗口起点：已过今日 10:00 则为今日 10:00，否则为昨日 10:00。"""
    now = now or _now_shanghai()
    today_slot = now.replace(
        hour=VS_MAIN_COMPARE_HOUR, minute=0, second=0, microsecond=0
    )
    if now >= today_slot:
        return today_slot
    return today_slot - timedelta(days=1)


def _vs_main_next_slot(now: datetime | None = None) -> datetime:
    return _vs_main_slot_start(now) + timedelta(days=1)


def _vs_main_snapshot_due(
    compared_at: datetime | None, now: datetime | None = None
) -> bool:
    now = now or _now_shanghai()
    if compared_at is None:
        return True
    if compared_at.tzinfo is None:
        compared_at = compared_at.replace(tzinfo=SHANGHAI_TZ)
    return compared_at.astimezone(SHANGHAI_TZ) < _vs_main_slot_start(now)


def _load_vs_main_snapshot() -> dict[str, Any]:
    path = _vs_main_snapshot_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, TypeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _save_vs_main_snapshot(snapshot: dict[str, Any]) -> None:
    path = _vs_main_snapshot_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _snapshot_compared_at(snapshot: dict[str, Any] | None = None) -> datetime | None:
    snap = snapshot if snapshot is not None else _load_vs_main_snapshot()
    return _parse_iso_datetime(str(snap.get("compared_at") or "") or None)


def _with_vs_main_meta(vs: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]:
    result = dict(vs)
    compared_at = snapshot.get("compared_at")
    if compared_at:
        result["compared_at"] = compared_at
        result["cached"] = True
    result["next_compare_at"] = _vs_main_next_slot().isoformat()
    return result


def _capture_vs_main_snapshot(paths: WorkspacePaths) -> dict[str, Any]:
    product: dict[str, Any] = {"ahead": None, "behind": None, "fetched": False}
    local: dict[str, Any] = {"ahead": None, "behind": None, "fetched": False}

    product_repo = paths.erp_product_dir
    if _is_git_repo(product_repo):
        fetched = _fetch_origin_refs(product_repo, "main", ERP_PRODUCT_PUSH_BRANCH)
        if not fetched:
            fetched = bool(
                _fetch_origin_ref(product_repo, "main")
                and _fetch_origin_ref(product_repo, ERP_PRODUCT_PUSH_BRANCH)
            )
        feature_ref = _feature_head_ref(product_repo)
        behind, ahead = (None, None)
        if feature_ref:
            behind, ahead = _ahead_behind(product_repo, "origin/main", feature_ref)
        product = {"ahead": ahead, "behind": behind, "fetched": fetched}

    local_repo = paths.local_dir
    if _is_git_repo(local_repo):
        fetched = _fetch_origin_ref(local_repo, "main")
        behind, ahead = _ahead_behind(local_repo, "origin/main", "HEAD")
        local = {"ahead": ahead, "behind": behind, "fetched": fetched}

    snapshot = {
        "compared_at": _now_shanghai().isoformat(),
        "product": product,
        "local": local,
    }
    _save_vs_main_snapshot(snapshot)
    return snapshot


def _ensure_vs_main_snapshot(
    paths: WorkspacePaths, *, force: bool = False, busy: bool = False
) -> dict[str, Any]:
    with _VS_MAIN_IO_LOCK:
        snapshot = _load_vs_main_snapshot()
        if not force and not _vs_main_snapshot_due(_snapshot_compared_at(snapshot)):
            return snapshot
        if busy and not force:
            return snapshot
        return _capture_vs_main_snapshot(paths)


def _erp_push_branch(_system_key: str) -> str:
    return ERP_PRODUCT_PUSH_BRANCH


def _load_github_token() -> str:
    load_dotenv(override=True)
    return os.environ.get("GITHUB_TOKEN", "").strip()


def _parse_github_repo(remote_url: str) -> tuple[str, str] | None:
    patterns = [
        re.compile(r"git@[^:]+:([^/]+)/(.+?)(?:\.git)?$"),
        re.compile(r"https://[^/]+/([^/]+)/(.+?)(?:\.git)?$"),
    ]
    for pattern in patterns:
        match = pattern.search(remote_url.strip())
        if match:
            return match.group(1), match.group(2)
    return None


def _github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


_TRANSIENT_HTTP_CODES = frozenset({429, 500, 502, 503, 504})


def _github_error_is_fatal(exc: GitSyncError) -> bool:
    text = f"{exc} {exc.details or ''}"
    return any(f"（{code}）" in text for code in (401, 403, 404, 422))


def _github_open_json(
    req: urllib.request.Request,
    *,
    timeout: int,
    attempts: int = 3,
) -> Any:
    """读取 GitHub JSON。响应被截断（IncompleteRead）或瞬时 5xx 时重试。"""
    delay = 0.4
    last: BaseException | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
        except urllib.error.HTTPError as exc:
            if exc.code in _TRANSIENT_HTTP_CODES and attempt + 1 < attempts:
                last = exc
                try:
                    exc.read()
                except Exception:
                    pass
                time.sleep(delay)
                delay = min(delay * 2, 2.0)
                continue
            raise
        except (
            urllib.error.URLError,
            TimeoutError,
            http.client.HTTPException,
            ConnectionError,
            json.JSONDecodeError,
        ) as exc:
            last = exc
            if attempt + 1 >= attempts:
                raise GitSyncError(
                    "GitHub API 请求失败",
                    details=str(exc),
                    code="github_api",
                ) from exc
            time.sleep(delay)
            delay = min(delay * 2, 2.0)
    raise GitSyncError(
        "GitHub API 请求失败",
        details=str(last) if last else "empty response",
        code="github_api",
    )


def _github_request(
    method: str,
    url: str,
    token: str,
    payload: dict[str, Any] | None = None,
    *,
    timeout: int = 30,
) -> Any:
    data = None
    headers = _github_headers(token)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        return _github_open_json(req, timeout=timeout)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(detail)
            message = parsed.get("message") or detail
        except json.JSONDecodeError:
            message = detail or str(exc)
        raise GitSyncError(
            f"GitHub API 请求失败（{exc.code}）",
            details=message,
            code="github_api",
        ) from exc


def _github_login(token: str) -> str:
    try:
        user = _github_request("GET", "https://api.github.com/user", token)
    except GitSyncError:
        return ""
    if isinstance(user, dict):
        return str(user.get("login") or "").strip()
    return ""


def _ensure_github_repo_access(owner: str, name: str, token: str) -> None:
    try:
        _github_request("GET", f"https://api.github.com/repos/{owner}/{name}", token)
    except GitSyncError as exc:
        if "404" not in str(exc) and "Not Found" not in (exc.details or ""):
            raise
        login = _github_login(token)
        who = f"当前 token 用户是 `{login}`" if login else "当前 token 已配置但无法识别用户"
        raise GitSyncError(
            f"无权访问 GitHub 仓库 {owner}/{name}",
            details=(
                f"{who}。GitHub 对无权限的私有仓会返回 404 Not Found。\n"
                "请更换能访问该仓的 GITHUB_TOKEN：fine-grained 需把资源所有者选为对应组织，"
                "仓库勾选目标仓，权限至少 Pull requests: Read and write。"
            ),
            code="github_repo_forbidden",
        ) from exc


def _github_graphql(token: str, query: str, variables: dict[str, Any]) -> dict[str, Any]:
    payload = {"query": query, "variables": variables}
    result = _github_request("POST", "https://api.github.com/graphql", token, payload)
    if not isinstance(result, dict):
        raise GitSyncError("GitHub GraphQL 返回异常", code="github_api")
    if result.get("errors"):
        messages = "; ".join(
            str(item.get("message") or item) for item in result["errors"] if item
        )
        raise GitSyncError("GitHub GraphQL 请求失败", details=messages, code="github_api")
    data = result.get("data")
    if not isinstance(data, dict):
        raise GitSyncError("GitHub GraphQL 返回异常", code="github_api")
    return data


def _http_get_text(url: str, *, timeout: int = 20) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "kb-orchestrator-pages-check",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _github_api_get(path: str, token: str = "") -> Any:
    url = path if path.startswith("https://") else f"https://api.github.com/{path.lstrip('/')}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "kb-orchestrator-pages-check",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        return _github_open_json(req, timeout=30)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise GitSyncError(
            f"GitHub API 请求失败（{exc.code}）",
            details=detail,
            code="github_api",
        ) from exc


def _github_api_get_soft(path: str, token: str = "") -> Any | None:
    """预览轮询用。瞬时失败返回 None；鉴权或权限错误继续抛出。"""
    try:
        return _github_api_get(path, token)
    except GitSyncError as exc:
        if _github_error_is_fatal(exc):
            raise
        return None


def _utc_now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _local_repo_slug(repo: Path) -> tuple[str, str]:
    remote_url = _run_git(["remote", "get-url", "origin"], repo, check=False).stdout.strip()
    parsed = _parse_github_repo(remote_url) if remote_url else None
    if not parsed:
        raise GitSyncError("无法解析本地仓库的 GitHub 地址", details=remote_url)
    return parsed


def _actions_url(owner: str, name: str, run_id: int | None = None) -> str:
    base = f"https://github.com/{owner}/{name}/actions"
    if run_id:
        return f"{base}/runs/{run_id}"
    return base


def _find_workflow_run(
    owner: str,
    name: str,
    *,
    workflow_name: str,
    token: str = "",
    head_sha: str = "",
    branch: str = "",
    since_iso: str = "",
) -> dict[str, Any] | None:
    query = f"repos/{owner}/{name}/actions/runs?per_page=30&exclude_pull_requests=true"
    if branch:
        query += f"&branch={branch}"
    data = _github_api_get_soft(query, token)
    runs = data.get("workflow_runs") if isinstance(data, dict) else None
    if not isinstance(runs, list):
        return None
    matched: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        if run.get("name") != workflow_name:
            continue
        if head_sha:
            run_sha = str(run.get("head_sha") or "")
            if run_sha != head_sha and not run_sha.startswith(head_sha[:7]):
                continue
        if since_iso and str(run.get("created_at") or "") < since_iso:
            continue
        matched.append(run)
    if not matched:
        return None
    matched.sort(key=lambda r: str(r.get("created_at") or ""), reverse=True)
    return matched[0]


def _live_stamp_matches(head_sha: str) -> tuple[bool, str]:
    try:
        text = _http_get_text(LOCAL_PAGES_STAMP_URL)
    except Exception as exc:  # noqa: BLE001 - 预览探测需吞掉网络异常
        return False, f"读取线上 stamp 失败: {exc}"
    ok = f"sha={head_sha}" in text
    return ok, text.strip()


def _run_git(
    args: list[str],
    cwd: Path,
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    global_config: list[str] | None = None,
) -> GitCommandResult:
    proc_env = os.environ.copy()
    if env:
        proc_env.update(env)
    prefix: list[str] = []
    if global_config:
        for item in global_config:
            prefix.extend(["-c", item])
    proc = subprocess.run(
        ["git", *prefix, *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        env=proc_env,
    )
    result = GitCommandResult(proc.returncode, proc.stdout, proc.stderr)
    if check and not result.ok:
        detail = result.text or f"git {' '.join(args)} failed"
        raise GitSyncError(detail, details=result.stderr.strip())
    return result


def _stash_wip(repo: Path, message: str) -> tuple[bool, list[str]]:
    """暂存工作区变更（含未跟踪文件），避免 merge 时 untracked 被覆盖报错。"""
    logs: list[str] = []
    if _count_changes(repo) == 0:
        return False, logs
    stash = _run_git(
        ["stash", "push", "--include-untracked", "-m", message],
        repo,
        check=False,
    )
    combined = f"{stash.stdout}\n{stash.stderr}"
    if "No local changes" in combined:
        return False, logs
    if not stash.ok:
        raise GitSyncError("暂存本地变更失败，请手动 stash 后再拉取", details=stash.text)
    if _count_changes(repo) > 0:
        raise GitSyncError(
            "工作区仍有未暂存变更，无法安全拉取",
            details=_run_git(["status", "--short"], repo, check=False).stdout,
        )
    logs.append("已暂存本地工作区变更（含未跟踪文件）")
    return True, logs


def _restore_stash(repo: Path) -> tuple[bool, str]:
    pop = _run_git(["stash", "pop"], repo, check=False)
    if pop.ok:
        return True, "已恢复拉取前的本地变更"
    return False, pop.text or "stash pop 失败，请手动 git stash list 查看"


def _is_git_repo(path: Path) -> bool:
    result = _run_git(["rev-parse", "--is-inside-work-tree"], path, check=False)
    return result.ok and result.stdout.strip() == "true"


def _current_branch(repo: Path) -> str:
    result = _run_git(["branch", "--show-current"], repo, check=False)
    if result.ok and result.stdout.strip():
        return result.stdout.strip()
    return "HEAD"


def _count_changes(repo: Path, rel_path: str | None = None) -> int:
    args = ["status", "--short"]
    if rel_path:
        args.extend(["--", rel_path])
    result = _run_git(args, repo, check=False)
    if not result.ok:
        return 0
    return len([line for line in result.stdout.splitlines() if line.strip()])


def _branch_tracking(
    repo: Path, branch: str, *, fetch: bool = False
) -> dict[str, int | str | None]:
    if fetch:
        fetch_result = _run_git(["fetch", "origin", branch], repo, check=False)
        if not fetch_result.ok:
            _run_git(["fetch", "origin"], repo, check=False)
    behind, ahead = _ahead_behind(repo, f"origin/{branch}", branch)
    return {
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
    }


def _fetch_origin_ref(repo: Path, ref: str = "main") -> bool:
    return _run_git(["fetch", "origin", ref], repo, check=False).ok


def _fetch_origin_refs(repo: Path, *refs: str) -> bool:
    if not refs:
        return _fetch_origin_ref(repo, "main")
    return _run_git(["fetch", "origin", *refs], repo, check=False).ok


def _ref_exists(repo: Path, ref: str) -> bool:
    return _run_git(["rev-parse", "--verify", ref], repo, check=False).ok


def _feature_head_ref(repo: Path) -> str | None:
    origin_ref = f"origin/{ERP_PRODUCT_PUSH_BRANCH}"
    if _ref_exists(repo, origin_ref):
        return origin_ref
    if _ref_exists(repo, ERP_PRODUCT_PUSH_BRANCH):
        return ERP_PRODUCT_PUSH_BRANCH
    return None


def _ahead_behind(
    repo: Path, left_ref: str, right_ref: str = "HEAD"
) -> tuple[int | None, int | None]:
    """left...right：左为 left 有而 right 无，右为 right 有而 left 无。"""
    result = _run_git(
        ["rev-list", "--left-right", "--count", f"{left_ref}...{right_ref}"],
        repo,
        check=False,
    )
    if not result.ok:
        return None, None
    parts = result.stdout.strip().split()
    if len(parts) != 2:
        return None, None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None, None


def _format_vs_main(
    ahead: int | None,
    behind: int | None,
    *,
    fetched: bool,
    can_merge: bool,
    can_push: bool = False,
) -> dict[str, Any]:
    if ahead is None or behind is None:
        return {
            "ahead": ahead,
            "behind": behind,
            "fetched": fetched,
            "state": "unknown",
            "label": "无法比较",
            "hint": "unknown",
        }
    if behind == 0 and ahead == 0:
        state, label, hint = "synced", "已同步", "synced"
    elif behind > 0 and ahead == 0:
        state, label, hint = "behind", f"落后 {behind} · 建议拉取", "pull"
    elif ahead > 0 and behind == 0:
        state = "ahead"
        if can_merge:
            label, hint = f"超前 {ahead} · 可合并", "merge"
        elif can_push:
            label, hint = f"超前 {ahead} · 可推送", "push"
        else:
            label, hint = f"超前 {ahead}", "synced"
    else:
        state, label, hint = (
            "diverged",
            f"分叉：超前 {ahead} · 落后 {behind} · 先拉取",
            "pull",
        )
    return {
        "ahead": ahead,
        "behind": behind,
        "fetched": fetched,
        "state": state,
        "label": label,
        "hint": hint,
    }


def _compare_to_origin_main(
    repo: Path,
    *,
    can_merge: bool,
    can_push: bool = False,
    do_fetch: bool = True,
) -> dict[str, Any]:
    fetched = _fetch_origin_ref(repo, "main") if do_fetch else True
    behind, ahead = _ahead_behind(repo, "origin/main", "HEAD")
    return _format_vs_main(
        ahead,
        behind,
        fetched=fetched,
        can_merge=can_merge,
        can_push=can_push,
    )


def _dedupe_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _nested_git_repos(root: Path) -> list[Path]:
    """根目录本身是仓库则返回 [root]；否则返回一级子目录中的 Git 仓库。"""
    if _is_git_repo(root):
        return [root]
    if not root.is_dir():
        return []
    repos: list[Path] = []
    for child in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        if _is_git_repo(child):
            repos.append(child)
    return repos


def _origin_default_branch(repo: Path) -> str:
    result = _run_git(
        ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
        repo,
        check=False,
    )
    if result.ok and result.stdout.strip():
        ref = result.stdout.strip()
        return ref.rsplit("/", 1)[-1]
    return ""


def _pull_fetch_refs(repo: Path) -> list[str]:
    branch = _current_branch(repo)
    refs: list[str] = []
    if branch and branch != "HEAD":
        refs.append(branch)
    default = _origin_default_branch(repo)
    if default:
        refs.append(default)
    return _dedupe_keep_order(refs)


def _origin_pull_ref(repo: Path) -> str | None:
    branch = _current_branch(repo)
    candidates: list[str] = []
    if branch and branch != "HEAD":
        candidates.append(branch)
    default = _origin_default_branch(repo)
    if default:
        candidates.append(default)
    candidates.extend(["master", "main"])
    for name in _dedupe_keep_order(candidates):
        if _ref_exists(repo, f"origin/{name}"):
            return f"origin/{name}"
    return None


def _compare_to_origin_tracking(repo: Path, *, do_fetch: bool = True) -> dict[str, Any]:
    fetched = True
    if do_fetch:
        refs = _pull_fetch_refs(repo)
        fetched = _fetch_origin_refs(repo, *refs) if refs else _fetch_origin_ref(repo)
    target = _origin_pull_ref(repo)
    if not target:
        return _format_vs_main(
            None, None, fetched=fetched, can_merge=False, can_push=False
        )
    behind, ahead = _ahead_behind(repo, target, "HEAD")
    return _format_vs_main(
        ahead, behind, fetched=fetched, can_merge=False, can_push=False
    )


def _aggregate_vs_main(vs_list: list[dict[str, Any]]) -> dict[str, Any]:
    if not vs_list:
        return _format_vs_main(None, None, fetched=False, can_merge=False, can_push=False)
    known = [item for item in vs_list if item.get("ahead") is not None and item.get("behind") is not None]
    fetched = all(bool(item.get("fetched")) for item in vs_list)
    if not known:
        return _format_vs_main(None, None, fetched=fetched, can_merge=False, can_push=False)
    ahead = max(int(item["ahead"]) for item in known)
    behind = max(int(item["behind"]) for item in known)
    vs = _format_vs_main(ahead, behind, fetched=fetched, can_merge=False, can_push=False)
    behind_repos = sum(1 for item in known if int(item["behind"]) > 0)
    if behind_repos > 1:
        vs["label"] = f"{behind_repos} 个仓库落后 · 建议拉取"
        vs["hint"] = "pull"
    return vs


def _code_repo_root(key: str, paths: WorkspacePaths) -> Path:
    if key == CODE_REPO_BACKEND:
        return paths.erp_backend_dir
    if key == CODE_REPO_FRONTEND:
        return paths.erp_frontend_dir
    raise GitSyncError(f"未知代码仓库: {key}")


def _build_code_repo_item(key: str, paths: WorkspacePaths) -> dict[str, Any]:
    root = _code_repo_root(key, paths)
    repos = _nested_git_repos(root)
    if not repos:
        missing = "目录不存在" if not root.exists() else "未找到 Git 仓库"
        return {
            "key": key,
            "name": key,
            "repo": key,
            "repo_path": str(root),
            "kind": "code",
            "current_branch": "",
            "target_branch": "",
            "can_push": False,
            "can_merge": False,
            "change_count": 0,
            "repo_change_count": 0,
            "status_label": missing,
            "tracking": None,
            "vs_main": _format_vs_main(
                None, None, fetched=False, can_merge=False, can_push=False
            ),
        }

    branches = _dedupe_keep_order([_current_branch(repo) for repo in repos])
    change_count = sum(_count_changes(repo) for repo in repos)
    if len(repos) == 1:
        vs_list = [_compare_to_origin_tracking(repos[0], do_fetch=False)]
    else:
        vs_list = [
            _compare_to_origin_tracking(repo, do_fetch=False) for repo in repos
        ]
    repo_label = key if len(repos) == 1 else f"{key}（{len(repos)} 个子仓库）"
    return {
        "key": key,
        "name": key,
        "repo": repo_label,
        "repo_path": str(root),
        "kind": "code",
        "current_branch": "、".join(branches) if branches else "",
        "target_branch": branches[0] if len(branches) == 1 else "",
        "can_push": False,
        "can_merge": False,
        "change_count": change_count,
        "repo_change_count": change_count,
        "status_label": _status_label(change_count, can_push=False),
        "tracking": None,
        "vs_main": vs_list[0] if len(vs_list) == 1 else _aggregate_vs_main(vs_list),
    }


def _erp_system_names(paths: WorkspacePaths) -> list[str]:
    product = paths.erp_product_dir
    if not product.is_dir():
        return []
    names: list[str] = []
    for child in sorted(product.iterdir(), key=lambda p: p.name):
        if not child.is_dir() or child.name.startswith("."):
            continue
        if child.name in {"README.md"} or child.suffix:
            continue
        names.append(child.name)
    return names


def _status_label(change_count: int, *, can_push: bool = False) -> str:
    if change_count > 0:
        return f"{change_count} 个变更待推送" if can_push else f"{change_count} 个本地变更"
    return "干净"


def _clear_system_worktree_after_push(repo: Path, system_key: str, logs: list[str]) -> None:
    """推送成功后清理该系统目录的工作区残留（内容已在目标分支远端）。"""
    _run_git(["checkout", "HEAD", "--", f"{system_key}/"], repo, check=False)
    clean = _run_git(["clean", "-fd", "--", f"{system_key}/"], repo, check=False)
    remaining = _count_changes(repo, f"{system_key}/")
    if remaining == 0:
        logs.append(f"已清理 {system_key}/ 本地工作区（推送完成）")
    else:
        logs.append(f"WARN: {system_key}/ 仍有 {remaining} 个本地变更未清理")


@dataclass
class GitSyncManager:
    _lock: threading.RLock = field(default_factory=threading.RLock)
    _busy: bool = False
    _busy_action: str = ""
    _busy_system: str = ""

    def _begin(self, action: str, system_key: str) -> None:
        with self._lock:
            if self._busy:
                raise GitSyncError(
                    f"已有 Git 操作进行中（{self._busy_action} · {self._busy_system}）",
                    code="busy",
                )
            self._busy = True
            self._busy_action = action
            self._busy_system = system_key

    def _end(self) -> None:
        with self._lock:
            self._busy = False
            self._busy_action = ""
            self._busy_system = ""

    def status_snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "busy": self._busy,
                "busy_action": self._busy_action,
                "busy_system": self._busy_system,
            }

    def refresh_vs_main_snapshot(self, *, erp_root=None, force: bool = True) -> dict[str, Any]:
        paths = WorkspacePaths.resolve(erp_root)
        return _ensure_vs_main_snapshot(paths, force=force, busy=self.status_snapshot()["busy"])

    def list_systems(self, *, erp_root=None) -> dict[str, Any]:
        paths = WorkspacePaths.resolve(erp_root)
        busy = self.status_snapshot()["busy"]
        with ThreadPoolExecutor(max_workers=3) as pool:
            backend_future = pool.submit(_build_code_repo_item, CODE_REPO_BACKEND, paths)
            frontend_future = pool.submit(_build_code_repo_item, CODE_REPO_FRONTEND, paths)
            snapshot_future = pool.submit(
                _ensure_vs_main_snapshot, paths, force=False, busy=busy
            )

            product_repo = paths.erp_product_dir
            product_is_git = _is_git_repo(product_repo)
            product_branch = _current_branch(product_repo) if product_is_git else ""
            product_dirty = _count_changes(product_repo) if product_is_git else 0
            items: list[dict[str, Any]] = [
                backend_future.result(),
                frontend_future.result(),
            ]
            snapshot = snapshot_future.result() or {}

        product_snap = snapshot.get("product") or {}
        local_snap = snapshot.get("local") or {}
        product_ahead = product_snap.get("ahead")
        product_behind = product_snap.get("behind")
        product_fetched = bool(product_snap.get("fetched"))

        for name in _erp_system_names(paths):
            target_branch = _erp_push_branch(name)
            can_push = name in GIT_PUSH_SYSTEMS
            system_changes = (
                _count_changes(product_repo, f"{name}/") if product_is_git else 0
            )
            tracking = (
                _branch_tracking(product_repo, target_branch)
                if product_is_git
                else None
            )
            items.append(
                {
                    "key": name,
                    "name": name,
                    "repo": "ERP_product",
                    "repo_path": str(product_repo),
                    "kind": "erp",
                    "current_branch": product_branch,
                    "target_branch": target_branch,
                    "can_push": can_push,
                    "can_merge": can_push,
                    "change_count": system_changes,
                    "repo_change_count": product_dirty,
                    "status_label": _status_label(system_changes, can_push=can_push),
                    "tracking": tracking,
                    "vs_main": _with_vs_main_meta(
                        _format_vs_main(
                            product_ahead,
                            product_behind,
                            fetched=product_fetched,
                            can_merge=can_push,
                            can_push=can_push,
                        ),
                        snapshot,
                    ),
                }
            )

        local_repo = paths.local_dir
        local_is_git = _is_git_repo(local_repo)
        local_branch = _current_branch(local_repo) if local_is_git else ""
        local_changes = _count_changes(local_repo) if local_is_git else 0
        local_tracking = _branch_tracking(local_repo, "main") if local_is_git else None
        local_vs = _format_vs_main(
            local_snap.get("ahead"),
            local_snap.get("behind"),
            fetched=bool(local_snap.get("fetched")),
            can_merge=False,
            can_push=True,
        )
        items.append(
            {
                "key": LOCAL_SYSTEM_KEY,
                "name": LOCAL_SYSTEM_KEY,
                "repo": "本地",
                "repo_path": str(local_repo),
                "kind": "local",
                "current_branch": local_branch,
                "target_branch": "main",
                "can_push": True,
                "can_merge": False,
                "change_count": local_changes,
                "repo_change_count": local_changes,
                "status_label": _status_label(local_changes, can_push=True),
                "tracking": local_tracking,
                "vs_main": _with_vs_main_meta(local_vs, snapshot),
            }
        )

        return {
            "items": items,
            "push_systems": sorted(GIT_PUSH_SYSTEMS),
            "vs_main_compared_at": snapshot.get("compared_at"),
            "vs_main_next_at": _vs_main_next_slot().isoformat(),
            "operation": self.status_snapshot(),
        }

    def pull_latest(self, system_key: str, *, erp_root=None) -> dict[str, Any]:
        key = system_key.strip()
        if not key:
            raise GitSyncError("系统名不能为空")
        self._begin("pull", key)
        try:
            paths = WorkspacePaths.resolve(erp_root)
            if key == LOCAL_SYSTEM_KEY:
                return self._pull_local(paths)
            if key in CODE_REPO_KEYS:
                return self._pull_code(key, paths)
            return self._pull_erp(key, paths)
        finally:
            self._end()

    def push_git(self, system_key: str, *, erp_root=None) -> dict[str, Any]:
        key = system_key.strip()
        if key not in GIT_PUSH_SYSTEMS:
            raise GitSyncError(f"系统 {key} 不支持推送 Git", code="forbidden")
        self._begin("push", key)
        try:
            if key == LOCAL_SYSTEM_KEY:
                return self._push_local(WorkspacePaths.resolve(erp_root))
            return self._push_erp_system(key, WorkspacePaths.resolve(erp_root))
        finally:
            self._end()

    def request_merge_main(self, system_key: str, *, erp_root=None) -> dict[str, Any]:
        key = system_key.strip()
        if key == LOCAL_SYSTEM_KEY:
            raise GitSyncError("本地不支持合并 main（已直接推送 main）", code="forbidden")
        if key not in GIT_PUSH_SYSTEMS:
            raise GitSyncError(f"系统 {key} 不支持合并 main", code="forbidden")
        self._begin("merge-request", key)
        try:
            paths = WorkspacePaths.resolve(erp_root)
            logs: list[str] = [f"===== ① 推送到 {ERP_PRODUCT_PUSH_BRANCH} ====="]
            push_result = self._push_erp_system(key, paths)
            logs.extend(push_result.get("logs") or [])
            push_skipped = bool(push_result.get("skipped"))
            if push_skipped:
                logs.append(f"{key}：无变更，无需推送，继续合并 main")
            elif push_result.get("message"):
                logs.append(str(push_result["message"]))

            logs.append(f"===== ② 合并 {ERP_PRODUCT_PUSH_BRANCH} → main =====")
            merge_result = self._merge_feature_into_main(key, paths)
            logs.extend(merge_result.get("logs") or [])

            if push_skipped:
                push_part = f"{key}：功能分支无新变更（{ERP_PRODUCT_PUSH_BRANCH}）"
            else:
                push_part = (
                    push_result.get("message")
                    or f"{key}：已推送到 {ERP_PRODUCT_PUSH_BRANCH}"
                )
            merge_part = merge_result.get("message") or f"{key}：已合并到 main"
            return {
                **merge_result,
                "push_ok": bool(push_result.get("ok")),
                "push_skipped": push_skipped,
                "skipped": push_skipped and bool(merge_result.get("skipped")),
                "message": f"{push_part}；{merge_part}",
                "logs": logs,
            }
        finally:
            self._end()

    def _merge_feature_into_main(self, system_key: str, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.erp_product_dir
        if not _is_git_repo(repo):
            raise GitSyncError("ERP_product 不是 Git 仓库")

        feature = ERP_PRODUCT_PUSH_BRANCH
        base = "main"
        original_branch = _current_branch(repo)
        logs: list[str] = [
            f"源分支: {feature}",
            f"目标分支: {base}",
            f"原始分支: {original_branch}",
        ]
        stash_created = False
        switched = False
        restored = False

        def restore_workspace() -> None:
            nonlocal restored
            if restored:
                return
            restored = True
            if switched and original_branch and original_branch != base:
                _run_git(["checkout", original_branch], repo, check=False)
                logs.append(f"已切回 {original_branch}")
            if stash_created:
                pop = _run_git(["stash", "pop"], repo, check=False)
                if pop.ok:
                    logs.append("已恢复 stash")
                else:
                    logs.append("WARN: stash pop 失败，请手动处理 stash")

        try:
            fetched = _fetch_origin_refs(repo, base, feature)
            if not fetched:
                _fetch_origin_ref(repo, base)
                _fetch_origin_ref(repo, feature)
            logs.append(f"已 fetch origin/{base} 与 origin/{feature}")

            source_ref = _feature_head_ref(repo)
            if not source_ref:
                raise GitSyncError(f"找不到功能分支 {feature}（本地与 origin 均不存在）")

            _, ahead = _ahead_behind(repo, f"origin/{base}", source_ref)
            if ahead == 0:
                return {
                    "ok": True,
                    "action": "merge-request",
                    "system": system_key,
                    "branch": feature,
                    "skipped": True,
                    "message": f"{system_key}：{feature} 没有领先 main 的提交，无需合并",
                    "logs": logs,
                }

            if _count_changes(repo) > 0:
                stash = _run_git(
                    [
                        "stash",
                        "push",
                        "--include-untracked",
                        "-m",
                        f"wip-before-merge-main-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    ],
                    repo,
                    check=False,
                )
                if stash.returncode == 0 and "No local changes" not in stash.stdout:
                    stash_created = True
                    logs.append("已 stash 工作区变更")

            if original_branch != base:
                checkout = _run_git(["checkout", base], repo, check=False)
                if not checkout.ok:
                    raise GitSyncError(f"无法切换到 {base}", details=checkout.text)
                switched = True
                logs.append(f"已切换到 {base}")

            pull = _run_git(["pull", "--no-edit", "origin", base], repo, check=False)
            if not pull.ok:
                conflict_files = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflict_files.stdout.splitlines() if line.strip()]
                _run_git(["merge", "--abort"], repo, check=False)
                if files:
                    raise GitSyncError(
                        "拉取 origin/main 发生冲突，请本地解决后重试",
                        details="\n".join(files),
                        code="conflict",
                    )
                raise GitSyncError("pull origin/main 失败", details=pull.text)
            logs.append("已 pull origin/main")

            merge = _run_git(["merge", "--no-edit", source_ref], repo, check=False)
            if not merge.ok:
                conflict_files = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflict_files.stdout.splitlines() if line.strip()]
                _run_git(["merge", "--abort"], repo, check=False)
                raise GitSyncError(
                    f"合并 {feature} 到 main 发生冲突，请本地解决后重试",
                    details="\n".join(files) or merge.text,
                    code="conflict",
                )
            if merge.stdout.strip():
                logs.append(merge.stdout.strip())
            else:
                logs.append(f"已合并 {source_ref} → main")

            push = _run_git(["push", "origin", base], repo, check=False)
            if not push.ok:
                raise GitSyncError("push origin/main 失败", details=push.text)
            logs.append("已 push origin/main")

            restore_workspace()
            return {
                "ok": True,
                "action": "merge-request",
                "system": system_key,
                "branch": feature,
                "message": f"{system_key}：已将 {feature} 合并到 main 并推送",
                "logs": logs,
            }
        except Exception:
            _run_git(["merge", "--abort"], repo, check=False)
            restore_workspace()
            raise

    def fix_local_preview(self, *, erp_root=None) -> dict[str, Any]:
        self._begin("fix-preview", LOCAL_SYSTEM_KEY)
        try:
            return self._fix_local_preview(WorkspacePaths.resolve(erp_root))
        finally:
            self._end()

    def _resolve_merge_repo(self, system_key: str, paths: WorkspacePaths) -> Path:
        if system_key == LOCAL_SYSTEM_KEY:
            return paths.local_dir
        return paths.erp_product_dir

    def _resolve_merge_head_branch(self, system_key: str, repo: Path) -> str:
        if system_key == LOCAL_SYSTEM_KEY:
            return _current_branch(repo)
        return ERP_PRODUCT_PUSH_BRANCH

    def _find_open_pr(
        self, owner: str, name: str, token: str, head_branch: str, base_branch: str = "main"
    ) -> dict[str, Any] | None:
        url = (
            f"https://api.github.com/repos/{owner}/{name}/pulls"
            f"?head={owner}:{head_branch}&base={base_branch}&state=open"
        )
        result = _github_request("GET", url, token)
        if isinstance(result, list) and result:
            return result[0]
        return None

    def _create_merge_pr(
        self,
        owner: str,
        name: str,
        token: str,
        *,
        head_branch: str,
        base_branch: str,
        system_key: str,
    ) -> dict[str, Any]:
        title = f"{system_key}：合并 {head_branch} → {base_branch} ({_now_label()[:10]})"
        body = (
            "## Summary\n"
            f"由知识库管理服务发起的合并请求，将 `{head_branch}` 合入 `{base_branch}`。\n\n"
            "## 变更范围\n"
            f"触发系统：`{system_key}`\n"
        )
        return _github_request(
            "POST",
            f"https://api.github.com/repos/{owner}/{name}/pulls",
            token,
            {"title": title, "head": head_branch, "base": base_branch, "body": body},
        )

    def _get_pull_request(
        self, owner: str, name: str, token: str, pr_number: int
    ) -> dict[str, Any]:
        return _github_request(
            "GET",
            f"https://api.github.com/repos/{owner}/{name}/pulls/{pr_number}",
            token,
        )

    def _wait_for_mergeable(
        self, owner: str, name: str, token: str, pr_number: int, *, attempts: int = 6
    ) -> dict[str, Any]:
        latest: dict[str, Any] = {}
        for attempt in range(attempts):
            latest = self._get_pull_request(owner, name, token, pr_number)
            if latest.get("merged"):
                return latest
            if latest.get("mergeable") is not None:
                return latest
            if attempt < attempts - 1:
                time.sleep(2)
        return latest

    def _merge_pull_request(
        self, owner: str, name: str, token: str, pr_number: int
    ) -> bool:
        try:
            _github_request(
                "PUT",
                f"https://api.github.com/repos/{owner}/{name}/pulls/{pr_number}/merge",
                token,
                {"merge_method": "merge"},
            )
            return True
        except GitSyncError as exc:
            if exc.code != "github_api":
                raise
            return False

    def _enable_pull_request_auto_merge(
        self, token: str, pull_request: dict[str, Any]
    ) -> bool:
        node_id = str(pull_request.get("node_id") or "").strip()
        if not node_id:
            return False
        query = """
        mutation EnableAutoMerge($pullRequestId: ID!) {
          enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: MERGE}) {
            pullRequest { number }
          }
        }
        """
        try:
            _github_graphql(token, query, {"pullRequestId": node_id})
            return True
        except GitSyncError:
            return False

    def _request_merge_main(self, system_key: str, paths: WorkspacePaths) -> dict[str, Any]:
        repo = self._resolve_merge_repo(system_key, paths)
        if not _is_git_repo(repo):
            raise GitSyncError(f"{system_key} 不是 Git 仓库")

        token = _load_github_token()
        if not token:
            raise GitSyncError(
                "未配置 GITHUB_TOKEN，请在 知识库管理服务/.env 中设置",
                code="no_token",
            )

        remote = _run_git(["remote", "get-url", "origin"], repo, check=False)
        if not remote.ok:
            raise GitSyncError("无法读取 origin 远程地址", details=remote.text)
        owner_repo = _parse_github_repo(remote.stdout.strip())
        if not owner_repo:
            raise GitSyncError("无法解析 GitHub 仓库地址", details=remote.stdout.strip())

        owner, name = owner_repo
        _ensure_github_repo_access(owner, name, token)
        head_branch = self._resolve_merge_head_branch(system_key, repo)
        base_branch = "main"
        logs: list[str] = [f"源分支: {head_branch}", f"目标分支: {base_branch}"]

        if head_branch == base_branch:
            return {
                "ok": True,
                "action": "merge-request",
                "system": system_key,
                "branch": head_branch,
                "skipped": True,
                "message": f"{system_key}：当前已在 {base_branch} 分支，无需创建合并请求",
                "logs": logs,
            }

        existing = self._find_open_pr(owner, name, token, head_branch, base_branch)
        created = False
        if existing:
            pull = existing
            logs.append(f"已找到进行中的 PR #{pull.get('number')}")
        else:
            pull = self._create_merge_pr(
                owner,
                name,
                token,
                head_branch=head_branch,
                base_branch=base_branch,
                system_key=system_key,
            )
            created = True
            logs.append(f"已创建 PR #{pull.get('number')}")

        pr_number = int(pull["number"])
        pr_url = str(pull.get("html_url") or "")
        logs.append(f"PR 链接: {pr_url}")

        pull = self._wait_for_mergeable(owner, name, token, pr_number)
        if pull.get("merged"):
            message = f"{system_key}：PR 已合并到 {base_branch}"
            logs.append("PR 已处于 merged 状态")
            return {
                "ok": True,
                "action": "merge-request",
                "system": system_key,
                "branch": head_branch,
                "pr_url": pr_url,
                "merged": True,
                "created": created,
                "message": message,
                "logs": logs,
            }

        mergeable = pull.get("mergeable")
        mergeable_state = str(pull.get("mergeable_state") or "")
        merged = False
        auto_merge_enabled = False

        if mergeable is True:
            merged = self._merge_pull_request(owner, name, token, pr_number)
            if merged:
                logs.append("已自动合并到 main")
            else:
                logs.append("GitHub 返回不可立即合并，尝试开启自动合并")
                auto_merge_enabled = self._enable_pull_request_auto_merge(token, pull)
        elif mergeable is False:
            logs.append("存在合并冲突，需先在 GitHub 上解决")
        elif mergeable_state in {"blocked", "unstable"}:
            auto_merge_enabled = self._enable_pull_request_auto_merge(token, pull)
            if auto_merge_enabled:
                logs.append("已开启自动合并，检查通过后将合入 main")
            else:
                logs.append("暂不可自动合并，请打开 PR 查看检查项或审批状态")
        else:
            auto_merge_enabled = self._enable_pull_request_auto_merge(token, pull)
            if auto_merge_enabled:
                logs.append("已开启自动合并")
            else:
                logs.append("GitHub 尚未完成可合并性判断，请稍后打开 PR 查看")

        if merged:
            message = f"{system_key}：已自动合并 {head_branch} → {base_branch}"
        elif mergeable is False:
            message = f"{system_key}：PR 存在冲突，请解决后合并"
        elif auto_merge_enabled:
            message = f"{system_key}：已创建 PR 并开启自动合并"
        elif created:
            message = f"{system_key}：已创建 PR（{head_branch} → {base_branch}）"
        else:
            message = f"{system_key}：已关联进行中的 PR（{head_branch} → {base_branch}）"

        return {
            "ok": True,
            "action": "merge-request",
            "system": system_key,
            "branch": head_branch,
            "pr_url": pr_url,
            "merged": merged,
            "auto_merge_enabled": auto_merge_enabled,
            "created": created,
            "mergeable": mergeable,
            "message": message,
            "logs": logs,
        }

    def _pull_single_code_repo(self, repo: Path, label: str) -> dict[str, Any]:
        if not _is_git_repo(repo):
            raise GitSyncError(f"{label} 不是 Git 仓库")
        original_branch = _current_branch(repo)
        logs: list[str] = [f"{label} 当前分支: {original_branch}"]
        stash_created = False

        try:
            refs = _pull_fetch_refs(repo)
            fetch = (
                _fetch_origin_refs(repo, *refs)
                if refs
                else _fetch_origin_ref(repo)
            )
            if not fetch:
                raise GitSyncError(f"{label}：fetch origin 失败")
            logs.append(f"已 fetch origin（{' '.join(refs) or 'default'}）")

            target = _origin_pull_ref(repo)
            if not target:
                raise GitSyncError(f"{label}：找不到可拉取的 origin 分支")
            logs.append(f"拉取目标: {target}")

            stash_created, stash_logs = _stash_wip(
                repo, f"wip-before-pull-{label}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            logs.extend(stash_logs)

            merge = _run_git(["merge", "--no-edit", target], repo, check=False)
            if not merge.ok:
                _run_git(["merge", "--abort"], repo, check=False)
                conflicts = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflicts.stdout.splitlines() if line.strip()]
                detail = merge.text
                if files:
                    raise GitSyncError(
                        f"{label}：合并 {target} 发生冲突，请本地解决后重试",
                        details="\n".join(files),
                        code="conflict",
                    )
                if "untracked working tree files would be overwritten" in detail:
                    raise GitSyncError(
                        f"{label}：合并失败，本地未跟踪文件与远端冲突",
                        details=detail,
                        code="untracked_conflict",
                    )
                raise GitSyncError(f"{label}：合并 {target} 失败", details=detail)

            if merge.stdout.strip():
                logs.append(merge.stdout.strip())
            else:
                logs.append(f"已合并 {target}（或已是最新）")

            if stash_created:
                restored, restore_msg = _restore_stash(repo)
                logs.append(restore_msg)
                if not restored:
                    logs.append("提示：如不需要 stash 中的旧文件，可执行 git stash drop")

            return {
                "ok": True,
                "label": label,
                "repo": str(repo),
                "branch": _current_branch(repo),
                "logs": logs,
            }
        except Exception:
            if stash_created:
                _restore_stash(repo)
            raise

    def _pull_code(self, system_key: str, paths: WorkspacePaths) -> dict[str, Any]:
        root = _code_repo_root(system_key, paths)
        repos = _nested_git_repos(root)
        if not repos:
            raise GitSyncError(
                f"{system_key} 目录不存在" if not root.exists() else f"{system_key} 未找到 Git 仓库"
            )

        logs: list[str] = []
        failed: list[str] = []
        succeeded = 0

        def pull_one(repo: Path) -> tuple[str, str, dict[str, Any] | GitSyncError]:
            label = repo.name if repo != root else system_key
            try:
                return ("ok", label, self._pull_single_code_repo(repo, label))
            except GitSyncError as exc:
                return ("err", label, exc)

        if len(repos) == 1:
            outcomes = [pull_one(repos[0])]
        else:
            with ThreadPoolExecutor(max_workers=min(8, len(repos))) as pool:
                outcomes = list(pool.map(pull_one, repos))

        for status, label, payload in outcomes:
            if status == "ok":
                succeeded += 1
                logs.extend((payload.get("logs") if isinstance(payload, dict) else None) or [])
            else:
                failed.append(label)
                logs.append(f"{label} 失败: {payload}")
                details = getattr(payload, "details", "")
                if details:
                    logs.append(details)

        if failed:
            raise GitSyncError(
                f"{system_key}：{succeeded}/{len(repos)} 个仓库已同步，失败：{'、'.join(failed)}",
                details="\n".join(logs),
                code="conflict" if any("冲突" in line for line in logs) else "git_error",
            )

        branch = _current_branch(repos[0]) if len(repos) == 1 else "、".join(
            _dedupe_keep_order([_current_branch(repo) for repo in repos])
        )
        return {
            "ok": True,
            "action": "pull",
            "system": system_key,
            "repo": system_key,
            "branch": branch,
            "message": (
                f"{system_key}：已同步 origin 最新到当前分支"
                if len(repos) == 1
                else f"{system_key}：已同步 {len(repos)} 个子仓库到 origin 最新"
            ),
            "logs": logs,
        }

    def _pull_erp(self, system_key: str, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.erp_product_dir
        if not _is_git_repo(repo):
            raise GitSyncError("ERP_product 不是 Git 仓库")
        original_branch = _current_branch(repo)
        logs: list[str] = [f"ERP_product 当前分支: {original_branch}"]
        stash_created = False

        try:
            fetch = _run_git(["fetch", "origin", "main"], repo, check=False)
            if not fetch.ok:
                raise GitSyncError("fetch origin/main 失败", details=fetch.text)
            logs.append("已 fetch origin/main")

            stash_created, stash_logs = _stash_wip(
                repo, f"wip-before-pull-main-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            logs.extend(stash_logs)

            merge = _run_git(["merge", "--no-edit", "origin/main"], repo, check=False)
            if not merge.ok:
                _run_git(["merge", "--abort"], repo, check=False)
                conflicts = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflicts.stdout.splitlines() if line.strip()]
                detail = merge.text
                if files:
                    raise GitSyncError(
                        "合并 origin/main 发生冲突，请本地解决后重试",
                        details="\n".join(files),
                        code="conflict",
                    )
                if "untracked working tree files would be overwritten" in detail:
                    raise GitSyncError(
                        "合并 origin/main 失败：本地未跟踪文件与 main 冲突",
                        details=detail,
                        code="untracked_conflict",
                    )
                raise GitSyncError("合并 origin/main 失败", details=detail)

            if merge.stdout.strip():
                logs.append(merge.stdout.strip())
            else:
                logs.append("已合并 origin/main（或已是最新）")

            if stash_created:
                restored, restore_msg = _restore_stash(repo)
                logs.append(restore_msg)
                if not restored:
                    logs.append("提示：如不需要 stash 中的旧文件，可执行 git stash drop")

            return {
                "ok": True,
                "action": "pull",
                "system": system_key,
                "repo": "ERP_product",
                "branch": _current_branch(repo),
                "message": f"{system_key}：已同步 origin/main 到当前分支",
                "logs": logs,
            }
        except Exception:
            if stash_created:
                _restore_stash(repo)
            raise

    def _pull_local(self, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.local_dir
        if not _is_git_repo(repo):
            raise GitSyncError("本地 不是 Git 仓库")

        if _count_changes(repo) > 0:
            raise GitSyncError(
                "本地仓库有未提交变更，请先推送或 stash 后再拉取",
                code="dirty",
            )

        fetch = _run_git(["fetch", "origin", "main"], repo, check=False)
        if not fetch.ok:
            raise GitSyncError("fetch origin/main 失败", details=fetch.text)

        pull = _run_git(["pull", "--ff-only", "origin", "main"], repo, check=False)
        if not pull.ok:
            raise GitSyncError("pull origin/main 失败", details=pull.text)

        return {
            "ok": True,
            "action": "pull",
            "system": LOCAL_SYSTEM_KEY,
            "repo": "本地",
            "branch": _current_branch(repo),
            "message": "本地：已 fast-forward 到 origin/main",
            "logs": [pull.stdout.strip() or pull.stderr.strip() or "pull 完成"],
        }

    def _push_erp_system(self, system_key: str, paths: WorkspacePaths) -> dict[str, Any]:
        if system_key not in SYSTEM_BRANCH_MAP:
            raise GitSyncError(f"未配置 {system_key} 的目标分支")

        target_branch = _erp_push_branch(system_key)

        repo = paths.erp_product_dir
        if not _is_git_repo(repo):
            raise GitSyncError("ERP_product 不是 Git 仓库")

        system_path = paths.system_dir(system_key)
        if not system_path.is_dir():
            raise GitSyncError(f"系统目录不存在: {system_key}")

        changes = _run_git(["status", "--short", "--", f"{system_key}/"], repo, check=False)
        if not changes.stdout.strip():
            return {
                "ok": True,
                "action": "push",
                "system": system_key,
                "skipped": True,
                "message": f"{system_key}：无变更，无需推送",
                "logs": [],
            }

        original_branch = _current_branch(repo)
        logs: list[str] = [f"原始分支: {original_branch}"]
        backup_dir = Path(tempfile.mkdtemp(prefix="kb-git-backup-"))
        stash_created = False
        switched = False
        restored = False

        def restore_workspace() -> None:
            nonlocal restored
            if restored:
                return
            restored = True
            if switched and original_branch and original_branch != target_branch:
                _run_git(["checkout", original_branch], repo, check=False)
                logs.append(f"已切回 {original_branch}")
            if stash_created:
                pop = _run_git(["stash", "pop"], repo, check=False)
                if pop.ok:
                    logs.append("已恢复 stash")
                else:
                    logs.append("WARN: stash pop 失败，请手动处理 stash")

        try:
            shutil.copytree(system_path, backup_dir / system_key)
            logs.append(f"已备份 {system_key}/")

            stash = _run_git(
                [
                    "stash",
                    "push",
                    "--include-untracked",
                    "-m",
                    f"wip-before-kb-push-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                ],
                repo,
                check=False,
            )
            if stash.returncode == 0 and "No local changes" not in stash.stdout:
                stash_created = True
                logs.append("已 stash 工作区变更")

            if original_branch != target_branch:
                checkout = _run_git(["checkout", target_branch], repo, check=False)
                if not checkout.ok:
                    raise GitSyncError(f"无法切换到 {target_branch}", details=checkout.text)
                switched = True
                logs.append(f"已切换到 {target_branch}")

            pull = _run_git(["pull", "--no-edit", "origin", target_branch], repo, check=False)
            if not pull.ok:
                conflict_files = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflict_files.stdout.splitlines() if line.strip()]
                _run_git(["merge", "--abort"], repo, check=False)
                if files:
                    raise GitSyncError(
                        f"拉取 origin/{target_branch} 发生冲突，请本地解决后重试",
                        details="\n".join(files),
                        code="conflict",
                    )
                raise GitSyncError(f"pull {target_branch} 失败", details=pull.text)
            logs.append(f"已 pull origin/{target_branch}")

            _fetch_origin_ref(repo, "main")
            merge_main = _run_git(["merge", "--no-edit", "origin/main"], repo, check=False)
            if not merge_main.ok:
                conflict_files = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflict_files.stdout.splitlines() if line.strip()]
                _run_git(["merge", "--abort"], repo, check=False)
                raise GitSyncError(
                    "合并 origin/main 到功能分支发生冲突，请本地解决后重试",
                    details="\n".join(files) or merge_main.text,
                    code="conflict",
                )
            logs.append("已合并 origin/main 到功能分支")

            if system_path.exists():
                shutil.rmtree(system_path)
            shutil.copytree(backup_dir / system_key, system_path)

            status = _run_git(["status", "--short", "--", f"{system_key}/"], repo, check=False)
            committed = False
            if status.stdout.strip():
                _run_git(["add", "--", f"{system_key}/"], repo)
                commit_msg = (
                    f"docs({system_key}): 知识库同步 {_now_label()[:10]}\n\n"
                    "由知识库管理服务推送，基于最新代码增量同步知识库。"
                )
                _run_git(["commit", "-m", commit_msg], repo)
                committed = True
                logs.append(f"已提交 {system_key}/ 变更")

            push = _run_git(["push", "origin", target_branch], repo, check=False)
            if not push.ok:
                raise GitSyncError(f"push {target_branch} 失败", details=push.text)
            logs.append(f"已 push origin/{target_branch}")

            restore_workspace()
            _clear_system_worktree_after_push(repo, system_key, logs)

            message = f"{system_key}：已推送到 {target_branch}"
            if not committed:
                message += "（无文件差异）"

            return {
                "ok": True,
                "action": "push",
                "system": system_key,
                "branch": target_branch,
                "committed": committed,
                "message": message,
                "logs": logs,
            }
        except Exception:
            _run_git(["merge", "--abort"], repo, check=False)
            restore_workspace()
            raise
        finally:
            shutil.rmtree(backup_dir, ignore_errors=True)

    def _push_local(self, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.local_dir
        if not _is_git_repo(repo):
            raise GitSyncError("本地 不是 Git 仓库")

        preview_logs = refresh_preview_trees(repo)

        if _count_changes(repo) == 0:
            head_sha = _run_git(["rev-parse", "HEAD"], repo).stdout.strip()
            preview = self._await_local_preview(
                repo,
                head_sha,
                since_iso=_utc_now_iso(),
                wait_for_new_deploy=False,
            )
            return {
                "ok": True,
                "action": "push",
                "system": LOCAL_SYSTEM_KEY,
                "skipped": True,
                "message": "本地：无变更，无需推送",
                "logs": preview_logs + (preview.get("logs") or []),
                "preview_base_url": LOCAL_PREVIEW_BASE_URL,
                "head_sha": head_sha,
                **{k: preview[k] for k in (
                    "preview_ok",
                    "preview_fixable",
                    "preview_message",
                    "actions_urls",
                ) if k in preview},
            }

        _run_git(["add", "-A"], repo)
        diff = _run_git(["diff", "--cached", "--name-only"], repo, check=False)
        staged_files = [line for line in diff.stdout.splitlines() if line.strip()]
        excluded_files = [f for f in staged_files if _is_sensitive_git_path(f)]
        safe_files = [f for f in staged_files if not _is_sensitive_git_path(f)]
        if excluded_files:
            for risky in excluded_files:
                _run_git(["reset", "HEAD", "--", risky], repo, check=False)

        cached = _run_git(["diff", "--cached", "--quiet"], repo, check=False)
        if cached.returncode == 0:
            logs = list(preview_logs)
            if excluded_files:
                logs.append(f"已排除敏感文件: {', '.join(excluded_files)}")
            head_sha = _run_git(["rev-parse", "HEAD"], repo).stdout.strip()
            preview = self._await_local_preview(
                repo,
                head_sha,
                since_iso=_utc_now_iso(),
                wait_for_new_deploy=False,
            )
            logs.extend(preview.get("logs") or [])
            return {
                "ok": True,
                "action": "push",
                "system": LOCAL_SYSTEM_KEY,
                "skipped": True,
                "message": "本地：无有效变更可提交（已排除敏感文件）",
                "logs": logs,
                "preview_base_url": LOCAL_PREVIEW_BASE_URL,
                "head_sha": head_sha,
                **{k: preview[k] for k in (
                    "preview_ok",
                    "preview_fixable",
                    "preview_message",
                    "actions_urls",
                ) if k in preview},
            }

        commit_msg = f"chore: 本地方案同步 {_now_label()[:10]}"
        _run_git(["commit", "-m", commit_msg], repo, env={"SKIP_AUTO_PUSH": "1"})
        head_sha = _run_git(["rev-parse", "HEAD"], repo).stdout.strip()
        since_iso = _utc_now_iso()

        remote_url = _run_git(["remote", "get-url", "origin"], repo, check=False).stdout.strip()
        push = _run_git(
            ["push", "origin", "HEAD"],
            repo,
            check=False,
            global_config=["http.version=HTTP/1.1"] if remote_url.startswith("https://") else None,
        )
        if not push.ok:
            detail = push.text
            hint = ""
            if "Couldn't connect to server" in detail or "Failed to connect" in detail:
                hint = (
                    "\n\n提示：当前网络无法通过 HTTPS 访问 GitHub。"
                    "可将 origin 改为 SSH，例如：\n"
                    "git remote set-url origin git@github-personal:18501404120/cursor.git"
                )
            raise GitSyncError("push origin 失败", details=detail + hint)

        logs = list(preview_logs)
        logs.append(push.stdout.strip() or push.stderr.strip() or "push 完成")
        preview = self._await_local_preview(
            repo,
            head_sha,
            since_iso=since_iso,
            wait_for_new_deploy=True,
        )
        logs.extend(preview.get("logs") or [])
        preview_ok = bool(preview.get("preview_ok"))
        message = (
            "本地：已 push，Pages 预览已更新"
            if preview_ok
            else (
                preview.get("preview_message")
                or "本地：已 push，但 Pages 预览未更新"
            )
        )
        return {
            "ok": preview_ok,
            "action": "push",
            "system": LOCAL_SYSTEM_KEY,
            "branch": _current_branch(repo),
            "message": message,
            "logs": logs,
            "preview_base_url": LOCAL_PREVIEW_BASE_URL,
            "head_sha": head_sha,
            "preview_ok": preview_ok,
            "preview_fixable": bool(preview.get("preview_fixable")),
            "preview_message": preview.get("preview_message") or "",
            "actions_urls": preview.get("actions_urls") or [],
        }

    def _await_local_preview(
        self,
        repo: Path,
        head_sha: str,
        *,
        since_iso: str,
        wait_for_new_deploy: bool,
    ) -> dict[str, Any]:
        try:
            return self._collect_local_preview(
                repo,
                head_sha,
                since_iso=since_iso,
                wait_for_new_deploy=wait_for_new_deploy,
            )
        except GitSyncError as exc:
            detail = (exc.details or "").strip()
            logs = [f"查询 GitHub Actions 失败: {exc}"]
            if detail:
                logs.append(detail[:500])
            return {
                "preview_ok": False,
                "preview_fixable": True,
                "preview_message": "查询 Pages 状态失败，可点「解决预览」重试",
                "actions_urls": [
                    {
                        "label": "Actions",
                        "url": "https://github.com/18501404120/cursor/actions",
                    }
                ],
                "logs": logs,
            }

    def _collect_local_preview(
        self,
        repo: Path,
        head_sha: str,
        *,
        since_iso: str,
        wait_for_new_deploy: bool,
    ) -> dict[str, Any]:
        logs: list[str] = []
        actions_urls: list[dict[str, str]] = []
        token = _load_github_token()
        try:
            owner, name = _local_repo_slug(repo)
        except GitSyncError as exc:
            return {
                "preview_ok": False,
                "preview_fixable": True,
                "preview_message": str(exc),
                "actions_urls": [{"label": "Actions", "url": "https://github.com/18501404120/cursor/actions"}],
                "logs": [str(exc)],
            }

        actions_home = _actions_url(owner, name)
        actions_urls.append({"label": "Actions", "url": actions_home})

        stamp_ok, stamp_text = _live_stamp_matches(head_sha)
        if stamp_ok:
            logs.append("线上 stamp 已匹配当前提交")
            return {
                "preview_ok": True,
                "preview_fixable": False,
                "preview_message": "Pages 预览已是最新",
                "actions_urls": actions_urls,
                "logs": logs,
            }

        if not wait_for_new_deploy:
            logs.append("线上 stamp 未匹配当前提交")
            latest_pages = _find_workflow_run(
                owner,
                name,
                workflow_name="pages build and deployment",
                token=token,
                branch="gh-pages",
            )
            if latest_pages and latest_pages.get("html_url"):
                actions_urls.append(
                    {"label": "最近 Pages 构建", "url": str(latest_pages["html_url"])}
                )
            return {
                "preview_ok": False,
                "preview_fixable": True,
                "preview_message": (
                    "本地预览未更新：线上 stamp 落后于当前提交，可点「解决预览」"
                ),
                "actions_urls": actions_urls,
                "logs": logs + [f"stamp={stamp_text[:180]}"],
            }

        deadline = time.time() + LOCAL_PREVIEW_WAIT_SEC
        deploy_run: dict[str, Any] | None = None
        pages_run: dict[str, Any] | None = None
        logs.append(f"等待 Pages 部署（最长 {LOCAL_PREVIEW_WAIT_SEC}s，目标 sha={head_sha[:7]}）")

        while time.time() < deadline:
            if deploy_run is None:
                deploy_run = _find_workflow_run(
                    owner,
                    name,
                    workflow_name="Deploy GitHub Pages",
                    token=token,
                    head_sha=head_sha,
                    branch="main",
                    since_iso=since_iso,
                )
                if deploy_run and deploy_run.get("html_url"):
                    actions_urls.append(
                        {"label": "Deploy GitHub Pages", "url": str(deploy_run["html_url"])}
                    )
                    logs.append(f"找到 Deploy 任务: {deploy_run.get('status')}/{deploy_run.get('conclusion')}")

            if deploy_run:
                refreshed = _github_api_get_soft(
                    f"repos/{owner}/{name}/actions/runs/{deploy_run['id']}", token
                )
                if not isinstance(refreshed, dict):
                    note = "查询 Deploy 状态暂时失败，继续等待"
                    if not logs or logs[-1] != note:
                        logs.append(note)
                else:
                    deploy_run = refreshed
                    status = deploy_run.get("status")
                    conclusion = deploy_run.get("conclusion")
                    if status == "completed" and conclusion != "success":
                        return {
                            "preview_ok": False,
                            "preview_fixable": True,
                            "preview_message": f"Deploy GitHub Pages 失败（{conclusion}）",
                            "actions_urls": actions_urls,
                            "logs": logs,
                        }

            if pages_run is None:
                pages_run = _find_workflow_run(
                    owner,
                    name,
                    workflow_name="pages build and deployment",
                    token=token,
                    branch="gh-pages",
                    since_iso=since_iso,
                )
                if pages_run and pages_run.get("html_url"):
                    actions_urls.append(
                        {"label": "pages build and deployment", "url": str(pages_run["html_url"])}
                    )

            if pages_run:
                refreshed = _github_api_get_soft(
                    f"repos/{owner}/{name}/actions/runs/{pages_run['id']}", token
                )
                if not isinstance(refreshed, dict):
                    note = "查询 Pages 构建状态暂时失败，继续等待"
                    if not logs or logs[-1] != note:
                        logs.append(note)
                    refreshed = None
                else:
                    pages_run = refreshed
                status = pages_run.get("status") if isinstance(refreshed, dict) else None
                conclusion = pages_run.get("conclusion") if isinstance(refreshed, dict) else None
                if isinstance(refreshed, dict) and status == "completed":
                    if conclusion == "success":
                        stamp_ok, stamp_text = _live_stamp_matches(head_sha)
                        if stamp_ok:
                            logs.append("Pages 构建成功，线上 stamp 已匹配")
                            return {
                                "preview_ok": True,
                                "preview_fixable": False,
                                "preview_message": "Pages 预览已更新",
                                "actions_urls": actions_urls,
                                "logs": logs,
                            }
                        logs.append("Pages 构建成功但 stamp 尚未匹配，继续等待 CDN")
                    else:
                        return {
                            "preview_ok": False,
                            "preview_fixable": True,
                            "preview_message": f"pages build and deployment 失败（{conclusion}）",
                            "actions_urls": actions_urls,
                            "logs": logs,
                        }

            stamp_ok, stamp_text = _live_stamp_matches(head_sha)
            if stamp_ok:
                logs.append("线上 stamp 已匹配当前提交")
                return {
                    "preview_ok": True,
                    "preview_fixable": False,
                    "preview_message": "Pages 预览已更新",
                    "actions_urls": actions_urls,
                    "logs": logs,
                }

            time.sleep(LOCAL_PREVIEW_POLL_SEC)

        stamp_ok, stamp_text = _live_stamp_matches(head_sha)
        if stamp_ok:
            return {
                "preview_ok": True,
                "preview_fixable": False,
                "preview_message": "Pages 预览已更新",
                "actions_urls": actions_urls,
                "logs": logs,
            }

        if not any(a.get("label") == "Deploy GitHub Pages" for a in actions_urls):
            latest_deploy = _find_workflow_run(
                owner,
                name,
                workflow_name="Deploy GitHub Pages",
                token=token,
                branch="main",
            )
            if latest_deploy and latest_deploy.get("html_url"):
                actions_urls.append(
                    {"label": "最近 Deploy", "url": str(latest_deploy["html_url"])}
                )
        if not any(a.get("label") == "pages build and deployment" for a in actions_urls):
            latest_pages = _find_workflow_run(
                owner,
                name,
                workflow_name="pages build and deployment",
                token=token,
                branch="gh-pages",
            )
            if latest_pages and latest_pages.get("html_url"):
                actions_urls.append(
                    {"label": "最近 Pages 构建", "url": str(latest_pages["html_url"])}
                )

        return {
            "preview_ok": False,
            "preview_fixable": True,
            "preview_message": (
                "本地预览超时未更新，可点「解决预览」重试；详见 Actions 链接"
            ),
            "actions_urls": actions_urls,
            "logs": logs + [f"stamp={stamp_text[:180]}"],
        }

    def _fix_local_preview(self, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.local_dir
        if not _is_git_repo(repo):
            raise GitSyncError("本地 不是 Git 仓库")

        design_dir = repo / "方案设计"
        if not design_dir.is_dir():
            raise GitSyncError("未找到 方案设计 目录，无法修复预览")

        marker = design_dir / ".pages-fix-preview"
        marker.write_text(
            "\n".join(
                [
                    f"fixed_at={_utc_now_iso()}",
                    f"actor=kb-orchestrator",
                    f"reason=fix-preview",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        _run_git(["add", "--", str(marker.relative_to(repo))], repo)
        cached = _run_git(["diff", "--cached", "--quiet"], repo, check=False)
        logs: list[str] = []
        if cached.returncode != 0:
            _run_git(
                ["commit", "-m", f"chore: fix pages preview {_now_label()[:10]}"],
                repo,
                env={"SKIP_AUTO_PUSH": "1"},
            )
            logs.append("已创建预览修复提交")
        else:
            logs.append("修复标记无新变更，继续触发等待")

        head_sha = _run_git(["rev-parse", "HEAD"], repo).stdout.strip()
        since_iso = _utc_now_iso()
        remote_url = _run_git(["remote", "get-url", "origin"], repo, check=False).stdout.strip()
        push = _run_git(
            ["push", "origin", "HEAD"],
            repo,
            check=False,
            global_config=["http.version=HTTP/1.1"] if remote_url.startswith("https://") else None,
        )
        if not push.ok:
            raise GitSyncError("解决预览：push 失败", details=push.text)
        logs.append(push.stdout.strip() or push.stderr.strip() or "push 完成")

        # 有 token 时额外尝试 workflow_dispatch，双通道触发
        token = _load_github_token()
        if token:
            try:
                owner, name = _local_repo_slug(repo)
                _github_request(
                    "POST",
                    f"https://api.github.com/repos/{owner}/{name}/actions/workflows/pages.yml/dispatches",
                    token,
                    {"ref": "main"},
                )
                logs.append("已触发 workflow_dispatch: Deploy GitHub Pages")
            except GitSyncError as exc:
                logs.append(f"workflow_dispatch 跳过: {exc}")

        preview = self._await_local_preview(
            repo,
            head_sha,
            since_iso=since_iso,
            wait_for_new_deploy=True,
        )
        logs.extend(preview.get("logs") or [])
        preview_ok = bool(preview.get("preview_ok"))
        return {
            "ok": preview_ok,
            "action": "fix-preview",
            "system": LOCAL_SYSTEM_KEY,
            "message": (
                "解决预览成功：Pages 已更新"
                if preview_ok
                else (preview.get("preview_message") or "解决预览失败")
            ),
            "logs": logs,
            "preview_base_url": LOCAL_PREVIEW_BASE_URL,
            "head_sha": head_sha,
            "preview_ok": preview_ok,
            "preview_fixable": (not preview_ok),
            "preview_message": preview.get("preview_message") or "",
            "actions_urls": preview.get("actions_urls") or [],
        }


def start_daily_vs_main_refresh() -> threading.Event:
    """后台在每天 10:00（北京时间）刷新相对 main 快照；错过则下次循环补做。"""
    stop = threading.Event()

    def loop() -> None:
        while not stop.is_set():
            snapshot = _load_vs_main_snapshot()
            if _vs_main_snapshot_due(_snapshot_compared_at(snapshot)):
                if git_sync_manager.status_snapshot().get("busy"):
                    stop.wait(30)
                    continue
                try:
                    git_sync_manager.refresh_vs_main_snapshot(force=True)
                except Exception:
                    stop.wait(60)
                    continue
            delay = (_vs_main_next_slot() - _now_shanghai()).total_seconds()
            stop.wait(max(1.0, delay))

    threading.Thread(target=loop, name="vs-main-daily", daemon=True).start()
    return stop


git_sync_manager = GitSyncManager()
