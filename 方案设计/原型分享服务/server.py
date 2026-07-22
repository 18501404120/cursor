#!/usr/bin/env python3
"""ERP_product 原型局域网分享服务（仅标准库）。"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import socket
import subprocess
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
DEFAULT_PRODUCT_ROOT = ROOT.parent.parent.parent / "ERP_product"
DEFAULT_DESIGN_FOLDER = ROOT.parent / "文件夹"
SKIP_DIR_NAMES = {".git", ".github", "__pycache__", ".DS_Store", "node_modules"}
SHAREABLE_EXTS = {".html", ".htm", ".md", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf", ".js", ".css", ".json"}
DEFAULT_MOUNT_ALIAS = "ERP_product"
LOCAL_REPO_ROOT = ROOT.parent.parent
DESIGN_PREFIX_IN_REPO = "方案设计/"
CONFIG_SCRIPT_RE = re.compile(
    r'(<script\s+id="prototype-annotation-config"\s+type="application/json"\s*>\s*)(\{.*?\})(\s*</script>)',
    re.DOTALL | re.IGNORECASE,
)
PA_PUBLISH_ALLOWED_ORIGINS = {
    "https://18501404120.github.io",
    "http://127.0.0.1:8787",
    "http://localhost:8787",
}


class RootMount:
    def __init__(self, alias: str, path: Path):
        self.alias = alias
        self.path = path.expanduser().resolve()


ROOT_MOUNTS: list[RootMount] = []


def get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        pass
    try:
        return socket.gethostbyname(socket.gethostname())
    except OSError:
        return "127.0.0.1"


def safe_join(base: Path, rel: str) -> Path | None:
    rel = urllib.parse.unquote(rel).lstrip("/").replace("\\", "/")
    if not rel or rel == ".":
        return base.resolve()
    candidate = (base / rel).resolve()
    try:
        candidate.relative_to(base.resolve())
    except ValueError:
        return None
    return candidate


def virtual_path_for(mount: RootMount, physical: Path) -> str:
    rel = str(physical.relative_to(mount.path)).replace("\\", "/")
    if not rel or rel == ".":
        return mount.alias
    return f"{mount.alias}/{rel}"


def resolve_virtual_path(rel: str) -> tuple[RootMount, Path] | None:
    rel = urllib.parse.unquote(rel or "").strip().lstrip("/").replace("\\", "/")
    if not rel:
        return None

    for mount in ROOT_MOUNTS:
        if rel == mount.alias:
            if mount.path.is_dir():
                return mount, mount.path
            return None
        prefix = f"{mount.alias}/"
        if rel.startswith(prefix):
            sub = rel[len(prefix) :]
            physical = safe_join(mount.path, sub)
            if physical is not None:
                return mount, physical
            return None

    default = next((m for m in ROOT_MOUNTS if m.alias == DEFAULT_MOUNT_ALIAS), None)
    if default is None:
        return None
    physical = safe_join(default.path, rel)
    if physical is None:
        return None
    return default, physical


def default_mount() -> RootMount:
    for mount in ROOT_MOUNTS:
        if mount.alias == DEFAULT_MOUNT_ALIAS:
            return mount
    return ROOT_MOUNTS[0]


def collect_htmls(dir_path: Path) -> list[Path]:
    named = sorted(dir_path.glob("原型*.html"))
    others = sorted(p for p in dir_path.glob("*.html") if not p.name.startswith("原型"))
    seen: set[str] = set()
    result: list[Path] = []
    for p in named + others:
        if p.name in seen:
            continue
        seen.add(p.name)
        result.append(p)
    return result


def list_entry(path: Path, mount: RootMount) -> dict:
    rel = virtual_path_for(mount, path)
    item = {
        "name": path.name,
        "path": rel,
        "root": mount.alias,
        "type": "dir" if path.is_dir() else "file",
    }
    if path.is_file():
        item["ext"] = path.suffix.lower()
        item["size"] = path.stat().st_size
        try:
            item["mtime"] = int(path.stat().st_mtime)
        except OSError:
            item["mtime"] = 0
    elif path.is_dir():
        htmls = collect_htmls(path)
        item["prototype_count"] = len(htmls)
        item["prototypes"] = [p.name for p in htmls[:8]]
        item["is_demand"] = len(htmls) > 0
        try:
            item["mtime"] = int(path.stat().st_mtime)
        except OSError:
            item["mtime"] = 0
    return item


def scan_demands_for_mount(mount: RootMount) -> list[dict]:
    """扫描「系统/迭代需求/版本/需求目录」结构下的含原型需求。"""
    demands: list[dict] = []
    product_root = mount.path
    if not product_root.is_dir():
        return demands
    for system_dir in sorted(product_root.iterdir()):
        if not system_dir.is_dir() or system_dir.name in SKIP_DIR_NAMES or system_dir.name.startswith("."):
            continue
        iter_root = system_dir / "迭代需求"
        if not iter_root.is_dir():
            continue
        for version_dir in sorted(iter_root.iterdir(), reverse=True):
            if not version_dir.is_dir() or version_dir.name.startswith("."):
                continue
            if version_dir.name in SKIP_DIR_NAMES:
                continue
            for demand_dir in sorted(version_dir.iterdir()):
                if not demand_dir.is_dir() or demand_dir.name.startswith("."):
                    continue
                htmls = collect_htmls(demand_dir)
                if not htmls:
                    continue
                try:
                    mtime = max(p.stat().st_mtime for p in htmls)
                    dir_mtime = demand_dir.stat().st_mtime
                    mtime = max(mtime, dir_mtime)
                except OSError:
                    mtime = 0
                rel = virtual_path_for(mount, demand_dir)
                primary = htmls[0]
                demands.append(
                    {
                        "name": demand_dir.name,
                        "path": rel,
                        "root": mount.alias,
                        "system": system_dir.name,
                        "version": version_dir.name,
                        "prototype_count": len(htmls),
                        "prototypes": [p.name for p in htmls],
                        "primary_html": primary.name,
                        "primary_path": virtual_path_for(mount, primary),
                        "mtime": int(mtime),
                    }
                )
    return demands


def scan_demands() -> list[dict]:
    demands: list[dict] = []
    for mount in ROOT_MOUNTS:
        demands.extend(scan_demands_for_mount(mount))
    demands.sort(key=lambda d: d["mtime"], reverse=True)
    return demands


def find_git_root(start: Path) -> Path | None:
    current = start.resolve()
    for parent in [current, *current.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def load_github_token() -> str:
    env_path = LOCAL_REPO_ROOT / "config" / "daily-kb-sync.env"
    if not env_path.is_file():
        return os.environ.get("GITHUB_TOKEN", "")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("GITHUB_TOKEN="):
            return line.split("=", 1)[1].strip()
    return os.environ.get("GITHUB_TOKEN", "")


def apply_config_to_html(html_path: Path, config: dict) -> bool:
    html = html_path.read_text(encoding="utf-8")
    match = CONFIG_SCRIPT_RE.search(html)
    if not match:
        raise ValueError(f"未找到 prototype-annotation-config: {html_path}")
    payload = json.dumps(config, ensure_ascii=False, indent=2)
    updated = html[: match.start(2)] + payload + html[match.end(2) :]
    if updated == html:
        return False
    html_path.write_text(updated, encoding="utf-8")
    return True


def resolve_repo_html_path(repo_path: str) -> Path:
    rel = urllib.parse.unquote(repo_path or "").strip().lstrip("/").replace("\\", "/")
    if not rel:
        raise ValueError("缺少 repoPath")
    if rel.startswith("cursor/"):
        rel = rel[len("cursor/") :]
    if not rel.startswith(DESIGN_PREFIX_IN_REPO):
        if rel.startswith("文件夹/"):
            rel = DESIGN_PREFIX_IN_REPO + rel
        else:
            rel = DESIGN_PREFIX_IN_REPO + rel
    target = (LOCAL_REPO_ROOT / rel).resolve()
    try:
        target.relative_to(LOCAL_REPO_ROOT.resolve())
    except ValueError as exc:
        raise ValueError("非法路径") from exc
    if not target.is_file():
        raise ValueError(f"文件不存在: {rel}")
    return target


def git_publish_file(html_path: Path, message: str) -> None:
    git_root = find_git_root(html_path)
    if git_root is None:
        raise RuntimeError("未找到 Git 仓库")
    rel = html_path.resolve().relative_to(git_root.resolve()).as_posix()
    env = os.environ.copy()
    env["SKIP_AUTO_PUSH"] = "1"
    subprocess.run(["git", "add", rel], cwd=git_root, check=True)
    status = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=git_root)
    if status.returncode == 0:
        return
    subprocess.run(["git", "commit", "-m", message], cwd=git_root, check=True, env=env)
    push = subprocess.run(
        ["git", "-c", "http.version=HTTP/1.1", "push", "origin", "HEAD"],
        cwd=git_root,
        capture_output=True,
        text=True,
    )
    if push.returncode != 0:
        raise RuntimeError(push.stderr.strip() or push.stdout.strip() or "git push 失败")


def preview_url_for_repo_path(repo_path: str) -> str:
    rel = repo_path.replace("\\", "/").lstrip("/")
    if rel.startswith("cursor/"):
        rel = rel[len("cursor/") :]
    if rel.startswith(DESIGN_PREFIX_IN_REPO):
        rel = rel[len(DESIGN_PREFIX_IN_REPO) :]
    return "https://18501404120.github.io/cursor/" + urllib.parse.quote(rel, safe="/")


class ProtoShareHandler(BaseHTTPRequestHandler):
    port: int = 8787

    def log_message(self, fmt: str, *args) -> None:
        print(f"[share] {self.address_string()} - {fmt % args}")

    def _send_json(self, data, status: int = 200, extra_headers: dict | None = None) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self) -> dict[str, str]:
        origin = self.headers.get("Origin", "")
        if origin in PA_PUBLISH_ALLOWED_ORIGINS:
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Vary": "Origin",
            }
        return {}

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("请求体不是合法 JSON") from exc
        if not isinstance(data, dict):
            raise ValueError("请求体必须是 JSON 对象")
        return data

    def do_OPTIONS(self) -> None:
        if self.path == "/api/pa-publish":
            self._send_json({"ok": True}, extra_headers=self._cors_headers())
            return
        self._send_json({"error": "not found"}, 404)

    def do_POST(self) -> None:
        if self.path != "/api/pa-publish":
            self._send_json({"error": "not found"}, 404)
            return
        cors = self._cors_headers()
        try:
            payload = self._read_json_body()
            repo_path = str(payload.get("repoPath") or "")
            config = payload.get("config")
            if not isinstance(config, dict):
                raise ValueError("缺少 config")
            html_path = resolve_repo_html_path(repo_path)
            changed = apply_config_to_html(html_path, config)
            if changed:
                page_title = str(config.get("pageTitle") or html_path.name)
                git_publish_file(html_path, f"chore(管报): 发布原型标注 {page_title}")
            self._send_json(
                {
                    "ok": True,
                    "repoPath": repo_path,
                    "changed": changed,
                    "previewUrl": preview_url_for_repo_path(repo_path),
                },
                extra_headers=cors,
            )
        except Exception as exc:  # noqa: BLE001 - return message to UI
            self._send_json({"ok": False, "error": str(exc)}, 400, extra_headers=cors)

    def _send_bytes(self, data: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_file(self, path: Path) -> None:
        ctype, _ = mimetypes.guess_type(str(path))
        if path.suffix.lower() in {".html", ".htm"}:
            ctype = "text/html; charset=utf-8"
        elif path.suffix.lower() == ".md":
            ctype = "text/markdown; charset=utf-8"
        elif not ctype:
            ctype = "application/octet-stream"
        data = path.read_bytes()
        self._send_bytes(data, ctype)

    def _send_static(self, name: str) -> None:
        path = (STATIC_DIR / name).resolve()
        try:
            path.relative_to(STATIC_DIR.resolve())
        except ValueError:
            self._send_json({"error": "forbidden"}, 403)
            return
        if not path.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        self._send_file(path)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path in {"/", "/index.html"}:
            self._send_static("index.html")
            return
        if path.startswith("/static/"):
            self._send_static(path[len("/static/") :])
            return
        if path == "/share" or path.startswith("/share/"):
            self._send_static("share.html")
            return
        if path == "/publish-bridge.html":
            self._send_static("publish-bridge.html")
            return
        if path == "/api/info":
            self._send_json(
                {
                    "lan_ip": get_lan_ip(),
                    "port": self.port,
                    "roots": [{"alias": m.alias, "path": str(m.path)} for m in ROOT_MOUNTS],
                    "product_root": str(default_mount().path),
                    "local_url": f"http://127.0.0.1:{self.port}/",
                    "lan_url": f"http://{get_lan_ip()}:{self.port}/",
                }
            )
            return
        if path == "/api/demands":
            q = ((qs.get("q") or [""])[0] or "").strip().lower()
            system = ((qs.get("system") or [""])[0] or "").strip()
            demands = scan_demands()
            systems = sorted({d["system"] for d in demands})
            if system:
                demands = [d for d in demands if d["system"] == system]
            if q:
                demands = [
                    d
                    for d in demands
                    if q in d["name"].lower()
                    or q in d["version"].lower()
                    or q in d["system"].lower()
                    or any(q in p.lower() for p in d["prototypes"])
                ]
            self._send_json({"total": len(demands), "systems": systems, "items": demands})
            return
        if path == "/api/browse":
            rel = (qs.get("path") or [""])[0]
            rel = (rel or "").strip().lstrip("/").replace("\\", "/")
            if not rel:
                children = []
                for mount in ROOT_MOUNTS:
                    if not mount.path.is_dir():
                        continue
                    children.append(list_entry(mount.path, mount))
                self._send_json({"path": "", "crumbs": [], "items": children})
                return

            resolved = resolve_virtual_path(rel)
            if resolved is None:
                self._send_json({"error": "路径不存在"}, 404)
                return
            mount, target = resolved
            if not target.exists():
                self._send_json({"error": "路径不存在"}, 404)
                return
            if target.is_file():
                self._send_json({"error": "目标是文件，请用 /files 访问"}, 400)
                return
            children = []
            for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
                if child.name in SKIP_DIR_NAMES or child.name.startswith("."):
                    continue
                if child.is_file() and child.suffix.lower() not in SHAREABLE_EXTS:
                    continue
                children.append(list_entry(child, mount))
            parts = [p for p in rel.split("/") if p]
            crumbs = []
            acc = []
            for part in parts:
                acc.append(part)
                crumbs.append({"name": part, "path": "/".join(acc)})
            self._send_json(
                {
                    "path": rel,
                    "crumbs": crumbs,
                    "items": children,
                }
            )
            return
        if path == "/api/folder":
            rel = (qs.get("path") or [""])[0]
            resolved = resolve_virtual_path(rel or "")
            if resolved is None:
                self._send_json({"error": "目录不存在"}, 404)
                return
            mount, target = resolved
            if not target.is_dir():
                self._send_json({"error": "目录不存在"}, 404)
                return
            files = []
            for child in sorted(target.iterdir(), key=lambda p: p.name.lower()):
                if not child.is_file():
                    continue
                if child.suffix.lower() not in SHAREABLE_EXTS:
                    continue
                files.append(list_entry(child, mount))
            htmls = collect_htmls(target)
            parts = rel.replace("\\", "/").strip("/").split("/")
            self._send_json(
                {
                    "path": rel.replace("\\", "/").strip("/"),
                    "name": target.name,
                    "root": mount.alias,
                    "system": parts[1] if len(parts) >= 2 and mount.alias == DEFAULT_MOUNT_ALIAS else "",
                    "version": parts[3] if len(parts) >= 4 and mount.alias == DEFAULT_MOUNT_ALIAS else "",
                    "files": files,
                    "primary_html": htmls[0].name if htmls else "",
                    "primary_path": virtual_path_for(mount, htmls[0]) if htmls else "",
                }
            )
            return
        if path.startswith("/files/"):
            rel = path[len("/files/") :]
            resolved = resolve_virtual_path(rel)
            if resolved is None:
                self._send_json({"error": "文件不存在"}, 404)
                return
            _, target = resolved
            if not target.is_file():
                self._send_json({"error": "文件不存在"}, 404)
                return
            if target.suffix.lower() not in SHAREABLE_EXTS:
                self._send_json({"error": "不支持的文件类型"}, 403)
                return
            self._send_file(target)
            return

        self._send_json({"error": "not found"}, 404)


def parse_mounts(root_args: list[str]) -> list[RootMount]:
    mounts: list[RootMount] = []
    for spec in root_args:
        if ":" in spec:
            alias, raw_path = spec.split(":", 1)
            alias = alias.strip()
            raw_path = raw_path.strip()
        else:
            alias = DEFAULT_MOUNT_ALIAS if not mounts else f"root{len(mounts) + 1}"
            raw_path = spec.strip()
        if not alias or not raw_path:
            raise SystemExit(f"无效的根目录配置: {spec}")
        path = Path(raw_path).expanduser().resolve()
        if not path.is_dir():
            raise SystemExit(f"目录不存在: {alias} -> {path}")
        mounts.append(RootMount(alias, path))
    return mounts


def main() -> None:
    parser = argparse.ArgumentParser(description="ERP 原型局域网分享服务")
    parser.add_argument(
        "--root",
        action="append",
        default=[],
        help="挂载目录，格式 alias:/path/to/dir；可重复指定多个",
    )
    parser.add_argument("--host", default="0.0.0.0", help="监听地址")
    parser.add_argument("--port", type=int, default=8787, help="端口")
    args = parser.parse_args()

    global ROOT_MOUNTS
    if args.root:
        ROOT_MOUNTS = parse_mounts(args.root)
    else:
        ROOT_MOUNTS = [
            RootMount(DEFAULT_MOUNT_ALIAS, DEFAULT_PRODUCT_ROOT),
            RootMount("文件夹", DEFAULT_DESIGN_FOLDER),
        ]

    ProtoShareHandler.port = args.port

    server = ThreadingHTTPServer((args.host, args.port), ProtoShareHandler)
    lan_ip = get_lan_ip()
    print("=" * 56)
    print("  ERP 原型分享服务已启动")
    for mount in ROOT_MOUNTS:
        print(f"  [{mount.alias}] {mount.path}")
    print(f"  本机管理: http://127.0.0.1:{args.port}/")
    print(f"  同事访问: http://{lan_ip}:{args.port}/")
    print("  停止服务: Ctrl+C")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[share] 已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
