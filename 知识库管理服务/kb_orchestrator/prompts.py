from __future__ import annotations

from pathlib import Path

STEP_FILES = {
    0: "step0-init.md",
    1: "step1-global-arch.md",
    2: "step2-module-split.md",
    3: "step3-module-summary.md",
    4: "step4-page-detail.md",
    5: "step5-db-model.md",
    6: "step6-business-rule.md",
    7: "step7-incremental-sync.md",
}


def read_text(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(f"提示词文件不存在: {path}")
    return path.read_text(encoding="utf-8")


def load_master(prompt_lib: Path) -> str:
    return read_text(prompt_lib / "master-scheduler.md")


def load_step(prompt_lib: Path, step: int) -> str:
    name = STEP_FILES.get(step)
    if name is None:
        raise ValueError(f"未知阶段: {step}")
    return read_text(prompt_lib / name)


def infer_step_from_progress(progress_text: str) -> int | None:
    """从进度文本粗判当前应执行阶段；已全部完成返回 None。"""
    if not progress_text.strip():
        return 0
    if "全部构建完成" in progress_text:
        return None
    if "| **总计** | **全部完成**" in progress_text:
        return None
    if "构建进度" in progress_text and "**全部完成**" in progress_text:
        return None

    # 标准模板：current_step 行
    for line in progress_text.splitlines():
        if line.strip().startswith("current_step"):
            if "全部" in line and "完成" in line:
                return None
            if "阶段0" in line and "完成" in line:
                return 1
            for n in range(6, -1, -1):
                if f"阶段{n}" in line:
                    if "完成" in line:
                        return min(n + 1, 6)
                    return n

    # 标准模板：finished_step / ✅ 标记
    finished = []
    for n in range(0, 7):
        if f"阶段{n}" in progress_text and ("✅" in progress_text or "完成" in progress_text):
            # 更精确：同行包含阶段n与完成
            for line in progress_text.splitlines():
                if f"阶段{n}" in line and ("✅" in line or "完成" in line):
                    finished.append(n)
                    break
    if finished:
        last = max(finished)
        return min(last + 1, 6)

    # 无法识别结构但文件已存在：交给 Agent 读进度断点续跑，默认挂 step3（模块循环高频区）
    return 3


def build_bootstrap_prompt(
    *,
    prompt_lib: Path,
    system_name: str,
    mode: str,
    progress_text: str | None,
    config_text: str | None,
    force_step: int | None = None,
) -> str:
    """构造新会话首包：重注入主控规则 + 当前阶段模板 + 外部进度。"""
    master = load_master(prompt_lib)
    step = force_step
    if step is None and progress_text:
        step = infer_step_from_progress(progress_text)
    if step is None and mode == "init":
        step = 0
    if step is None and mode == "sync":
        step = 7
    if step is None:
        step = 0

    step_body = load_step(prompt_lib, step)

    parts = [
        "# 编排器会话启动包（自动注入，优先级最高）",
        "",
        "你正在由本地编排器驱动，执行 ERP 知识库构建。",
        "以下规则与阶段模板每次新会话都会完整重注入，请严格遵守，不要依赖聊天历史记忆。",
        "",
        f"- 当前绑定系统：{system_name}",
        f"- 编排模式：{mode}",
        f"- 当前应执行阶段模板：step{step}",
        "- 进度真相源：知识库目录下的 run-progress.md（已附在下方时以其为准）",
        "- 每完成一个阶段/模块/页面后，按主控规则反问；编排器会自动回复「继续」",
        "- 禁止跳过进度、禁止重做已标记完成的模块/页面",
        "- 文件直接落盘；对话中只输出执行摘要与反问话术",
        "",
        "---",
        "# master-scheduler.md",
        master,
        "",
        "---",
        f"# {STEP_FILES[step]}",
        step_body,
    ]

    if config_text:
        parts.extend(["", "---", "# system-config.md（当前快照）", config_text])
    if progress_text:
        parts.extend(["", "---", "# run-progress.md（当前快照，断点续跑以此为准）", progress_text])

    # 已有进度文件时，即使命令是 init，也按主控「断点续跑」语义，避免重复初始化
    has_progress = bool(progress_text and progress_text.strip())
    fresh_init = mode == "init" and not has_progress

    if mode == "sync":
        parts.extend(
            [
                "",
                "---",
                "# 首条用户指令",
                f"同步{system_name}知识库",
                "请按 step7 增量同步模板执行；给出变更影响清单后逐项推进，每项完成后反问。",
            ]
        )
    elif fresh_init:
        parts.extend(
            [
                "",
                "---",
                "# 首条用户指令",
                f"初始化{system_name}知识库构建",
                "请立即按阶段0模板执行初始化；完成后按主控话术反问是否进入下一阶段。",
            ]
        )
    else:
        parts.extend(
            [
                "",
                "---",
                "# 首条用户指令",
                f"继续{system_name}知识库构建（断点续跑）",
                "请读取上方 run-progress.md，从当前未完成项继续执行，禁止重做已完成项。",
                "完成后按主控话术反问。",
            ]
        )

    return "\n".join(parts)


def continue_message() -> str:
    return "继续"
