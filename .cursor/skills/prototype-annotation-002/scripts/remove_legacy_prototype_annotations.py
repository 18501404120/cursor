#!/usr/bin/env python3
"""Remove legacy inline prototype annotations before prototype-annotation 001."""

from __future__ import annotations

import re
import sys
from pathlib import Path


def remove_page_doc_panel(html: str) -> str:
    return re.sub(
        r'\n\s*<section class="panel page-doc-panel">[\s\S]*?</section>\n',
        "\n",
        html,
        count=1,
    )


def remove_annotation_buttons(html: str) -> str:
    html = re.sub(
        r'\s*<button[^>]*\bclass="[^"]*\blogic-pin\b[^"]*"[^>]*>.*?</button>',
        "",
        html,
        flags=re.I | re.S,
    )
    html = re.sub(
        r'\s*<button[^>]*\bclass="[^"]*\bfield-hint-icon\b[^"]*"[^>]*>.*?</button>',
        "",
        html,
        flags=re.I | re.S,
    )
    return html


def remove_logic_modal(html: str) -> str:
    return re.sub(
        r'\n\s*<motionless id="logicUnifiedModal"[\s\S]*?</motionless>\n'.replace("motionless", "div"),
        "\n",
        html,
        count=1,
    )


def remove_css_ranges(html: str) -> str:
    patterns = [
        r"\n    \.page-doc-panel[\s\S]*?    \.page-doc-content li \{[^}]+\}\n",
        r"\n    /\* 开发/测试：红点[\s\S]*?    \.logic-modal-tag\.user \{[^}]+\}\n",
        r"\n    /\* 与《原型-红点逻辑标注[\s\S]*?    \.field-hint-icon:focus-visible \{[^}]+\}\n",
        r"\n    \.logic-modal \{[\s\S]*?    \.logic-modal-tag\.user \{[^}]+\}\n",
    ]
    for pat in patterns:
        html = re.sub(pat, "\n", html, count=1)
    return html


def remove_logic_dev_user_hint(html: str) -> str:
    html = re.sub(
        r"\n  /\*\*[^*]*红点[^*]*\*/\n  var LOGIC_DEV = \(function \(\) \{[\s\S]*?\}\)\(\);\n",
        "\n",
        html,
        count=1,
    )
    html = re.sub(
        r"\n  /\*\*本页开发/测试说明[^*]*\*/\n  var LOGIC_DEV = \(function \(\) \{[\s\S]*?\}\)\(\);\n",
        "\n",
        html,
        count=1,
    )
    html = re.sub(
        r"\n  /\*\* 蓝「i」[^*]*\*/\n  var USER_HINT = \(function \(\) \{[\s\S]*?\}\)\(\);\n",
        "\n",
        html,
        count=1,
    )
    html = re.sub(
        r"\n  var USER_HINT = \(function \(\) \{[\s\S]*?\}\)\(\);\n",
        "\n",
        html,
        count=1,
    )
    return html


def remove_explain_functions(html: str) -> str:
    return re.sub(
        r"\n  function parseExplainBody\(text\) \{[\s\S]*?\n  function wireUnifiedExplain\(\) \{[\s\S]*?\n  \}\n",
        "\n",
        html,
        count=1,
    )


def clean_js_template_pins(html: str) -> str:
    html = re.sub(
        r"\s*'\s*<button[^']*logic-pin[^']*</button>'\s*\+\s*",
        "",
        html,
        flags=re.I,
    )
    html = re.sub(
        r"\s*'\s*<button[^']*field-hint-icon[^']*</button>'\s*\+\s*",
        "",
        html,
        flags=re.I,
    )
    html = re.sub(
        r"      var stripN = document\.createElement\(\"div\"\);\n"
        r"      stripN\.className = \"logic-pop-toolbar\";\n"
        r"      stripN\.innerHTML =\n"
        r'        "[^"]*"\s*\+\n'
        r'        "<span[^"]*</span>";\n'
        r"      el\.appendChild\(stripN\);\n",
        "",
        html,
    )
    html = re.sub(
        r"    var strip = document\.createElement\(\"div\"\);\n"
        r"    strip\.className = \"logic-pop-toolbar\";\n"
        r"    strip\.innerHTML =\n"
        r"      '[^']*';\n"
        r"    el\.appendChild\(strip\);\n",
        "",
        html,
    )
    return html


def remove_misc(html: str) -> str:
    html = re.sub(
        r"\s*if \([^)]*#logicUnifiedModal[^)]*\) return;\s*\n",
        "\n",
        html,
    )
    html = re.sub(r"\n    wireUnifiedExplain\(\);\n", "\n", html)
    return html


def process(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    html = remove_page_doc_panel(html)
    html = remove_annotation_buttons(html)
    html = remove_logic_modal(html)
    html = remove_css_ranges(html)
    html = remove_logic_dev_user_hint(html)
    html = remove_explain_functions(html)
    html = clean_js_template_pins(html)
    html = remove_misc(html)
    path.write_text(html, encoding="utf-8")
    print(f"OK {path.name}")


def main() -> int:
    for arg in sys.argv[1:]:
        process(Path(arg).expanduser().resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
