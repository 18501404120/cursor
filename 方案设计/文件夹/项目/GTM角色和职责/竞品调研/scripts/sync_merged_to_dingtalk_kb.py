#!/usr/bin/env python3
"""
将本地 Markdown（默认《全渠道模块竞品分析-合并版.md》）上传到钉钉**知识库 / 团队空间**指定文件夹。

上传后，在钉钉知识库中会以**文件**形式展示，可在钉钉内在线预览（具体预览能力与文件类型以钉钉客户端为准）。  
若需**空白在线协作文档**再手工排版，可在钉钉内「新建文档」或使用开放平台「创建知识库文档」类接口（与本脚本的三步上传不同，需单独对接）。

钉钉开放平台文档：「知识库上传文件」三步
  1) POST /v2.0/storage/spaces/files/{parentDentryUuid}/uploadInfos/query
  2) PUT 到返回的 OSS URL（Content-Type 需为空，按官方说明）
  3) POST /v2.0/storage/spaces/files/{parentDentryUuid}/commit

必填环境变量
  DINGTALK_APP_KEY           企业内部应用 Client ID（原 AppKey）
  DINGTALK_APP_SECRET        企业内部应用 Client Secret
  DINGTALK_UNION_ID          操作者 unionId（与知识库权限匹配的用户）
  DINGTALK_PARENT_DENTRY_UUID 目标文件夹 dentryUuid（例如「竞品分析」文件夹的 ID）

可选
  DINGTALK_LOCAL_FILE        默认：脚本上一级目录的「全渠道模块竞品分析-合并版.md」
  DINGTALK_COMMIT_NAME       钉钉中显示的文件名（默认与本地文件名一致；可改为带日期的名称）
  DINGTALK_CONFLICT_STRATEGY 默认 OVERWRITE（同名覆盖）

获取 parentDentryUuid：在钉钉文档/知识库网页中打开目标文件夹（如「竞品分析」），
从浏览器开发者工具网络请求或开放平台「列举子文件」类接口中查看 dentryUuid。

应用权限：需开通与「企业存储 / 知识库文件上传」相关的接口权限（以开放平台当前文案为准）。

用法:
  export DINGTALK_APP_KEY=... DINGTALK_APP_SECRET=... DINGTALK_UNION_ID=... DINGTALK_PARENT_DENTRY_UUID=...
  python3 scripts/sync_merged_to_dingtalk_kb.py
"""
from __future__ import annotations

import http.client
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.dingtalk.com"


def _json_req(
    method: str,
    path: str,
    *,
    query: dict[str, str] | None = None,
    body: dict | None = None,
    token: str | None = None,
) -> dict:
    url = API + path
    if query:
        q = "&".join(f"{k}={urllib.parse.quote(v, safe='')}" for k, v in query.items())
        url = f"{url}?{q}"
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["x-acs-dingtalk-access-token"] = token
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {path}: {err}") from e
    if not raw:
        return {}
    return json.loads(raw)


def get_access_token(app_key: str, app_secret: str) -> str:
    path = "/v1.0/oauth2/accessToken"
    req = urllib.request.Request(
        API + path,
        data=json.dumps({"appKey": app_key, "appSecret": app_secret}).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        j = json.loads(resp.read().decode("utf-8"))
    token = j.get("accessToken")
    if not token:
        raise RuntimeError(f"未返回 accessToken: {j}")
    return token


def _oss_put(put_url: str, body: bytes, headers: dict) -> None:
    """使用 http.client 上传，便于控制 Content-Type（钉钉要求可为空）。"""
    u = urllib.parse.urlparse(put_url)
    path = u.path or "/"
    if u.query:
        path = f"{path}?{u.query}"
    h: dict[str, str] = {}
    for k, v in headers.items():
        h[str(k)] = str(v) if v is not None else ""
    # 钉钉文档：Content-Type 必须为空字符串；若上游未给，则补空
    if not any(x.lower() == "content-type" for x in h):
        h["Content-Type"] = ""
    conn = http.client.HTTPSConnection(u.netloc, timeout=300)
    try:
        conn.request("PUT", path, body=body, headers=h)
        resp = conn.getresponse()
        resp_body = resp.read()
        if resp.status >= 400:
            raise RuntimeError(
                f"OSS PUT 失败 HTTP {resp.status}: {resp_body[:800]!r}"
            )
    finally:
        conn.close()


def main() -> int:
    app_key = os.environ.get("DINGTALK_APP_KEY", "").strip()
    app_secret = os.environ.get("DINGTALK_APP_SECRET", "").strip()
    union_id = os.environ.get("DINGTALK_UNION_ID", "").strip()
    parent = os.environ.get("DINGTALK_PARENT_DENTRY_UUID", "").strip()
    conflict = os.environ.get("DINGTALK_CONFLICT_STRATEGY", "OVERWRITE").strip()

    default_file = Path(__file__).resolve().parent.parent / "全渠道模块竞品分析-合并版.md"
    local = Path(os.environ.get("DINGTALK_LOCAL_FILE", str(default_file))).resolve()
    commit_name = os.environ.get("DINGTALK_COMMIT_NAME", "").strip() or local.name

    if not all([app_key, app_secret, union_id, parent]):
        print(__doc__, file=sys.stderr)
        print(
            "\n缺少环境变量：请设置 DINGTALK_APP_KEY、DINGTALK_APP_SECRET、"
            "DINGTALK_UNION_ID、DINGTALK_PARENT_DENTRY_UUID 后重试。",
            file=sys.stderr,
        )
        return 1

    if not local.is_file():
        print(f"本地文件不存在: {local}", file=sys.stderr)
        return 1

    print(f"上传本地文件: {local}\n钉钉显示文件名: {commit_name}\n目标 parent dentryUuid: {parent[:16]}…")

    body_bytes = local.read_bytes()
    size = len(body_bytes)
    name = commit_name

    print("获取 accessToken …")
    token = get_access_token(app_key, app_secret)

    print("步骤 1/3：query uploadInfos …")
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
    r1 = _json_req(
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
        raise SystemExit(f"步骤1返回异常: {json.dumps(r1, ensure_ascii=False)[:2000]}")

    put_url = urls[0]
    print("步骤 2/3：PUT 上传到 OSS …")
    _oss_put(put_url, body_bytes, hdrs)

    print("步骤 3/3：commit …")
    c_path = (
        f"/v2.0/storage/spaces/files/{urllib.parse.quote(parent, safe='')}/commit"
    )
    c_body = {
        "uploadKey": upload_key,
        "name": name,
        "option": {"size": size, "conflictStrategy": conflict},
    }
    r3 = _json_req(
        "POST",
        c_path,
        query={"unionId": union_id},
        body=c_body,
        token=token,
    )
    print("完成。钉钉返回摘要（节选）:")
    print(json.dumps(r3, ensure_ascii=False, indent=2)[:3000])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130) from None
