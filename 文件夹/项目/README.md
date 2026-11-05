# 项目目录（`文件夹/项目`）

各产品线的需求文档、会议纪要与 **HTML 交互原型** 均在本目录下按项目分子文件夹维护。

## 同步到个人 GitHub

本仓库已关联个人远程：

- 仓库：`https://github.com/18501404120/cursor`
- 默认分支：`main`

在仓库根目录（含 `.git` 的 `方案设计`）执行：

```bash
cd /path/to/方案设计
git status
git add 文件夹/项目/   # 或只 add 本次改动的具体路径
git commit -m "docs(项目): 说明本次变更"
git push origin main
```

推送 `main` 后，根目录 [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) 会把静态站点发布到 **`gh-pages`** 分支。

> **注意**：不要只把 `文件夹/项目` 单独拆到另一个空仓库。销量预测等原型通过相对路径引用 [`文件夹/规范/`](../规范/) 下的 `assets/*.js` 与 `基础数据/*.json`，须与规范目录一并存在于同一仓库。

## 在线预览（GitHub Pages）

1. 打开 GitHub 仓库 **Settings → Pages**。
2. 发布源选 **Deploy from a branch**。
3. 分支选 **`gh-pages`**，目录 **`/(root)`**。
4. 等待部署完成后访问：
   - **项目总入口**：[文件夹/项目/index.html](https://18501404120.github.io/cursor/%E6%96%87%E4%BB%B6%E5%A4%B9/%E9%A1%B9%E7%9B%AE/index.html)
   - **仓库根入口**：[index.html](https://18501404120.github.io/cursor/)

含 `fetch` 的页面请用上述 HTTP 地址打开，**不要**用 `file://` 双击 HTML。

## 本地预览

在**仓库根目录**启动静态服务（不要只在 `项目` 子目录起服务，否则 `../../../规范/` 类路径会失效）：

```bash
python3 -m http.server 8765
```

浏览器打开：

- `http://localhost:8765/文件夹/项目/index.html`
- `http://localhost:8765/文件夹/项目/销量预测/原型/index.html`
- `http://localhost:8765/文件夹/项目/全渠道管报/原型/index.html`
- `http://localhost:8765/文件夹/项目/GTM角色和职责/index.html`

## 子项目入口

| 项目 | 原型目录 |
|------|----------|
| 销量预测 | [`销量预测/原型/index.html`](./销量预测/原型/index.html) |
| 全渠道管报 | [`全渠道管报/原型/index.html`](./全渠道管报/原型/index.html) |
| GTM 角色与职责 | [`GTM角色和职责/index.html`](./GTM角色和职责/index.html) |

更多说明见上级 [`文件夹/README.md`](../README.md)。
