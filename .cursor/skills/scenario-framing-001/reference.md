# 场景梳理 001 · 参考

## 版本与覆盖

| 场景 | 行为 | 文件名示例 |
|------|------|------------|
| 首次梳理 | 新建 | `WFS共享库存-场景梳理.html` |
| 再次全量梳理（同主题） | 新建下一版 | `WFS共享库存-场景梳理-v2.html` → `-v3` … |
| 用户回复待确认后定稿 | **覆盖**当前迭代文件 | 仍为 `…-场景梳理.html` 或用户指定的 `-v2` |

**解析下一版号**

1. 在 `{根}/方案/` 下列出匹配 `*{主题}*-场景梳理*.html` 的文件（主题与用户本次提炼一致）。
2. 若仅有 `{主题}-场景梳理.html`，下一版为 `-v2`。
3. 若已有 `-v2`…`-vN`，下一版为 `-v{N+1}`。
4. 主题不一致（例如子场景不同）则用新主题新文件，不强行续 v 号。

---

## 维护 index.html

### 目标文件

| 根目录前缀 | 更新的 index |
|------------|------------|
| `文件夹/需求/{名}/` | `文件夹/需求/index.html` |
| `文件夹/项目/{名}/` | `文件夹/项目/index.html` |

### 操作步骤

1. 打开对应 `index.html`。
2. 计算相对链接（相对 index 所在目录）：
   - 需求示例：`商超3p需求/方案/WFS共享库存-场景梳理.html`
   - 项目示例：`全渠道管报/方案/管报口径-场景梳理-v2.html`
3. 在 **「全部 HTML 原型 · 一览」** 表格的 `<tbody>` 中：
   - 若已有该 `{名}` 的 `<tr>`：在第二列 `<td>` 内**追加** `<br>` + `<a href="…">…场景梳理…</a>` + 可选 `<span class="tag">场景梳理</span>`
   - 若无该行：新增 `<tr><td><strong>{显示名}</strong></td><td><a href="…">…</a></td></tr>`
4. 在 **「方案说明页」** 或同类 card 的 `<ul>` 中追加一条 `<li><a href="…">…</a></li>`（若页面无该 card，可只维护表格）。
5. **不要**删除旧版链接（多版本并存）。
6. 链接文案建议：`{主题} · 场景梳理` 或 `场景梳理 v2`（与文件名一致即可）。

### GitHub Pages

推送 `main` 后，入口一般为：

- 需求：`https://18501404120.github.io/cursor/文件夹/需求/index.html`
- 项目：`https://18501404120.github.io/cursor/文件夹/项目/index.html`

回复用户时给出**从 index 点击可达**的相对路径即可。

---

## HTML 页面骨架（最小可行）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{主题} · 场景梳理</title>
  <style>/* 内联：变量、.page、.hero、.nav、section、示意图组件 */</style>
</head>
<body>
  <div class="page">
    <!-- 含待确认时 -->
    <div class="draft-banner" role="status">草案 · 含 N 条待确认</div>

    <h1>{主题} · 场景梳理</h1>
    <p class="sub">…副标题 / 范围一句…</p>

    <div class="hero">
      <p><strong>一句话：</strong>…</p>
    </div>

    <nav class="nav" aria-label="章节">
      <a href="#bg">背景</a>
      <a href="#pain">痛点</a>
      <!-- 按实际章节增减 -->
      <a href="#open">待确认</a>
    </nav>

    <section id="bg">
      <header>…</header>
      <div class="bd">…</div>
    </section>

    <section id="open">
      <header>待确认 / 开放问题</header>
      <div class="bd">
        <ol>
          <li><strong>待您确认：</strong>…？</li>
        </ol>
      </div>
    </section>
  </div>
  <script>/* 可选：Tab、折叠、简单演算 */</script>
</body>
</html>
```

---

## 推荐图示组件（纯 HTML/CSS，任选）

| 组件 | 适用 |
|------|------|
| `.cards` 多卡网格 | 背景、痛点、价值并列 |
| 泳道 `.swimlane` | 多角色流程 |
| 管道 `.pipe` + `.n` | 库存/数量流转 |
| 三列 `.stores` | 多店/多仓对比 |
| `.win-grid` 对比窗 | 现状 vs 目标 |
| `.moment` 时间轴 | 10 分钟拉单等时序 |
| 内联 `<svg>` | 简单箭头流程（参考 WFS v2 `#s5`） |
| `table` + 行高亮 | 演算、触发条件 |
| 表单 + `table` 联动 JS | 轻量「改数字看结果」 |

**禁止**：Mermaid、依赖 CDN 的 chart 库、整屏纯 `<p>` 长文。

---

## 质量标杆

阅读并参考交互与信息密度（**勿复制其 WFS 业务文案**）：

`文件夹/需求/商超3p需求/原型/WFS共享库存与自动借货-方案说明-v2.html`

- 一句话 hero + 确认示例（可选第二块 hero）
- Sticky 章节导航
- 短卡片、管道图、店铺对比、可交互演算
- 章节标题「编号 · 短标题」

新 Skill 产出在 **`方案/`** 目录，视觉可借鉴，链接不要指向 `原型/` 内旧说明页除非用户要求互链。

---

## 主题提炼启发式

1. 用户标题/首句中的核心名词（如「WFS 共享库存」）。
2. 拖入文件名中的业务词（去掉日期、会议纪要、副本等）。
3. 文件夹名（如 `商超3p需求` → 子主题仍从内容提炼，避免整文件夹名过长作文件名）。
4. 多主题一场合：默认**一个 HTML 多章节**；文件名用**主主题**；次要主题作 section，除非用户要求拆分。

---

## 示例数据速查

| 类型 | 来源 |
|------|------|
| 店铺/渠道 | `文件夹/规范/基础数据/渠道店铺基础数据_v1.json` |
| SKU / model | `销售主数据索引_v1.json`、`销售主数据-全局业务规范.md` §示例 |
| 区域国家 | `区域国家基础数据_v1.json` |
| 列表演示行 | `全局筛选示范数据_v1.json`（需表格时） |

GoveeLife 店铺写法：`Goveelife_XX`（life 小写）。
