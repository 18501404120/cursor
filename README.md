# 方案设计（cursor）

产品方案、需求文档与 **HTML 交互原型** 仓库，已关联个人 GitHub：`https://github.com/18501404120/cursor`。

## 快速预览

| 方式 | 入口 |
|------|------|
| **在线（GitHub Pages）** | [项目原型总目录](https://18501404120.github.io/cursor/%E6%96%87%E4%BB%B6%E5%A4%B9/%E9%A1%B9%E7%9B%AE/index.html) · [仓库根导航](https://18501404120.github.io/cursor/) |
| **本地 HTTP** | 在仓库根执行 `python3 -m http.server 8765`，打开 `http://localhost:8765/文件夹/项目/index.html` |

推送 `main` 后由 [`.github/workflows/pages.yml`](.github/workflows/pages.yml) 发布到 `gh-pages`。Pages 设置：**Deploy from a branch** → `gh-pages` / `/(root)`。

详细说明见 [`文件夹/README.md`](文件夹/README.md)、[`文件夹/项目/README.md`](文件夹/项目/README.md)。
