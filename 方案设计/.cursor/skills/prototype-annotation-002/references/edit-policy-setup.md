# 局域网分享只读 / 本机可编 — 配置步骤（原型标注002）

适用：通过 **原型分享服务**（`http://192.168.x.x:8787/`）分享 HTML 原型；协作者**只能看标注**，你本人在本机可**新增 / 编辑 / 删除**标注与页面说明。

与 **原型标注001**（GitHub Pages + 公网 IP 白名单）分工明确，**不要混用**。

---

## 权限模型（A + B 组合）

| 访问方式 | 能否编辑标注 |
|----------|----------------|
| `http://127.0.0.1:8787/...` 本机管理页点「打开」 | **是** |
| `file://` 直接打开本地 HTML | **是** |
| `http://192.168.x.x:8787/...?paView=1`（分享按钮复制的链接） | **否** |
| `http://192.168.x.x:8787/...` 无 `paView=1` | **否**（私有局域网 IP 默认只读） |
| `...?paEdit=你的随机串`（可选备用，勿发同事） | **是** |

**原型分享服务**已默认在「分享」复制的链接上附加 `paView=1`；「打开」不带该参数。

---

## 步骤 1：启动原型分享服务

```bash
cd /Users/ckw/Documents/erp/本地/方案设计/原型分享服务
./start.sh
```

- 你用 **本机地址** `http://127.0.0.1:8787/` 浏览、编辑标注  
- 发给同事 **局域网地址**（终端显示的 `http://192.168.x.x:8787/...`）

---

## 步骤 2：页面注入 prototype-annotation-002

在仓库根目录执行（路径按实际页面调整）：

```bash
python3 .cursor/skills/prototype-annotation-002/scripts/remove_legacy_prototype_annotations.py \
  /path/to/page.html

python3 .cursor/skills/prototype-annotation-002/scripts/inject_prototype_annotation.py \
  --html /path/to/page.html \
  --config /path/to/page.annotation.json
```

注入脚本会自动合并 `assets/default-edit-policy.json`（局域网分享专用策略）。

---

## 步骤 3：（可选）页面级 `editPolicy` 覆盖

在 `<script id="prototype-annotation-002-config">` 内可写：

```json
"editPolicy": {
  "allowLocalhost": true,
  "allowOtherHosts": false,
  "enforcePaView": true,
  "allowPrivateLanEdit": false,
  "editToken": "请改成随机长串（可选）"
}
```

| 字段 | 含义 |
|------|------|
| `enforcePaView` | URL 带 `?paView=1` 时强制只读（默认 `true`） |
| `allowPrivateLanEdit` | `false` 时 `192.168.x.x` 等私有 IP 访问不可编（默认 `false`） |
| `allowLocalhost` | `127.0.0.1` / `localhost` 可编（默认 `true`） |
| `allowOtherHosts` | 非本机、非局域网规则的主机是否可编（默认 `false`） |
| `editToken` | 与 `?paEdit=同值` 时可编；应急用，**勿分享给同事** |

---

## 步骤 4：验证

| 场景 | 期望 |
|------|------|
| `http://127.0.0.1:8787/files/.../页面.html`（点「打开」） | 有「新增标注」；弹层有「编辑」「删除」 |
| 点「分享」复制的链接（含 `paView=1`） | 仅「查看页面说明」；弹层只有「关闭」 |
| 同事用局域网 IP 打开分享链接 | 与上条一致，只读 |
| `...?paEdit=你的随机串` | 可编辑（即使带 `paView=1` 也不生效，token 优先——若需此行为请在 runtime 中确认；当前实现 paView 先判断） |

注意：当前 runtime **先判断 `paView=1`**，带 `paView=1` 的链接即使加 `paEdit` 也仍为只读。本机编辑请用 `127.0.0.1` 无 `paView` 的「打开」链接。

控制台测试：`await PrototypeAnnotation.resolveCanEdit({ editPolicy: { ... } })`

---

## 步骤 5：标注内容如何让同事看到

- 页内编辑会写入 HTML 内 `persistedState`（随文件落盘）  
- 仅存在浏览器 `localStorage` 的改动**不会**同步给同事  
- 定稿后保存 HTML 并提交 Git（若需要跨机器同步）

---

## 故障排查

| 现象 | 处理 |
|------|------|
| 本机也只读 | 是否用了带 `paView=1` 的分享链接？改用 `127.0.0.1` +「打开」 |
| 同事能编辑 | 分享链接是否误去掉了 `paView=1`；确认页面用的是 **002** runtime 而非 001 |
| 标注不显示 | 确认 HTML 引用的是同目录下已更新的 `prototype-annotation-runtime.js` |

---

## 安全说明

- `paView=1` 写在前端 **不是强鉴权**，仅隐藏编辑入口，防误操作。  
- 需要强隔离时请使用带后端鉴权的服务，而非静态 HTML 假权限。
