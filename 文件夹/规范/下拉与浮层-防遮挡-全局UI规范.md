# 下拉与浮层 — 防遮挡（全局 UI 规范）

> **适用范围**：后台页中 **绝对定位** 的下拉面板、日期/月份浮层、多选筛选面板、自定义 `Popover` 等（**非**浏览器原生 `<select>` 的系统下拉，原生控件由 OS 绘制一般不受父级 `overflow` 裁切）。  
> **目标**：展开层 **不被** 表格滚动区、卡片、`overflow: hidden/auto` 的父级 **裁切**，也不被 **后渲染的同级板块** 盖住。  
> **配套规则**：`.cursor/rules/dropdown-overlay-escape.mdc`（摘要）；实现上已与下列脚本对齐。

---

## 1. 根因（MUST 理解）

| 现象 | 常见原因 |
|------|----------|
| 面板下半截没了 | 祖先节点设置了 **`overflow: hidden`** 或 **`overflow: auto`**（含仅设 `overflow-x: auto` 时，部分浏览器会把另一轴算成 `auto`，从而裁切纵向溢出）。 |
| 面板被下方另一块内容盖住 | **层叠上下文**：后出现的兄弟节点默认叠在上面；仅提高面板 `z-index` 若仍在同一裁切容器内也无效。 |
| 滚动页面/表格后位置飘了 | 面板仍相对已滚动容器 **绝对定位**，未随触发器更新坐标。 |

---

## 2. 方案优先级（MUST / SHOULD）

### 2.1 结构层（SHOULD，优先评估）

1. **避免**在「包住触发器 + 浮层」的路径上使用 **`overflow: hidden`**。白卡片、面板 body 等宜 **`overflow: visible`**，横向滚动仅包在 **不包含浮层** 的结构上（若无法拆分，则走 2.2）。  
2. 需要 **叠在后续板块之上** 的筛选区卡片，可对整块筛选容器设 **`position: relative; z-index`**（数值随页面约定，须高于下方静态内容）。  
3. **`table-wrap` + `overflow-x: auto`**：易裁切行内下拉，优先改为 **整页/外层横向滚动**，或采用 2.2。

### 2.2 实现层（MUST，本仓库已落地的默认策略）

对 **自绘** 的月份范围、多选筛选等，**默认**采用：

- **展开时**将面板节点挂到 **`document.body`**（或统一浮层根节点），使用 **`position: fixed`**，根据触发器 **`getBoundingClientRect()`** 计算 `left` / `top`。  
- **`z-index`** 使用调用方传入值（弹窗内须高于弹窗底栏，如 `400+`）。  
- **关闭 / `destroy`** 时把面板挂回原占位容器并清理监听。  
- **滚动与缩放**：监听 **`window` 的 `resize`、捕获阶段 `scroll`**，并辅以 **短周期 `requestAnimationFrame` / `setInterval`（如 200ms）** 同步位置，以覆盖 **内部可滚动容器** 不冒泡到 `window` 的情况（原型阶段可接受；生产可改为 `VisualViewport` 或滚动源委托）。

**已对齐脚本**

| 脚本 | 行为 |
|------|------|
| `文件夹/规范/assets/month-range-picker.js` | `MonthRangePicker.mount(..., { useBodyPortal: true })` **默认**为 `true`；设为 `false` 则回退为容器内绝对定位（仅在不裁切的布局中使用）。 |
| `文件夹/规范/assets/multi-select-filter.js` | `MultiSelectFilter.mount(..., { useBodyPortal: true })` **默认**为 `true`。 |

### 2.3 正式环境（SHOULD）

- 使用 Ant Design / Element Plus 等时，优先 **`getPopupContainer={() => document.body}`**（或团队统一浮层根），并统一 **`zIndex`**。  
- **`date-range-picker.js`**（按日范围）若出现同类遮挡，应对齐本规范与月份脚本的 **body + fixed** 策略。

---

## 3. 与现有规范的关系

- 《**月份范围选择框-全局UI规范**》：视觉与交互不变；**层级与防遮挡**以本文为准。  
- 《**多选下拉筛选-全局UI规范**》：懒加载、搜索、多选规则不变；**浮层挂载**以本文为准。  
- 《**产品信息筛选区**》：布局与 SKU 组合控件不变；其中若使用本仓库 `multi-select-filter.js`，自动继承 **防遮挡** 行为。

---

## 4. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-07 | 首版：根因说明、结构建议、body+fixed 默认实现及脚本对照。 |
