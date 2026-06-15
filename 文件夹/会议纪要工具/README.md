# 会议纪要工具（macOS）

线下会议录音 + **FunASR 本地免费转写**，悬浮小窗操作，自动保存原文与录音。

## 功能

- 220×88 悬浮窗：开始 / 暂停 / 结束
- 录麦克风（线下会议）
- 结束后本地 FunASR 转写，输出说话人 A/B/C + 时间戳
- 自动保存到 `~/Desktop/工作文件/会议记录/YY-MM/YY-MM-DD 会议.txt` 与同名的 `.m4a`

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
# 编辑 saveBaseDir 等
```

## 使用

1. 启动后出现悬浮窗，点击 **开始** 录音
2. **暂停** / 继续；点击 **结束** 后自动转写
3. 完成后在 Finder 中打开所在文件夹
4. 右上角 **×**：隐藏悬浮窗（仍在菜单栏运行）；**完全退出** → 菜单栏麦克风图标 → **退出**

同一天多场会议，文件名自动递增：`26-06-12 会议-2`

## 输出示例

```text
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

**转写失败 / 提示未安装环境**

```bash
npm run setup:python
```

**转写很慢**

- 应用启动后会在后台 **预加载 FunASR 模型**（首次约 1～3 分钟），第二次及以后转写会快很多
- 保存目录 **仅保留** `同名.m4a` + `同名.txt`，中间文件在系统临时目录，不会残留
- 本地模型计算仍需要时间；M 系列芯片通常快于 Intel

**权限**

首次录音 macOS 会请求麦克风权限，请在「系统设置 → 隐私与安全性 → 麦克风」中允许终端或 Electron。

## 技术栈

- Electron（悬浮窗 + 录音）
- ffmpeg-static（m4a / wav 转换）
- FunASR paraformer-zh + CAM++ 说话人分离
