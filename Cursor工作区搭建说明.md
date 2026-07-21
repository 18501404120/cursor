# ERP Cursor 工作区搭建说明

> **面向读者：产品同学**  
> 适用场景：在本地 Mac 上，用 Cursor 同时查看**产品文档**、**前端代码**、**后端代码**。  
> 产品同学主要维护 `ERP_product/`；前后端代码只需**拉取到本地**供 AI 查阅和对照，无需 push。

---

## 一、工作区整体结构

本地根目录建议为：

```
/Users/<你的用户名>/Documents/ERP/
├── ERP.code-workspace      # Cursor 工作区配置（保留在根目录）
├── ERP_product/            # 产品需求库（GitHub · igovee 组织）
├── ERP_frontend/           # 前端代码（GitHub · govee-frontend 组织，多仓库）
├── ERP_backend/            # 后端代码（阿里云 Codeup）
└── 本地/                   # 本地工具与文档（不推送远程）
    ├── Cursor工作区搭建说明.md
    ├── 新工作模式宣讲.md
    ├── prompt-lib/         # AI 工作流规则
    ├── scripts/            # 拉取脚本
    │   ├── pull-govee-frontend.sh
    │   └── govee-frontend-repos.txt
    └── reports/            # 本地报告、日志
```

### 三个代码目录与远程服务器对应关系

| 本地目录 | 远程平台 | SSH 地址示例 | 默认分支 |
| --- | --- | --- | --- |
| `ERP_product/` | GitHub（企业账号） | `git@github-govee:igovee/ERP_product.git` | `main` |
| `ERP_frontend/<仓库名>/` | GitHub（企业账号） | `git@github-govee:govee-frontend/<仓库名>.git` | `master` |
| `ERP_backend/` | 阿里云 Codeup | `git@codeup.aliyun.com:60a77d967db6c7317ae82ccf/base/ERP_backend.git` | `release` |

> **说明**：`github-govee` 是 SSH 别名，不是真实域名，用于区分企业 GitHub 账号与个人账号。

---

## 二、前置条件

1. 已安装 [Cursor](https://cursor.com/)（或 VS Code）
2. 已安装 Git（终端执行 `git --version` 可验证）
3. 已开通对应平台的账号与仓库访问权限：
   - GitHub 企业账号（`kaiwu.cheng@govee.com`）
   - 阿里云 Codeup 后端仓库权限

---

## 三、配置 SSH 连接

三个目录涉及**两个 SSH 入口**：企业 GitHub（别名 `github-govee`）和阿里云 Codeup（直连 `codeup.aliyun.com`）。

### 3.1 生成 SSH 密钥（首次配置）

**企业 GitHub 专用密钥**（与个人账户分开，避免混用）：

```bash
ssh-keygen -t ed25519 -C "kaiwu.cheng@govee.com" -f ~/.ssh/id_ed25519_govee
```

**阿里云 Codeup** 可使用默认密钥（若已有可跳过）：

```bash
ssh-keygen -t ed25519 -C "你的邮箱" -f ~/.ssh/id_ed25519
```

### 3.2 配置 SSH 别名（`~/.ssh/config`）

编辑 `~/.ssh/config`，追加以下内容：

```
# 企业 GitHub 账号专用别名
# 用法：把地址里的 github.com 换成 github-govee
Host github-govee
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_govee
    IdentitiesOnly yes
```

> Codeup 无需额外别名，Git 会直接使用 `~/.ssh/id_ed25519` 或 `~/.ssh/id_rsa` 连接 `codeup.aliyun.com`。

### 3.3 将公钥添加到各平台

```bash
# 查看企业 GitHub 公钥，复制后添加到 GitHub → Settings → SSH keys
cat ~/.ssh/id_ed25519_govee.pub

# 查看 Codeup 公钥，复制后添加到阿里云 Codeup → 个人设置 → SSH 公钥
cat ~/.ssh/id_ed25519.pub
```

| 平台 | 添加位置 |
| --- | --- |
| GitHub（企业账号） | https://github.com/settings/keys |
| 阿里云 Codeup | Codeup 控制台 → 个人设置 → SSH 公钥 |

### 3.4 验证 SSH 连通性

```bash
# 测试企业 GitHub
ssh -T git@github-govee
# 期望输出：Hi <你的 GitHub 用户名>! You've successfully authenticated...

# 测试阿里云 Codeup
ssh -T git@codeup.aliyun.com
# 期望输出：Welcome to Codeup, <你的用户名>!
```

两条命令均返回成功提示后，即可进行 clone 和 pull。

---

## 四、首次克隆到本地

在终端依次执行（将 `<你的用户名>` 替换为实际路径）：

```bash
# 1. 创建本地工作区根目录
mkdir -p ~/Documents/ERP
cd ~/Documents/ERP

# 2. 克隆产品需求库
git clone git@github-govee:igovee/ERP_product.git ERP_product

# 3. 克隆后端代码（切换到 release 分支）
git clone git@codeup.aliyun.com:60a77d967db6c7317ae82ccf/base/ERP_backend.git ERP_backend
cd ERP_backend && git checkout release && cd ..

# 4. 克隆前端代码（可用脚本批量拉取）
mkdir -p 本地/scripts ERP_frontend
# 将 pull-govee-frontend.sh 和 govee-frontend-repos.txt 放到 本地/scripts/ 后执行：
chmod +x 本地/scripts/pull-govee-frontend.sh
./本地/scripts/pull-govee-frontend.sh
```

前端脚本会自动拉取 `govee-frontend` 组织下的全部仓库到 `ERP_frontend/`：

| 仓库名 | 说明 |
| --- | --- |
| `lanjing-erp-admin-web` | ERP 主前端（最常用） |
| `ziying-shopify-web` | 自营站前端 |
| `govee-app-h5` | App H5 |
| `lanjing-app-edu` | 教育 App |

---

## 五、用 Cursor 打开工作区

### 方式一：打开工作区文件（推荐）

1. 启动 Cursor
2. 菜单 **File → Open Workspace from File...**
3. 选择 `~/Documents/ERP/ERP.code-workspace`

### 方式二：直接打开文件夹

1. **File → Open Folder...**
2. 选择 `~/Documents/ERP`

打开后，左侧资源管理器可同时浏览 `ERP_product`、`ERP_frontend`、`ERP_backend` 及 `本地/prompt-lib` 等目录，AI 可跨目录检索代码与文档。

---

## 六、日常拉取（Pull）

### 6.1 产品文档

产品库采用「每人一条长期分支 + PR 合并 main」模式，分支命名：`feature-{姓名拼音}-{业务标识}`，详见 `ERP_product/README.md`。

```bash
cd ~/Documents/ERP/ERP_product
git checkout feature-chengkaiwu-kefu              # 切到自己的分支（示例）
git pull --rebase origin feature-chengkaiwu-kefu  # 同步自己的分支

# 需要看其他系统最新文档时，单独拉 main
git fetch origin main
```

### 6.2 后端代码

```bash
cd ~/Documents/ERP/ERP_backend
git pull --ff-only origin release
```

> 后端日常在 `release` 分支上同步，不要使用 `git pull` 不带分支名，以免拉到错误分支。

### 6.3 前端代码

**批量拉取全部前端仓库：**

```bash
cd ~/Documents/ERP
./本地/scripts/pull-govee-frontend.sh
```

**仅拉取 ERP 主前端：**

```bash
cd ~/Documents/ERP/ERP_frontend/lanjing-erp-admin-web
git pull --ff-only
```

### 6.4 一键拉取参考（可在 Cursor 指令中使用）

```
# 后端
git pull --ff-only origin release

# 前端（全部）
./本地/scripts/pull-govee-frontend.sh

# 产品（自己的分支）
cd ERP_product && git pull --rebase origin feature-chengkaiwu-kefu
```

---

## 七、产品文档提交与推送（Push）

> 以下仅针对 `ERP_product/`，前后端代码由研发维护，产品同学不需要 push。

各产品在独立分支上维护，合并 `main` 走 Pull Request（详见 `ERP_product/README.md`）：

```bash
cd ~/Documents/ERP/ERP_product
git checkout feature-chengkaiwu-kefu              # 示例：chengkaiwu 负责客服系统
git pull --rebase origin feature-chengkaiwu-kefu

git add 客服系统/                        # 只 add 自己负责的目录
git commit -m "feat: 新增 KF-002 PRD"
git push origin feature-chengkaiwu-kefu

# 文档就绪后，在 GitHub 提 PR：feature-chengkaiwu-kefu → main
gh pr create --base main --head feature-chengkaiwu-kefu --title "客服系统：KF-002 PRD"
```

> `main` 受分支保护，禁止直接 push。`客服系统/` 改动须由 CODEOWNERS 负责人 Review 后合并。

---

## 八、常见问题排查

### SSH 报错 `Permission denied (publickey)`

1. 确认公钥已添加到对应平台
2. 确认 `~/.ssh/config` 中 `github-govee` 配置正确
3. 执行 `ssh-add ~/.ssh/id_ed25519_govee` 加载密钥
4. 用 `ssh -T git@github-govee` 单独测试

### `git pull` 提示分支冲突

| 目录 | 建议处理 |
| --- | --- |
| ERP_product | `git pull --rebase origin feature-chengkaiwu-kefu`，解决冲突后 `git rebase --continue` |
| ERP_backend / ERP_frontend | 产品同学通常不修改代码，直接重新拉取即可：`git pull --ff-only origin release`（后端）或运行 `./本地/scripts/pull-govee-frontend.sh`（前端） |

### 前端 remote 地址不对

若 `git remote -v` 显示 `git@github.com:...` 而非 `git@github-govee:...`，执行：

```bash
git remote set-url origin git@github-govee:govee-frontend/<仓库名>.git
```

或直接重新运行 `./本地/scripts/pull-govee-frontend.sh`，脚本会自动修正 remote 地址。

---

## 九、目录权限与协作约定

| 目录 | 产品同学做什么 | 谁维护 |
| --- | --- | --- |
| `ERP_product/客服系统/` | 在自己的分支上编辑、提 PR 合并 main | 产品（chengkaiwu） |
| `ERP_product/其他系统/` | 同上，各管各的系统目录 | 各系统产品负责人 |
| `ERP_frontend/*` | **只拉取**，供 AI 查阅页面逻辑 | 前端研发 |
| `ERP_backend/` | **只拉取**，供 AI 查阅接口逻辑 | 后端研发 |
| `本地/prompt-lib/` | 本地使用 AI 工作流规则 | 产品（本地维护，不推送远程） |

---

## 十、快速检查清单

新机器或新同事接入时，按顺序打勾：

- [ ] 安装 Cursor、Git
- [ ] 生成 SSH 密钥（`id_ed25519_govee` + 默认密钥）
- [ ] 配置 `~/.ssh/config`（`github-govee` 别名）
- [ ] 公钥分别添加到 GitHub 和 Codeup
- [ ] `ssh -T git@github-govee` 和 `ssh -T git@codeup.aliyun.com` 均成功
- [ ] 克隆 `ERP_product`、`ERP_backend`、`ERP_frontend` 到本地
- [ ] 用 Cursor 打开 `ERP.code-workspace`
- [ ] 执行一次 pull，确认三个目录均能正常同步

---

## 附录：远程地址速查

```bash
# 产品
git@github-govee:igovee/ERP_product.git

# 后端
git@codeup.aliyun.com:60a77d967db6c7317ae82ccf/base/ERP_backend.git

# 前端（示例）
git@github-govee:govee-frontend/lanjing-erp-admin-web.git
git@github-govee:govee-frontend/ziying-shopify-web.git
git@github-govee:govee-frontend/govee-app-h5.git
git@github-govee:govee-frontend/lanjing-app-edu.git
```
