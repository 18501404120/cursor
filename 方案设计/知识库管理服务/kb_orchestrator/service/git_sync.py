from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from ..paths import WorkspacePaths

LOCAL_SYSTEM_KEY = "本地"

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

SYSTEM_BRANCH_MAP: dict[str, str] = {
    "分销系统": "feature-chengkaiwu-fenxiao",
    "销售系统": "feature-chengkaiwu-xiaoshou",
    "GTM系统": "feature-chengkaiwu-gtm",
    "自营系统": "feature-chengkaiwu-ziying",
    "产品系统": "feature-chengkaiwu-chanpin",
    "商超系统": "feature-chengkaiwu-shangchao",
}

LOCAL_PREVIEW_BASE_URL = "https://18501404120.github.io/cursor/"

_SENSITIVE_PATTERNS = (".env", ".pem", "credentials.json")


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


def _load_github_token() -> str:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        return token
    paths = WorkspacePaths.resolve()
    env_file = paths.local_dir / "config" / "daily-kb-sync.env"
    if not env_file.is_file():
        return ""
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "GITHUB_TOKEN":
            return value.strip().strip("'").strip('"')
    return ""


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


def _parse_github_repo(remote_url: str) -> tuple[str, str] | None:
    patterns = [
        re.compile(r"git@[^:]+:([^/]+)/(.+)\.git$"),
        re.compile(r"https://[^/]+/([^/]+)/(.+)\.git$"),
    ]
    for pattern in patterns:
        match = pattern.search(remote_url.strip())
        if match:
            return match.group(1), match.group(2)
    return None


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
    ahead_behind = _run_git(
        ["rev-list", "--left-right", "--count", f"origin/{branch}...{branch}"],
        repo,
        check=False,
    )
    ahead = behind = None
    if ahead_behind.ok:
        parts = ahead_behind.stdout.strip().split()
        if len(parts) == 2:
            behind, ahead = int(parts[0]), int(parts[1])
    return {
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
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

    def list_systems(self, *, erp_root=None) -> dict[str, Any]:
        paths = WorkspacePaths.resolve(erp_root)
        items: list[dict[str, Any]] = []

        product_repo = paths.erp_product_dir
        product_branch = _current_branch(product_repo) if _is_git_repo(product_repo) else ""
        product_dirty = _count_changes(product_repo) if _is_git_repo(product_repo) else 0

        for name in _erp_system_names(paths):
            mapped = SYSTEM_BRANCH_MAP.get(name)
            system_changes = (
                _count_changes(product_repo, f"{name}/") if _is_git_repo(product_repo) else 0
            )
            tracking = (
                _branch_tracking(product_repo, mapped)
                if mapped and _is_git_repo(product_repo)
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
                    "mapped_branch": mapped,
                    "can_push": name in GIT_PUSH_SYSTEMS,
                    "change_count": system_changes,
                    "repo_change_count": product_dirty,
                    "status_label": _status_label(
                        system_changes, can_push=name in GIT_PUSH_SYSTEMS
                    ),
                    "tracking": tracking,
                }
            )

        local_repo = paths.local_dir
        local_branch = _current_branch(local_repo) if _is_git_repo(local_repo) else ""
        local_changes = _count_changes(local_repo) if _is_git_repo(local_repo) else 0
        local_tracking = (
            _branch_tracking(local_repo, "main") if _is_git_repo(local_repo) else None
        )
        items.append(
            {
                "key": LOCAL_SYSTEM_KEY,
                "name": LOCAL_SYSTEM_KEY,
                "repo": "本地",
                "repo_path": str(local_repo),
                "kind": "local",
                "current_branch": local_branch,
                "mapped_branch": "main",
                "can_push": True,
                "change_count": local_changes,
                "repo_change_count": local_changes,
                "status_label": _status_label(local_changes, can_push=True),
                "tracking": local_tracking,
            }
        )

        return {
            "items": items,
            "push_systems": sorted(GIT_PUSH_SYSTEMS),
            "operation": self.status_snapshot(),
        }

    def pull_latest(self, system_key: str, *, erp_root=None) -> dict[str, Any]:
        key = system_key.strip()
        if not key:
            raise GitSyncError("系统名不能为空")
        self._begin("pull", key)
        try:
            if key == LOCAL_SYSTEM_KEY:
                return self._pull_local(WorkspacePaths.resolve(erp_root))
            return self._pull_erp(key, WorkspacePaths.resolve(erp_root))
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
        target_branch = SYSTEM_BRANCH_MAP.get(system_key)
        if not target_branch:
            raise GitSyncError(f"未配置 {system_key} 的目标分支")

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

            checkout = _run_git(["checkout", target_branch], repo, check=False)
            if not checkout.ok:
                raise GitSyncError(f"无法切换到 {target_branch}", details=checkout.text)
            logs.append(f"已切换到 {target_branch}")

            pull = _run_git(["pull", "origin", target_branch], repo, check=False)
            if not pull.ok:
                raise GitSyncError(f"pull {target_branch} 失败", details=pull.text)
            logs.append(f"已 pull origin/{target_branch}")

            merge = _run_git(["merge", "--no-edit", "origin/main"], repo, check=False)
            if not merge.ok:
                conflict_files = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                files = [line for line in conflict_files.stdout.splitlines() if line.strip()]
                for rel in files:
                    if rel.startswith(f"{system_key}/"):
                        _run_git(["checkout", "--ours", "--", rel], repo, check=False)
                        _run_git(["add", "--", rel], repo, check=False)
                    else:
                        _run_git(["checkout", "--theirs", "--", rel], repo, check=False)
                        _run_git(["add", "--", rel], repo, check=False)
                remaining = _run_git(
                    ["diff", "--name-only", "--diff-filter=U"], repo, check=False
                )
                if remaining.stdout.strip():
                    _run_git(["merge", "--abort"], repo, check=False)
                    raise GitSyncError(
                        "合并 origin/main 仍有未解决冲突",
                        details=remaining.stdout.strip(),
                        code="conflict",
                    )
                _run_git(
                    [
                        "commit",
                        "--no-edit",
                        "-m",
                        f"merge origin/main into {target_branch}: resolve conflicts before KB push",
                    ],
                    repo,
                    check=False,
                )
                logs.append("已解决 merge origin/main 冲突")
            else:
                logs.append("merge origin/main 完成")

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

            pr_url = self._maybe_create_pr(repo, system_key, target_branch)

            if original_branch and original_branch != target_branch:
                _run_git(["checkout", original_branch], repo, check=False)
                logs.append(f"已切回 {original_branch}")

            if stash_created:
                pop = _run_git(["stash", "pop"], repo, check=False)
                if pop.ok:
                    logs.append("已恢复 stash")
                else:
                    logs.append("WARN: stash pop 失败，请手动处理 stash")

            _clear_system_worktree_after_push(repo, system_key, logs)

            message = f"{system_key}：已推送到 {target_branch}"
            if not committed:
                message += "（仅 merge commit 或无文件差异）"

            result: dict[str, Any] = {
                "ok": True,
                "action": "push",
                "system": system_key,
                "branch": target_branch,
                "committed": committed,
                "message": message,
                "logs": logs,
            }
            if pr_url:
                result["pr_url"] = pr_url
            else:
                owner_repo = self._github_owner_repo(repo)
                if owner_repo:
                    owner, name = owner_repo
                    result["manual_pr_url"] = (
                        f"https://github.com/{owner}/{name}/compare/main...{target_branch}"
                    )
            return result
        finally:
            shutil.rmtree(backup_dir, ignore_errors=True)

    def _push_local(self, paths: WorkspacePaths) -> dict[str, Any]:
        repo = paths.local_dir
        if not _is_git_repo(repo):
            raise GitSyncError("本地 不是 Git 仓库")

        if _count_changes(repo) == 0:
            return {
                "ok": True,
                "action": "push",
                "system": LOCAL_SYSTEM_KEY,
                "skipped": True,
                "message": "本地：无变更，无需推送",
                "logs": [],
                "preview_base_url": LOCAL_PREVIEW_BASE_URL,
            }

        _run_git(["add", "-A"], repo)
        diff = _run_git(["diff", "--cached", "--name-only"], repo, check=False)
        staged_files = [line for line in diff.stdout.splitlines() if line.strip()]
        safe_files = [
            f
            for f in staged_files
            if not any(part in f for part in _SENSITIVE_PATTERNS)
        ]
        if len(safe_files) < len(staged_files):
            for risky in set(staged_files) - set(safe_files):
                _run_git(["reset", "HEAD", "--", risky], repo, check=False)

        cached = _run_git(["diff", "--cached", "--quiet"], repo, check=False)
        if cached.returncode == 0:
            return {
                "ok": True,
                "action": "push",
                "system": LOCAL_SYSTEM_KEY,
                "skipped": True,
                "message": "本地：无有效变更可提交（已排除敏感文件）",
                "logs": [],
                "preview_base_url": LOCAL_PREVIEW_BASE_URL,
            }

        commit_msg = f"chore: 本地方案同步 {_now_label()[:10]}"
        _run_git(["commit", "-m", commit_msg], repo, env={"SKIP_AUTO_PUSH": "1"})

        push = _run_git(
            ["push", "origin", "HEAD"],
            repo,
            check=False,
            global_config=["http.version=HTTP/1.1"],
        )
        if not push.ok:
            raise GitSyncError("push origin 失败", details=push.text)

        return {
            "ok": True,
            "action": "push",
            "system": LOCAL_SYSTEM_KEY,
            "branch": _current_branch(repo),
            "message": "本地：已 push 到 origin/main，约 1～2 分钟后 Pages 预览更新",
            "logs": [push.stdout.strip() or push.stderr.strip() or "push 完成"],
            "preview_base_url": LOCAL_PREVIEW_BASE_URL,
        }

    def _github_owner_repo(self, repo: Path) -> tuple[str, str] | None:
        remote = _run_git(["remote", "get-url", "origin"], repo, check=False)
        if not remote.ok:
            return None
        parsed = _parse_github_repo(remote.stdout.strip())
        return parsed

    def _maybe_create_pr(
        self, repo: Path, system_key: str, target_branch: str
    ) -> str | None:
        token = _load_github_token()
        owner_repo = self._github_owner_repo(repo)
        if not token or not owner_repo:
            return None
        owner, name = owner_repo

        check_url = (
            f"https://api.github.com/repos/{owner}/{name}/pulls"
            f"?head={owner}:{target_branch}&base=main&state=open"
        )
        req = urllib.request.Request(
            check_url,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                existing = json.loads(resp.read().decode("utf-8"))
            if isinstance(existing, list) and existing:
                return str(existing[0].get("html_url") or "")
        except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
            pass

        title = f"{system_key}知识库同步 {_now_label()[:10]}"
        body = (
            "## Summary\n"
            "由知识库管理服务推送的知识库增量同步。\n\n"
            "## 变更范围\n"
            f"仅限 `{system_key}/` 目录的知识库文档更新。"
        )
        payload = json.dumps(
            {"title": title, "head": target_branch, "base": "main", "body": body}
        ).encode("utf-8")
        create_req = urllib.request.Request(
            f"https://api.github.com/repos/{owner}/{name}/pulls",
            data=payload,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(create_req, timeout=20) as resp:
                created = json.loads(resp.read().decode("utf-8"))
            return str(created.get("html_url") or "") or None
        except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
            return None


git_sync_manager = GitSyncManager()
