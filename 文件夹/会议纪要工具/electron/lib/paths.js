const fs = require('fs');
const path = require('path');
const os = require('os');

// electron/lib → 项目根目录（会议纪要工具/）
const ROOT = path.join(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const EXAMPLE_PATH = path.join(ROOT, 'config.example.json');

const DEFAULT_CONFIG = {
  saveBaseDir: '~/Desktop/工作文件/会议记录',
  defaultTitleSuffix: '会议',
  pythonPath: '',
  transcribeModel: 'paraformer-zh',
};

function expandHome(p) {
  if (!p || typeof p !== 'string') return p;
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  if (p === '~') return os.homedir();
  return p;
}

function loadConfig() {
  let defaults = { ...DEFAULT_CONFIG };
  if (fs.existsSync(EXAMPLE_PATH)) {
    defaults = { ...defaults, ...JSON.parse(fs.readFileSync(EXAMPLE_PATH, 'utf8')) };
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...defaults, saveBaseDir: expandHome(defaults.saveBaseDir) };
  }
  const user = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const merged = { ...defaults, ...user };
  merged.saveBaseDir = expandHome(merged.saveBaseDir);
  return merged;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateParts(d = new Date()) {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return { yy, mm, dd, monthDir: `${yy}-${mm}`, datePrefix: `${yy}-${mm}-${dd}` };
}

function formatDateTime(d = new Date()) {
  const { datePrefix } = formatDateParts(d);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${d.getFullYear()}-${mmFrom(d)}-${pad2(d.getDate())} ${hh}:${mi}:${ss}`;
}

function mmFrom(d) {
  return pad2(d.getMonth() + 1);
}

function resolveUniqueBaseName(dir, baseName) {
  let candidate = baseName;
  let i = 2;
  while (
    fs.existsSync(path.join(dir, `${candidate}.txt`)) ||
    fs.existsSync(path.join(dir, `${candidate}.m4a`))
  ) {
    candidate = `${baseName}-${i}`;
    i += 1;
  }
  return candidate;
}

function buildOutputPaths(config, startedAt = new Date()) {
  const { monthDir, datePrefix } = formatDateParts(startedAt);
  const monthPath = path.join(config.saveBaseDir, monthDir);
  fs.mkdirSync(monthPath, { recursive: true });
  const suffix = config.defaultTitleSuffix || '会议';
  const baseName = resolveUniqueBaseName(monthPath, `${datePrefix} ${suffix}`);
  return {
    monthPath,
    baseName,
    txtPath: path.join(monthPath, `${baseName}.txt`),
    m4aPath: path.join(monthPath, `${baseName}.m4a`),
    webmPath: path.join(monthPath, `${baseName}.webm`),
    wavPath: path.join(monthPath, `${baseName}.wav`),
  };
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatTimestampMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function speakerLabel(spkIndex) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const idx = Number(spkIndex);
  if (Number.isNaN(idx) || idx < 0) return '说话人A';
  const letter = letters[idx] || String(idx + 1);
  return `说话人${letter}`;
}

function buildTranscriptText({ startedAt, durationMs, lines, speakerCount }) {
  const header = [
    '# 会议记录',
    `会议开始：${formatDateTime(startedAt)}`,
    `时长：${formatDuration(durationMs)}`,
    `说话人数：${speakerCount || '—'}`,
    '',
  ].join('\n');
  const body = (lines || [])
    .map((line) => `${line.time} [${line.speaker}] ${line.text}`)
    .join('\n');
  return `${header}${body}\n`;
}

module.exports = {
  ROOT,
  CONFIG_PATH,
  loadConfig,
  buildOutputPaths,
  buildTranscriptText,
  formatDuration,
  formatTimestampMs,
  speakerLabel,
  expandHome,
};
