---
name: prototype-edit-001
description: >-
  页内编辑 HTML 原型（编辑原型001 / 编辑原型 001 / prototype-edit-001）。注入运行时后在浏览器中直接改文案、隐藏筛选项/按钮/表格列/表单字段、改 mock 数据、处理 JS 重绘；导出 sidecar 供 Git 持久化；后续 AI 改 HTML 时不得回滚页内编辑除非用户明确撤销。
  触发词：编辑原型001、编辑原型 001、用编辑原型001、页内编辑原型、prototype edit 001。
  亦用于：注入编辑运行时、合并 sidecar、新增简单筛选项/列表列（组件目录）。
---

# 编辑原型001（Prototype Edit）

## Objective

在 **不依赖 AI 对话框改源文件** 的前提下，让产品/评审在浏览器打开的 HTML 原型上直接编辑；并将改动通过 **sidecar JSON** 持久化到仓库，使 **后续 AI 对话修改同一页面时默认保留页内编辑结果**。

与 **原型标注001** 分工：

| 系统 | 改什么 |
|------|--------|
| **编辑原型001** | 页面控件、文案、显隐、mock、简单新增筛选项/列 |
| **原型标注001** | 红点/蓝 i 说明、页面说明文档 |

## Trigger

用户说出以下**之一**时立即读本 Skill 全文并执行：

- 编辑原型001 / 编辑原型 001 / 用编辑原型001
- 页内编辑原型 / prototype-edit-001

## Agent Workflow（注入运行时）

1. 确认目标 HTML 路径（当前聚焦文件或用户指定）。
2. 检查同目录 `{basename}.prototype-edit.json`；存在则注入时 **必须** `--preserve-edits`（脚本默认已开启）。
3. 在仓库根目录执行：

```bash
python3 .cursor/skills/prototype-edit-001/scripts/inject_prototype_edit.py \
  --html "/path/to/page.html"
```

4. 复制资源到页面旁 `prototype-edit/`（脚本自动）：`prototype-edit-runtime.js`、`prototype-edit.css`、`component-catalog.json`。
5. 告知用户：浏览器打开页面 → 左上角工具条 → **编辑模式 / Mock / 添加组件 / 导出修改**。
6. 用户导出 JSON 后，Agent 执行：

```bash
python3 .cursor/skills/prototype-edit-001/scripts/save_sidecar.py \
  --html "/path/to/page.html" \
  --from-json "/path/to/downloaded.prototype-edit.json"
```

7. 再次 `inject_prototype_edit.py` 将 sidecar 合并进 `#prototype-edit-config` 的 `canonicalEdits`。
8. **将 `{page}.prototype-edit.json` 与 HTML 一并提交 Git**（sidecar 是 AI 跨对话不回滚的权威来源）。

## Runtime UX（页内操作）

固定左上角 **`.pe-toolbar`**（与右上角原型标注错开）：

| 按钮 | 作用 |
|------|------|
| **编辑模式** | 悬停点选 → 改文案 / 隐藏；**点表头列** → **← 左移 / 右移 →** 调整列顺序（重绘后仍保持） |
| **添加组件** | 插入筛选项或表格列（**立即生效**） |
| **Mock** | 编辑 mock JSON 并应用 |
| **保存** | 写入页面内 `#prototype-edit-config`；提示 Cmd+S 保存 HTML 入库 |

- **Esc** 退出编辑模式。
- **无需每次导出 JSON**：同浏览器刷新仍生效；进 Git 用 **保存** + 存 HTML，或 sidecar（可选）。
- 组件目录 **内嵌 runtime**，`file://` 可直接用。
- 页面脚本若在 IIFE 内，注入时须暴露 `window.__xxxRefreshAll` 并写入 `renderHooks`（见 component-add-guide）。

## Config Shape

```html
<script id="prototype-edit-config" type="application/json">
{
  "pageId": "manual-fee-entry",
  "runtimeVersion": "2026-06-23",
  "pageTitle": "费用填报管理",
  "mockRegistry": [
    { "path": "window.MOCK_ROWS", "label": "列表数据" }
  ],
  "renderHooks": ["renderTable"],
  "canonicalEdits": {
    "text": { "pe:…": "最终标题" },
    "hidden": ["pe:…"],
    "mock": { "window.MOCK_ROWS": "[…]" },
    "addedFilters": [],
    "addedColumns": [],
    "addedButtons": [],
    "addedFormFields": []
  }
}
</script>
```

注入前 Agent 应根据页面扫描补充：

- `mockRegistry`：页面内 `window.MOCK_*` / `tableData` / `renderTable` 使用的数组。
- `renderHooks`：实际存在的 `renderTable`、`renderRows` 等函数名。

## Sidecar Shape

文件：`{与html同主文件名}.prototype-edit.json`

```json
{
  "pageId": "manual-fee-entry",
  "sidecarVersion": 2,
  "updatedAt": "2026-06-23T12:00:00.000Z",
  "pageTitle": "费用填报管理",
  "edits": { }
}
```

`edits` 结构与 `canonicalEdits` 相同。

## JS 重绘处理（强制行为）

runtime 必须：

1. **包装** `config.renderHooks` 及探测到的 `renderTable` / `renderRows` / `renderList` / `refreshTable`，调用后 `applyAll()`。
2. **MutationObserver** 监听所有 `table tbody`，debounce 300ms 后 `applyAll()`（补列、文案、隐藏）。
3. `applyAll` 顺序：`addedFilters` → `addedColumns` → `mock` → `text` → `hidden`。

Agent 修改页面 JS 时：**不得**删除上述 hook 依赖的函数名而不更新 `renderHooks`；重构 render 函数时保留函数名或在 config 中更新。

## AI 持久化（核心 · 强制）

**完整策略见** [references/ai-persistence-policy.md](references/ai-persistence-policy.md)。

摘要：

- 修改 HTML **前**必读 sidecar + `canonicalEdits`。
- **默认禁止**回滚：`hidden`、`text`、`mock`、`addedFilters`、`addedColumns`。
- **仅当用户明确**「恢复页内编辑默认 / 撤销编辑原型001 / 改回去 / 恢复显示 XX」才可清除 sidecar 或还原。
- 模糊需求（「优化筛选区」）**仍须**遵守 sidecar。
- 重新 inject 时必须 `--preserve-edits`；仅用户明确要求清空时用 `--no-preserve-edits`。

## 新增组件（评估结论）

**详见** [references/component-add-guide.md](references/component-add-guide.md)。

| 能力 | 页内一键 | 说明 |
|------|----------|------|
| 下拉/文本筛选 | ✅ | `filter-select` / `filter-text` |
| 月份范围 | ⚠️ 占位 | 完整交互需源 HTML 引 `month-range-picker.js` |
| 表格文本列 | ✅ | 静态表 + JS 重绘（observer + hook） |
| 工具栏按钮 / 表单字段 | 🔜 catalog 已预留 | v1 运行时以筛选/列为主 |
| 场景品类 / SKU 组合 / 多选 | ❌ | 须 Agent 从规范示范页复制并 **preserve-edits** |

复杂控件：**禁止**用占位糊弄；改源 HTML + 保留 sidecar。

组件定义：`assets/component-catalog.json`。

## 与原型标注001 共存

1. 先 inject **编辑原型001**，再 inject **原型标注001**（或反之，但块独立）。
2. 块标记：`<!-- prototype-edit:start/end -->` 与 `<!-- prototype-annotation:start/end -->` 不得互相覆盖。
3. 重生成标注 Skill 时 **不得** 移除 edit 块或 sidecar。

## Plain HTML Checklist

注入完成后验证：

- [ ] 左上角出现 **编辑模式 / Mock / 添加组件 / 导出修改**
- [ ] 编辑模式可隐藏筛选项且 flex 排版正常
- [ ] 改表头文案后刷新仍生效（localStorage + 导出 sidecar 后 inject）
- [ ] 有 `renderTable` 的页面：查询/切换后隐藏列与新增列仍生效
- [ ] 导出 JSON → `save_sidecar.py` → 再 inject → 换浏览器仍生效（canonicalEdits）
- [ ] `#prototype-edit-config` 仅一份

## Agent 修改 HTML 时的合并示例

用户 sidecar 隐藏 `pe:filter-fee-type`：

- ✅ 保留该节点于 HTML，或 sidecar 继续记录 hidden；**不要**在 diff 中重新展示该筛选项。
- ✅ 改标题时读取 `edits.text["pe:page-title"]` 使用新文案。
- ❌ 「重构筛选区」时把已隐藏项加回默认结构。

## 清除页内编辑（仅用户明确要求）

```bash
# 1. 删除 sidecar（或清空 edits）
# 2. 注入并重置
python3 .cursor/skills/prototype-edit-001/scripts/inject_prototype_edit.py \
  --html "/path/to/page.html" \
  --no-preserve-edits
```

并删除 `{page}.prototype-edit.json`。

## Resources

| 路径 | 用途 |
|------|------|
| `assets/prototype-edit-runtime.js` | 页内运行时 |
| `assets/prototype-edit.css` | 样式 |
| `assets/component-catalog.json` | 可添加组件 |
| `scripts/inject_prototype_edit.py` | 注入/升级 |
| `scripts/save_sidecar.py` | 保存导出 JSON |
| `references/ai-persistence-policy.md` | Agent 禁止回滚 |
| `references/component-add-guide.md` | 新增组件评估 |
| `.cursor/rules/prototype-edit-001.mdc` | 短语触发规则 |

## Quality Bar

- 页内编辑 **不** 要求改 Git 中 HTML 才能预览。
- **跨 AI 对话** 不丢编辑：sidecar 入库 + Agent 读 sidecar。
- 隐藏/改字后 **flex/grid 表格** 排版不崩。
- 不在页内实现 OAuth；导出/入库由用户或 Agent 完成。
