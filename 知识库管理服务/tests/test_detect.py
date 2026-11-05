from kb_orchestrator.detect import classify_reply, needs_continue, is_all_done


def test_needs_continue_stage():
    text = "阶段1执行完毕，文档已保存。是否继续执行下一阶段？回复【继续】进入下一步，回复【终止】结束。"
    assert needs_continue(text)
    assert classify_reply(text, mode="resume") == "continue"


def test_needs_continue_page():
    text = "页面【工单看板】详情梳理完成。当前模块已完成1/9个页面。是否处理本模块下一个页面【客服点赞看板】？回复【继续】处理下一个。"
    assert classify_reply(text, mode="init") == "continue"


def test_done():
    text = "【客服系统】全流程知识库构建全部完成，所有文档归档完毕。可发送新初始化指令梳理其他ERP子系统。"
    assert is_all_done(text)
    assert classify_reply(text, mode="resume") == "done"


def test_ambiguous_waits():
    text = "前端路由里有两个候选目录，请确认绑定哪一个业务根路径？"
    assert classify_reply(text, mode="init") == "wait"


def test_sync_markdown_bold_continue():
    text = "是否开始逐项更新？回复【**继续**】处理第一项（工单看板），回复【**跳过**】跳过该项。"
    assert classify_reply(text, mode="sync") == "continue"
