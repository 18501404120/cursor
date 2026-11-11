#!/usr/bin/env node
/** 从已有转写 .txt 补生成场景梳理 HTML，并按会议主题重命名文件夹 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../electron/lib/paths');
const { generateScenarioFromTranscript } = require('../electron/lib/scenario-framing');
const { isLlmConfigured } = require('../electron/lib/llm');

function parseTranscriptMeta(text) {
  const startedMatch = text.match(/会议开始：(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  const durationMatch = text.match(/时长：(\d{2}):(\d{2}):(\d{2})/);
  const startedAt = startedMatch ? new Date(startedMatch[1].replace(' ', 'T')) : new Date();
  let durationMs = 0;
  if (durationMatch) {
    const h = Number(durationMatch[1]);
    const m = Number(durationMatch[2]);
    const s = Number(durationMatch[3]);
    durationMs = (h * 3600 + m * 60 + s) * 1000;
  }
  return { startedAt, durationMs };
}

async function main() {
  const htmlOnly = process.argv.includes('--html-only') && !process.argv.includes('--rename');
  const txtPath = path.resolve(process.argv.find((a) => a.endsWith('.txt')) || '');
  if (!txtPath || !fs.existsSync(txtPath)) {
    console.error('用法: npm run scenario:from-txt -- "/path/to/26-06-16 会议.txt"');
    console.error('      npm run scenario:from-txt -- --html-only "/path/..."   # 仅更新 HTML，不改文件夹名');
    console.error('      npm run scenario:from-txt -- --rename "/path/..."     # 重新生成并按主题重命名');
    process.exit(2);
  }

  const config = loadConfig();
  if (!isLlmConfigured(config)) {
    console.error('❌ 未配置 LLM。请先执行: cp config.example.json config.json');
    console.error('   并在 config.json 中填写 llm.apiKey');
    process.exit(1);
  }

  const transcript = fs.readFileSync(txtPath, 'utf8');
  const sessionDir = path.dirname(txtPath);
  const baseName = path.basename(txtPath, '.txt');
  const { startedAt, durationMs } = parseTranscriptMeta(transcript);

  console.log('>>> 分析转写并生成场景梳理页…');
  const result = await generateScenarioFromTranscript(config, {
    transcript,
    paths: {
      sessionDir,
      baseName,
      txtPath,
      m4aPath: path.join(sessionDir, `${baseName}.m4a`),
    },
    startedAt,
    durationMs,
    onProgress: (p) => {
      if (p?.message) console.log('   ', p.message);
    },
    htmlOnly,
  });

  if (result.skipped) {
    console.error('跳过:', result.reason);
    process.exit(1);
  }

  console.log('');
  console.log('✅ HTML:', result.htmlPath);
  console.log('📁 目录:', result.sessionDir);
  console.log('🏷  主题:', result.meetingTopic);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
