# 原型标注002 · AI 持久化策略

与 **001** 相同：页内标注改动须跨 AI 对话保留；runtime 静默写入 HTML 内 `persistedState`。

触发词改为：「刷新原型标注002」「更新标注002」等。

Config id：`prototype-annotation-002-config`。注入脚本：`.cursor/skills/prototype-annotation-002/scripts/inject_prototype_annotation.py`。

其余规则见 `../prototype-annotation/references/ai-persistence-policy.md`（禁止在改页面时回滚 persistedState、刷新标注须 preserve-persisted 等）。
