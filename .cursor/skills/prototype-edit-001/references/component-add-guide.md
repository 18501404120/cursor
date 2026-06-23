# 编辑原型001 · 新增组件评估与用法

## 评估结论

| 能力 | 可行性 | 页内体验 | 说明 |
|------|--------|----------|------|
| 新增 **下拉筛选** | ✅ 推荐 | 选模板 → 填标签/选项 → 插入筛选区 | 复用 `.f-item` + `select.ctl` 结构 |
| 新增 **文本筛选** | ✅ 推荐 | 同上 | `label` + `input` |
| 新增 **按钮** | ✅ 可用 | 填文案 + 选样式 | 仅展示，默认无业务逻辑 |
| 新增 **表格列（静态表）** | ✅ 推荐 | 填列名 + 占位/mock 字段名 | 自动补 `th` 与现有行 `td` |
| 新增 **表格列（JS 渲染）** | ⚠️ 有条件 | 同上 + 注册 renderHook | 须在 `mockRegistry` 或列定义中补字段；重绘后 runtime 补 cell |
| 新增 **月份范围筛选** | ⚠️ 占位 | 插入 `#peMonthHost` 空容器 | 完整交互需页面已引 `month-range-picker.js`；否则仅展示占位 |
| 新增 **场景品类 / SKU 组合 / 多选** | ❌ 页内不做 | — | 规范控件需主数据 JSON 与初始化脚本；请用 AI 改源 HTML 或规范示范页复制 |
| 新增 **弹窗表单字段** | ⚠️ 有限 | 复制 `.field` 模板插入 | grid 可自动重排；校验/联动需改 JS |

**结论**：筛选项（下拉/文本）与列表列**可以**纳入 Skill；复杂规范控件**不**做页内一键添加，避免假交互与排版破坏。

## 组件目录

运行时读取 `assets/component-catalog.json`。页内「添加组件」仅展示 `tier: "page-edit"` 的条目。

### 筛选项模板 id

- `filter-select` — 标签 + 可清除下拉（占位选项）
- `filter-text` — 标签 + 文本输入
- `filter-month-placeholder` — 标签 + 月份范围占位（168px 宽）

### 列表模板 id

- `table-column-text` — 文本列；mock 字段名可编辑

### 挂载规则

1. **筛选项**：默认挂到 `.filter-grid`、`.filter-panel .filter-grid`、`section.filters` 第一个匹配；可点选其他容器。
2. **表格列**：点选 `table` 或 `#mainTable`；在 `thead tr` 末追加 `th`，在 `tbody tr` 追加 `td`。
3. 插入节点统一带 `data-pe-key="pe-add-{uuid}"` 与 `data-pe-added="true"`。

## JS 重绘（IIFE 页面）

若页面主逻辑包在 `(function(){ ... })()` 内，`renderTable` 等**不在 window**，runtime 无法自动 hook。注入编辑能力时 **须** 在 IIFE 末尾增加：

```javascript
window.__boardRefreshAll = refreshAll; // 名称按页面自定
```

并在 `#prototype-edit-config` 的 `renderHooks` 中登记该名称。表格区仍靠 `MutationObserver` 兜底。

## JS 重绘表格时新增列的保持

1. 页内保存 `addedColumns[]` 到 state（自动 persist）。
2. runtime 在 `applyAll()` 中：补 `th`；对 `tbody` 每行补缺失 `td`。
3. 若存在 `window` 上的 refresh 函数且在 `renderHooks` 中登记：包装后末尾 `applyAll()`。
4. 无 hook 时：`MutationObserver` 监听 `tbody`，debounce 200ms 后 `applyAll()`。

## Agent 添加复杂控件时

用户要求「加一个场景品类筛选」等超出 catalog 的需求：

1. **不要**强行用 page-edit 占位糊弄。
2. 读 `文件夹/规范/全局筛选与列表示范页.html` 复制对应块。
3. 改源 HTML，并**合并** sidecar（不恢复已隐藏项）。
4. 重新 `inject_prototype_edit.py --preserve-edits`。
