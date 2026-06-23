#!/usr/bin/env python3
"""Inject prototype-edit 001 runtime into a plain HTML prototype."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


START = "<!-- prototype-edit:start -->"
END = "<!-- prototype-edit:end -->"


def remove_block(html: str) -> str:
    while START in html and END in html:
        start = html.index(START)
        end = html.index(END) + len(END)
        html = html[:start] + html[end:]
    return html


def inject(html: str, block: str) -> str:
    if "</body>" in html:
        return html.replace("</body>", block + "\n</body>", 1)
    return html + "\n" + block


def sidecar_path(html_path: Path) -> Path:
    return html_path.with_suffix(".prototype-edit.json")


def load_sidecar(html_path: Path) -> dict | None:
    path = sidecar_path(html_path)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def default_page_id(html_path: Path) -> str:
    stem = html_path.stem
    return re.sub(r"[^\w\-]+", "-", stem).strip("-").lower() or "page"


def build_config(
    html_path: Path,
    page_id: str | None,
    page_title: str | None,
    preserve_edits: bool,
    existing_config: dict | None,
    sidecar: dict | None,
) -> dict:
    config: dict = {
        "pageId": page_id or (existing_config or {}).get("pageId") or default_page_id(html_path),
        "runtimeVersion": "2026-06-23",
        "pageTitle": page_title or (existing_config or {}).get("pageTitle") or html_path.stem,
        "mockRegistry": (existing_config or {}).get("mockRegistry") or [],
        "renderHooks": (existing_config or {}).get("renderHooks") or [],
        "canonicalEdits": empty_edits(),
    }

    if preserve_edits:
        if sidecar and sidecar.get("edits"):
            config["canonicalEdits"] = sidecar["edits"]
            config["sidecarVersion"] = sidecar.get("sidecarVersion", 1)
        elif existing_config and existing_config.get("canonicalEdits"):
            config["canonicalEdits"] = existing_config["canonicalEdits"]
        elif existing_config and existing_config.get("edits"):
            config["canonicalEdits"] = existing_config["edits"]

    return config


def empty_edits() -> dict:
    return {
        "text": {},
        "hidden": [],
        "mock": {},
        "addedFilters": [],
        "addedColumns": [],
        "addedButtons": [],
        "addedFormFields": [],
        "columnOrder": {},
    }


def read_existing_config(html: str) -> dict | None:
    marker = 'id="prototype-edit-config"'
    if marker not in html:
        return None
    start = html.index("<script", html.index(marker))
    start = html.index(">", start) + 1
    end = html.index("</script>", start)
    try:
        return json.loads(html[start:end])
    except json.JSONDecodeError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Inject prototype-edit 001 into HTML.")
    parser.add_argument("--html", required=True, help="Target HTML file.")
    parser.add_argument("--page-id", default="", help="Stable pageId for storage/sidecar.")
    parser.add_argument("--page-title", default="", help="Human-readable page title.")
    parser.add_argument(
        "--asset-dir",
        default="prototype-edit",
        help="Directory relative to HTML where runtime assets are copied.",
    )
    parser.add_argument(
        "--preserve-edits",
        action="store_true",
        default=True,
        help="Merge sidecar / existing canonicalEdits (default: true).",
    )
    parser.add_argument(
        "--no-preserve-edits",
        action="store_false",
        dest="preserve_edits",
        help="Reset canonicalEdits (only when user explicitly clears edits).",
    )
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    skill_dir = Path(__file__).resolve().parents[1]
    assets_src = skill_dir / "assets"
    asset_dir = html_path.parent / args.asset_dir
    asset_dir.mkdir(parents=True, exist_ok=True)

    for name in (
        "prototype-edit-runtime.js",
        "prototype-edit.css",
        "component-catalog.json",
    ):
        shutil.copy2(assets_src / name, asset_dir / name)

    html = html_path.read_text(encoding="utf-8")
    existing = read_existing_config(html)
    sidecar = load_sidecar(html_path)
    config = build_config(
        html_path,
        args.page_id or None,
        args.page_title or None,
        args.preserve_edits,
        existing,
        sidecar,
    )

    config_text = json.dumps(config, ensure_ascii=False, indent=2)
    rel_css = f"{args.asset_dir}/prototype-edit.css"
    rel_js = f"{args.asset_dir}/prototype-edit-runtime.js"
    block = f"""
{START}
<link rel="stylesheet" href="{rel_css}">
<script id="prototype-edit-config" type="application/json">
{config_text}
</script>
<script src="{rel_js}"></script>
{END}
""".rstrip()

    html = remove_block(html)
    html = inject(html, block)
    html_path.write_text(html, encoding="utf-8")
    print(f"Injected prototype-edit into {html_path}")
    if sidecar:
        print(f"Merged sidecar: {sidecar_path(html_path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
