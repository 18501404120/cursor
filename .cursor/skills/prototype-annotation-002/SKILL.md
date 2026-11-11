---
name: prototype-annotation-002
description: Generate reusable intelligent business annotations for HTML prototypes shared via the local LAN prototype sharing service. Trigger phrases (read immediately when user says any of these)：「原型标注002」「原型标注 002」「通过原型标注002对当前原型页面进行标注」「用原型标注002标注当前页面」「原型标注2」「使用原型标注2」。Also trigger for 局域网分享标注、原型分享服务标注、刷新原型标注002。Use when adding annotations to prototypes shared through 原型分享服务; author edits on localhost, shared links are view-only via paView=1. GitHub Pages continues to use prototype-annotation-001.
---

# Prototype Annotation 002（局域网分享）

## 与 001 的分工

| Skill | 分享渠道 | 编辑权限 |
|-------|----------|----------|
| **原型标注001** | GitHub Pages | 公网 IP 白名单 + `?paEdit=` |
| **原型标注002** | **原型分享服务**（`8787`） | 本机 `127.0.0.1` 可编；分享链接 `?paView=1` 只读 |

标注能力（红点、蓝 i、页面说明、持久化、内容规范）与 **001 相同**；差异仅在 **editPolicy** 与 **分享服务联动**。

## Objective

为通过 **原型分享服务** 分发的 HTML 原型注入业务标注层：本机可编辑，复制给同事的链接只读。

## Core Rule

与 001 相同：每次刷新标注须先清理旧标注系统，再注入 `prototype-annotation-002` 块。改页面时默认不动 `persistedState`。

完整内容规范、图标位置、弹层结构、selector 策略、pageGuide 要求 — **与 001 一致**（见 `../prototype-annotation/SKILL.md` 对应章节）。

### 弹层防裁切（与 001 相同 · mandatory）

标注弹层（红点 / 蓝 i / 新增表单）**不得**被视口右/下边缘裁切。注入时必须使用本 skill `assets/prototype-annotation-runtime.js` 与 `assets/prototype-annotation.css` 的最新版：

- `placePopover` + `schedulePlacePopover`：按实际宽高钳制；带图按 420 宽；内容渲染后再定位。
- `.pa-popover`：`max-width/max-height` 限制在 `100vw/100vh - 28px`，超高可滚动。

细节见 001 skill「Annotation popover viewport clamp」。

## Workflow

0. **Remove legacy annotations** — 使用 `scripts/remove_legacy_prototype_annotations.py`（与 001 共用）。
1. 阅读目标页面与业务文档，生成 `annotations` / `fieldTips` / `pageGuide` / `statusFlow`。
2. 注入 **002** runtime（非 001）：

```bash
python3 .cursor/skills/prototype-annotation-002/scripts/inject_prototype_annotation.py \
  --html "/path/to/page.html" \
  --config "/path/to/page.annotation.json"
```

3. 确认 `editPolicy` 已合并默认策略（`assets/default-edit-policy.json`）。
4. 启动原型分享服务，验证本机「打开」可编、分享链接只读。

## 局域网分享编辑权限（A + B · 已实现）

| 环境 | 新增/编辑/删除 |
|------|----------------|
| `127.0.0.1` / `localhost`（本机点「打开」） | 是 |
| `file://` 本地文件 | 是 |
| 分享链接带 `?paView=1` | 否 |
| `192.168.x.x` 等私有局域网 IP（无本机例外） | 否 |
| `?paEdit=` 与 `editToken` 一致 | 是（仅本机无 `paView` 场景备用；**勿**在带 `paView=1` 的分享链上使用） |

**方案 A**：`allowPrivateLanEdit: false` — 局域网 IP 主机名默认只读。  
**方案 B**：`enforcePaView: true` — URL 含 `paView=1` 强制只读。  
**原型分享服务** 的「分享」按钮已自动附加 `paView=1`；「打开」不带。

配置详解：`references/edit-policy-setup.md`

## Runtime Contract

```html
<!-- prototype-annotation-002:start -->
<script id="prototype-annotation-002-config" type="application/json">
{
  "pageId": "fee-accrual-rules",
  "version": "2026-07-17T18:00:00+08:00",
  "pageTitle": "计提规则配置",
  "annotations": [],
  "fieldTips": [],
  "pageGuide": { "dev": {}, "user": {} },
  "statusFlow": { "nodes": [], "transitions": [] },
  "editPolicy": {
    "allowLocalhost": true,
    "allowOtherHosts": false,
    "enforcePaView": true,
    "allowPrivateLanEdit": false,
    "editToken": ""
  }
}
</script>
<!-- prototype-annotation-002:end -->
```

块标记与 config id 必须为 **`prototype-annotation-002`**，避免与 001 混用。

## Agent 执行要求

- 用户要 **局域网分享标注** 时用 **002**，不要注入 001 runtime。
- 用户要 **GitHub Pages** 时用 **001**。
- 注入须使用 `prototype-annotation-002/assets/prototype-annotation-runtime.js`（含 `paView` / 私有 IP 判定）。
- 用户要「只我读、别人只看」时，指引 `references/edit-policy-setup.md` 步骤 1～5。
- **勿**在 002 页面配置 GitHub Pages 的 `viewOnlyHostnames` / 公网 `allowIps`（那是 001 的职责）。

## 持久化

见 `references/ai-persistence-policy.md`（与 001 相同策略；触发词改为 002）。

## Quality Checklist

与 001 相同，另加：

- [ ] HTML 使用 `prototype-annotation-002-config`，非 001 的 config id
- [ ] `127.0.0.1` +「打开」可新增/编辑标注
- [ ] 分享链接含 `paView=1` 且只显示「查看页面说明」
- [ ] 未误注入 001 的 `PA_POLICY_DEFAULT`（含 `github.io`）
