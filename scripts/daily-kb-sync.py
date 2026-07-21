#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from pathlib import Path

from cursor_sdk import Agent, AgentOptions, CursorAgentError, LocalAgentOptions


ERP_ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ERP_ROOT / "本地" / "reports" / "daily-kb-sync"
SUMMARY_FILE = REPORT_DIR / f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-agent-summary.md"


def parse_systems() -> list[str]:
    raw = os.environ.get(
        "ERP_DAILY_KB_SYSTEMS",
        "分销系统,销售系统,自营系统,商超系统,GTM系统",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


def build_prompt(system_name: str) -> str:
    return f"""
你是本机无人值守的 ERP 知识库日更 Agent。当前工作区根目录是：
`{ERP_ROOT}`

本次只处理一个系统：`{system_name}`。

执行前必须读取并遵守：
1. `{ERP_ROOT}/.cursor/skills/master-scheduler/SKILL.md`
2. `{ERP_ROOT}/本地/prompt-lib/master-scheduler.md`
3. 如进入增量同步，继续读取 `{ERP_ROOT}/.cursor/skills/step7-incremental-sync/SKILL.md`

无人值守执行规则：
1. 不要向用户反问，不要等待“继续/跳过/终止”。
2. 如果该系统知识库还未完成阶段0到阶段6，请按 master-scheduler 连续执行到阶段6结束。
3. 如果该系统知识库已完成阶段0到阶段6，请进入增量同步模式，基于当前已拉取的前后端代码更新知识库。
4. 增量同步时，兼容 `run-progress.md` 中已有的同步字段命名：`web_synced_commit/backend_synced_commit` 或 `frontend_baseline_commit/backend_baseline_commit`。
5. 对能明确映射的代码变更，自动更新对应知识库文档；对无法明确映射或风险较高的变更，不要臆造，追加记录到该系统知识库根目录下的 `sync-pending.md`，并在最终摘要里说明。
6. 只允许改动 `{ERP_ROOT}/ERP_product/{system_name}` 下的知识库、需求索引或同步日志文件；不要修改前端和后端代码仓库。
7. 写入内容必须是产品经理可读的业务语言，不要输出大段代码实现细节。
8. 每个系统执行结束后，更新进度/同步状态和同步日志；如果没有可更新内容，也要记录本次检查结果。

请直接开始处理 `{system_name}`，完成后输出简短执行摘要、更新文件清单、遗留待确认项。
""".strip()


def run_system(system_name: str) -> tuple[bool, str]:
    api_key = os.environ["CURSOR_API_KEY"]
    model = os.environ.get("ERP_DAILY_KB_MODEL", "composer-2.5")
    prompt = build_prompt(system_name)

    try:
        result = Agent.prompt(
            prompt,
            AgentOptions(
                api_key=api_key,
                model=model,
                local=LocalAgentOptions(cwd=str(ERP_ROOT)),
            ),
        )
    except CursorAgentError as err:
        return False, f"启动失败：{err.message}"

    status = getattr(result, "status", "unknown")
    body = getattr(result, "result", "")
    if status != "finished":
        return False, f"执行失败，状态：{status}\n\n{body}"
    return True, str(body)


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    systems = parse_systems()
    if not systems:
        print("No systems configured in ERP_DAILY_KB_SYSTEMS.", file=sys.stderr)
        return 2

    lines: list[str] = [
        "# ERP 知识库日更执行摘要",
        "",
        f"- 执行时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- 工作区：`{ERP_ROOT}`",
        f"- 系统范围：{', '.join(systems)}",
        "",
    ]
    failures: list[str] = []

    for system_name in systems:
        print(f"==> Cursor Agent sync: {system_name}", flush=True)
        ok, summary = run_system(system_name)
        marker = "完成" if ok else "失败"
        lines.extend([f"## {system_name}：{marker}", "", summary.strip(), ""])
        if not ok:
            failures.append(system_name)

    SUMMARY_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"Summary written: {SUMMARY_FILE}")

    if failures:
        print(f"Failed systems: {', '.join(failures)}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
