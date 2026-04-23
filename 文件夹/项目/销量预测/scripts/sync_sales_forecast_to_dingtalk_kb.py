#!/usr/bin/env python3
"""
将「销量预测」下的 **需求文档** 与 **原型** 目录中的文件批量上传到钉钉**知识库 / 团队空间**的指定文件夹。

与《竞品调研/scripts/sync_merged_to_dingtalk_kb.py》使用同一套「知识库上传文件」三步接口。

关于「Markdown → 钉钉文档格式」
--------------------------------
钉钉存在两种常见形态：
1) **知识库里的文件**（本脚本）：上传 .md / .html 等，在钉钉里以文件展示，可预览/下载；**不是**钉盘里新建的那种空白协作文档本体。
2) **在线协作文档**（alidocs）：需在钉钉客户端内「新建文档」或使用开放平台「创建知识库文档」类接口单独对接，本脚本**不生成**该格式的 API 调用。

若希望 Markdown 在钉内更像 Word，可安装 pandoc 后加参数 ``--docx``：先把每个 .md 转成 .docx 再上传（仍属「文件」，但排版更接近正式文档）。

必填环境变量（与竞品脚本一致）
  DINGTALK_APP_KEY
  DINGTALK_APP_SECRET
  DINGTALK_UNION_ID
  DINGTALK_PARENT_DENTRY_UUID   # 指向钉钉里「项目 / cursor」等目标文件夹的 dentryUuid

用法
  export DINGTALK_APP_KEY=... DINGTALK_APP_SECRET=... DINGTALK_UNION_ID=...
  export DINGTALK_PARENT_DENTRY_UUID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  python3 文件夹/项目/销量预测/scripts/sync_sales_forecast_to_dingtalk_kb.py
  python3 文件夹/项目/销量预测/scripts/sync_sales_forecast_to_dingtalk_kb.py --dry-run
  python3 文件夹/项目/销量预测/scripts/sync_sales_forecast_to_dingtalk_kb.py --docx   # 需本机 pandoc
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# 复用竞品调研目录下的钉钉上传实现（避免复制维护两份 HTTP 逻辑）
_KB_HELPER = (
    Path(__file__).resolve().parents[2]
    / "GTM角色和职责"
    / "竞品调研"
    / "scripts"
    / "sync_merged_to_dingtalk_kb.py"
)


def _load_kb_module():
    if not _KB_HELPER.is_file():
        print(f"未找到钉钉上传辅助脚本: {_KB_HELPER}", file=sys.stderr)
        sys.exit(1)
    spec = importlib.util.spec_from_file_location("sync_merged_to_dingtalk_kb", _KB_HELPER)
    if spec is None or spec.loader is None:
        print("无法加载钉钉上传辅助模块", file=sys.stderr)
        sys.exit(1)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _collect_files(req_dir: Path, proto_dir: Path, want_docx: bool) -> list[tuple[Path, str]]:
    """返回 (本地路径, 钉钉提交文件名)，文件名带「需求文档/」「原型/」前缀便于在目标文件夹内区分。"""
    out: list[tuple[Path, str]] = []
    exts = {".md", ".html", ".htm", ".js", ".css", ".json"}
    for base, folder_label in ((req_dir, "需求文档"), (proto_dir, "原型")):
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*")):
            if not p.is_file():
                continue
            if p.name.startswith("."):
                continue
            suf = p.suffix.lower()
            if suf not in exts:
                continue
            rel = p.relative_to(base)
            if want_docx and suf == ".md":
                ding = f"{folder_label}/{rel.with_suffix('.docx').as_posix()}"
            else:
                ding = f"{folder_label}/{rel.as_posix()}"
            out.append((p, ding))
    return out


def _md_to_docx(md_path: Path, docx_path: Path) -> None:
    pandoc = shutil.which("pandoc")
    if not pandoc:
        raise RuntimeError("未找到 pandoc，请安装后重试，或去掉 --docx")
    docx_path.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        [pandoc, str(md_path), "-o", str(docx_path)],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if r.returncode != 0:
        raise RuntimeError(f"pandoc 失败: {r.stderr or r.stdout}")


def _upload_one(kb, token: str, union_id: str, parent: str, local: Path, commit_name: str, conflict: str) -> dict:
    body_bytes = local.read_bytes()
    size = len(body_bytes)
    name = commit_name
    import urllib.parse

    API = "https://api.dingtalk.com"
    q_body = {
        "protocol": "HEADER_SIGNATURE",
        "option": {
            "storageDriver": "DINGTALK",
            "preCheckParam": {"name": commit_name, "size": size},
        },
    }
    q_path = (
        f"/v2.0/storage/spaces/files/{urllib.parse.quote(parent, safe='')}"
        "/uploadInfos/query"
    )
    r1 = kb._json_req(
        "POST",
        q_path,
        query={"unionId": union_id},
        body=q_body,
        token=token,
    )
    upload_key = r1.get("uploadKey")
    hsi = r1.get("headerSignatureInfo") or {}
    urls = hsi.get("resourceUrls") or []
    hdrs = hsi.get("headers") or {}
    if not upload_key or not urls:
        raise RuntimeError(f"query 返回异常: {json.dumps(r1, ensure_ascii=False)[:1500]}")
    kb._oss_put(urls[0], body_bytes, hdrs)
    c_path = (
        f"/v2.0/storage/spaces/files/{urllib.parse.quote(parent, safe='')}/commit"
    )
    c_body = {
        "uploadKey": upload_key,
        "name": name,
        "option": {"size": size, "conflictStrategy": conflict},
    }
    return kb._json_req(
        "POST",
        c_path,
        query={"unionId": union_id},
        body=c_body,
        token=token,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="上传销量预测需求文档与原型到钉钉知识库文件夹")
    ap.add_argument("--dry-run", action="store_true", help="仅列出将上传的文件，不调用接口")
    ap.add_argument(
        "--docx",
        action="store_true",
        help="将 .md 先用 pandoc 转为 .docx 再上传（钉钉内显示为 Word 文件）",
    )
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    req_dir = root / "需求文档"
    proto_dir = root / "原型"

    app_key = os.environ.get("DINGTALK_APP_KEY", "").strip()
    app_secret = os.environ.get("DINGTALK_APP_SECRET", "").strip()
    union_id = os.environ.get("DINGTALK_UNION_ID", "").strip()
    parent = os.environ.get("DINGTALK_PARENT_DENTRY_UUID", "").strip()
    conflict = os.environ.get("DINGTALK_CONFLICT_STRATEGY", "OVERWRITE").strip()

    named = _collect_files(req_dir, proto_dir, want_docx=args.docx)
    if not named:
        print("未找到可上传文件（扩展名 .md/.html/.js/.css/.json）", file=sys.stderr)
        return 1

    print(f"根目录: {root}")
    print(f"将处理 {len(named)} 个文件（--docx={'是' if args.docx else '否'}）")
    for local, cname in named[:30]:
        print(f"  - {local}  →  钉钉名: {cname}")
    if len(named) > 30:
        print(f"  … 共 {len(named)} 个")

    if args.dry_run:
        return 0

    if not all([app_key, app_secret, union_id, parent]):
        print(
            "缺少环境变量：DINGTALK_APP_KEY、DINGTALK_APP_SECRET、"
            "DINGTALK_UNION_ID、DINGTALK_PARENT_DENTRY_UUID",
            file=sys.stderr,
        )
        return 1

    kb = _load_kb_module()
    print("获取 accessToken …")
    token = kb.get_access_token(app_key, app_secret)

    tmpdir = tempfile.mkdtemp(prefix="dt_sf_")
    try:
        for local, commit_name in named:
            upload_path = local
            if args.docx and local.suffix.lower() == ".md":
                safe = commit_name.replace("/", "__")
                docx_path = Path(tmpdir) / safe
                print(f"转换: {local.name} → docx …")
                _md_to_docx(local, docx_path)
                upload_path = docx_path
            print(f"上传: {commit_name} …")
            r = _upload_one(kb, token, union_id, parent, upload_path, commit_name, conflict)
            print(json.dumps(r, ensure_ascii=False)[:500])
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    print("全部完成。")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130) from None
