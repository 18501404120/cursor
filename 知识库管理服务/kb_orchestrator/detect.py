from __future__ import annotations

import re

# 策略 A：匹配主控规定的反问话术，触发自动回复「继续」
CONTINUE_PATTERNS = [
    r"是否继续执行下一阶段",
    r"是否处理下一个模块",
    r"是否处理本模块下一个页面",
    r"是否进入下一个模块",
    r"是否开始逐项更新",
    r"回复【继续】",
    r"回复\[继续\]",
    r"回复「继续」",
    r"回复\s*继续",
]

DONE_PATTERNS = [
    r"全流程知识库构建全部完成",
    r"所有文档归档完毕",
    r"可发送新初始化指令梳理其他ERP子系统",
]

# 同步模式可能出现的收尾
SYNC_DONE_PATTERNS = [
    r"本次同步已完成",
    r"无代码变更",
    r"基线已初始化[，,].*本次无需更新",
]


def _normalize(text: str) -> str:
    """去掉常见 Markdown 加粗，便于匹配【**继续**】一类写法。"""
    return text.replace("**", "").replace("__", "")


def _matched(text: str, patterns: list[str]) -> bool:
    normalized = _normalize(text)
    return any(re.search(p, normalized) for p in patterns)


def needs_continue(assistant_text: str) -> bool:
    """助手是否在按主控规则反问，等待「继续」。"""
    if not assistant_text:
        return False
    if is_all_done(assistant_text):
        return False
    return _matched(assistant_text, CONTINUE_PATTERNS)


def is_all_done(assistant_text: str) -> bool:
    return _matched(assistant_text or "", DONE_PATTERNS)


def is_sync_done(assistant_text: str) -> bool:
    return _matched(assistant_text or "", SYNC_DONE_PATTERNS) or is_all_done(assistant_text)


def classify_reply(assistant_text: str, *, mode: str) -> str:
    """
    返回动作标签：
    - done: 流程结束
    - continue: 应自动回复继续
    - wait: 看不出明确反问（可能在提问用户选择/报错），停止自动推进以免误操作
    """
    if mode == "sync":
        if is_sync_done(assistant_text):
            return "done"
    elif is_all_done(assistant_text):
        return "done"

    if needs_continue(assistant_text):
        return "continue"
    return "wait"
