#!/usr/bin/env python3
"""Inject prototype-annotation-002 runtime into a plain HTML prototype."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path


START = "<!-- prototype-annotation-002:start -->"
END = "<!-- prototype-annotation-002:end -->"

CONFIG_SCRIPT_RE = re.compile(
    r'<script\s+id="prototype-annotation-002-config"\s+type="application/json"\s*>\s*(\{.*?\})\s*</script>',
    re.DOTALL | re.IGNORECASE,
)


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


def read_existing_config(html: str) -> dict | None:
    match = CONFIG_SCRIPT_RE.search(html)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def preserve_from_existing(config: dict, existing: dict | None) -> dict:
    if not existing:
        return config
    if existing.get("pageId") and not config.get("pageId"):
        config["pageId"] = existing["pageId"]
    persisted = existing.get("persistedState")
    if isinstance(persisted, dict) and persisted:
        config["persistedState"] = persisted
    return config


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, help="Target HTML file.")
    parser.add_argument("--config", required=True, help="Annotation config JSON file.")
    parser.add_argument(
        "--asset-dir",
        default="prototype-annotation",
        help="Directory relative to the HTML file where runtime assets will be copied.",
    )
    parser.add_argument(
        "--preserve-persisted",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Keep persistedState (and pageId) from existing HTML config (default: true).",
    )
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    config_path = Path(args.config).expanduser().resolve()
    skill_dir = Path(__file__).resolve().parents[1]
    assets_src = skill_dir / "assets"
    asset_dir = html_path.parent / args.asset_dir
    asset_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(assets_src / "prototype-annotation-runtime.js", asset_dir / "prototype-annotation-runtime.js")
    shutil.copy2(assets_src / "prototype-annotation.css", asset_dir / "prototype-annotation.css")

    html = html_path.read_text(encoding="utf-8")
    existing = read_existing_config(html) if args.preserve_persisted else None

    config = json.loads(config_path.read_text(encoding="utf-8"))
    if args.preserve_persisted:
        config = preserve_from_existing(config, existing)
    elif "persistedState" in config:
        del config["persistedState"]

    default_policy_path = assets_src / "default-edit-policy.json"
    if "editPolicy" not in config and default_policy_path.is_file():
        config["editPolicy"] = json.loads(default_policy_path.read_text(encoding="utf-8"))

    config_text = json.dumps(config, ensure_ascii=False, indent=2)
    rel_css = f"{args.asset_dir}/prototype-annotation.css"
    rel_js = f"{args.asset_dir}/prototype-annotation-runtime.js"
    block = f"""
{START}
<link rel="stylesheet" href="{rel_css}">
<script id="prototype-annotation-002-config" type="application/json">
{config_text}
</script>
<script src="{rel_js}"></script>
{END}
""".rstrip()

    html = remove_block(html)
    html = inject(html, block)
    html_path.write_text(html, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
