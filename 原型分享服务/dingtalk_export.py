#!/usr/bin/env python3
"""把原型标注烤进单文件 HTML，供钉钉文档预览。

钉钉预览不执行页面脚本，也不加载同目录的 js/css。
本模块只生成上传用副本，不改源文件。
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path


CONFIG_RE = re.compile(
    r'<script\s+id="prototype-annotation(?:-002)?-config"\s+type="application/json"\s*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)
BLOCK_RE = re.compile(
    r"<!--\s*prototype-annotation(?:-002)?:start\s*-->.*?<!--\s*prototype-annotation(?:-002)?:end\s*-->",
    re.DOTALL | re.IGNORECASE,
)
SKIP_RE = re.compile(
    r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<!--.*?-->",
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<(/?)([A-Za-z][\w:-]*)([^<>]*?)(/?)>", re.DOTALL)
ATTR_RE = re.compile(
    r"""([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?""",
)
NUMBERED_RE = re.compile(r"^\d+[.、)]\s*")
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
WRAP_TAGS = VOID_TAGS | {"select", "textarea"}
TABLE_TAGS = {"table", "thead", "tbody", "tfoot", "tr", "td", "th"}

BAKED_STYLE = """
<style id="dingtalk-annotation-style">
  .dt-pa-banner {
    margin: 0; padding: 8px 14px; background: #fff7ed; color: #9a3412;
    font: 13px/1.6 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .dt-pa-host { position: relative; }
  .dt-pa-dot, .dt-pa-tip {
    position: absolute; z-index: 20; top: -6px; right: -6px;
    min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font: 700 10px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    box-sizing: border-box;
  }
  .dt-pa-dot { border: 1px solid rgba(220, 38, 38, 0.4); background: #ef4444; color: #fff; }
  .dt-pa-tip { border: 1px solid #7ea9ff; background: #eef4ff; color: #2b6fff; }
  .dt-pa-note {
    margin: 16px; padding: 12px 14px; border: 1px solid #d9e2ef; border-radius: 8px;
    background: #fff; color: #1f2937;
    font: 13px/1.7 -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .dt-pa-note h2 { margin: 0 0 8px; font-size: 15px; }
  .dt-pa-note h3 { margin: 14px 0 4px; font-size: 13px; }
  .dt-pa-note ol, .dt-pa-note ul { margin: 4px 0 0; padding-left: 18px; }
  .dt-pa-miss { margin: 0 0 8px; padding: 8px 10px; background: #fff7ed; color: #9a3412; border-radius: 6px; }
  .dt-pa-item { margin: 0 0 10px; padding: 8px 10px; border-radius: 8px; }
  .dt-pa-item-ann { border: 1px solid #fecaca; background: #fff7f7; color: #7f1d1d; }
  .dt-pa-item-tip { border: 1px solid #dbe7ff; background: #f5f8ff; color: #1e3a8a; }
  .dt-pa-item strong { display: block; }
</style>
""".strip()


def has_annotation(html_text: str) -> bool:
    return bool(CONFIG_RE.search(html_text))


def read_config(html_text: str) -> dict | None:
    match = CONFIG_RE.search(html_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def export_filename(source: Path) -> str:
    return f"{source.stem}-钉钉预览{source.suffix or '.html'}"


def _text(value) -> str:
    return "" if value is None else str(value)


def _esc(value) -> str:
    return html.escape(_text(value), quote=True)


def parse_body(raw: str) -> tuple[list[str], list[str]]:
    numbered: list[str] = []
    extra: list[str] = []
    for line in _text(raw).replace("\r\n", "\n").split("\n"):
        line = line.strip()
        if not line:
            continue
        if NUMBERED_RE.match(line):
            numbered.append(NUMBERED_RE.sub("", line))
        else:
            extra.append(line)
    return numbered, extra


def body_html(raw: str) -> str:
    numbered, extra = parse_body(raw)
    parts: list[str] = []
    if numbered:
        parts.append("<ol>" + "".join(f"<li>{_esc(item)}</li>" for item in numbered) + "</ol>")
    parts.extend(f"<p>{_esc(item)}</p>" for item in extra)
    return "".join(parts) or "<p>无说明正文。</p>"


def resolve_content(config: dict, key: str, item: dict) -> str:
    persisted = config.get("persistedState") if isinstance(config.get("persistedState"), dict) else {}
    edits = persisted.get("edits") if isinstance(persisted.get("edits"), dict) else {}
    edited = edits.get(key)
    if isinstance(edited, dict) and edited.get("body") is not None:
        return _text(edited.get("body"))
    if isinstance(edited, str):
        return edited
    return _text(item.get("body"))


def collect_items(config: dict) -> tuple[list[dict], list[dict], list[str]]:
    persisted = config.get("persistedState") if isinstance(config.get("persistedState"), dict) else {}
    hidden = persisted.get("hidden") if isinstance(persisted.get("hidden"), dict) else {}
    user_added = persisted.get("userAdded") if isinstance(persisted.get("userAdded"), dict) else {}
    warnings: list[str] = []
    if any(user_added.get(name) for name in ("annotations", "fieldTips")):
        warnings.append("浏览器里新增、尚未写回文件的标注不会出现在这份副本里。")

    def take(kind: str, items: list, user: bool) -> list[dict]:
        out = []
        for index, item in enumerate(items or []):
            if not isinstance(item, dict):
                continue
            item_id = _text(item.get("id")) or str(index)
            if kind == "annotation":
                key = f"{'userAnnotation' if user else 'annotation'}:{item_id if user or item.get('id') else index}"
            else:
                key = f"{'userFieldTip' if user else 'fieldTip'}:{item_id if user or item.get('id') else index}"
            if hidden.get(key):
                continue
            out.append({
                "kind": kind,
                "id": item_id,
                "selector": _text(item.get("selector")),
                "title": _text(item.get("title")) or ("字段释义" if kind == "tip" else "说明"),
                "body": resolve_content(config, key, item),
            })
        return out

    annotations = take("annotation", config.get("annotations") or [], False)
    annotations += take("annotation", user_added.get("annotations") or [], True)
    tips = take("tip", config.get("fieldTips") or [], False)
    tips += take("tip", user_added.get("fieldTips") or [], True)
    for index, item in enumerate(annotations):
        item["number"] = index + 1
    return annotations, tips, warnings


def _skip_ranges(html_text: str) -> list[tuple[int, int]]:
    return [(match.start(), match.end()) for match in SKIP_RE.finditer(html_text)]


def _inside(index: int, ranges: list[tuple[int, int]]) -> bool:
    return any(start <= index < end for start, end in ranges)


def _attrs(raw: str) -> dict[str, str | None]:
    attrs: dict[str, str | None] = {}
    for match in ATTR_RE.finditer(raw or ""):
        name = match.group(1)
        if not name or name.startswith("/") or name in {"/", "?"}:
            continue
        value = match.group(2)
        if value is None:
            value = match.group(3)
        if value is None:
            value = match.group(4)
        attrs[name.lower()] = value
    return attrs


def _attr(attrs: dict[str, str | None], name: str) -> str:
    value = attrs.get(name.lower())
    return "" if value is None else value


class _Node:
    def __init__(self, tag: str, attrs: dict[str, str | None], start: int, open_end: int, self_close: bool):
        self.tag = tag
        self.attrs = attrs
        self.start = start
        self.open_end = open_end
        self.end = open_end
        self.self_close = self_close
        self.parent: _Node | None = None
        self.children: list[_Node] = []

    def ancestor_tags(self) -> set[str]:
        tags = set()
        current = self.parent
        while current:
            tags.add(current.tag)
            current = current.parent
        return tags


def _build_tree(html_text: str) -> list[_Node]:
    skipped = _skip_ranges(html_text)
    roots: list[_Node] = []
    stack: list[_Node] = []
    for match in TAG_RE.finditer(html_text):
        if _inside(match.start(), skipped):
            continue
        closing, tag, attr_raw, slash = match.groups()
        tag = tag.lower()
        if closing:
            for index in range(len(stack) - 1, -1, -1):
                if stack[index].tag == tag:
                    stack[index].end = match.end()
                    del stack[index:]
                    break
            continue
        node = _Node(tag, _attrs(attr_raw), match.start(), match.end(), bool(slash) or tag in VOID_TAGS)
        if stack:
            node.parent = stack[-1]
            stack[-1].children.append(node)
        else:
            roots.append(node)
        if not node.self_close:
            stack.append(node)
    return roots


def _walk(nodes: list[_Node]):
    for node in nodes:
        yield node
        yield from _walk(node.children)


def _has_class(node: _Node, name: str) -> bool:
    return name in _attr(node.attrs, "class").split()


def _matches_simple(node: _Node, token: str) -> bool:
    nth = re.fullmatch(r"(.+):nth-child\((\d+)\)", token)
    if nth:
        token = nth.group(1)
        index = int(nth.group(2))
        siblings = node.parent.children if node.parent else []
        if not (1 <= index <= len(siblings) and siblings[index - 1] is node):
            return False
    head = token
    for marker in ("#", ".", "["):
        pos = token.find(marker)
        if pos >= 0:
            head = token[:pos]
            break
    tag = head.lower()
    if tag and tag != "*" and node.tag != tag:
        return False
    rest = token[len(head):]
    cursor = 0
    while cursor < len(rest):
        char = rest[cursor]
        if char == "#":
            nxt = _next_marker(rest, cursor + 1)
            if _attr(node.attrs, "id") != rest[cursor + 1:nxt]:
                return False
            cursor = nxt
        elif char == ".":
            nxt = _next_marker(rest, cursor + 1)
            if not _has_class(node, rest[cursor + 1:nxt]):
                return False
            cursor = nxt
        elif char == "[":
            end = rest.find("]", cursor)
            if end < 0 or "=" not in rest[cursor + 1:end]:
                return False
            name, expected = rest[cursor + 1:end].split("=", 1)
            if _attr(node.attrs, name.strip()) != expected.strip().strip("\"'"):
                return False
            cursor = end + 1
        else:
            return False
    return bool(tag or rest)


def _next_marker(text: str, start: int) -> int:
    positions = [text.find(mark, start) for mark in ".[#"]
    positions = [pos for pos in positions if pos >= 0]
    return min(positions) if positions else len(text)


def find_target(html_text: str, selector: str) -> _Node | None:
    selector = " ".join(selector.strip().split())
    if not selector:
        return None
    roots = _build_tree(html_text)
    candidates: list[_Node] | None = None
    for part in selector.split(" "):
        pool = list(_walk(roots)) if candidates is None else [
            node for scope in candidates for node in _walk(scope.children)
        ]
        matched = []
        seen = set()
        for node in pool:
            if id(node) in seen or not _matches_simple(node, part):
                continue
            seen.add(id(node))
            matched.append(node)
        candidates = matched
        if not candidates:
            return None
    return candidates[0]


def _with_host_class(open_tag: str) -> str:
    if re.search(r"\bdt-pa-host\b", open_tag):
        return open_tag
    matched = re.search(r"""\bclass\s*=\s*(['"])""", open_tag, re.IGNORECASE)
    if matched:
        return open_tag[:matched.end()] + "dt-pa-host " + open_tag[matched.end():]
    return open_tag[:-1] + ' class="dt-pa-host">'


def marker_html(item: dict) -> str:
    label = str(item["number"]) if item["kind"] == "annotation" else "i"
    kind = "dt-pa-dot" if item["kind"] == "annotation" else "dt-pa-tip"
    return f'<span class="{kind}" title="{_esc(item["title"])}">{_esc(label)}</span>'


def _apply(text: str, edits: list[tuple[int, int, str]]) -> str:
    for start, end, replacement in sorted(edits, key=lambda item: (item[0], item[1]), reverse=True):
        text = text[:start] + replacement + text[end:]
    return text


def guide_html(config: dict, items: list[dict], missed: list[dict], warnings: list[str]) -> str:
    page_title = _text(config.get("pageTitle")) or "页面说明"
    persisted = config.get("persistedState") if isinstance(config.get("persistedState"), dict) else {}
    guides = persisted.get("guides") if isinstance(persisted.get("guides"), dict) else {}
    page_guide = config.get("pageGuide") if isinstance(config.get("pageGuide"), dict) else {}
    parts = [f'<section class="dt-pa-note"><h2>标注说明：{_esc(page_title)}</h2>']
    notes = list(warnings)
    if missed:
        names = "、".join(_esc(item["title"]) for item in missed)
        notes.append(f"以下标注挂在页面脚本生成的内容上，钉钉预览无法标到对应位置，只保留文字：{names}")
    if notes:
        parts.append(f'<div class="dt-pa-miss">{"<br>".join(notes)}</div>')
    if items:
        parts.append("<h3>标注</h3>")
        for item in items:
            kind = "dt-pa-item-ann" if item["kind"] == "annotation" else "dt-pa-item-tip"
            prefix = f'{item["number"]}. ' if item["kind"] == "annotation" else "i "
            suffix = "（未能标到页面位置）" if item in missed else ""
            parts.append(
                f'<div class="dt-pa-item {kind}"><strong>{_esc(prefix + item["title"] + suffix)}</strong>'
                f'{body_html(item["body"])}</div>'
            )
    for key, label in (("dev", "开发测试专用"), ("user", "终端用户手册")):
        custom = guides.get(key)
        guide = page_guide.get(key) if isinstance(page_guide.get(key), dict) else {}
        if not custom and not guide:
            continue
        parts.append(f"<h3>{label}</h3>")
        if isinstance(custom, str) and custom.strip():
            parts.append(f"<pre style=\"white-space:pre-wrap;font:inherit\">{_esc(custom)}</pre>")
        else:
            for name, value in guide.items():
                parts.append(f"<h3>{_esc(name)}</h3>{body_html(value)}")
    flow = config.get("statusFlow") if isinstance(config.get("statusFlow"), dict) else {}
    transitions = [item for item in (flow.get("transitions") or []) if isinstance(item, dict)]
    if transitions:
        parts.append("<h3>状态流转</h3><ul>")
        for item in transitions:
            line = f'{_text(item.get("from"))} → {_text(item.get("to"))}：{_text(item.get("trigger"))}'
            if item.get("allowed"):
                line += f'；允许：{item.get("allowed")}'
            if item.get("forbidden"):
                line += f'；限制：{item.get("forbidden")}'
            parts.append(f"<li>{_esc(line)}</li>")
        parts.append("</ul>")
    parts.append("</section>")
    return "".join(parts)


def bake_annotations(html_text: str) -> tuple[str, dict]:
    config = read_config(html_text)
    if not config:
        raise ValueError("这个 HTML 没有原型标注配置")
    annotations, tips, warnings = collect_items(config)
    items = annotations + tips
    if not items and not config.get("pageGuide") and not config.get("statusFlow"):
        raise ValueError("这个 HTML 没有可导出的标注")

    stripped = BLOCK_RE.sub("", html_text)
    edits: list[tuple[int, int, str]] = []
    hosted: set[int] = set()
    placed: list[dict] = []
    missed: list[dict] = []
    for item in items:
        target = find_target(stripped, item["selector"])
        if target is None:
            missed.append(item)
            continue
        marker = marker_html(item)
        if target.tag in WRAP_TAGS:
            edits.append((
                target.start,
                target.end,
                '<span class="dt-pa-host" style="position:relative;display:inline-block">'
                + stripped[target.start:target.end]
                + marker
                + "</span>",
            ))
        else:
            if target.start not in hosted:
                open_tag = stripped[target.start:target.open_end]
                edits.append((target.start, target.open_end, _with_host_class(open_tag)))
                hosted.add(target.start)
            edits.append((target.open_end, target.open_end, marker))
        placed.append(item)

    baked = _apply(stripped, edits)
    banner = (
        '<div class="dt-pa-banner">标注已写入页面。红色数字、蓝色 i 是说明点，'
        "完整文字在页面底部「标注说明」。这份文件只用于钉钉预览，不能继续编辑标注。</div>"
    )
    if "<body" in baked.lower():
        body = re.search(r"<body\b[^>]*>", baked, re.IGNORECASE)
        if body:
            baked = baked[:body.end()] + banner + baked[body.end():]
        else:
            baked = banner + baked
    else:
        baked = banner + baked
    if "</head>" in baked.lower():
        baked = re.sub(r"</head>", BAKED_STYLE + "\n</head>", baked, count=1, flags=re.IGNORECASE)
    else:
        baked = BAKED_STYLE + baked
    note = guide_html(config, items, missed, warnings)
    if "</body>" in baked.lower():
        baked = re.sub(r"</body>", note + "\n</body>", baked, count=1, flags=re.IGNORECASE)
    else:
        baked += note
    return baked, {
        "placed": len(placed),
        "missed": [{"title": item["title"], "selector": item["selector"]} for item in missed],
        "warnings": warnings,
        "total": len(items),
    }
