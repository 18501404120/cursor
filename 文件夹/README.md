# 文件夹（需求 / 规范 / 项目）

本目录为方案设计仓库的主要内容区：需求记录、全局 UI 规范与静态资源、各项目文档与 **HTML 原型**。

## 原型预览

### 1. GitHub Pages（在线）

1. 将 `main` 推送到 GitHub 后，工作流 [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) 会把仓库根目录的静态文件发布到 **`gh-pages`** 分支。
2. 在仓库 **Settings → Pages**：发布源选 **Deploy from a branch**，分支 **`gh-pages`**，目录 **`/(root)`**。
3. 打开站点根入口（含各项目原型链接）：  
   `https://18501404120.github.io/cursor/`  
   或根目录 [`index.html`](../index.html) 中的卡片链接。

多数原型内脚本使用 `fetch` 读取同仓库下的 JSON（例如 `文件夹/规范/基础数据/`），**不要用 `file://` 直接双击打开**，否则会触发浏览器跨域限制。

### 2. 本地 HTTP（推荐开发时）

在**仓库根目录**（与 `.git` 同级，即 `方案设计`）执行：

```bash
cd /path/to/方案设计
python3 -m http.server 8765
```

在浏览器访问（示例）：

- 根导航：`http://localhost:8765/index.html`
- 全渠道管报原型目录：`http://localhost:8765/文件夹/项目/全渠道管报/原型/index.html`

各子项目若有单独说明，见例如 [`项目/全渠道管报/原型/README.md`](./项目/全渠道管报/原型/README.md)。

## Git 提交范围说明

若只维护本目录下文档与原型，提交时可限定路径为 `文件夹/`，避免把 `.cursor`、本地日志等一并纳入。
