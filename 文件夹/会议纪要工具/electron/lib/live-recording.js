const fs = require('fs');
const path = require('path');
const { formatDuration } = require('./paths');

const LIVE_WEBM = 'recording.webm';
const LIVE_META = 'session.json';

function liveWebmPath(sessionDir) {
  return path.join(sessionDir, LIVE_WEBM);
}

function liveMetaPath(sessionDir) {
  return path.join(sessionDir, LIVE_META);
}

function writeLiveMeta(sessionDir, data) {
  const file = liveMetaPath(sessionDir);
  const prev = readLiveMeta(sessionDir) || {};
  fs.writeFileSync(file, `${JSON.stringify({ ...prev, ...data, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

function readLiveMeta(sessionDir) {
  const file = liveMetaPath(sessionDir);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function openLiveFd(sessionDir) {
  fs.mkdirSync(sessionDir, { recursive: true });
  return fs.openSync(liveWebmPath(sessionDir), 'a');
}

function closeLiveFd(fd) {
  if (fd == null) return;
  try {
    fs.fsyncSync(fd);
  } catch (_) {
    /* ignore */
  }
  try {
    fs.closeSync(fd);
  } catch (_) {
    /* ignore */
  }
}

function appendLiveChunk(fd, buffer) {
  if (fd == null) throw new Error('录音文件未打开');
  if (!buffer || !buffer.length) return 0;
  fs.writeSync(fd, buffer);
  fs.fsyncSync(fd);
  return buffer.length;
}

function liveWebmSize(sessionDir) {
  const file = liveWebmPath(sessionDir);
  if (!fs.existsSync(file)) return 0;
  try {
    return fs.statSync(file).size;
  } catch (_) {
    return 0;
  }
}

function sessionHasTranscript(sessionDir, baseName) {
  const name = baseName || path.basename(sessionDir);
  return fs.existsSync(path.join(sessionDir, `${name}.txt`));
}

function sessionHasM4a(sessionDir, baseName) {
  const name = baseName || path.basename(sessionDir);
  return fs.existsSync(path.join(sessionDir, `${name}.m4a`));
}

function cleanupLiveArtifacts(sessionDir) {
  if (!sessionDir || !fs.existsSync(sessionDir)) return;
  for (const name of [LIVE_WEBM, LIVE_META]) {
    const file = path.join(sessionDir, name);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_) {
      /* ignore */
    }
  }
}

function estimateDurationMs(meta, sessionDir) {
  if (!meta) return 0;
  if (Number(meta.durationMs) > 0) return Number(meta.durationMs);
  const started = meta.startedAt ? Date.parse(meta.startedAt) : NaN;
  const last = meta.lastChunkAt ? Date.parse(meta.lastChunkAt) : NaN;
  if (!Number.isNaN(started) && !Number.isNaN(last) && last >= started) {
    return last - started;
  }
  const bytes = liveWebmSize(sessionDir);
  if (bytes > 0) {
    // opus/webm 约 8–16 KB/s，按 12 KB/s 估一个可读时长
    return Math.round((bytes / 12000) * 1000);
  }
  return 0;
}

function describeIncomplete(item) {
  const dur = formatDuration(item.durationMs || 0);
  const start = item.startedAt ? String(item.startedAt).replace('T', ' ').slice(0, 19) : '';
  const extra = start ? `，开始于 ${start}` : '';
  return `${item.baseName}（约 ${dur}${extra}）`;
}

function findIncompleteSessions(saveBaseDir, excludeDirs = []) {
  const results = [];
  if (!saveBaseDir || !fs.existsSync(saveBaseDir)) return results;
  const exclude = new Set((excludeDirs || []).map((d) => path.resolve(d)));

  let monthDirs = [];
  try {
    monthDirs = fs
      .readdirSync(saveBaseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(saveBaseDir, d.name));
  } catch (_) {
    return results;
  }

  for (const monthPath of monthDirs) {
    let sessions = [];
    try {
      sessions = fs
        .readdirSync(monthPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(monthPath, d.name));
    } catch (_) {
      continue;
    }

    for (const sessionDir of sessions) {
      if (exclude.has(path.resolve(sessionDir))) continue;
      const baseName = path.basename(sessionDir);
      if (sessionHasTranscript(sessionDir, baseName)) {
        cleanupLiveArtifacts(sessionDir);
        continue;
      }

      const meta = readLiveMeta(sessionDir);
      const webmBytes = liveWebmSize(sessionDir);
      const hasM4a = sessionHasM4a(sessionDir, baseName);
      if (webmBytes <= 0 && !hasM4a) continue;

      const startedAt = meta?.startedAt || null;
      results.push({
        sessionDir,
        baseName,
        monthPath,
        startedAt,
        mimeType: meta?.mimeType || 'audio/webm',
        durationMs: estimateDurationMs(meta, sessionDir),
        bytes: webmBytes,
        hasM4a,
        hasWebm: webmBytes > 0,
        status: meta?.status || (hasM4a ? 'transcribing' : 'interrupted'),
        txtPath: path.join(sessionDir, `${baseName}.txt`),
        m4aPath: path.join(sessionDir, `${baseName}.m4a`),
        webmPath: liveWebmPath(sessionDir),
      });
    }
  }

  results.sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
  return results;
}

module.exports = {
  LIVE_WEBM,
  LIVE_META,
  liveWebmPath,
  liveMetaPath,
  writeLiveMeta,
  readLiveMeta,
  openLiveFd,
  closeLiveFd,
  appendLiveChunk,
  liveWebmSize,
  cleanupLiveArtifacts,
  findIncompleteSessions,
  describeIncomplete,
  estimateDurationMs,
};
