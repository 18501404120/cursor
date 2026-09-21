from pathlib import Path

from kb_orchestrator.progress import ProgressSnapshot


def test_fingerprint_changes_with_current_page(tmp_path: Path):
    p = tmp_path / "run-progress.md"
    a = ProgressSnapshot(
        system_name="客服系统",
        path=p,
        text="current_step: 阶段4\ncurrent_page: 页面A\n",
        exists=True,
    )
    b = ProgressSnapshot(
        system_name="客服系统",
        path=p,
        text="current_step: 阶段4\ncurrent_page: 页面B\n",
        exists=True,
    )
    assert a.fingerprint() != b.fingerprint()


def test_fingerprint_stable_when_unrelated_text_changes():
    a = ProgressSnapshot(
        system_name="x",
        path=Path("x"),
        text="current_step: 阶段4\ncurrent_page: 页面A\n备注: 1\n",
        exists=True,
    )
    b = ProgressSnapshot(
        system_name="x",
        path=Path("x"),
        text="current_step: 阶段4\ncurrent_page: 页面A\n备注: 2\n",
        exists=True,
    )
    assert a.fingerprint() == b.fingerprint()
