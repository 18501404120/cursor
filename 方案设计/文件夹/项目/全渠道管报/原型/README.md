# 全渠道管报 · 原型（HTML）

本目录为静态 HTML 原型，推送至仓库 `main` 后可通过 **GitHub Pages** 或 **本地 HTTP** 预览。

## 在线预览（GitHub Pages）

1. 推送 `main` 后，工作流 `.github/workflows/pages.yml` 会将仓库根目录静态资源发布到 **`gh-pages`** 分支。
2. 在 GitHub 仓库：**Settings → Pages**，发布源选 **Deploy from a branch**，分支 **`gh-pages`**、目录 **`/(root)`**。
3. 站点根地址一般为：`https://18501404120.github.io/cursor/`  
   **本目录入口（路径已编码）：**  
   `https://18501404120.github.io/cursor/%E6%96%87%E4%BB%B6%E5%A4%B9/%E9%A1%B9%E7%9B%AE/%E5%85%A8%E6%B8%A0%E9%81%93%E7%AE%A1%E6%8A%A5/%E5%8E%9F%E5%9E%8B/index.html`

也可从仓库根目录 [`index.html`](../../../index.html) 的「全渠道管报」卡片进入。

## 本地预览

在本目录执行：

```bash
python3 -m http.server 8765
```

浏览器打开：`http://localhost:8765/index.html`

## 页面列表

见同目录 [`index.html`](./index.html) 内导航链接。

## 多选筛选控件

涉及「枚举多选」筛选（如零售商、场景、MSKU 列表等）的原型，对齐仓库规范 **`文件夹/规范/多选下拉筛选-全局UI规范.md`**，并优先使用 **`文件夹/规范/assets/multi-select-filter.js`**（懒加载选项、搜索、默认「全部」；SKU/MSKU 大数据场景可无「全部」）。营销费用使用看板活动弹窗仍为原生多选列表，后续可择机替换为同一组件。
