from __future__ import annotations

import os
import signal
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from cursor_sdk import Agent, CursorAgentError, LocalAgentOptions, close_default_client

from .detect import classify_reply
from .env import load_dotenv, resolve_api_key
from .paths import WorkspacePaths
from .progress import load_optional_text, load_progress, summarize_progress
from .prompts import build_bootstrap_prompt, continue_message
from .state import OrchestratorState, load_state, save_state


LogFn = Callable[[str], None]
StreamFn = Callable[[str], None]


@dataclass
class OrchestratorConfig:
    system_name: str
    mode: str  # init | resume | sync
    erp_root: Path | None = None
    model: str = "composer-2.5"
    api_key: str | None = None
    # 同一会话最多自动轮次，超过则开新会话重注入提示词
    max_turns_per_session: int = 8
    # 本次进程最多自动轮次（防死循环烧额度）
    max_total_turns: int = 30
    # 连续 N 轮 run-progress 无变化则熔断
    max_stagnant_turns: int = 3
    # 累计 token 上限；0 表示不按 token 熔断
    max_total_tokens: int = 500_000
    dry_run: bool = False


class KnowledgeBaseOrchestrator:
    """策略 A：检测反问话术后自动回复「继续」；支持 Ctrl+C 中断与断点续跑。"""

    def __init__(
        self,
        config: OrchestratorConfig,
        log: LogFn | None = None,
        on_stream: StreamFn | None = None,
        *,
        echo_stdout: bool = True,
        install_signals: bool = True,
    ) -> None:
        self.config = config
        self.log = log or (lambda msg: print(msg, flush=True))
        self.on_stream = on_stream
        self.echo_stdout = echo_stdout
        self.install_signals = install_signals
        self.paths = WorkspacePaths.resolve(config.erp_root)
        self._stop_requested = False
        self._active_run = None
        self._agent = None
        self.state = OrchestratorState(
            system_name=config.system_name,
            mode=config.mode,
            status="idle",
        )

    @property
    def state_path(self) -> Path:
        return self.paths.orchestrator_state_file(self.config.system_name)

    def request_stop(self, *_args) -> None:
        if self._stop_requested:
            self.log("再次收到中断信号，强制退出…")
            raise SystemExit(130)
        self._stop_requested = True
        self.log("\n收到中断（Ctrl+C）。正在优雅停止：取消当前 run，并保存断点…")
        run = self._active_run
        if run is not None and getattr(run, "status", None) == "running":
            try:
                if run.supports("cancel"):
                    run.cancel()
                    self.log("已请求取消当前 Agent run。")
            except Exception as exc:  # noqa: BLE001
                self.log(f"取消 run 时出现异常（可忽略）: {exc}")

    def _install_signal_handlers(self) -> None:
        if not self.install_signals:
            return
        try:
            signal.signal(signal.SIGINT, self.request_stop)
            if hasattr(signal, "SIGTERM"):
                signal.signal(signal.SIGTERM, self.request_stop)
        except ValueError:
            # 非主线程无法注册 signal（Web 后台任务走 request_stop）
            self.log("当前线程无法注册 Ctrl+C 处理器，改用管理端停止接口。")

    def _persist(self, **updates) -> None:
        for k, v in updates.items():
            setattr(self.state, k, v)
        save_state(self.state_path, self.state)

    def _create_agent(self):
        # 确保项目 .env 覆盖终端残留的无效 export
        load_dotenv(override=True)
        api_key = resolve_api_key(self.config.api_key)
        if not api_key:
            raise RuntimeError(
                "未设置 CURSOR_API_KEY。可任选其一：\n"
                "  1) 在 本地/知识库管理服务/.env 写入 CURSOR_API_KEY=...\n"
                "  2) export CURSOR_API_KEY=..."
            )
        return Agent.create(
            model=self.config.model,
            api_key=api_key,
            local=LocalAgentOptions(cwd=str(self.paths.erp_root)),
        )

    def _close_agent(self) -> None:
        if self._agent is None:
            return
        try:
            self._agent.close()
        except Exception as exc:  # noqa: BLE001
            self.log(f"关闭 agent 时异常（可忽略）: {exc}")
        self._agent = None

    def _bootstrap_prompt(self) -> str:
        progress = load_progress(
            self.paths.progress_file(self.config.system_name),
            self.config.system_name,
        )
        config_text = load_optional_text(self.paths.config_file(self.config.system_name))
        return build_bootstrap_prompt(
            prompt_lib=self.paths.prompt_lib,
            system_name=self.config.system_name,
            mode=self.config.mode,
            progress_text=progress.text if progress.exists else None,
            config_text=config_text,
        )

    def _track_progress_after_turn(self) -> bool:
        """
        更新进度指纹与停滞计数。
        返回 True 表示已触发停滞熔断，调用方应停止。
        """
        snap = load_progress(
            self.paths.progress_file(self.config.system_name),
            self.config.system_name,
        )
        fp = snap.fingerprint()
        prev = self.state.last_progress_fingerprint
        if prev is None:
            self.state.last_progress_fingerprint = fp
            self.state.stagnant_turns = 0
            return False
        if fp == prev:
            self.state.stagnant_turns += 1
            self.log(
                f"[熔断观测] 进度未变化 stagnant={self.state.stagnant_turns}/"
                f"{self.config.max_stagnant_turns} fingerprint={fp}"
            )
        else:
            self.state.stagnant_turns = 0
            self.state.last_progress_fingerprint = fp
            self.log(f"[熔断观测] 进度已推进 fingerprint={fp}")
        self._persist()
        return self.state.stagnant_turns >= self.config.max_stagnant_turns

    def _track_usage(self, result) -> None:
        usage = getattr(result, "usage", None) if result is not None else None
        tokens = getattr(usage, "total_tokens", None) if usage is not None else None
        if isinstance(tokens, int) and tokens > 0:
            self.state.cumulative_tokens += tokens
            self.log(
                f"[用量] 本轮≈{tokens} tokens，本次累计≈{self.state.cumulative_tokens}"
                + (
                    f" / 上限 {self.config.max_total_tokens}"
                    if self.config.max_total_tokens > 0
                    else ""
                )
            )

    def _budget_exceeded(self) -> str | None:
        if self.state.run_turns >= self.config.max_total_turns:
            return (
                f"达到本次进程轮次上限 max_total_turns={self.config.max_total_turns}"
            )
        if (
            self.config.max_total_tokens > 0
            and self.state.cumulative_tokens >= self.config.max_total_tokens
        ):
            return (
                f"达到本次 token 上限 max_total_tokens={self.config.max_total_tokens}"
            )
        return None

    def _send(self, prompt: str) -> str:
        assert self._agent is not None
        self.log("── 发送消息 ──")
        preview = prompt if len(prompt) <= 240 else prompt[:240] + "…"
        self.log(preview)
        self.log("────────────")

        run = self._agent.send(prompt)
        self._active_run = run
        self._persist(
            status="running",
            agent_id=getattr(self._agent, "agent_id", None),
            last_action="send",
        )

        chunks: list[str] = []
        result = None
        try:
            for message in run.messages():
                if self._stop_requested:
                    break
                if message.type == "assistant":
                    for block in message.message.content:
                        if getattr(block, "type", None) == "text" and getattr(block, "text", None):
                            chunks.append(block.text)
                            if self.echo_stdout:
                                sys.stdout.write(block.text)
                                sys.stdout.flush()
                            if self.on_stream is not None:
                                self.on_stream(block.text)
            result = run.wait()
        finally:
            self._active_run = None

        text = "".join(chunks).strip()
        if not text and result is not None:
            maybe = getattr(result, "result", None)
            text = maybe if isinstance(maybe, str) else ""

        status = getattr(result, "status", None) if result is not None else None
        self.log(f"\n[run.status={status}]")
        if status == "error":
            raise RuntimeError(f"Agent run 失败: {getattr(result, 'id', '')}")
        if status == "cancelled" or self._stop_requested:
            raise KeyboardInterrupt("run cancelled by user")

        self._track_usage(result)
        self.state.turns_in_session += 1
        self.state.run_turns += 1
        self.state.total_turns += 1
        self._persist(status="running", last_action="turn_finished")
        return text

    def _open_fresh_session(self, *, reason: str) -> str:
        self.log(f"开启新会话（原因: {reason}），重新注入主控提示词与最新进度…")
        self._close_agent()
        self.state.turns_in_session = 0
        # 续跑语义：轮换后一律按 resume 注入，避免重复初始化
        if self.config.mode == "init":
            self.config.mode = "resume"
            self.state.mode = "resume"
        self._agent = self._create_agent()
        self._persist(agent_id=self._agent.agent_id, last_action="session_opened")
        self.log(f"Agent 已创建: {self._agent.agent_id}")
        return self._send(self._bootstrap_prompt())

    def _stop_for_circuit(self, reason: str, *, status: str = "stalled") -> int:
        self._persist(status=status, last_error=reason, note=reason, last_action="circuit_break")
        self.log(
            f"[熔断] {reason}\n"
            f"已停止，避免继续消耗 token。\n"
            f"检查进度后如需继续：\n"
            f"  python -m kb_orchestrator resume --system {self.config.system_name}"
        )
        return 4

    def run(self) -> int:
        if self.install_signals:
            self._install_signal_handlers()

        prev = load_state(self.state_path)
        if prev and prev.system_name == self.config.system_name:
            # 仅继承观测用累计轮次；本次熔断计数从 0 起
            self.state.total_turns = prev.total_turns

        progress = load_progress(
            self.paths.progress_file(self.config.system_name),
            self.config.system_name,
        )
        self.state.last_progress_fingerprint = progress.fingerprint()
        self.state.stagnant_turns = 0

        self.log(f"系统: {self.config.system_name}")
        self.log(f"模式: {self.config.mode}")
        self.log(f"ERP 根目录: {self.paths.erp_root}")
        self.log(f"进度: {summarize_progress(progress)}")
        self.log(
            "熔断参数: "
            f"max_total_turns={self.config.max_total_turns}, "
            f"max_stagnant_turns={self.config.max_stagnant_turns}, "
            f"max_total_tokens={self.config.max_total_tokens}"
        )

        if self.config.mode == "resume" and not progress.exists:
            self.log("错误：resume 需要已有 run-progress.md，请改用 init。")
            return 2
        if self.config.mode == "init" and progress.looks_complete:
            self.log("提示：该系统进度显示已全部完成。若只需增量维护请用 sync。")
            return 0

        if self.config.dry_run:
            self.log("=== dry-run bootstrap prompt ===")
            self.log(self._bootstrap_prompt())
            return 0

        exit_code = 0
        try:
            text = self._open_fresh_session(reason=f"mode={self.config.mode}")
            if self._track_progress_after_turn():
                # 首轮后进度仍与启动指纹相同是正常的（刚注入尚未推进），不因首轮停滞退出
                self.state.stagnant_turns = 0
                self._persist()
            action = classify_reply(text, mode=self.config.mode)
            self.log(f"[编排判定] action={action}")

            while True:
                if self._stop_requested:
                    raise KeyboardInterrupt

                if action == "done":
                    self._persist(status="finished", last_action="done", note="流程完成")
                    self.log("知识库流程判定为完成，编排结束。")
                    break

                if action == "wait":
                    self._persist(
                        status="wait_user",
                        last_action="wait",
                        note="未识别到标准反问话术，已暂停以免误自动继续",
                    )
                    self.log(
                        "未识别到主控标准反问话术，已暂停。\n"
                        "请人工检查输出后，确认可继续再执行：\n"
                        f"  python -m kb_orchestrator resume --system {self.config.system_name}"
                    )
                    exit_code = 3
                    break

                budget = self._budget_exceeded()
                if budget:
                    exit_code = self._stop_for_circuit(budget, status="error")
                    break

                # 下一轮前若本会话轮次将超阈，先换新会话再继续
                if self.state.turns_in_session >= self.config.max_turns_per_session:
                    text = self._open_fresh_session(
                        reason=f"turns_in_session>={self.config.max_turns_per_session}"
                    )
                    if self._track_progress_after_turn():
                        exit_code = self._stop_for_circuit(
                            f"连续 {self.config.max_stagnant_turns} 轮 run-progress 无变化"
                        )
                        break
                    action = classify_reply(text, mode=self.config.mode)
                    self.log(f"[编排判定] action={action}")
                    continue

                time.sleep(0.3)
                text = self._send(continue_message())
                if self._track_progress_after_turn():
                    exit_code = self._stop_for_circuit(
                        f"连续 {self.config.max_stagnant_turns} 轮 run-progress 无变化"
                    )
                    break
                budget = self._budget_exceeded()
                if budget:
                    exit_code = self._stop_for_circuit(budget, status="error")
                    break
                action = classify_reply(text, mode=self.config.mode)
                self.log(f"[编排判定] action={action}")

        except KeyboardInterrupt:
            self._persist(
                status="interrupted",
                interrupted_at=self.state.updated_at,
                note="用户中断。进度以 run-progress.md 为准；用 resume 从断点继续。",
            )
            self.log(
                "\n已中断并保存编排状态。\n"
                f"- 进度文件: {self.paths.progress_file(self.config.system_name)}\n"
                f"- 编排状态: {self.state_path}\n"
                "继续构建请执行：\n"
                f"  python -m kb_orchestrator resume --system {self.config.system_name}"
            )
            exit_code = 130
        except CursorAgentError as exc:
            self._persist(status="error", last_error=str(exc))
            self.log(
                f"Agent 启动/调用失败: {exc} "
                f"(retryable={getattr(exc, 'is_retryable', None)})"
            )
            exit_code = 1
        except Exception as exc:  # noqa: BLE001
            self._persist(status="error", last_error=str(exc))
            self.log(f"编排失败: {exc}")
            exit_code = 1
        finally:
            self._close_agent()
            try:
                close_default_client()
            except Exception:  # noqa: BLE001
                pass

        return exit_code
