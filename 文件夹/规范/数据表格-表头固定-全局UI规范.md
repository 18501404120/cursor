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

---

## 3. 多行表头（`thead` 多行 / `rowspan` / `colspan`）

- 第一行 `th`：`top: 0`。  
- 第二行及以下：需设置 **`top` 为第一行实际高度**（或由设计稿给出像素值），保证两行均固定。  
- 复杂表头建议与前端统一用组件（如 Ant Design Table）或单独说明每一行的 `sticky` 偏移。

---

## 4. 左侧冻结列 + 纵向固定表头

若同时有 **横向冻结列**（`position: sticky; left: …`）：

- 普通表头：`z-index: 2～3`。  
- 仅冻结列：`z-index` 略高于普通单元格。  
- **左上角交叉格**：`left` + `top` 同时 sticky，`z-index` **最高**（如 `5～6`），背景不透明。

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
.table-scroll-wrap thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fafafa;
  box-shadow: 0 1px 0 #f0f0f0;
}
```

（具体色值与项目主题一致即可。）

---

## 7. 跨项目复用

1. 将本规范纳入团队 UI/组件库说明。  
2. 复制 `.cursor/rules/table-sticky-header.mdc` 至各仓库。  
3. 新页面表格 **默认** 按本规范实现；旧页改版时顺带补齐滚动容器与 `sticky`。

---

*文档版本：1.0｜与 Cursor Rule `table-sticky-header` 同步维护*
