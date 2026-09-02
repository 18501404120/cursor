from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .env import load_dotenv
from .orchestrator import KnowledgeBaseOrchestrator, OrchestratorConfig
from .paths import WorkspacePaths
from .progress import load_progress, summarize_progress
from .state import load_state


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--system", required=True, help="系统名，如：客服系统 / 质量系统")
    parser.add_argument(
        "--erp-root",
        type=Path,
        default=None,
        help="ERP 工作区根目录（默认自动推断）",
    )
    parser.add_argument("--model", default="composer-2.5", help="Cursor 模型 ID")
    parser.add_argument(
        "--max-turns-per-session",
        type=int,
        default=8,
        help="同一 Agent 会话最多自动轮次，超限后开新会话重注入提示词",
    )
    parser.add_argument(
        "--max-total-turns",
        type=int,
        default=30,
        help="本次进程最多自动轮次（默认 30，防死循环烧额度）",
    )
    parser.add_argument(
        "--max-stagnant-turns",
        type=int,
        default=3,
        help="连续 N 轮 run-progress 无变化则熔断（默认 3）",
    )
    parser.add_argument(
        "--max-total-tokens",
        type=int,
        default=500_000,
        help="本次累计 token 上限（默认 500000；0=不限制）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印首包提示词，不调用 Cursor Agent",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="kb-orchestrator",
        description="ERP 知识库自动多轮构建编排器（策略 A）",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="初始化并自动推进知识库构建")
    _add_common(p_init)

    p_resume = sub.add_parser("resume", help="中断后/暂停后从 run-progress.md 断点续跑")
    _add_common(p_resume)

    p_sync = sub.add_parser("sync", help="增量同步模式（step7）")
    _add_common(p_sync)

    p_status = sub.add_parser("status", help="查看进度与编排状态")
    p_status.add_argument("--system", required=True, help="系统名")
    p_status.add_argument("--erp-root", type=Path, default=None)

    p_web = sub.add_parser("web", help="启动知识库管理 Web 服务")
    p_web.add_argument("--host", default="127.0.0.1")
    p_web.add_argument("--port", type=int, default=8765)

    return parser


def cmd_status(system_name: str, erp_root: Path | None) -> int:
    paths = WorkspacePaths.resolve(erp_root)
    progress = load_progress(paths.progress_file(system_name), system_name)
    state = load_state(paths.orchestrator_state_file(system_name))

    print(f"系统: {system_name}")
    print(f"进度文件: {progress.path}")
    print(f"进度摘要: {summarize_progress(progress)}")
    if progress.exists:
        print("--- run-progress.md ---")
        print(progress.text[:2000])
        if len(progress.text) > 2000:
            print("…(截断)")
    print("--- orchestrator state ---")
    if state is None:
        print("(无)")
    else:
        print(json.dumps(state.to_dict(), ensure_ascii=False, indent=2))

    if state and state.status == "interrupted":
        print(
            "\n上次中断。继续请执行:\n"
            f"  python -m kb_orchestrator resume --system {system_name}"
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    # 项目 .env 优先，避免终端里残留的错误 export（如示例占位符 cursor_...）盖住真实密钥
    env_path = load_dotenv(override=True)
    if env_path is not None:
        print(f"已加载本地配置: {env_path}", flush=True)

    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "status":
        return cmd_status(args.system, args.erp_root)

    if args.command == "web":
        import uvicorn

        uvicorn.run(
            "kb_orchestrator.service.app:app",
            host=args.host,
            port=args.port,
            reload=False,
        )
        return 0

    mode = args.command  # init | resume | sync
    config = OrchestratorConfig(
        system_name=args.system,
        mode=mode,
        erp_root=args.erp_root,
        model=args.model,
        max_turns_per_session=args.max_turns_per_session,
        max_total_turns=args.max_total_turns,
        max_stagnant_turns=args.max_stagnant_turns,
        max_total_tokens=args.max_total_tokens,
        dry_run=args.dry_run,
    )
    return KnowledgeBaseOrchestrator(config).run()


if __name__ == "__main__":
    sys.exit(main())
