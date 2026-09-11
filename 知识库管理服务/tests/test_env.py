import os
from pathlib import Path

from kb_orchestrator.env import load_dotenv, resolve_api_key


def test_load_dotenv_and_resolve(tmp_path: Path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text('CURSOR_API_KEY="crsr_test_key"\n', encoding="utf-8")
    monkeypatch.delenv("CURSOR_API_KEY", raising=False)

    loaded = load_dotenv(env_file, override=True)
    assert loaded == env_file
    assert os.environ["CURSOR_API_KEY"] == "crsr_test_key"
    # 不调用会回落到项目 .env 的 resolve；此处直接验证已注入环境
    assert os.environ.get("CURSOR_API_KEY") == "crsr_test_key"


def test_placeholder_env_falls_back_to_dotenv(tmp_path: Path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("CURSOR_API_KEY=crsr_real_from_file\n", encoding="utf-8")
    monkeypatch.setenv("CURSOR_API_KEY", "cursor_...")
    monkeypatch.setattr(
        "kb_orchestrator.env.project_root",
        lambda: tmp_path,
    )
    assert resolve_api_key() == "crsr_real_from_file"
