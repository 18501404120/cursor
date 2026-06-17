# 会议纪要工具（macOS）

线下会议录音 + **FunASR 本地免费转写**，悬浮小窗操作，自动保存原文与录音。

## 功能

- 158×44 透明悬浮胶囊：图标控制开始 / 暂停 / 结束
- 录麦克风（线下会议）
- 结束后本地 FunASR 转写，输出说话人 A/B/C + 时间戳
- 转写完成后（需配置 LLM）：自动生成 **场景梳理 HTML**（借鉴场景梳理 001 页结构），文末含 **会议纪要** 与 **待办事项**
- 按会议主题重命名文件夹与文件，例如 `26-06-15 会议-7` → `26-06-15 商超线下退货流程梳理`
- 自动保存到 `~/Desktop/工作文件/会议记录/YY-MM/` 目录下的 `.m4a`、`.txt`、`.html`

## 环境要求

- macOS（Apple Silicon 或 Intel）
- Node.js ≥ 18
- Python 3.9+（系统自带或 Homebrew）
- 麦克风权限
- 首次转写需联网下载 FunASR 模型（约 1～2 GB，之后可离线）

## 安装

```bash
cd 文件夹/会议纪要工具
npm install
npm run setup:python   # 安装 FunASR（较久，仅需一次）
npm run download:models # 预下载转写模型（约 1GB，强烈建议首次使用前执行）
npm start              # 终端启动
```

### 桌面双击启动（推荐）

```bash
npm run install:desktop
```

会在 **桌面** 生成 **「会议记录.app」**，以后双击即可打开，无需开终端。

若双击无反应（常见于使用 nvm 安装 Node 的环境），请重新执行一次 `npm run install:desktop` 更新启动器。

启动失败时可查看日志：`~/Library/Logs/会议记录.log`

可选：复制配置

```bash
cp config.example.json config.json
# 编辑 saveBaseDir、llm.apiKey 等
```

### LLM 配置（场景梳理）

转写完成后，工具会调用 OpenAI 兼容接口分析转写内容，生成场景梳理页并重命名文件夹。在 `config.json` 中配置：

```json
{
  "scenarioFraming": { "enabled": true },
  "llm": {
    "enabled": true,
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

也支持 DeepSeek、通义等 OpenAI 兼容端点，修改 `baseUrl` 与 `model` 即可。未配置 `apiKey` 时仍正常转写，仅跳过场景梳理。

## 使用

1. 启动后出现悬浮窗，点击 **开始** 录音
2. **暂停** / 继续；点击 **结束** 后自动转写
3. 完成后在 Finder 中打开所在文件夹
4. 右上角 **×**：隐藏悬浮窗（仍在菜单栏运行）；**完全退出** → 菜单栏麦克风图标 → **退出**

同一天多场会议，文件名先自动递增：`26-06-12 会议-2`；生成场景梳理后会按主题重命名为例如 `26-06-12 商超线下退货流程梳理`。

## 输出示例

目录结构（配置 LLM 后）：

```text
26-06/
  26-06-15 商超线下退货流程梳理/
    26-06-15 商超线下退货流程梳理.m4a
    26-06-15 商超线下退货流程梳理.txt
    26-06-15 商超线下退货流程梳理.html   ← 场景梳理页 + 文末会议纪要/待办
```

转写 txt 示例：
# 会议记录
会议开始：2026-06-12 14:30:00
时长：00:45:12
说话人数：3

00:43 [说话人A] ……
00:55 [说话人B] ……
```

## 常见问题

**`npm run setup:python` 报错 `triton_ops.py SyntaxError`**

macOS 自带 **Python 3.9** 与最新版 FunASR 不兼容。当前脚本已：

- 锁定 `funasr==1.1.18`
- 跳过 pip 预编译（`PIP_NO_COMPILE=1`）

请删除旧环境后重装：

```bash
rm -rf scripts/.venv
npm run setup:python
```

若仍失败，可安装 Python 3.11（[python.org](https://www.python.org/downloads/)）后重试。

**转写失败 / `incompatible architecture` / PyTorch dlopen**

Apple Silicon 上若 PyTorch 为 arm64、Python 误跑 x86_64 会失败。当前版本已强制 `arch -arm64` 启动转写。

请 **完全退出** 应用后重新打开再试；若仍失败：

```bash
rm -rf scripts/.venv
npm run setup:python
```

**转写失败 / `No such file or directory: 'pip'`**

FunASR 加载说话人模型时会调用 `pip`。桌面应用 PATH 较窄，旧版找不到 venv 里的 pip。请更新代码后重装依赖：

```bash
cd 文件夹/会议纪要工具
npm run setup:python
npm run download:models
```

**转写失败 / 提示未安装环境**

```bash
npm run setup:python
```

**结束录音后一直转圈、转写不成功**

首次转写需从网络下载 FunASR 模型（约 **1GB**），网速慢时可能要 **10～30 分钟**。新版会在悬浮窗计时区显示 **下载进度（如 12%）**；鼠标悬停蓝点可查看详情。

建议安装后先执行（可看到终端下载进度）：

```bash
npm run download:models
```

完成后再录音转写。若多次中断导致下载损坏，可删除 `~/.cache/modelscope` 后重新执行上述命令。

**转写很慢**

- 首次请先 `npm run download:models` 预下载模型
- 模型下载完成后，转写速度取决于录音时长与芯片性能
- 保存目录 **仅保留** `同名.m4a` + `同名.txt`，中间文件在系统临时目录，不会残留

**权限**

首次录音 macOS 会请求麦克风权限，请在「系统设置 → 隐私与安全性 → 麦克风」中允许终端或 Electron。

## 技术栈

- Electron（悬浮窗 + 录音）
- ffmpeg-static（m4a / wav 转换）
- FunASR paraformer-zh + CAM++ 说话人分离
