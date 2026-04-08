# 需求原型 HTML 生成规范

## 1. 文件结构（单文件）

- 一个 **.html** 文件，内含：
  - `<head>`：`<meta charset="utf-8">`、`<title>`（需求名称）、`<style>` 内嵌样式
  - `<body>`：页面结构 + 内嵌 `<script>` 实现交互
- 不依赖后端，用浏览器直接打开即可**预览**与**交互**。

## 2. 页面结构约定

```html
<body>
  <!-- 面包屑 / 页面标题 -->
  <header>
    <nav class="breadcrumb">数据中心 → 库存分析 → 成品库龄看板</nav>
    <h1>需求名称（与需求文档一致）</h1>
  </header>

  <!-- 筛选区 -->
  <section class="filters">
    <label>筛选日期</label><input type="date" />
    <label>Forecast 类型</label> <!-- Tab 或 radio -->
    <label>负责人</label><select>...</select>
    <button type="button">查询</button>
  </section>

  <!-- 表格/内容区 -->
  <section class="content">
    <table>
      <thead><tr>...</tr></thead>
      <tbody>...</tbody>
    </table>
  </section>

  <script>
    // 交互：日期/下拉/Tab 变更、表格排序、查询按钮反馈
  </script>
</body>
```

## 3. 筛选区

- 根据需求文档「3.3 筛选/查询条件」生成控件：
  - **日期**：`<input type="date">`，可设 min/max 或默认值
  - **单选/Tab**：`<input type="radio">` 或 `<div class="tabs">` + 点击切换
  - **下拉**：`<select>`，选项可用模拟数据（如 负责人1、负责人2）
- 提供「查询」按钮；点击后可用 JS 更新表格或给出 toast/提示（模拟）。

### 3.1 产品信息类筛选（强制）

当需求涉及 **model、SKU、SPU** 等产品维度筛选时，**必须**按全局规范实现筛选条样式与结构，详见：

**`文件夹/规范/产品信息筛选区-全局UI规范.md`**

要点：**model** 用标签 + Select（「请选择」）；**SKU** 用「模糊 / 精确 / 8位搜索」左侧下拉 + 右侧「请输入SKU」一体组合，聚焦时整组主色描边；筛选区底部浅灰分隔线，单行横向对齐。原型用 CSS `:focus-within` 可模拟整组聚焦。

## 4. 表格区

- 根据需求文档「3.2 字段/数据项」生成表头与列；
- 使用 **模拟数据**（3～5 行即可），数值符合文档中的公式（如 D=A+B-C，G=E+F-C，占比 D/G）；
- 若文档标明某列「可排序」，表头可点击触发前端排序并重绘 tbody。

## 5. 交互与反馈

- 筛选变更：可仅做 UI 状态更新，或「查询」后更新表格/提示「已按条件筛选（模拟）」；
- 表格：可排序列点击切换升序/降序；
- G=0 或无数据：按需求文档 3.6 展示「-」或「N/A」，样式上与正常数字区分。

## 6. 日期范围（强制）

凡页面含 **起止日期**（按日）筛选或录入，须遵守 **`文件夹/规范/日期范围选择框-全局UI规范.md`**，并优先使用 **`文件夹/规范/assets/date-range-picker.js`**（`DateRangePicker.mount`），不得用两个原生 `<input type="date">` 拼「至」作为最终交付形态。  
（从 `文件夹/项目/.../原型/*.html` 引用脚本时相对路径一般为 `../../../规范/assets/date-range-picker.js`，以实际目录层级为准。）

## 6.1 月份范围（强制）

凡 **按自然月** 的起止筛选（标签为「月份范围」「起止月」或数据为 YYYYMM/YYYY-MM），须遵守 **`文件夹/规范/月份范围选择框-全局UI规范.md`**，使用 **`文件夹/规范/assets/month-range-picker.js`**（`MonthRangePicker.mount`），**不得**使用日期范围控件展示 `YYYY-MM-DD 至 YYYY-MM-DD`。脚本路径一般为 `../../../规范/assets/month-range-picker.js`。

## 7. 样式建议

- 字体：系统无衬线（如 `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`）；
- 筛选区：横向排列，间距统一，标签与控件对齐；
- 表格：边框清晰，表头背景色区分，斑马纹可选；
- 响应式：可选 min-width 或 overflow-x:auto，保证小屏可横向滚动表格。

## 8. 数据表格表头固定（强制）

凡表格区域 **可纵向滚动**，须遵守 **`文件夹/规范/数据表格-表头固定-全局UI规范.md`**：表格外包 `overflow: auto` + `max-height`（或 flex 限高），`thead th` 使用 `position: sticky; top: 0`、不透明背景与适当 `z-index`，避免表头随数据行滚出视区。

## 9. 注释与说明

- 在 HTML 顶部或底部可加注释：`<!-- 本原型根据 需求文档.md 生成，数据为模拟，仅用于演示 -->`，便于与开发/业务沟通。
