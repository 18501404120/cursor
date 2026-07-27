from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorkspacePaths:
    """ERP 工作区路径集合。"""

    erp_root: Path
    prompt_lib: Path

    @classmethod
    def resolve(cls, erp_root: Path | None = None) -> WorkspacePaths:
        if erp_root is None:
            # 目录可能是 本地/知识库管理服务 或 本地/方案设计/知识库管理服务
            # 向上查找同时包含 本地/prompt-lib 与 ERP_product 的仓库根
            here = Path(__file__).resolve()
            erp_root = None
            for parent in here.parents:
                if (parent / "本地" / "prompt-lib").is_dir() and (
                    parent / "ERP_product"
                ).is_dir():
                    erp_root = parent
                    break
            if erp_root is None:
                raise FileNotFoundError(
                    "未找到 ERP 仓库根（需含 本地/prompt-lib 与 ERP_product）"
                )
        erp_root = erp_root.resolve()
        prompt_lib = erp_root / "本地" / "prompt-lib"
        if not prompt_lib.is_dir():
            raise FileNotFoundError(f"未找到 prompt-lib: {prompt_lib}")
        return cls(erp_root=erp_root, prompt_lib=prompt_lib)

    def system_dir(self, system_name: str) -> Path:
        return self.erp_root / "ERP_product" / system_name

    def kb_root(self, system_name: str) -> Path:
        return self.system_dir(system_name) / "知识库"

    def progress_file(self, system_name: str) -> Path:
        return self.kb_root(system_name) / "run-progress.md"

    def config_file(self, system_name: str) -> Path:
        return self.kb_root(system_name) / "system-config.md"

    def orchestrator_state_file(self, system_name: str) -> Path:
        return self.kb_root(system_name) / ".kb-orchestrator-state.json"
