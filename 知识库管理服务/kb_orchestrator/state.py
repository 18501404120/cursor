from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


@dataclass
class OrchestratorState:
    system_name: str
    mode: str  # init | resume | sync
    status: str = "idle"  # idle | running | interrupted | finished | wait_user | error | stalled
    agent_id: str | None = None
    turns_in_session: int = 0
    # 本次进程内轮次（用于 max_total_turns 熔断，不跨进程累加）
    run_turns: int = 0
    # 历史累计轮次（仅观测）
    total_turns: int = 0
    cumulative_tokens: int = 0
    stagnant_turns: int = 0
    last_progress_fingerprint: str | None = None
    last_action: str | None = None
    last_error: str | None = None
    interrupted_at: str | None = None
    updated_at: str = field(default_factory=_now)
    note: str = ""

    def touch(self) -> None:
        self.updated_at = _now()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> OrchestratorState:
        known = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})


def load_state(path: Path) -> OrchestratorState | None:
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return OrchestratorState.from_dict(data)


def save_state(path: Path, state: OrchestratorState) -> None:
    state.touch()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(state.to_dict(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
