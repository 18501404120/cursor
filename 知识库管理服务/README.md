# 知识库管理服务

ERP 知识库**自动多轮构建编排器**（策略 A）+ **Web 管理服务**：

- 加载 `本地/prompt-lib/master-scheduler.md` + 当前 `stepX` 模板
- 驱动 Cursor Agent 执行；检测到主控反问话术后**自动回复「继续」**
- 会话过长时**自动开新对话并重注入提示词**，避免上下文丢失
- **支持 Ctrl+C 中断**；中断后用 `resume` 从 `run-progress.md` 断点续跑
- **Web 界面**：配置参数、启动/停止任务、SSE 实时日志与进度

## 安装

```bash
cd 本地/知识库管理服务
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# 可选：可编辑安装
pip install -e .
```

## Web 管理服务（推荐）

```bash
cd 本地/知识库管理服务
./start-web.sh
# 浏览器打开 http://127.0.0.1:8765
```

或：

```bash
source .venv/bin/activate
PYTHONPATH=. python -m kb_orchestrator.service.app
```

页面能力：

1. 选择系统（客服/质量…）与模式（sync / resume / init）
2. 配置模型、轮次/停滞/token 熔断参数，可「保存为默认」
3. 启动/停止任务
4. 右侧实时进程（Agent 流式输出 + 编排事件）
5. 底部查看 `run-progress.md` 与任务结果摘要

需先配置 `.env` 中的 `CURSOR_API_KEY`。

## 配置密钥（推荐：本地文件夹）

在编排器目录创建 `.env`（已加入 `.gitignore`，不会进 git）：

```bash
cd 本地/知识库管理服务
cp .env.example .env
# 编辑 .env，填入：
# CURSOR_API_KEY=crsr_你的密钥
```

也可临时用环境变量：`export CURSOR_API_KEY="crsr_..."`（会覆盖 `.env` 中的同名项）。

## 常用命令

在 `本地/知识库管理服务` 目录下（已激活 venv）：

```bash
# 只看将要注入的首包提示词（不花额度）
python -m kb_orchestrator init --system 质量系统 --dry-run

# 从零初始化并自动推进
python -m kb_orchestrator init --system 质量系统

# 中断后 / 暂停后继续
python -m kb_orchestrator resume --system 质量系统

# 增量同步（step7）
python -m kb_orchestrator sync --system 客服系统

# 查看进度与编排状态
python -m kb_orchestrator status --system 质量系统
```

可选参数：

- `--max-turns-per-session 8`：同一会话最多自动轮次，超限开新会话
- `--max-total-turns 30`：本次进程轮次上限（默认 30）
- `--max-stagnant-turns 3`：连续 N 轮 `run-progress` 无变化则熔断
- `--max-total-tokens 500000`：本次累计 token 上限（`0`=不限制）
- `--model composer-2.5`：模型 ID
- `--erp-root /path/to/ERP`：工作区根（默认自动推断）

### 防烧额度熔断

默认三道闸：

1. **轮次上限**：本次进程最多 30 轮（不跨进程累加）
2. **进度停滞**：连续 3 轮 `run-progress.md` 关键指纹不变 → 立即停止
3. **token 上限**：本次累计约 50 万 tokens（SDK 有上报时生效）

触发后 exit code `4`，不会继续自动「继续」。检查后可用 `resume` 再开跑。

## 中断与续跑

### 允许中断吗？

**允许。** `Ctrl+C`（或 `SIGTERM`）会：

1. 请求取消当前正在执行的 Agent run（若支持 cancel）
2. 关闭 Agent，释放资源
3. 把编排状态写入  
   `ERP_product/{{系统}}/知识库/.kb-orchestrator-state.json`（`status=interrupted`）

知识库进度仍以 Agent 已落盘的  
`ERP_product/{{系统}}/知识库/run-progress.md` 为准。  
若中断发生在「某一页写到一半」，该页文档可能不完整——`resume` 后 Agent 应按进度重做当前未完成项（主控规则要求读进度断点续跑）。

### 中断后怎么继续？

```bash
python -m kb_orchestrator resume --system 质量系统
```

`resume` 会：

1. 新建 Agent 会话（不接着旧聊天，避免脏上下文）
2. 重新注入 `master-scheduler` + 推断出的当前 `stepX`
3. 附上最新 `system-config.md` + `run-progress.md`
4. 下达「从断点续跑，禁止重做已完成项」
5. 继续策略 A 自动「继续」循环

也可用 `status` 先确认断点：

```bash
python -m kb_orchestrator status --system 质量系统
```

## 工作原理（简图）

```text
init/resume/sync
    → 新会话 + 注入 master + step + 进度
    → Agent 执行一个单元并反问
    → 检测到「回复【继续】」类话术 → 自动发「继续」
    → 每 N 轮或显式需要时 → 关旧会话 → 新会话重注入
    → 识别「全流程完成」→ 退出
Ctrl+C → cancel run → 写 interrupted 状态 → 之后 resume
```

## 安全默认

若 Agent 没有使用主控标准反问话术（例如在向人确认路径歧义），编排器会 **暂停**（exit code 3），避免误点继续。人工处理完后再 `resume`。

## 与现有 Skill 的关系

| 入口 | 用途 |
|------|------|
| `/kb-init` `/kb-resume` `/kb-sync` | IDE 里人工点「继续」 |
| 本编排器 | 无人值守自动推进；中断可续 |

两者共用同一套 `prompt-lib` 与 `run-progress.md`，不要同时对同一系统跑两套进程。
