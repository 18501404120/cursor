const fs = require('fs');
const path = require('path');

const SCENARIO_V2_CSS =
  fs.readFileSync(path.join(__dirname, 'scenario-v2.css'), 'utf8');

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseCardItem(item, index) {
  if (item && typeof item === 'object') {
    return {
      tag: item.tag || '',
      title: item.title || item.label || '',
      body: item.body || item.desc || item.text || '',
    };
  }
  const raw = String(item || '');
  const sep = raw.includes('：') ? '：' : raw.includes(':') ? ':' : '';
  if (sep) {
    const idx = raw.indexOf(sep);
    return { tag: '', title: raw.slice(0, idx).trim(), body: raw.slice(idx + 1).trim() };
  }
  return { tag: '', title: `要点 ${index + 1}`, body: raw };
}

function renderListItems(items) {
  return `<ul class="list">${items
    .map((t) => `<li>${escapeHtml(String(t))}</li>`)
    .join('')}</ul>`;
}

function renderSectionItems(section) {
  const { kind, items } = section;
  if (!items || !items.length) return '<p class="section-intro">（暂无）</p>';

  if (kind === 'pain-grid' || (kind === 'cards' && section.id === 'pain')) {
    const painItems = items.map((it, i) => {
      const p = typeof it === 'object' ? it : parseCardItem(it, i);
      const tag = p.tag || `痛点 ${String(i + 1).padStart(2, '0')}`;
      return `<article class="pain-card">
        <span class="card-tag">${escapeHtml(tag)}</span>
        <h3>${escapeHtml(p.title || p.body?.slice(0, 24) || tag)}</h3>
        <p>${escapeHtml(p.body || p.title || '')}</p>
        ${p.impact ? `<div class="pain-effect"><strong>直接影响</strong><p>${escapeHtml(p.impact)}</p></div>` : ''}
      </article>`;
    });
    return `<div class="grid-4">${painItems.join('')}</div>`;
  }

  if (kind === 'cards' || kind === 'value-cards') {
    return `<div class="grid-cards">${items
      .map((it, i) => {
        const c = parseCardItem(it, i);
        return `<article class="card soft card-item">
          ${c.tag ? `<span class="card-tag">${escapeHtml(c.tag)}</span>` : ''}
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.body)}</p>
        </article>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'win' || kind === 'state') {
    const cls = ['current', 'target'];
    const labels = ['当前状态', '目标状态'];
    return `<div class="state-grid">${items
      .map(
        (w, i) =>
          `<article class="state-card ${cls[i] || 'current'}">
            <span class="state-pill">${escapeHtml(w.title || labels[i] || `状态 ${i + 1}`)}</span>
            <h3>${escapeHtml(w.subtitle || w.title || labels[i] || '')}</h3>
            ${renderListItems(w.items || [])}
          </article>`,
      )
      .join('')}</div>`;
  }

  if (kind === 'scheme') {
    return `<div class="scheme-grid">${items
      .map((s) => {
        const prob = s.problems || s.problemItems || [];
        const sol = s.solutions || s.solutionItems || [];
        return `<article class="scheme-card">
          <div class="scheme-head">
            <h3>${escapeHtml(s.title || '')}</h3>
            <p>${escapeHtml(s.subtitle || s.desc || '')}</p>
          </div>
          <div class="scheme-body">
            <div class="scheme-cell">
              <span>要解决的问题</span>
              ${prob.length ? renderListItems(prob) : '<p>—</p>'}
            </div>
            <div class="scheme-cell">
              <span>核心方案</span>
              ${sol.length ? renderListItems(sol) : '<p>—</p>'}
            </div>
            <div class="scheme-cell">
              <span>业务价值</span>
              <p>${escapeHtml(s.value || s.businessValue || '—')}</p>
            </div>
          </div>
        </article>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'pipe') {
    return `<div class="pipe-flow">${items
      .map((n, i) => {
        const node =
          typeof n === 'object'
            ? `<div class="pipe-node"><strong>${escapeHtml(n.label || '')}</strong>${n.note ? `<span>${escapeHtml(n.note)}</span>` : ''}</div>`
            : `<div class="pipe-node">${escapeHtml(String(n))}</div>`;
        const arr = i < items.length - 1 ? '<span class="pipe-arrow">→</span>' : '';
        return node + arr;
      })
      .join('')}</div>`;
  }

  if (kind === 'swimlane') {
    return `<div class="swim-wrap">${items
      .map((lane) => {
        const steps = Array.isArray(lane.steps) ? lane.steps.join(' → ') : String(lane.steps || '');
        return `<div class="swim-row">
          <div class="swim-role">${escapeHtml(lane.lane || lane.role || '角色')}</div>
          <div class="swim-steps">${escapeHtml(steps)}</div>
        </div>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'table') {
    const table = items && !Array.isArray(items) ? items : { headers: [], rows: [] };
    const headers = table.headers || [];
    const bodyRows = table.rows || [];
    if (!headers.length) return '<p class="section-intro">（暂无）</p>';
    return `<table class="data-table"><thead><tr>${headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join('')}</tr></thead><tbody>${bodyRows
      .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  }

  if (kind === 'text') {
    return items.map((t) => `<p class="section-intro">${escapeHtml(String(t))}</p>`).join('');
  }

  if (kind === 'banner') {
    const b = items[0];
    if (typeof b === 'object') {
      return `<div class="blueprint-banner"><h3>${escapeHtml(b.title || b.text || '')}</h3><p>${escapeHtml(b.body || b.note || '')}</p></div>`;
    }
    return `<div class="blueprint-banner"><p>${escapeHtml(String(b))}</p></div>`;
  }

  if (kind === 'list' || section.id === 'open') {
    return `<ol class="open-list">${items.map((t) => `<li>${escapeHtml(String(t))}</li>`).join('')}</ol>`;
  }

  return renderListItems(items.map(String));
}

function buildHeroMetrics(metrics) {
  if (!metrics?.length) return '';
  return `<div class="hero-metrics">${metrics
    .slice(0, 4)
    .map(
      (m) => `<article class="metric">
        <span>${escapeHtml(m.tag || m.label || '要点')}</span>
        <strong>${escapeHtml(m.title || m.value || '')}</strong>
        <p>${escapeHtml(m.description || m.desc || m.body || '')}</p>
      </article>`,
    )
    .join('')}</div>`;
}

function buildScenarioHtml(data, meta) {
  const {
    meetingTopic,
    hero,
    heroLead,
    subtitle,
    readMinutes,
    heroMetrics = [],
    sections = [],
    meetingMinutes = {},
    closing,
  } = data;

  const openCount = (sections.find((s) => s.id === 'open')?.items || []).length;
  const draftBanner =
    openCount > 0
      ? `<div class="draft-banner" role="status">草案 · 含 <strong>${openCount}</strong> 条待确认（见「待确认」章节）</div>`
      : '';

  const navLinks = sections
    .map((s) => `<a href="#${escapeHtml(s.id)}">${escapeHtml(s.title || s.id)}</a>`)
    .join('');
  const navHtml = `<nav class="page-nav" aria-label="章节">${navLinks}<a href="#minutes">会议纪要</a></nav>`;

  const sectionHtml = sections
    .map((s, idx) => {
      const num = s.label || `${String(idx + 1).padStart(2, '0')} ${s.title || s.id}`;
      const h2 = s.heading || s.title || '';
      const intro = s.intro || s.lead || '';
      const banner =
        s.banner && typeof s.banner === 'object'
          ? `<div class="blueprint-banner"><h3>${escapeHtml(s.banner.title || '')}</h3><p>${escapeHtml(s.banner.body || '')}</p></div>`
          : '';
      return `<section class="section" id="${escapeHtml(s.id)}">
        <div class="section-head">
          <span class="section-label">${escapeHtml(num)}</span>
          <h2>${escapeHtml(h2)}</h2>
          ${intro ? `<p class="section-intro">${escapeHtml(intro)}</p>` : ''}
        </div>
        ${banner}
        ${renderSectionItems(s)}
      </section>`;
    })
    .join('\n');

  const summaryBlocks = meetingMinutes.summaryBlocks || [];
  let summaryHtml = '';
  if (summaryBlocks.length) {
    summaryHtml = summaryBlocks
      .map(
        (b) => `<div class="summary-block">
          ${b.title ? `<h4>${escapeHtml(b.title)}</h4>` : ''}
          ${(b.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        </div>`,
      )
      .join('');
  } else {
    summaryHtml = (meetingMinutes.summary || '')
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');
  }

  const todos = meetingMinutes.todos || [];
  const todosHtml =
    todos.length > 0
      ? `<table class="data-table"><thead><tr><th>待办事项</th><th>负责人</th><th>期限</th></tr></thead><tbody>${todos
          .map(
            (t) =>
              `<tr><td>${escapeHtml(t.task || '')}</td><td>${escapeHtml(t.owner || '—')}</td><td>${escapeHtml(t.due || '—')}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '<p class="section-intro">本次会议未明确待办事项。</p>';

  const closingHtml = closing
    ? `<footer class="closing"><span>总结</span><h2>${escapeHtml(closing.title || closing.text || '')}</h2><p>${escapeHtml(closing.body || '')}</p></footer>`
    : '';

  const lead = heroLead || subtitle || '';
  const readLabel = readMinutes ? ` · 约 ${readMinutes} 分钟阅读` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meetingTopic)} · 场景梳理</title>
  <style>${SCENARIO_V2_CSS}</style>
</head>
<body>
  <div class="page">
    <p class="meta-line">由会议记录工具自动生成 · ${escapeHtml(meta.generatedAt)} · 转写 ${escapeHtml(meta.durationLabel || '')}${escapeHtml(readLabel)}</p>

    <header class="hero">
      <div class="eyebrow">会议记录 · 场景梳理</div>
      <h1>${escapeHtml(meetingTopic)}</h1>
      ${lead ? `<p class="hero-lead">${escapeHtml(lead)}</p>` : ''}
      <div class="hero-quote">
        <span>一句话结论</span>
        <strong>${escapeHtml(hero || meetingTopic)}</strong>
      </div>
      ${buildHeroMetrics(heroMetrics)}
    </header>

    ${draftBanner}
    ${navHtml}
    ${sectionHtml}

    <section class="section section-minutes" id="minutes">
      <div class="section-head">
        <span class="section-label">会议纪要</span>
        <h2>会议总结与待办</h2>
        <p class="section-intro">基于转写原文归纳的讨论要点、结论与行动项。</p>
      </div>
      <div class="summary-block">
        <h4>会议总结</h4>
        ${summaryHtml || '<p class="section-intro">暂无摘要。</p>'}
      </div>
      <div class="summary-block">
        <h4>待办事项</h4>
        ${todosHtml}
      </div>
    </section>

    ${closingHtml}
  </div>
</body>
</html>`;
}

module.exports = {
  buildScenarioHtml,
  escapeHtml,
  renderSectionItems,
};
