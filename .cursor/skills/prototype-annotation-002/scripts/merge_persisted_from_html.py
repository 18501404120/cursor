#!/usr/bin/env python3
"""Merge persistedState from HTML into a standalone annotation config JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

CONFIG_SCRIPT_RE = re.compile(
    r'<script\s+id="prototype-annotation-002-config"\s+type="application/json"\s*>\s*(\{.*?\})\s*</script>',
    re.DOTALL | re.IGNORECASE,
)


def read_config_from_html(html_path: Path) -> dict | None:
    html = html_path.read_text(encoding="utf-8")
    match = CONFIG_SCRIPT_RE.search(html)
    if not match:
        return None
    return json.loads(match.group(1))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, help="HTML file with embedded annotation config.")
    parser.add_argument("--config", required=True, help="Annotation config JSON to update.")
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    config_path = Path(args.config).expanduser().resolve()

    embedded = read_config_from_html(html_path)
    if not embedded:
        raise SystemExit("No prototype-annotation-002-config found in HTML.")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    if embedded.get("pageId"):
        config["pageId"] = embedded["pageId"]
    persisted = embedded.get("persistedState")
    if isinstance(persisted, dict) and persisted:
        config["persistedState"] = persisted

    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
