# 标注发布桥接（Cloudflare Worker）

用于 **GitHub Pages 在线预览页**：

1. **编辑保存** → 自动写回个人 Git（`18501404120/cursor`）
2. **他人刷新** → runtime 经 Worker **直接读 Git 最新标注**（不经过 Pages CDN）→ **保存成功后刷新即可看到**

**不需要**启动本机「原型分享服务（8787）」。

## 一次性部署

1. 安装 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)（`npm i -g wrangler`）
2. 登录：`wrangler login`
3. 在本目录执行：

```bash
cd 方案设计/原型分享服务/cloudflare

# GitHub Token：需 repo 权限（或 fine-grained: Contents Read and write）
wrangler secret put GITHUB_TOKEN

# 自定义发布口令（自行设定一串随机字符，写入页面 editPolicy）
wrangler secret put PUBLISH_TOKEN

wrangler deploy
```

4. 记下部署后的 Worker 地址，例如：`https://pa-publish.xxx.workers.dev`

## 配置到原型页面

在 HTML 内 `editPolicy` 增加：

```json
"editPolicy": {
  "autoPublishOnSave": true,
  "githubPublish": {
    "endpoint": "https://pa-publish.xxx.workers.dev",
    "token": "与 PUBLISH_TOKEN 相同的口令"
  }
}
```

也可写在页面旁的 `*.annotation.json` 后重新注入。

## 使用效果

| 操作 | 结果 |
|------|------|
| Pages 上新增/编辑/删除标注并保存 | 自动同步到 Git；提示「已同步」 |
| 同事刷新同一 Pages 链接 | 立刻看到最新标注（Worker GET 读 Git） |
| 手动点「发布到预览」 | 同上，可作失败重试 |

> 页面结构本身仍由 GitHub Pages 托管；仅标注内容经 Worker 实时拉取。

## API

- `POST /` + `X-Pa-Publish-Token`：写入 HTML 中的 `prototype-annotation-config`
- `GET /?path=方案设计/文件夹/.../xxx.html`：返回最新 `persistedState`（只读，无需 token）

## 安全说明

- `PUBLISH_TOKEN` 会出现在页面配置中，仅用于防止随意调用 Worker；请勿使用 GitHub PAT 作为该口令。
- `GITHUB_TOKEN` 仅保存在 Cloudflare Secrets，不会暴露给浏览器。
