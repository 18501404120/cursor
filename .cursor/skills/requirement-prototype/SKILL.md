---
name: requirement-prototype
description: Generates an interactive HTML prototype from 需求文档.md. Use when the user asks to generate 需求原型, 原型, or frontend prototype from a requirement in 需求 folder. Reads 需求文档.md from the specified folder under 文件夹/需求, outputs a single self-contained 需求原型.html to the same folder for preview and interaction. Aligns with ERP UI patterns (filters, tables, data boards).
---

# 需求原型生成 Skill

## 何时使用

- 用户说「根据需求文档生成原型」「生成需求原型」「用前端代码展示原型」「需求原型可预览可交互」等
- 用户指向 `文件夹/需求` 下某子文件夹，且该文件夹内已有 `需求文档.md`
- 用户希望将需求文档中的页面/筛选/字段/表格等**用前端页面展示并支持预览与交互**

## 执行步骤

1. **确定需求文件夹**
   - 若用户给出路径（如 `需求/成品库龄看板增加未来预计呆滞字段`）：以该路径为需求文件夹。
   - 若未指定，询问或使用当前打开的需求文档所在文件夹。

2. **读取需求文档**
   - 读取该文件夹下的 **`需求文档.md`**；若不存在，提示先运行需求评估 Skill 生成需求文档，或根据同文件夹下的 `需求内容`/`需求评估.md` 提炼改动点后再生成原型。

3. **提炼原型要素**
   - 从需求文档中提取：**页面/功能入口**（位置、标题）、**筛选/查询条件**（筛选项名称、类型、可选值）、**字段/数据项**（表格列名、展示格式、是否可排序）、**业务逻辑**（公式、联动）与**异常展示**（无数据、G=0 等）。
   - 对齐 `文件夹/提示词/产品经理定位.md` 中的 ERP 场景（多仓、多平台、表格看板、筛选等），保持原型风格一致。

4. **生成单文件 HTML 原型**
   - 生成 **单个 HTML 文件**，内嵌 CSS 与少量 JavaScript，无需服务端即可用浏览器打开预览。
   - 结构按 [prototype-guide.md](prototype-guide.md)：页面标题与面包屑、筛选区、表格/内容区、占位或模拟数据；支持**基础交互**（日期选择、下拉、Tab 切换、表格排序、查询按钮等）。
   - 若含 **model / SKU** 等产品信息筛选，筛选区须符合 **`文件夹/规范/产品信息筛选区-全局UI规范.md`**（与项目 Cursor Rule `product-filter-bar` 一致）。
   - 使用语义化标签（如 `<header>`、`<section>`、`<table>`），样式简洁、适合 ERP 看板（表格清晰、筛选区明显）。

5. **保存与说明**
   - 将生成的 HTML 保存为需求文件夹下的 **`需求原型.html`**。
   - 可选：在同文件夹下增加 **`需求原型-说明.txt`** 或简短说明（一行）：用浏览器直接打开 `需求原型.html` 即可预览与交互。

## 输出规范

- **文件名**：`需求原型.html`
- **位置**：与 `需求文档.md`、`需求评估.md` 同目录（即 `需求/xxx/` 下）
- **技术约束**：
  - 单文件，CSS 与 JS 内联或 `<style>`/`<script>` 内嵌，不依赖外部 CDN（或仅使用常见 CDN 如 unpkg 的 date picker 若需）。
  - 兼容 Chrome/Edge 本地打开（file://）；若有跨域限制，可提示用「用浏览器打开」或本地静态服务。
- **交互要求**：筛选条件可操作（输入、选择、切换），表格可排序（若需求文档标明可排序列），按钮可点击并有反馈（如「查询」后表格或提示更新）；数据可为**模拟数据**，仅用于演示布局与交互。

## 参考规范

详见 [prototype-guide.md](prototype-guide.md)：HTML 结构、筛选区与表格区约定、交互与模拟数据、样式与无障碍提示。
