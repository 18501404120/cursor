### 安装说明：`yctimlin/mcp_excalidraw`（给 Cursor 用）

你当前已完成：

- 仓库已克隆到：`/Users/ckw/Desktop/cursor文件夹/方案设计/文件夹/mcp/mcp_excalidraw`
- Cursor 配置已生成到：`/Users/ckw/Desktop/cursor文件夹/方案设计/.cursor/mcp.json`

> 但你的电脑目前缺少运行依赖：`node`（以及可选的 `docker`）。下面任选一种方式安装即可。

---

### 方式 A（推荐）：安装 Node 18+，本地运行

#### 1) 安装 Node

- 到 Node.js 官网下载安装 **LTS（建议 18/20）**  
- 安装完成后在终端验证：

```bash
node -v
npm -v
```

#### 2) 构建 MCP（生成 `dist/index.js`）

```bash
cd "/Users/ckw/Desktop/cursor文件夹/方案设计/文件夹/mcp/mcp_excalidraw"
npm ci
npm run build
```

#### 3) 启动画布（Canvas）

新开一个终端窗口运行：

```bash
cd "/Users/ckw/Desktop/cursor文件夹/方案设计/文件夹/mcp/mcp_excalidraw"
PORT=3000 npm run canvas
```

浏览器打开：`http://localhost:3000`

#### 4) 让 Cursor 启动 MCP

Cursor 会根据项目里的配置文件启动：

- ` /Users/ckw/Desktop/cursor文件夹/方案设计/.cursor/mcp.json `

如果你改了仓库位置，记得同步更新其中的 `dist/index.js` 绝对路径。

---

### 方式 B：安装 Docker Desktop，用镜像运行（无需 Node）

#### 1) 安装 Docker

安装 Docker Desktop 后验证：

```bash
docker --version
```

#### 2) 启动 Canvas（容器）

```bash
docker run -d -p 3000:3000 --name mcp-excalidraw-canvas ghcr.io/yctimlin/mcp_excalidraw-canvas:latest
```

浏览器打开：`http://localhost:3000`

#### 3) 修改 Cursor MCP 配置为 Docker 启动

把 `.cursor/mcp.json` 改为 README 里 Cursor 的 Docker 配置（重点是 `command: docker`，以及 `EXPRESS_SERVER_URL=http://host.docker.internal:3000`）。

---

### 最小验证（可选）

当 canvas 已启动且 MCP 可运行后，你可以用 MCP Inspector 做一次工具列表验证（需要 Node 环境）：

```bash
cd "/Users/ckw/Desktop/cursor文件夹/方案设计/文件夹/mcp/mcp_excalidraw"
npx @modelcontextprotocol/inspector --cli \
  -e EXPRESS_SERVER_URL=http://localhost:3000 \
  -e ENABLE_CANVAS_SYNC=true -- \
  node dist/index.js --method tools/list
```

