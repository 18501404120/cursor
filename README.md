# ERP 本地工作区

个人 Git 仓库，包含 Cursor 工作区本地工具、脚本、知识库日更配置，以及 [`方案设计/`](方案设计/) 下的产品方案与 HTML 原型。

## 权威源地图

工作区四大根目录路径不要随意改名（日更、Skills、原型服务均依赖固定路径）。找东西时按下表：

| 你要找的东西 | 去哪 | 不要去哪 |
|--------------|------|----------|
| 正式 PRD / 知识库 / 系统原型 | `ERP_product/{{系统}}/` | 已归档的 `erp_product_preview`、`方案设计` 草稿 |
| 会议草稿 / 探索原型 / 跨系统方案 | `本地/方案设计/文件夹/` | 直接当正式需求落盘 |
| AI 规则真源 | `本地/prompt-lib/` | 只改 `.cursor/skills` 薄入口不够 |
| 日更脚本与日志 | `本地/scripts/`、`本地/reports/` | — |

> `erp_product_preview` 已移出工作区，归档于 `~/Archives/erp_product_preview`。正式产品库以 `ERP_product` 为准。

## 两层结构

本仓内容按职责分为两层，**不要混着找**：

| 层 | 目录 | 干什么 |
|----|------|--------|
| **工具层** | `scripts/` · `prompt-lib/` · `config/` · `launchd/` · `reports/` · `state/` · `package.json` | 知识库日更、AI 规则、定时任务与运行日志 |
| **内容层** | [`方案设计/`](方案设计/) | 探索型方案 / HTML 原型（个人 GitHub Pages 发布源） |

日常改方案、看原型：只进 `方案设计/文件夹/`。正式 PRD / 知识库仍在工作区根下的 `ERP_product/`。

侧栏已隐藏 `reports`、`state`、`node_modules`、`.venv` 以及体积较大的 `方案设计/文件夹/会议纪要工具`（仅影响资源管理器显示，不删文件、不改脚本路径）。

## 目录说明

| 目录 | 说明 |
|------|------|
| [`方案设计/`](方案设计/) | 产品方案、需求文档、HTML 交互原型（GitHub Pages 发布源） |
| [`scripts/`](scripts/) | 知识库日更、分支推送等本地脚本 |
| [`config/`](config/) | 本地任务配置（`daily-kb-sync.env.example` 为模板，真实密钥勿提交） |
| [`prompt-lib/`](prompt-lib/) | AI 工作流提示词库 |
| [`reports/`](reports/) | 本地运行报告与日志摘要（侧栏隐藏） |
| [`state/`](state/) | 日更状态文件（侧栏隐藏） |
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
