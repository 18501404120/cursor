# ERP 本地工作区

个人 Git 仓库，包含 Cursor 工作区本地工具、脚本、知识库日更配置，以及 [`方案设计/`](方案设计/) 下的产品方案与 HTML 原型。

## 目录说明

| 目录 | 说明 |
|------|------|
| [`方案设计/`](方案设计/) | 产品方案、需求文档、HTML 交互原型（GitHub Pages 发布源） |
| [`scripts/`](scripts/) | 知识库日更、分支推送等本地脚本 |
| [`config/`](config/) | 本地任务配置（`daily-kb-sync.env.example` 为模板，真实密钥勿提交） |
| [`prompt-lib/`](prompt-lib/) | AI 工作流提示词库 |
| [`reports/`](reports/) | 本地运行报告与日志摘要 |
| [`launchd/`](launchd/) | macOS 定时任务配置 |

## 原型在线预览（GitHub Pages）

推送 `main` 后自动发布到 **gh-pages** 分支，在线入口：

- 总导航：<https://18501404120.github.io/cursor/>
- 项目原型目录：<https://18501404120.github.io/cursor/%E6%96%87%E4%BB%B6%E5%A4%B9/%E9%A1%B9%E7%9B%AE/index.html>

Pages 设置：仓库 **Settings → Pages → Deploy from a branch → gh-pages / (root)**。

## 本地局域网预览

```bash
cd 方案设计/原型分享服务
./start.sh
```

浏览器打开 `http://127.0.0.1:8787/`，可一键复制局域网链接分享给同事。

## 本地 HTTP 预览（无需启动分享服务）

```bash
cd 方案设计
python3 -m http.server 8765
```

打开 `http://localhost:8765/文件夹/项目/index.html`。
