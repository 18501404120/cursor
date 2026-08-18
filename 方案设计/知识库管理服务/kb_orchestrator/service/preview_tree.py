from __future__ import annotations

import json
from pathlib import Path
from typing import Any

SKIP_DIR_NAMES = {
    ".git",
    ".github",
    ".cursor",
    "__pycache__",
    "node_modules",
    "_archive",
    "暂时不需要",
    "mcp",
}

HTML_SUFFIXES = {".html", ".htm"}


def _default_repo() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "方案设计" / "文件夹").is_dir() and (parent / ".git").exists():
            return parent
    raise FileNotFoundError("未找到本地仓库根（需含 方案设计/文件夹 与 .git）")


def _load_badges(repo: Path) -> dict[str, dict[str, str]]:
    path = repo / "方案设计" / "文件夹" / "规范" / "assets" / "preview-badges.json"
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return {}
    result: dict[str, dict[str, str]] = {}
    for key, value in data.items():
        if isinstance(value, dict):
            result[str(key).replace("\\", "/")] = {
                k: str(v) for k, v in value.items() if v is not None
            }
        elif isinstance(value, str) and value:
            result[str(key).replace("\\", "/")] = {"badge": value}
    return result


def infer_badge(folder_rel: str, name: str, badges: dict[str, dict[str, str]]) -> dict[str, str]:
    key = folder_rel.replace("\\", "/")
    if key in badges:
        return dict(badges[key])
    lowered = name.lower()
    if lowered == "index.html" or lowered == "index.htm":
        return {"badge": "子目录入口", "badgeClass": "is-index"}
    if "demo" in lowered:
        return {"badge": "Demo"}
    if name == "方案框架.html":
        return {"badge": "总览"}
    if name == "需求原型.html":
        return {"badge": "wireframe"}
    if "场景梳理" in name:
        return {"badge": "场景梳理"}
    return {}


def _should_skip_dir(name: str) -> bool:
    return name in SKIP_DIR_NAMES or name.startswith(".")


def scan_html_tree(
    scan_root: Path,
    *,
    href_prefix: str = "",
    skip_root_index: bool = True,
    open_depth: int = 2,
    badges: dict[str, dict[str, str]] | None = None,
    folder_prefix: str = "",
) -> list[dict[str, Any]]:
    badges = badges or {}

    def walk(dir_path: Path, depth: int) -> list[dict[str, Any]]:
        children: list[dict[str, Any]] = []
        try:
            entries = sorted(dir_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except OSError:
            return children

        for entry in entries:
            if entry.is_dir():
                if _should_skip_dir(entry.name):
                    continue
                nested = walk(entry, depth + 1)
                if not nested:
                    continue
                children.append(
                    {
                        "type": "dir",
                        "name": entry.name,
                        "open": depth < open_depth,
                        "children": nested,
                    }
                )
                continue

            if entry.suffix.lower() not in HTML_SUFFIXES:
                continue
            if skip_root_index and depth == 0 and entry.name.lower() in {"index.html", "index.htm"}:
                continue

            rel = entry.relative_to(scan_root).as_posix()
            folder_rel = f"{folder_prefix}/{rel}".strip("/") if folder_prefix else rel
            node: dict[str, Any] = {
                "type": "file",
                "name": entry.name,
                "href": f"{href_prefix}{rel}",
            }
            extra = infer_badge(folder_rel, entry.name, badges)
            if extra.get("badge"):
                node["badge"] = extra["badge"]
            if extra.get("badgeClass"):
                node["badgeClass"] = extra["badgeClass"]
            children.append(node)
        return children

    return walk(scan_root, 0)


def _write_json_if_changed(path: Path, payload: Any) -> bool:
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def refresh_preview_trees(repo: Path | None = None) -> list[str]:
    """扫描 方案设计/文件夹 下 HTML，重写三份 preview-manifest.json。"""
    repo = Path(repo) if repo is not None else _default_repo()
    design = repo / "方案设计"
    folder = design / "文件夹"
    logs: list[str] = []
    if not folder.is_dir():
        logs.append("预览目录树：未找到 方案设计/文件夹，已跳过")
        return logs

    badges = _load_badges(repo)
    specs = [
        {
            "name": "项目",
            "scan": folder / "项目",
            "manifest": folder / "项目" / "preview-manifest.json",
            "href_prefix": "",
            "skip_root_index": True,
            "open_depth": 3,
            "folder_prefix": "项目",
        },
        {
            "name": "需求",
            "scan": folder / "需求",
            "manifest": folder / "需求" / "preview-manifest.json",
            "href_prefix": "",
            "skip_root_index": True,
            "open_depth": 2,
            "folder_prefix": "需求",
        },
        {
            "name": "仓库根",
            "scan": folder,
            "manifest": design / "preview-manifest.json",
            "href_prefix": "文件夹/",
            "skip_root_index": False,
            "open_depth": 1,
            "folder_prefix": "",
        },
    ]

    changed = 0
    for spec in specs:
        scan = spec["scan"]
        if not scan.is_dir():
            logs.append(f"预览目录树：跳过 {spec['name']}（目录不存在）")
            continue
        tree = scan_html_tree(
            scan,
            href_prefix=str(spec["href_prefix"]),
            skip_root_index=bool(spec["skip_root_index"]),
            open_depth=int(spec["open_depth"]),
            badges=badges,
            folder_prefix=str(spec["folder_prefix"]),
        )
        payload = {"tree": tree}
        if _write_json_if_changed(spec["manifest"], payload):
            changed += 1
            logs.append(f"预览目录树：已更新 {spec['name']} ({_count_files(tree)} 个 HTML)")
        else:
            logs.append(f"预览目录树：{spec['name']} 已是最新 ({_count_files(tree)} 个 HTML)")
    if changed:
        logs.append(f"预览目录树：共刷新 {changed} 份清单，推送后 Pages 将按磁盘展示")
    return logs


def _count_files(nodes: list[dict[str, Any]]) -> int:
    total = 0
    for node in nodes:
        if node.get("type") == "file":
            total += 1
        else:
            total += _count_files(node.get("children") or [])
    return total


def main() -> None:
    for line in refresh_preview_trees():
        print(line)


if __name__ == "__main__":
    main()
