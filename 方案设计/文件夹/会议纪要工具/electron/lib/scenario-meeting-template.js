const fs = require('fs');
const path = require('path');

const SCENARIO_MEETING_CSS = fs.readFileSync(path.join(__dirname, 'scenario-meeting.css'), 'utf8');

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
      title: item.title || item.label || item.strong || '',
      body: item.body || item.desc || item.text || item.content || '',
    };
  }
  const raw = String(item || '');
  const sep = raw.includes('：') ? '：' : raw.includes(':') ? ':' : '';
  if (sep) {
    const idx = raw.indexOf(sep);
    return { title: raw.slice(0, idx).trim(), body: raw.slice(idx + 1).trim() };
  }
  return { title: `要点 ${index + 1}`, body: raw };
}

function renderBullets(items) {
  if (!items?.length) return '';
  return `<ul class="bullets">${items.map((t) => `<li>${escapeHtml(String(t))}</li>`).join('')}</ul>`;
}

function renderBlock(block, sectionId, blockIdx) {
  const kind = block.kind || block.type;
  const items = block.items || [];

  if (kind === 'lead' || kind === 'text') {
    const text = block.text || block.body || items[0];
    return `<p class="lead">${escapeHtml(String(text || ''))}</p>`;
  }

  if (kind === 'note') {
    return `<p class="note">${escapeHtml(block.text || block.body || String(items[0] || ''))}</p>`;
  }

  if (kind === 'cards') {
    return `<div class="cards">${items
      .map((it, i) => {
        const c = parseCardItem(it, i);
        return `<div class="card"><strong>${escapeHtml(c.title)}</strong>${escapeHtml(c.body)}</div>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'pills') {
    return `<div class="pill-row">${items
      .map((p) => {
        const text = typeof p === 'object' ? p.text || p.label : String(p);
        const variant = typeof p === 'object' ? p.variant || 'default' : 'default';
        return `<span class="pill ${escapeHtml(variant)}">${escapeHtml(text)}</span>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'swimlane') {
    return `<div class="swimlane">${items
      .map(
        (lane) => `<div class="lane">
          <div class="role">${escapeHtml(lane.lane || lane.role || '角色')}</div>
          <div class="steps">${escapeHtml(
            Array.isArray(lane.steps) ? lane.steps.join(' → ') : String(lane.steps || lane.body || ''),
          )}</div>
        </div>`,
      )
      .join('')}</div>`;
  }

  if (kind === 'win' || kind === 'state') {
    const cls = ['a', 'b'];
    return `<div class="win-grid">${items
      .map(
        (w, i) =>
          `<div class="win ${cls[i] || 'a'}"><h5>${escapeHtml(w.title || w.subtitle || `状态 ${i + 1}`)}</h5>${escapeHtml(w.body || w.subtitle || '')}${w.items?.length ? renderBullets(w.items) : ''}</div>`,
      )
      .join('')}</div>`;
  }

  if (kind === 'pipe') {
    return `<div class="pipe">${items
      .map((n, i) => {
        const label = typeof n === 'object' ? n.label || n.title : String(n);
        const note = typeof n === 'object' ? n.note || n.subtitle : '';
        const variant = typeof n === 'object' ? n.variant || '' : '';
        const node = `<div class="n ${escapeHtml(variant)}">${escapeHtml(label)}${note ? `<br><small>${escapeHtml(note)}</small>` : ''}</div>`;
        const arr = i < items.length - 1 ? '<span class="arr">+</span>' : '';
        return node + arr;
      })
      .join('')}</div>`;
  }

  if (kind === 'table') {
    const table = block.table || (items && !Array.isArray(items) ? items : null);
    const headers = table?.headers || block.headers || [];
    const rows = table?.rows || block.rows || (Array.isArray(items) ? items : []);
    if (!headers.length) return '';
    const body = rows
      .map((row) => {
        const cells = row.cells || row;
        const rowClass = row.class || row.rowClass || '';
        return `<tr class="${escapeHtml(rowClass)}">${cells.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`;
      })
      .join('');
    return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  }

  if (kind === 'tabs') {
    const tabId = `${sectionId || 'sec'}-tabs-${blockIdx}`;
    const btns = items
      .map(
        (t, i) =>
          `<button type="button" class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${tabId}-${i}">${escapeHtml(t.label || t.title || `Tab ${i + 1}`)}</button>`,
      )
      .join('');
    const panels = items
      .map((t, i) => {
        const title = t.title || t.lead || '';
        const bullets = t.bullets || t.items || [];
        return `<div class="tab-panel${i === 0 ? ' active' : ''}" id="${tabId}-${i}">
          ${title ? `<p class="lead">${escapeHtml(title)}</p>` : ''}
          ${renderBullets(bullets)}
        </div>`;
      })
      .join('');
    return `<div class="tabs-wrap" data-tabs="${tabId}"><div class="tabs" role="tablist">${btns}</div>${panels}</div>`;
  }

  if (kind === 'moments') {
    return `<div class="moments">${items
      .map((m) => {
        const tag = m.tag ? `<span class="tag tag-${escapeHtml(m.tagVariant || 'good')}">${escapeHtml(m.tag)}</span>` : '';
        return `<div class="moment"><div class="mh"><span class="t">${escapeHtml(m.time || m.title || '')}</span>${tag}</div><div class="mb">${escapeHtml(m.body || m.text || '')}</div></div>`;
      })
      .join('')}</div>`;
  }

  if (kind === 'list') {
    return `<ol class="open-list">${items.map((t) => `<li>${escapeHtml(String(t))}</li>`).join('')}</ol>`;
  }

  return renderBullets(items.map(String));
}

function renderSectionBody(section) {
  if (section.lead) {
    // legacy single lead at section level
  }

  if (Array.isArray(section.blocks) && section.blocks.length) {
    const parts = [];
    if (section.lead || section.intro) {
      parts.push(`<p class="lead">${escapeHtml(section.lead || section.intro)}</p>`);
    }
    section.blocks.forEach((b, i) => parts.push(renderBlock(b, section.id, i)));
    return parts.join('\n');
  }

  const kind = section.kind || 'cards';
  const intro = section.lead || section.intro;
  const introHtml = intro ? `<p class="lead">${escapeHtml(intro)}</p>` : '';
  return introHtml + renderBlock({ kind, items: section.items, ...section }, section.id, 0);
}

function sectionHeaderLabel(section, idx) {
  if (section.header) return section.header;
  const num = section.num || idx + 1;
  const title = section.title || section.id || '章节';
  return `${num} · ${title}`;
}

function buildScenarioHtml(data, meta) {
  const {
    meetingTopic,
    hero,
    heroHint,
    subtitle,
    readMinutes,
    sections = [],
    meetingMinutes = {},
  } = data;

  const openSec = sections.find((s) => s.id === 'open');
  const openCount = openSec?.items?.length || openSec?.blocks?.[0]?.items?.length || 0;
  const draftBanner =
    openCount > 0
      ? `<div class="draft-banner" role="status">草案 · 含 ${openCount} 条待确认</div>`
      : '';

  const navLinks = sections
    .map((s) => `<a href="#${escapeHtml(s.id)}">${escapeHtml(s.navTitle || s.title || s.id)}</a>`)
    .join('');

  const sectionHtml = sections
    .map((s, idx) => {
      return `<section id="${escapeHtml(s.id)}">
      <header>${escapeHtml(sectionHeaderLabel(s, idx))}</header>
      <div class="bd">${renderSectionBody(s)}</div>
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
  } else if (meetingMinutes.summary) {
    summaryHtml = String(meetingMinutes.summary)
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');
  }

  const todos = meetingMinutes.todos || [];
  const todosHtml =
    todos.length > 0
      ? `<table><thead><tr><th>待办</th><th>负责人</th><th>期限</th></tr></thead><tbody>${todos
          .map(
            (t) =>
              `<tr><td>${escapeHtml(t.task || '')}</td><td>${escapeHtml(t.owner || '—')}</td><td>${escapeHtml(t.due || '—')}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '<p class="note">本次会议未明确待办。</p>';

  const readLabel = readMinutes ? ` · 约 ${readMinutes} 分钟阅读` : '';
  const subLine = subtitle || meta.meetingDate || '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meetingTopic)} · 场景梳理</title>
  <style>${SCENARIO_MEETING_CSS}</style>
</head>
<body>
  <div class="page">
    <p class="meta-line">由会议记录工具自动生成 · ${escapeHtml(meta.generatedAt || '')}${meta.durationLabel ? ` · 转写 ${escapeHtml(meta.durationLabel)}` : ''}${escapeHtml(readLabel)}</p>

    ${draftBanner}
    <h1>${escapeHtml(meetingTopic)} · 场景梳理</h1>
    ${subLine ? `<p class="sub">${escapeHtml(subLine)}</p>` : ''}

    <div class="hero">
      <p><strong>一句话：</strong>${escapeHtml(hero || meetingTopic)}</p>
      ${heroHint ? `<p class="hint">${escapeHtml(heroHint)}</p>` : ''}
    </div>

    <nav class="nav" aria-label="章节">${navLinks}</nav>
    ${sectionHtml}

    <section id="minutes">
      <header>会议纪要</header>
      <div class="bd">
        <div class="summary-block"><h4>讨论要点</h4>${summaryHtml || '<p class="note">暂无。</p>'}</div>
        <div class="summary-block"><h4>待办事项</h4>${todosHtml}</div>
      </div>
    </section>
  </div>
  <script>
    document.querySelectorAll('.tabs-wrap').forEach(function(wrap) {
      wrap.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-tab');
          wrap.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
          wrap.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
          btn.classList.add('active');
          var panel = document.getElementById(id);
          if (panel) panel.classList.add('active');
        });
      });
    });
  </script>
</body>
</html>`;
}

module.exports = {
  buildScenarioHtml,
  escapeHtml,
  renderBlock,
  renderSectionBody,
};
