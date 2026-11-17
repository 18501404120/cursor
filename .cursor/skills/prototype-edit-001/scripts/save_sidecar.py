#!/usr/bin/env python3
"""Write or update {page}.prototype-edit.json from exported JSON or stdin."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Save prototype-edit sidecar next to HTML.")
    parser.add_argument("--html", required=True, help="Target HTML file (sidecar path derived).")
    parser.add_argument(
        "--from-json",
        default="",
        help="Path to exported .prototype-edit.json; default: stdin JSON.",
    )
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    sidecar_path = html_path.with_suffix(".prototype-edit.json")

    if args.from_json:
        payload = json.loads(Path(args.from_json).expanduser().read_text(encoding="utf-8"))
    else:
        payload = json.load(sys.stdin)

    if "edits" not in payload:
        raise SystemExit("JSON must contain 'edits' object.")

    sidecar_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {sidecar_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
