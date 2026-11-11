# 数据表格 — 表头固定（纵向滚动）全局 UI 规范

> **适用范围**：凡含 `thead` 的数据表格，在 **纵向可滚动**（表体区域滚动、页面中部表格、弹窗内表格等）时，**表头须始终可见**，不随表体行一起滚出视区。  
> **技术要点**：`position: sticky` + **滚动容器**（`overflow: auto` 且通常需 **`max-height` 或 `flex` 子项 `min-height:0`**）。  
> **配套规则**：`.cursor/rules/table-sticky-header.mdc`。

---

## 1. 为什么必须包一层「滚动容器」

仅给 `th { position: sticky; top: 0 }` **不能**在整页只有 `body` 滚动时可靠固定表头，除非表头参与的那条滚动链明确。规范做法是：

- **外层** `.table-scroll-wrap`（或项目内统一类名）设置：  
  `overflow: auto;`  
  以及 **`max-height`**（如 `calc(100vh - 260px)`、`min(60vh, 720px)`）或放在 **flex 布局** 中由父级限制高度。
- **内层** `<table>` 保持 `border-collapse: collapse`（或 `separate` 与团队约定一致）。

---

## 2. 表头单元格样式（`th`）

| 项目 | 要求 |
|------|------|
| 定位 | `position: sticky;` **`top: 0`**（若表格位于 **固定顶栏** 下方且与顶栏同页滚动，则 `top` 取 **顶栏高度**，避免被遮挡）。 |
| 层级 | `z-index: 2`（若与 **左侧冻结列** 并存，冻结列表头交叉格用更高 `z-index`，如 `5～6`）。 |
| 背景 | **不透明背景色**（与表头设计一致，如 `#fafafa`），避免滚动时与数据行叠字。 |
| 分隔（建议） | `box-shadow: 0 1px 0 #f0f0f0` 或与边框色一致，滚动时表头与首行数据有清晰分界。 |
| **格线可辨（必守）** | **表头** `thead th` 的外框与单元格分隔线须在浅色表头底上**肉眼清晰可辨**（禁止仅用与底色对比极弱的浅灰作为表头唯一网格线）；**多行表头**时，首行与次行间须有 **加粗（如 `2px`）或更深色** 的水平分隔，避免两行视觉融成一块。表体 `td` 可采用相对更浅的网格以减轻噪音，但不得出现「表头格线糊掉、无法判断列边界」的情况。推荐色值示例：表头线 `#94a3b8`～`#64748b`（slate 系），表体线 `#e2e8f0`～`#e5edf7`；具体与主题色对齐即可。 |
| **全表网格（参考）** | 与「经营分析」类多列对比表一致：**整表**为连续网格——`border-collapse: collapse`（默认），每个单元格均有可见边框，横竖线贯通、无「半截线」或大块无框空白。表头区域整体使用**浅蓝灰底**（如 `#eef5ff`、`#f1f5f9`），表体行以**白底**或极浅灰为主，与表头形成分区但仍靠**格线**读列，勿仅靠留白区分。**禁止**在已设 `border` 的多行 `sticky` 表头行上再叠加与格线同色的 **`box-shadow` 模拟底边**（如 `0 1px 0 #cbd5e1`），否则与相邻行 `border-collapse` 边线叠成双粗或粗细不均。 |

---

## 2.1 多层级表头须无缝贴合（必守）

当 `thead` 内存在 **两行及以上** 表头（分组行 + 列名行，或更多级）时，须保证 **层级之间无可见间隙**（无白条、无滚动时透出表体的「断层」）。

| 项目 | 要求 |
|------|------|
| DOM 结构 | 所有表头行必须放在 **同一 `<thead>` 内**，按顺序连续排列多个 `<tr>`。**禁止**用多个 `<thead>`、**禁止**在表头行之间插入非表格行元素充当间距。 |
| 行距与外边距 | **禁止**在 `thead tr` 上使用 `margin`；若表格外层用 flex/grid 包裹表格，**禁止**对 `thead`/`tr` 使用 `gap` 造成行距。 |
| `border-spacing` | 若使用 `border-collapse: separate`（非默认），必须设 **`border-spacing: 0`**，并自行处理圆角与边框重叠；**默认仍推荐 `collapse`**。 |
| 空行 | **禁止**用空 `<tr>` / 占位行制造「视觉呼吸缝」。 |
| 多行 `sticky` 与「假缝隙」 | 第二行及以下表头 `th` 的 `sticky` **`top`** 必须等于 **上一行表头已渲染的累计高度**（像素级对齐）。若 `top` 小于上一行真实高度，纵向滚动时会在两行表头之间**露出表体内容**，形成假间隙。**推荐**：为首行表头设固定 **`height`/`min-height`**（或由设计稿给出），并用 **CSS 变量**（如 `--thead-level1-h`）同时赋给第二行 `th` 的 `top`。**首行若含 `rowspan>1` 的角格**，勿对其设会压扁跨行的固定 `height`；仅对本行独占的 `th`（如 `:not([rowspan])`）定高，或按实测高度调整变量。 |
| 内边距 | 行与行之间仅靠 **共享的 `1px` 边框** 贴合；用 `padding` 控制单元格内留白即可，**不要**对相邻级 `th` 叠加 `margin-bottom` / `margin-top`。 |
| 裁切与圆角 | 谨慎对表头 `tr`/`th` 使用 `overflow: hidden` + 大圆角，避免角部裁切造成「线不闭合」或露底；若需圆角，优先在**表格外容器**上做，且不得破坏 `thead` 行连续贴齐。 |

---

## 3. 多行表头（`thead` 多行 / `rowspan` / `colspan`）

- 第一行 `th`：`top: 0`。  
- 第二行及以下：需设置 **`top` 为第一行实际高度**（或由设计稿给出像素值），保证两行均固定。  
- 复杂表头建议与前端统一用组件（如 Ant Design Table）或单独说明每一行的 `sticky` 偏移。
- **与「格线可辨」配合**：两行表头之间除 `sticky` 偏移外，须有 **肉眼可见** 的水平分隔（见第 2 节表格中「格线可辨」行），避免仅依赖背景色差区分两行。
- **与 §2.1 配合**：多层级表头的 **无缝贴合** 与 **`sticky` 行高对齐** 须同时满足，见 **§2.1**。

---

## 4. 冻结列 + 纵向固定表头

若同时有 **横向冻结列**（`position: sticky; left: …` / `right: …`）：

- 普通表头：`z-index: 2～3`。  
- 仅冻结列：`z-index` 略高于普通单元格。  
- **左上角交叉格**：`left` + `top` 同时 sticky，`z-index` **最高**（如 `5～6`），背景不透明。
- **右侧操作列**：列表存在“明细 / 编辑 / 生效 / 删除”等操作时，默认作为 **右侧冻结列**；横向滚动时始终可见，不随内容区滚出视口。
- **右上角操作列表头**：`right: 0` + `top: 0` 同时 sticky，`z-index` 应高于普通表头与普通单元格，背景必须不透明，并补左侧分隔阴影/边线。

推荐口径：

- 小屏时 **不压缩列宽**，通过横向滚动查看；操作列固定右侧。
- 操作列宽度固定，建议 `88～120px`。
- 冻结列背景色需与所在区域一致，避免滚动时出现透底叠字。

---

## 5. 弹窗 / 抽屉内表格

滚动容器一般为 **弹窗 body**（`overflow: auto`）或 **body 内再包一层** `.table-scroll-wrap`。表头 `sticky` 的 **`top` 相对该滚动容器** 为 `0` 即可（除非内部还有二级固定条）。

---

## 6. 与原型 HTML 的对应关系

原型中单文件页面推荐类名：

```html
<div class="table-scroll-wrap">
  <table class="data-table">…</table>
</div>
```

```css
.table-scroll-wrap {
  overflow: auto;
  max-height: min(60vh, 720px); /* 按页面留白调整 */
}
.table-scroll-wrap thead {
  --thead-level1-h: 38px; /* 首行「非 rowspan」格的设计高度：须与第二行 th 的 sticky top 一致 */
}
.table-scroll-wrap thead th {
  position: sticky;
  z-index: 2;
  background: #fafafa;
  border: 1px solid #94a3b8; /* 表头格线须可辨，勿用过浅线 */
  box-shadow: 0 1px 0 #cbd5e1;
}
.table-scroll-wrap thead tr:first-child th {
  top: 0;
}
/* 首行若含 rowspan=2 角格，勿对其设固定 height，仅约束本行独占的 th，避免 rowspan 被压扁 */
.table-scroll-wrap thead tr:first-child th:not([rowspan]) {
  min-height: var(--thead-level1-h);
  height: var(--thead-level1-h);
  box-sizing: border-box;
  vertical-align: middle;
}
.table-scroll-wrap thead tr:nth-child(2) th {
  top: var(--thead-level1-h); /* 须写在通用 thead th 之后，避免被 top:0 覆盖 */
}
.data-table th.col-action,
.data-table td.col-action {
  position: sticky;
  right: 0;
  background: #fff;
  box-shadow: -1px 0 0 #f0f0f0;
}
.data-table thead th.col-action {
  z-index: 6;
  background: #fafafa;
  box-shadow: -1px 0 0 #f0f0f0, 0 1px 0 #f0f0f0;
}
```

（具体色值与项目主题一致即可。）

---

## 7. 跨项目复用

1. 将本规范纳入团队 UI/组件库说明。  
2. 复制 `.cursor/rules/table-sticky-header.mdc` 至各仓库。  
3. 新页面表格 **默认** 按本规范实现；旧页改版时顺带补齐滚动容器与 `sticky`。

---

*文档版本：1.4（全表网格：补充禁止 sticky 表头叠 shadow 伪线导致双粗边）｜与 Cursor Rule `table-sticky-header` 同步维护*
