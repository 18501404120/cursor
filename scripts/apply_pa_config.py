#!/usr/bin/env python3
"""将原型标注配置写入 HTML 内嵌的 prototype-annotation-config。"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

CONFIG_SCRIPT_RE = re.compile(
    r'(<script\s+id="prototype-annotation-config"\s+type="application/json"\s*>\s*)(\{.*?\})(\s*</script>)',
    re.DOTALL | re.IGNORECASE,
)


def apply_config_to_html(html_path: Path, config: dict) -> bool:
    html = html_path.read_text(encoding="utf-8")
    match = CONFIG_SCRIPT_RE.search(html)
    if not match:
        raise SystemExit(f"未找到 prototype-annotation-config: {html_path}")
    payload = json.dumps(config, ensure_ascii=False, indent=2)
    updated = html[: match.start(2)] + payload + html[match.end(2) :]
    if updated == html:
        return False
    html_path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, help="目标 HTML 文件路径")
    parser.add_argument("--config", required=True, help="完整配置 JSON 文件路径")
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    config_path = Path(args.config).expanduser().resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    changed = apply_config_to_html(html_path, config)
    print("updated" if changed else "unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
