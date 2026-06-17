const fs = require('fs');
const path = require('path');
const { chatCompletion, extractJson } = require('./llm');
const { formatDateParts, sanitizeFilename, resolveUniqueSessionDir } = require('./paths');

const SCENARIO_PROMPT = `你是一位 ERP 产品场景梳理助手。根据会议转写原文，输出结构化 JSON（不要 markdown 包裹）。

要求：
1. meetingTopic：会议主题（中文 4～24 字，不含日期，例如「商超线下退货流程梳理」）
2. 场景梳理页（借鉴 PRD 前场景对齐页，短句要点，禁止会议流水账）：
   - hero：一句话概括
   - subtitle：副标题/阅读范围一句
   - readMinutes：预估阅读分钟数（数字）
   - sections：数组，每项 { id, title, kind, items }
     - id 用小写英文：guide/bg/pain/asis/value/solution/roles/open 等
     - kind 取 cards | list | pipe | win | swimlane | table | text 之一
     - items 结构随 kind：
       - cards/list/text: string[]
       - pipe: { label, note? }[]
       - win: { title, items: string[] }[]（现状 vs 目标）
       - swimlane: { lane, steps: string[] }[]
       - table: { headers: string[], rows: string[][] }
   - 至少包含 bg、pain、solution；有角色信息则加 roles；未拍板项写入 id=open 的 section
3. meetingMinutes：
   - summary：会议纪要正文（2～6 段短段落，总结讨论要点与结论，自然中文）
   - todos：待办数组，每项 { task, owner?, due? }

只写转写中能支撑或合理推断的内容；不确定的放进 open section，不要编造具体 SKU/店名/人名。

【重要】所有字段必须放在 JSON 顶层，禁止嵌套在 scenarioOverview、场景梳理页 等子对象内。
顶层必须包含：meetingTopic、hero、subtitle、readMinutes、sections（非空数组）、meetingMinutes。
输出纯 JSON，字段名严格使用上述英文 key。`;

const NESTED_SCENARIO_KEYS = ['场景梳理页', 'scenarioOverview', 'scenarioFraming', 'scenario', '场景梳理'];

function normalizeAnalysisData(raw) {
  const data = { ...(raw || {}) };

  for (const key of NESTED_SCENARIO_KEYS) {
    const nested = data[key];
    if (!nested || typeof nested !== 'object') continue;
    if (!data.hero && nested.hero) data.hero = nested.hero;
    if (!data.subtitle && nested.subtitle) data.subtitle = nested.subtitle;
    if (data.readMinutes == null && nested.readMinutes != null) data.readMinutes = nested.readMinutes;
    if ((!Array.isArray(data.sections) || !data.sections.length) && Array.isArray(nested.sections)) {
      data.sections = nested.sections;
    }
    delete data[key];
  }

  if (!data.meetingTopic) {
    data.meetingTopic = data.topic || data.title || '会议梳理';
  }
  data.meetingTopic = sanitizeFilename(data.meetingTopic) || '会议梳理';
  if (!data.hero) data.hero = data.meetingTopic;
  if (!Array.isArray(data.sections)) data.sections = [];
  if (!data.meetingMinutes) data.meetingMinutes = { summary: '', todos: [] };

  return data;
}

function buildAnalysisMessages(transcript) {
  const trimmed = String(transcript || '').slice(0, 120000);
  return [
    { role: 'system', content: SCENARIO_PROMPT },
    {
      role: 'user',
      content: `以下是会议转写原文，请分析并输出 JSON：\n\n${trimmed}`,
    },
  ];
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderItems(section) {
  const { kind, items } = section;
  if (!items || !items.length) return '<p class="hint">（暂无）</p>';

  if (kind === 'cards') {
    return `<div class="cards">${items
      .map((t) => {
        const [title, ...rest] = String(t).split('：');
        if (rest.length) {
          return `<div class="card"><strong>${escapeHtml(title)}</strong>${escapeHtml(rest.join('：'))}</div>`;
        }
        return `<div class="card">${escapeHtml(t)}</div>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'list' || kind === 'text') {
    const tag = kind === 'text' ? 'div' : 'ul';
    const inner =
      kind === 'text'
        ? items.map((t) => `<p>${escapeHtml(t)}</p>`).join('')
        : `<ul>${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;
    return `<${tag} class="bd-text">${inner}</${tag}>`;
  }

  if (kind === 'pipe') {
    return `<div class="pipe">${items
      .map((n, i) => {
        const node = `<div class="n brand"><strong>${escapeHtml(n.label)}</strong>${n.note ? `<br><span>${escapeHtml(n.note)}</span>` : ''}</div>`;
        const arr = i < items.length - 1 ? '<span class="arr">→</span>' : '';
        return node + arr;
      })
      .join('')}</div>`;
  }

  if (kind === 'win') {
    const cls = ['a', 'b'];
    return `<div class="win-grid">${items
      .map(
        (w, i) =>
          `<div class="win ${cls[i] || 'a'}"><h5>${escapeHtml(w.title)}</h5><ul>${(w.items || [])
            .map((t) => `<li>${escapeHtml(t)}</li>`)
            .join('')}</ul></div>`,
      )
      .join('')}</div>`;
  }

  if (kind === 'swimlane') {
    return items
      .map(
        (lane) =>
          `<div class="swimlane"><div class="lane">${escapeHtml(lane.lane)}</div><div class="steps">${(lane.steps || [])
            .map((s, i, arr) =>
              i < arr.length - 1
                ? `<span>${escapeHtml(s)}</span><span class="arr">→</span>`
                : `<span>${escapeHtml(s)}</span>`,
            )
            .join('')}</div></div>`,
      )
      .join('');
  }

  if (kind === 'table') {
    const table = items && !Array.isArray(items) ? items : { headers: [], rows: [] };
    const headers = table.headers || [];
    const bodyRows = table.rows || [];
    if (!headers.length) return '<p class="hint">（暂无）</p>';
    return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows
      .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  }

  return `<ul>${items.map((t) => `<li>${escapeHtml(String(t))}</li>`).join('')}</ul>`;
}

function countOpenItems(sections) {
  const open = (sections || []).find((s) => s.id === 'open');
  return open?.items?.length || 0;
}

function buildScenarioHtml(data, meta) {
  const {
    meetingTopic,
    hero,
    subtitle,
    readMinutes,
    sections = [],
    meetingMinutes = {},
  } = data;
  const title = `${meetingTopic} · 场景梳理`;
  const openCount = countOpenItems(sections);
  const draftBanner =
    openCount > 0
      ? `<div class="draft-banner" role="status">草案 · 含 <strong>${openCount}</strong> 条待确认（见「待确认」章节）</div>`
      : '';

  let navLinks = sections
    .map((s) => `<a href="#${escapeHtml(s.id)}">${escapeHtml(s.title)}</a>`)
    .join('');
  navLinks += '<a href="#minutes">会议纪要</a>';

  const sectionHtml = sections
    .map(
      (s) =>
        `<section id="${escapeHtml(s.id)}"><header>${escapeHtml(s.title)}</header><div class="bd">${renderItems(s)}</div></section>`,
    )
    .join('\n');

  const summaryHtml = (meetingMinutes.summary || '')
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');

  const todos = meetingMinutes.todos || [];
  const todosHtml =
    todos.length > 0
      ? `<table class="todo-table"><thead><tr><th>待办事项</th><th>负责人</th><th>期限</th></tr></thead><tbody>${todos
          .map(
            (t) =>
              `<tr><td>${escapeHtml(t.task || '')}</td><td>${escapeHtml(t.owner || '—')}</td><td>${escapeHtml(t.due || '—')}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '<p class="hint">本次会议未明确待办事项。</p>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #eef3fb; --surface: #fff; --text: #0f172a; --muted: #475569;
      --line: #dbe4f0; --brand: #0b5ed7; --brand-soft: #e7f1ff;
      --shadow: 0 8px 24px rgba(15,23,42,.07); --radius: 12px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      background: linear-gradient(165deg, #eaf0fb, var(--bg) 60%, #f8fafc);
      color: var(--text); line-height: 1.65;
    }
    .page { max-width: 1100px; margin: 0 auto; padding: 20px 16px 48px; }
    h1 { margin: 0 0 6px; font-size: 22px; color: #0f2f63; }
    .sub { margin: 0 0 14px; font-size: 13px; color: var(--muted); }
    .meta { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
    .draft-banner {
      padding: 10px 14px; margin-bottom: 12px; border-radius: 10px;
      background: #fffbeb; border: 1px solid #fcd34d; font-size: 13px; color: #92400e;
    }
    .hero {
      padding: 16px 18px; background: #fff; border: 1px solid var(--line);
      border-radius: var(--radius); box-shadow: var(--shadow); margin-bottom: 14px;
    }
    .hero p { margin: 0; font-size: 14px; }
    .nav {
      position: sticky; top: 0; z-index: 30; display: flex; flex-wrap: wrap; gap: 6px;
      padding: 8px 0 12px; background: linear-gradient(180deg, #eef3fb 80%, transparent);
    }
    .nav a {
      font-size: 12px; text-decoration: none; color: var(--brand);
      padding: 5px 10px; border-radius: 999px; border: 1px solid #bfdbfe; background: #fff;
    }
    section {
      margin-top: 14px; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
    }
    section > header {
      padding: 12px 16px; font-size: 14px; font-weight: 800; color: #0f2f63;
      border-bottom: 1px solid var(--line); background: #f8fbff;
    }
    section > .bd { padding: 16px; }
    section#minutes { border-color: #93c5fd; }
    section#minutes > header { background: var(--brand-soft); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .card {
      padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: #fafbff; font-size: 13px;
    }
    .card strong { display: block; margin-bottom: 4px; color: #0f2f63; }
    .pipe { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0; font-size: 12px; }
    .pipe .n {
      padding: 10px 12px; border-radius: 10px; text-align: center; min-width: 88px;
      border: 2px solid var(--line); background: #fff;
    }
    .pipe .n.brand { border-color: #93c5fd; background: var(--brand-soft); }
    .pipe .arr { color: #94a3b8; font-weight: 800; font-size: 18px; }
    .win-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 600px) { .win-grid { grid-template-columns: 1fr; } }
    .win { padding: 12px; border-radius: 10px; font-size: 13px; }
    .win.a { background: #fff7ed; border: 1px solid #fdba74; }
    .win.b { background: #ecfdf5; border: 1px solid #6ee7b7; }
    .win h5 { margin: 0 0 6px; font-size: 13px; }
    .swimlane {
      display: grid; grid-template-columns: 100px 1fr; border: 1px solid var(--line);
      border-radius: 10px; overflow: hidden; font-size: 12px; margin: 8px 0;
    }
    .swimlane .lane { padding: 10px; background: #f8fbff; font-weight: 700; border-bottom: 1px solid var(--line); }
    .swimlane .steps {
      padding: 10px 12px; border-bottom: 1px solid var(--line);
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    }
    .swimlane .steps span { padding: 4px 8px; background: #fff; border: 1px solid var(--line); border-radius: 6px; }
    .swimlane .steps .arr { background: none; border: none; color: #94a3b8; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
    th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .todo-table td:first-child { font-weight: 600; }
    .bd-text p { margin: 0 0 8px; font-size: 13px; }
    .bd-text ul { margin: 0; padding-left: 1.3em; font-size: 13px; }
    .hint { font-size: 12px; color: var(--muted); }
    #open ol { padding-left: 1.3em; font-size: 13px; }
    #open li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="page">
    <p class="meta">由会议记录工具自动生成 · ${escapeHtml(meta.generatedAt)} · 转写 ${escapeHtml(meta.durationLabel || '')}</p>
    <h1>${escapeHtml(meetingTopic)} · 场景梳理</h1>
    <p class="sub">${escapeHtml(subtitle || '')}${readMinutes ? ` · 约 ${readMinutes} 分钟阅读` : ''}</p>
    ${draftBanner}
    <div class="hero"><p><strong>一句话：</strong>${escapeHtml(hero || '')}</p></div>
    <nav class="nav" aria-label="章节">${navLinks}</nav>
    ${sectionHtml}
    <section id="minutes">
      <header>会议纪要</header>
      <div class="bd">
        <p class="lead">会议总结</p>
        ${summaryHtml || '<p class="hint">暂无摘要。</p>'}
        <p class="lead" style="margin-top:16px">待办事项</p>
        ${todosHtml}
      </div>
    </section>
  </div>
</body>
</html>`;
}

function computeRenamedPaths(monthPath, oldSessionDir, oldBaseName, meetingTopic, startedAt) {
  const { datePrefix } = formatDateParts(startedAt);
  const safeTopic = sanitizeFilename(meetingTopic);
  let newBaseName = `${datePrefix} ${safeTopic}`.trim();

  const currentDir = path.basename(oldSessionDir);
  if (newBaseName !== currentDir) {
    newBaseName = resolveUniqueSessionDir(monthPath, newBaseName, oldSessionDir);
  }

  const newSessionDir = path.join(monthPath, newBaseName);
  return {
    newBaseName,
    newSessionDir,
    newTxtPath: path.join(newSessionDir, `${newBaseName}.txt`),
    newM4aPath: path.join(newSessionDir, `${newBaseName}.m4a`),
    htmlPath: path.join(newSessionDir, `${newBaseName}.html`),
    oldSessionDir,
    oldBaseName,
  };
}

function renameSessionFiles(renamed) {
  const { oldSessionDir, oldBaseName, newSessionDir, newBaseName, newTxtPath, newM4aPath } = renamed;

  if (oldSessionDir !== newSessionDir) {
    fs.renameSync(oldSessionDir, newSessionDir);
  }

  const oldTxt = path.join(newSessionDir, `${oldBaseName}.txt`);
  const oldM4a = path.join(newSessionDir, `${oldBaseName}.m4a`);

  if (oldBaseName !== newBaseName) {
    if (fs.existsSync(oldTxt) && oldTxt !== newTxtPath) fs.renameSync(oldTxt, newTxtPath);
    if (fs.existsSync(oldM4a) && oldM4a !== newM4aPath) fs.renameSync(oldM4a, newM4aPath);
  }

  return {
    sessionDir: newSessionDir,
    baseName: newBaseName,
    txtPath: newTxtPath,
    m4aPath: newM4aPath,
  };
}

async function analyzeTranscript(config, transcript) {
  const messages = buildAnalysisMessages(transcript);
  let content = await chatCompletion(config, messages);
  let data = normalizeAnalysisData(extractJson(content));

  if (!data.sections.length) {
    console.warn('[meeting-recorder] sections 为空，请求模型补全场景梳理章节…');
    content = await chatCompletion(config, [
      ...messages,
      { role: 'assistant', content },
      {
        role: 'user',
        content:
          '你返回的 JSON 中 sections 为空或未解析。请重新输出完整 JSON：hero、subtitle、readMinutes、sections 必须在顶层；sections 至少含 bg（背景）、pain（痛点）、solution（方案）、open（待确认）四章，每章 items 非空。',
      },
    ]);
    data = normalizeAnalysisData(extractJson(content));
  }

  if (!data.meetingTopic) {
    throw new Error('模型未返回 meetingTopic');
  }
  if (!data.sections.length) {
    throw new Error('模型未返回场景梳理 sections，请重试或更换 model');
  }

  return data;
}

async function generateScenarioFromTranscript(config, options) {
  const { transcript, paths, startedAt, durationMs, onProgress, htmlOnly = false } = options;
  const scenarioEnabled = config.scenarioFraming?.enabled !== false;

  if (!scenarioEnabled) {
    return { skipped: true, reason: 'scenarioFraming.enabled=false' };
  }

  if (onProgress) onProgress({ phase: 'scenario', message: '分析会议内容…' });

  const analysis = await analyzeTranscript(config, transcript);
  if (onProgress) onProgress({ phase: 'scenario', message: '生成场景梳理页…' });

  const html = buildScenarioHtml(analysis, {
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    durationLabel: durationMs ? `${Math.round(durationMs / 60000)} 分钟` : '',
  });

  let filePaths;
  let htmlPath;

  if (htmlOnly) {
    htmlPath = path.join(paths.sessionDir, `${paths.baseName}.html`);
    filePaths = {
      sessionDir: paths.sessionDir,
      baseName: paths.baseName,
      txtPath: paths.txtPath,
      m4aPath: paths.m4aPath,
    };
  } else {
    const renamed = computeRenamedPaths(
      path.dirname(paths.sessionDir),
      paths.sessionDir,
      paths.baseName,
      analysis.meetingTopic,
      startedAt,
    );
    // 先写 HTML 再改名，避免改名后写文件失败导致无 HTML
    htmlPath = path.join(paths.sessionDir, `${renamed.newBaseName}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    filePaths = renameSessionFiles(renamed);
    htmlPath = path.join(filePaths.sessionDir, `${filePaths.baseName}.html`);
  }

  if (htmlOnly) {
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  return {
    skipped: false,
    meetingTopic: analysis.meetingTopic,
    htmlPath,
    ...filePaths,
    openCount: countOpenItems(analysis.sections),
    todoCount: (analysis.meetingMinutes?.todos || []).length,
  };
}

module.exports = {
  analyzeTranscript,
  buildScenarioHtml,
  generateScenarioFromTranscript,
  computeRenamedPaths,
  renameSessionFiles,
  normalizeAnalysisData,
};
