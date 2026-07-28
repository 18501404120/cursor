const fs = require('fs');
const path = require('path');
const { chatCompletion, extractJson } = require('./llm');
const { formatDateParts, sanitizeFilename, resolveUniqueSessionDir } = require('./paths');
const { buildScenarioHtml } = require('./scenario-meeting-template');

const FACT_EXTRACTION_PROMPT = `你是 ERP/管报领域会议记录分析助手。从转写原文中提取**全部可核实事实**，输出 JSON（不要 markdown）。

{
  "meetingTopic": "4～20字中文主题",
  "heroHint": "示例店铺/SKU/月份等验证样本一句（转写有则写，无则空）",
  "numbers": [{ "label": "指标名", "value": "数值含单位", "context": "语境" }],
  "systemsAndReports": ["Settlement", "促销报告", ...],
  "promotionTypes": [{ "type": "Coupon/Promotion/Deal", "scenarios": "", "inPromotionReport": "是/否/待验证", "rule": "识别或取数规则" }],
  "dataSources": [{ "name": "", "fields": [], "granularity": "", "pros": [], "cons": [], "sampleNote": "" }],
  "painPoints": [{ "title": "", "body": "" }],
  "currentProcess": [{ "role": "", "steps": "" }],
  "targetVsCurrent": { "current": "", "target": "" },
  "businessValue": [{ "title": "", "body": "" }],
  "rules": ["口径/分摊/定稿规则"],
  "skuSplitOptions": [{ "path": "", "method": "", "pros": "", "cons": "" }],
  "timeMechanism": [{ "phase": "", "tag": "", "body": "" }],
  "roles": [{ "role": "", "duty": "", "deliverable": "" }],
  "decisions": ["已拍板结论"],
  "openQuestions": ["待确认问题，可直接向业务提问"],
  "todos": [{ "task": "", "owner": "", "due": "" }]
}

要求：
1. **尽量穷尽**转写中的数字、报告名、字段名、口径、案例（如 70.7万、item-price-discount、Govee_US）
2. 转写含糊处标注在 openQuestions，不要编造未出现的数字
3. 去掉说话人姓名，职责用「销售/运营」「数据/研发」「财务」「产品」等角色
4. openQuestions 至少 5 条（长会议 8+ 条）`;

const SCENARIO_PROMPT = `你是 ERP 产品「场景梳理」助手。根据【事实清单】和【转写原文】，输出用于渲染 HTML 场景梳理页的 JSON。

视觉与信息密度对标：「亚马逊促销费用拆分-场景梳理.html」（非项目规划页）——短句卡片、泳道、对比窗、标签 pill、规则表、Tab 数据源对比、管道图、时间轴 moment、待确认列表。

【顶层字段 — 必须 JSON 根级】
- meetingTopic, hero（一句话 ≤120字）, heroHint（可选）, subtitle（如「全渠道管报 · 亚马逊 · 2026-06-16 会议对齐」）
- readMinutes：8～15
- meetingTopic **禁止**仅为「会议」「会议梳理」，须为 4～24 字的具体业务主题
- sections：至少 8 章，按会议内容选配 id（不可全空 items/blocks）
- meetingMinutes：{ summaryBlocks: [{title, paragraphs[]}], todos[] }

【sections 结构】
{ id, num, title, navTitle, header?, lead?, blocks[] }
优先用 blocks 组合多组件；每章 blocks 至少 1 个且内容充实。

blocks 的 kind：
- cards：4～6 项 { title, body } — 用于背景/痛点/价值
- swimlane：{ role/lane, steps }[]
- win：2 项 { title, body } — 现状 vs 目标
- pills：{ text, variant: coupon|promo|deal|ship|default }[]
- table：{ headers[], rows: [{ cells[], class?: ok|highlight|gap }] }
- tabs：{ label, title, bullets[] }[] — 多数据源对比
- pipe：{ label, note?, variant?: brand|good|deal|warn }[]
- moments：{ time, tag?, tagVariant?: good|warn, body }[]
- list：字符串[] — 待确认用「待您确认：…？」
- note：{ kind:"note", text }

【推荐章节 id（按信息量取舍，长会议尽量 9～11 章）】
bg · pain · asis · value · types · data · sku · time · roles · open

写作要求：
1. **禁止**空 blocks；禁止「暂无」；禁止项目规划式的 scheme-grid
2. 从事实清单和转写提取**具体数字、报告名、字段名**（如 70.7万、63万、Shipping Credit、RRP 倒算）
3. types 章：pills + 识别规则 table（含 row class）
4. data 章：tabs 对比各数据源优缺点与样本差异
5. sku 章：对比表 + pipe 串联
6. time 章：moments 三条（按天更新 / 数据变动 / 定稿替换）
7. open 章：list 至少 6 条，每条以「待您确认：」开头
8. 只输出纯 JSON`;

const NESTED_SCENARIO_KEYS = ['场景梳理页', 'scenarioOverview', 'scenarioFraming', 'scenario', '场景梳理'];

function normalizeAnalysisData(raw) {
  const data = { ...(raw || {}) };

  for (const key of NESTED_SCENARIO_KEYS) {
    const nested = data[key];
    if (!nested || typeof nested !== 'object') continue;
    Object.assign(data, nested);
    delete data[key];
  }

  if (!data.meetingTopic) {
    data.meetingTopic = data.topic || data.title || '会议梳理';
  }
  data.meetingTopic = sanitizeFilename(data.meetingTopic) || '会议梳理';
  if (!data.hero) data.hero = data.meetingTopic;
  if (!Array.isArray(data.sections)) data.sections = [];
  if (!data.meetingMinutes) data.meetingMinutes = { summary: '', todos: [] };

  data.sections.forEach((sec, idx) => {
    if (!sec.id) sec.id = `sec-${idx + 1}`;
    if (!sec.title) sec.title = sec.heading || sec.id;
    if (!sec.navTitle) sec.navTitle = sec.title;
    if (!sec.num) sec.num = idx + 1;
    if (sec.intro && !sec.lead) sec.lead = sec.intro;

    // legacy kind/items → blocks
    if ((!sec.blocks || !sec.blocks.length) && sec.items?.length) {
      sec.blocks = [{ kind: sec.kind || 'cards', items: sec.items }];
    }

    if (sec.id === 'open' && sec.blocks?.length) {
      sec.blocks.forEach((b) => {
        if (b.kind === 'list' && Array.isArray(b.items)) {
          b.items = b.items.map((item) => {
            const s = String(item);
            if (s.startsWith('待您确认') || s.startsWith('待确认')) return s;
            return `待您确认：${s.replace(/^[？?]+/, '').replace(/[？?]$/, '')}？`;
          });
        }
      });
    }
  });

  return data;
}

function blockHasContent(b) {
  if (!b) return false;
  if (b.kind === 'note') return Boolean(b.text);
  if (b.kind === 'table') {
    const rows = b.table?.rows || b.rows || b.items;
    return Boolean(rows?.length);
  }
  if (b.kind === 'swimlane' || b.kind === 'tabs' || b.kind === 'cards' || b.kind === 'pills') {
    return Boolean(b.items?.length);
  }
  return Boolean(b.items?.length || b.text);
}

function sectionNeedsRepair(sec) {
  if (!sec.blocks?.length) return true;
  const coreKinds = ['cards', 'swimlane', 'tabs', 'table', 'pipe', 'moments', 'pills', 'win', 'list'];
  const core = sec.blocks.filter((b) => coreKinds.includes(b.kind));
  if (!core.length) return true;
  return core.some((b) => !blockHasContent(b));
}

/** 用第 1 步事实清单补全仍为空的关键章节 */
function enrichFromFacts(data, facts) {
  if (!facts || typeof facts !== 'object') return data;

  const findSec = (id) => data.sections.find((s) => s.id === id);

  const asis = findSec('asis');
  if (asis && facts.currentProcess?.length) {
    const swimOk = asis.blocks?.some((b) => b.kind === 'swimlane' && b.items?.length);
    if (!swimOk) {
      const noteBlock = asis.blocks?.find((b) => b.kind === 'note' && b.text);
      asis.blocks = [
        {
          kind: 'swimlane',
          items: facts.currentProcess.map((p) => ({
            role: p.role || p.lane,
            steps: p.steps || p.body || '',
          })),
        },
      ];
      if (facts.targetVsCurrent?.current || facts.targetVsCurrent?.target) {
        asis.blocks.push({
          kind: 'win',
          items: [
            { title: '现状：财报视角', body: facts.targetVsCurrent.current || '' },
            { title: '目标：管报视角', body: facts.targetVsCurrent.target || '' },
          ],
        });
      }
      if (noteBlock) asis.blocks.push(noteBlock);
    }
  }

  const dataSec = findSec('data');
  if (dataSec && facts.dataSources?.length) {
    const tabsOk = dataSec.blocks?.some((b) => b.kind === 'tabs' && b.items?.length);
    if (!tabsOk) {
      dataSec.blocks = [
        {
          kind: 'tabs',
          items: facts.dataSources.map((ds, i) => ({
            label: ds.name || `数据源 ${i + 1}`,
            title: ds.name || '',
            bullets: [
              ...(ds.fields?.length ? [`字段：${ds.fields.join('、')}`] : []),
              ds.granularity ? `粒度：${ds.granularity}` : '',
              ...(ds.pros || []).map((p) => `优点：${p}`),
              ...(ds.cons || []).map((c) => `局限：${c}`),
              ds.sampleNote ? `样本：${ds.sampleNote}` : '',
            ].filter(Boolean),
          })),
        },
      ];
    }
  }

  const types = findSec('types');
  if (types && facts.promotionTypes?.length && sectionNeedsRepair(types)) {
    types.blocks = [
      {
        kind: 'pills',
        items: facts.promotionTypes.map((p) => ({
          text: p.type,
          variant: String(p.type || '').toLowerCase().includes('deal')
            ? 'deal'
            : String(p.type || '').toLowerCase().includes('coupon')
              ? 'coupon'
              : String(p.type || '').toLowerCase().includes('ship')
                ? 'ship'
                : 'promo',
        })),
      },
      {
        kind: 'table',
        headers: ['类型', '典型场景', '是否在促销报告', '识别/取数'],
        rows: facts.promotionTypes.map((p) => ({
          cells: [p.type, p.scenarios || '—', p.inPromotionReport || '—', p.rule || '—'],
          class: String(p.inPromotionReport || '').includes('否') ? 'gap' : 'ok',
        })),
      },
    ];
  }

  const open = findSec('open');
  if (open && sectionNeedsRepair(open) && facts.openQuestions?.length) {
    open.blocks = [{ kind: 'list', items: facts.openQuestions }];
  }

  if (!(data.meetingMinutes?.todos || []).length && facts.todos?.length) {
    data.meetingMinutes.todos = facts.todos;
  }

  return data;
}

function topicFromFolderName(name) {
  return String(name || '')
    .replace(/^\d{2}-\d{2}-\d{2}\s*/, '')
    .replace(/\.txt$/i, '')
    .trim();
}

/** 录音结束时的默认占位名（如「会议」「会议-2」），不能覆盖 LLM 主题 */
function isGenericTopicName(name) {
  const t = topicFromFolderName(name).replace(/\s+/g, '');
  if (!t) return true;
  if (t === '会议梳理') return true;
  return /^会议(-\d+)?$/.test(t);
}

function applyTopicHint(data, topicHint) {
  if (isGenericTopicName(topicHint)) return data;
  const fromFolder = topicFromFolderName(topicHint);
  if (!fromFolder || isGenericTopicName(fromFolder)) return data;
  const safe = sanitizeFilename(fromFolder);
  if (!safe) return data;
  const current = data.meetingTopic || '';
  if (isGenericTopicName(current)) {
    data.meetingTopic = safe;
    return data;
  }
  const overlap =
    fromFolder.includes(current.slice(0, 4)) || current.includes(fromFolder.slice(0, 4));
  if (!current || current === '会议梳理' || !overlap) {
    data.meetingTopic = safe;
  }
  return data;
}

/** LLM 主题仍为占位时，从事实清单或 hero 提炼可用文件夹名 */
function refineMeetingTopic(data, facts) {
  if (!isGenericTopicName(data.meetingTopic)) return data;

  const factTopic = facts?.meetingTopic;
  if (factTopic && !isGenericTopicName(factTopic)) {
    data.meetingTopic = sanitizeFilename(factTopic) || data.meetingTopic;
    if (!isGenericTopicName(data.meetingTopic)) return data;
  }

  const hero = String(data.hero || '').trim();
  if (hero.length >= 8) {
    const clause = hero.split(/[，,。；;]/)[0].trim();
    if (clause.length >= 4 && clause.length <= 40) {
      data.meetingTopic = sanitizeFilename(clause) || data.meetingTopic;
    }
  }

  if (isGenericTopicName(data.meetingTopic)) {
    const bg = (data.sections || []).find((s) => s.id === 'bg');
    const lead = bg?.lead || bg?.intro || '';
    if (lead.length >= 6) {
      data.meetingTopic = sanitizeFilename(lead.split(/[，,。；;]/)[0].slice(0, 36)) || data.meetingTopic;
    }
  }

  return data;
}

function buildAnalysisMessages(transcript, facts, topicHint) {
  const trimmed = String(transcript || '').slice(0, 90000);
  const factsJson = JSON.stringify(facts || {}, null, 0).slice(0, 25000);
  const hint = topicFromFolderName(topicHint);
  return [
    { role: 'system', content: SCENARIO_PROMPT },
    {
      role: 'user',
      content: `${hint ? `【文件夹主题提示】${hint}\n\n` : ''}【事实清单】\n${factsJson}\n\n【转写原文】\n${trimmed}`,
    },
  ];
}

function buildFactMessages(transcript) {
  return [
    { role: 'system', content: FACT_EXTRACTION_PROMPT },
    { role: 'user', content: `请提取事实清单 JSON：\n\n${String(transcript || '').slice(0, 100000)}` },
  ];
}

function countOpenItems(sections) {
  const open = (sections || []).find((s) => s.id === 'open');
  if (!open) return 0;
  const listBlock = open.blocks?.find((b) => b.kind === 'list');
  if (listBlock?.items?.length) return listBlock.items.length;
  return open.items?.length || 0;
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
    const oldHtml = path.join(newSessionDir, `${oldBaseName}.html`);
    const newHtml = path.join(newSessionDir, `${newBaseName}.html`);
    if (fs.existsSync(oldHtml) && oldHtml !== newHtml) {
      if (fs.existsSync(newHtml)) {
        fs.unlinkSync(oldHtml);
      } else {
        fs.renameSync(oldHtml, newHtml);
      }
    }
  }

  return {
    sessionDir: newSessionDir,
    baseName: newBaseName,
    txtPath: newTxtPath,
    m4aPath: newM4aPath,
  };
}

async function extractFacts(config, transcript) {
  const content = await chatCompletion(config, buildFactMessages(transcript), { temperature: 0.2 });
  return extractJson(content);
}

async function analyzeTranscript(config, transcript, onProgress, topicHint) {
  if (onProgress) onProgress({ phase: 'scenario', message: '第 1 步：提取会议要点与数字…' });
  let facts = {};
  try {
    facts = await extractFacts(config, transcript);
  } catch (err) {
    console.warn('[meeting-recorder] 事实提取失败，将仅用转写生成:', err.message);
  }

  if (onProgress) onProgress({ phase: 'scenario', message: '第 2 步：生成场景梳理结构…' });
  const messages = buildAnalysisMessages(transcript, facts, topicHint);
  let content = await chatCompletion(config, messages, { temperature: 0.35 });
  let data;
  try {
    data = normalizeAnalysisData(extractJson(content));
  } catch (parseErr) {
    console.warn('[meeting-recorder] 场景 JSON 解析失败，请求模型重输出:', parseErr.message);
    content = await chatCompletion(config, [
      ...messages,
      { role: 'assistant', content },
      {
        role: 'user',
        content:
          `上一份输出不是合法 JSON（${parseErr.message}）。请只输出一份严格合法的 JSON 对象，不要 markdown，不要注释，字符串内引号必须转义。`,
      },
    ], { temperature: 0.2 });
    data = normalizeAnalysisData(extractJson(content));
  }

  const emptySections = data.sections.filter(sectionNeedsRepair);
  if (!data.sections.length || emptySections.length) {
    console.warn('[meeting-recorder] 存在空章节，请求补全…', emptySections.map((s) => s.id));
    content = await chatCompletion(config, [
      ...messages,
      { role: 'assistant', content },
      {
        role: 'user',
        content: `以下章节 blocks 为空或内容不足：${emptySections.map((s) => s.id).join(', ') || '全部'}。
请重新输出**完整** JSON。要求：
- sections 至少 8 章，每章 blocks 非空且信息充实
- types 章含 pills+table；data 章含 tabs；sku 章含 table+pipe；time 章含 moments
- open 至少 6 条「待您确认：…？」
- 写入转写中的具体数字与报告字段名`,
      },
    ]);
    data = normalizeAnalysisData(extractJson(content));
  }

  data = enrichFromFacts(data, facts);

  const stillEmpty = data.sections.filter(sectionNeedsRepair);
  if (stillEmpty.length) {
    console.warn('[meeting-recorder] 补全后仍空章节:', stillEmpty.map((s) => s.id));
  }

  if (facts.meetingTopic && (!data.meetingTopic || data.meetingTopic === '会议梳理')) {
    data.meetingTopic = sanitizeFilename(facts.meetingTopic) || data.meetingTopic;
  }
  if (facts.heroHint && !data.heroHint) data.heroHint = facts.heroHint;
  if (facts.todos?.length && !(data.meetingMinutes?.todos || []).length) {
    data.meetingMinutes.todos = facts.todos;
  }

  applyTopicHint(data, topicHint);
  refineMeetingTopic(data, facts);

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

  const topicHint = options.topicHint || paths?.baseName || path.basename(paths?.sessionDir || '');
  const analysis = await analyzeTranscript(config, transcript, onProgress, topicHint);
  if (onProgress) onProgress({ phase: 'scenario', message: '渲染场景梳理页…' });

  const meetingDate = startedAt ? formatDateParts(startedAt).datePrefix : '';
  const html = buildScenarioHtml(analysis, {
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    durationLabel: durationMs ? `${Math.round(durationMs / 60000)} 分钟` : '',
    meetingDate,
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
    fs.writeFileSync(htmlPath, html, 'utf8');
  } else {
    const renamed = computeRenamedPaths(
      path.dirname(paths.sessionDir),
      paths.sessionDir,
      paths.baseName,
      analysis.meetingTopic,
      startedAt,
    );
    htmlPath = path.join(paths.sessionDir, `${renamed.newBaseName}.html`);
    filePaths = renameSessionFiles(renamed);
    htmlPath = path.join(filePaths.sessionDir, `${filePaths.baseName}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  return {
    skipped: false,
    meetingTopic: analysis.meetingTopic,
    htmlPath,
    ...filePaths,
    openCount: countOpenItems(analysis.sections),
    todoCount: (analysis.meetingMinutes?.todos || []).length,
    sectionCount: analysis.sections.length,
  };
}

module.exports = {
  analyzeTranscript,
  buildScenarioHtml,
  generateScenarioFromTranscript,
  computeRenamedPaths,
  renameSessionFiles,
  normalizeAnalysisData,
  extractFacts,
};
