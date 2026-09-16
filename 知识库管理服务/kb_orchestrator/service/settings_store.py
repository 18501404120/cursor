from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

from ..env import project_root


DEFAULT_FAVORITE_SYSTEMS = ["销售系统", "GTM系统"]


@dataclass
class AppSettings:
    model: str = "composer-2.5"
    max_turns_per_session: int = 8
    max_total_turns: int = 30
    max_stagnant_turns: int = 3
    max_total_tokens: int = 500_000
    default_system: str = "销售系统"
    default_mode: str = "sync"
    # 目标系统下拉默认展示的「我负责的系统」；展开后才列出 ERP_product 全部
    favorite_systems: list[str] = field(
        default_factory=lambda: list(DEFAULT_FAVORITE_SYSTEMS)
    )

    def __post_init__(self) -> None:
        if not self.favorite_systems:
            self.favorite_systems = list(DEFAULT_FAVORITE_SYSTEMS)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> AppSettings:
        known = {f.name for f in fields(cls)}
        cleaned = {k: v for k, v in data.items() if k in known}
        fav = cleaned.get("favorite_systems")
        if isinstance(fav, list):
            cleaned["favorite_systems"] = [
                str(x).strip() for x in fav if str(x).strip()
            ]
        return cls(**cleaned)


def settings_path() -> Path:
    return project_root() / "data" / "settings.json"


def load_settings() -> AppSettings:
    path = settings_path()
    if not path.is_file():
        return AppSettings()
    try:
        return AppSettings.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, TypeError, ValueError):
        return AppSettings()


def save_settings(settings: AppSettings) -> AppSettings:
    path = settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(settings.to_dict(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return settings
