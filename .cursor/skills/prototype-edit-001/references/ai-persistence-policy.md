# 编辑原型001 · AI 持久化策略

页内编辑的改动必须跨 AI 对话保留。本文件定义 Agent 在后续修改同一 HTML 原型时的强制行为。

## 权威数据源（优先级从高到低）

1. **`{页面名}.prototype-edit.json`**（与 HTML 同目录，**应纳入 Git**）
2. HTML 内 `#prototype-edit-config` → `canonicalEdits`
3. 浏览器 `localStorage`（`prototypeEdit:{pageId}`）— 仅本机；Agent **不得**依赖 localStorage

## Agent 修改 HTML 前（强制）

1. 检查同目录是否存在 `{basename}.prototype-edit.json`；存在则**完整读取** `edits`。
2. 检查 HTML 是否含 `<!-- prototype-edit:start -->` 块；读取 `canonicalEdits`。
3. 合并两者（sidecar 字段覆盖 config 中同 key；以 sidecar 为准）。

## Agent 修改 HTML 时（强制 · 禁止回滚）

除非用户**明确**要求恢复（见下方触发词），否则：

| 页内编辑类型 | Agent 必须 |
|--------------|------------|
| `edits.hidden` | **不得**重新插入/显示这些元素；不得在 diff 中「还原」被隐藏项 |
| `edits.text` | **不得**改回旧文案；新写 HTML 须使用 sidecar 中的最终文案 |
| `edits.mock` | **不得**覆盖 mock 为旧默认值；合并 mock 路径时保留 sidecar 值 |
| `edits.addedFilters` | **不得**删除页内新增的筛选项；注入/重构时保留或迁移 `data-pe-key` |
| `edits.addedColumns` | **不得**删除新增列；`renderTable` 等重构须保留列定义与渲染 |
| `edits.columnOrder` | **不得**恢复旧列顺序；重构表头/表体后须重新 `applyColumnOrder` 语义（按 sidecar 顺序重排） |

## 用户明确要求「改回去」的触发词

仅当用户说出以下**之一**时，Agent 才可撤销页内编辑并清空/忽略 sidecar：

- 恢复页内编辑默认 / 撤销编辑原型001 / 清除 prototype-edit
- 把页内隐藏的 XX **恢复显示** / 改回原来的 XX 文案
- 明确说「不要保留之前的页内编辑」

模糊表述（如「优化一下筛选区」）**不算**撤销许可；仍须遵守 sidecar。

## Agent 修改 HTML 后（强制）

1. **保留** `prototype-edit` 注入块（config + runtime 引用）；可升级 `runtimeVersion`，**不得**删除整个编辑运行时。
2. 若 sidecar 存在：运行 `merge_sidecar_into_html.py` 或手动确保 `#prototype-edit-config` 内 `canonicalEdits` 与 sidecar 一致。
3. 若用户从浏览器「导出修改」提供了新 JSON：写入/更新 `{basename}.prototype-edit.json` 并 commit。

## 与「原型标注001」共存

- `prototype-edit` 管**页面结构与 mock**；`prototype-annotation` 管**说明层**。
- 同页可同时注入；Agent 重生成标注时**不得**动 `prototype-edit` 块与 sidecar。
- 重生成页面业务 HTML 时：**先**读 sidecar，**再**改结构，**最后**重新 inject edit runtime（`inject_prototype_edit.py --preserve-edits`）。

## 禁止行为

- 全量重写 HTML 时不读 sidecar。
- 「顺便」恢复被隐藏的筛选项/列/按钮。
- 以「代码更干净」为由删除 `data-pe-key` 或 `addedFilters` / `addedColumns` 配置。
