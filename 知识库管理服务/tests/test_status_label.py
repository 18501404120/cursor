from kb_orchestrator.progress import ProgressSnapshot, status_label


def test_status_no_kb():
    assert status_label(None, has_kb=False) == "未建库"


def test_status_complete():
    snap = ProgressSnapshot(
        system_name="x",
        path=__import__("pathlib").Path("x"),
        text="current_step: ✅ 全部构建完成\n",
        exists=True,
    )
    assert status_label(snap, has_kb=True) == "已完成"


def test_status_current_step():
    snap = ProgressSnapshot(
        system_name="x",
        path=__import__("pathlib").Path("x"),
        text="current_step: 阶段4（进行中）\ncurrent_page: 工单看板\n",
        exists=True,
    )
    assert "阶段4" in status_label(snap, has_kb=True)
