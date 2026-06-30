#!/usr/bin/env node
/** 从已有 .m4a 重新转写并生成场景梳理（含文件夹重命名） */

const fs = require('fs');
const path = require('path');
const { loadConfig, buildTranscriptText, speakerLabel, formatTimestampMs } = require('../electron/lib/paths');
const { convertToWav, transcribeAudio } = require('../electron/lib/transcribe');
const { generateScenarioFromTranscript } = require('../electron/lib/scenario-framing');
const { isLlmConfigured } = require('../electron/lib/llm');

function parseTranscriptMeta(text) {
  const startedMatch = text.match(/会议开始：(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  const durationMatch = text.match(/时长：(\d{2}):(\d{2}):(\d{2})/);
  const startedAt = startedMatch ? new Date(startedMatch[1].replace(' ', 'T')) : new Date();
  let durationMs = 0;
  if (durationMatch) {
    durationMs =
      (Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])) * 1000;
  }
  return { startedAt, durationMs };
}

async function retranscribeOne(m4aPath, config) {
  const sessionDir = path.dirname(m4aPath);
  const baseName = path.basename(m4aPath, '.m4a');
  const txtPath = path.join(sessionDir, `${baseName}.txt`);

  console.log(`\n>>> 转写 ${baseName}`);
  const tempWav = path.join(sessionDir, `.retranscribe-${Date.now()}.wav`);
  try {
    await convertToWav(m4aPath, tempWav);
    const result = await transcribeAudio(tempWav, config, (p) => {
      if (p?.message) console.log('   ', p.message);
    });
    const lines = (result.sentences || []).map((s) => ({
      time: formatTimestampMs(s.start_ms || 0),
      speaker: speakerLabel(s.spk),
      text: (s.text || '').trim(),
    }));
    const speakers = new Set(lines.map((l) => l.speaker));
    let startedAt = new Date();
    let durationMs = 0;
    if (fs.existsSync(txtPath)) {
      const meta = parseTranscriptMeta(fs.readFileSync(txtPath, 'utf8'));
      startedAt = meta.startedAt;
      durationMs = meta.durationMs;
    }
    if (!durationMs && result.duration_ms) durationMs = result.duration_ms;

    const transcript = buildTranscriptText({
      startedAt,
      durationMs,
      lines,
      speakerCount: speakers.size,
    });
    fs.writeFileSync(txtPath, transcript, 'utf8');
    console.log(`   转写完成: ${lines.length} 行 → ${txtPath}`);

    if (config.scenarioFraming?.enabled !== false && isLlmConfigured(config)) {
      console.log('>>> 生成场景梳理…');
      const scenario = await generateScenarioFromTranscript(config, {
        transcript,
        paths: { sessionDir, baseName, txtPath, m4aPath },
        startedAt,
        durationMs,
        onProgress: (p) => p?.message && console.log('   ', p.message),
        htmlOnly: false,
      });
      console.log(`✅ ${scenario.meetingTopic}`);
      console.log(`   HTML: ${scenario.htmlPath}`);
      console.log(`   目录: ${scenario.sessionDir}`);
    }
  } finally {
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
  }
}

async function main() {
  const targets = process.argv.slice(2).filter((a) => a.endsWith('.m4a'));
  if (!targets.length) {
    console.error('用法: npm run retranscribe:m4a -- "/path/a.m4a" "/path/b.m4a"');
    process.exit(2);
  }

  const config = loadConfig();
  if (!isLlmConfigured(config)) {
    console.error('❌ 未配置 LLM（config.json → llm.apiKey）');
    process.exit(1);
  }

  for (const m4a of targets) {
    const resolved = path.resolve(m4a);
    if (!fs.existsSync(resolved)) {
      console.error('❌ 文件不存在:', resolved);
      continue;
    }
    await retranscribeOne(resolved, config);
  }
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
