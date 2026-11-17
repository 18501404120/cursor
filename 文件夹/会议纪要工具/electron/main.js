const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadConfig,
  buildOutputPaths,
  buildTranscriptText,
  speakerLabel,
  formatTimestampMs,
} = require('./lib/paths');
const {
  convertToM4a,
  convertToWav,
  transcribeAudio,
  warmTranscribeService,
  stopTranscribeService,
  buildTempSessionDir,
  removeDirSafe,
  resolvePython,
} = require('./lib/transcribe');
const { generateScenarioFromTranscript } = require('./lib/scenario-framing');
const { isLlmConfigured } = require('./lib/llm');
const {
  liveWebmPath,
  writeLiveMeta,
  openLiveFd,
  closeLiveFd,
  appendLiveChunk,
  liveWebmSize,
  cleanupLiveArtifacts,
  findIncompleteSessions,
  describeIncomplete,
} = require('./lib/live-recording');

const MAX_FLOATING_WINDOWS = 2;
const WIN_W = 148;
const WIN_H = 34;
const APP_ICON_PATH = path.join(ROOT, 'assets', 'app-icon.png');

/** @type {Map<number, { win: import('electron').BrowserWindow, slot: number }>} */
const floatingWindows = new Map();
/** @type {Map<number, object>} */
const sessionsByWindowId = new Map();
/** @type {import('electron').Tray | null} */
let tray = null;
/** 退出中：禁止关窗后自动重建悬浮窗，否则关机/⌘Q 会卡住需强制退出 */
let isQuitting = false;

/** 转写 + 场景梳理串行队列，避免和下一场录音抢模型 */
const transcribeQueue = [];
let transcribeQueueRunning = false;
let jobSeq = 0;
/** @type {Array<{ id: number, baseName: string, sessionDir: string, status: string, phaseLabel: string, error: string, note: string, noteDetail: string, openPath: string, tempDir: string|null, run: Function }>} */
const backgroundJobs = [];
let quitPromptOpen = false;

const isDev = !app.isPackaged;

function loadAppIcon() {
  if (!fs.existsSync(APP_ICON_PATH)) return nativeImage.createEmpty();
  const img = nativeImage.createFromPath(APP_ICON_PATH);
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function applyAppBranding() {
  app.setName('会议记录');
  if (process.platform !== 'darwin') return;
  const icon = loadAppIcon();
  if (!icon.isEmpty()) app.dock.setIcon(icon);
}

function syncDockWithWindow() {
  if (process.platform === 'darwin' && app.dock) app.dock.show();
}

function destroyAllFloatingWindows() {
  const wins = [...floatingWindows.values()].map(({ win }) => win);
  floatingWindows.clear();
  sessionsByWindowId.clear();
  for (const win of wins) {
    if (win && !win.isDestroyed()) {
      try {
        win.removeAllListeners('closed');
        win.destroy();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

function flushLiveSessionsOnQuit() {
  for (const session of sessionsByWindowId.values()) {
    closeLiveFd(session.liveFd);
    session.liveFd = null;
    if (session.paths?.sessionDir) {
      try {
        writeLiveMeta(session.paths.sessionDir, {
          status: 'interrupted',
          lastChunkAt: new Date().toISOString(),
        });
      } catch (_) {
        /* ignore */
      }
    }
  }
}

function forceQuitApp() {
  if (isQuitting) {
    app.exit(0);
    return;
  }
  isQuitting = true;
  flushLiveSessionsOnQuit();
  markPendingJobsInterrupted();
  try {
    globalShortcut.unregisterAll();
  } catch (_) {
    /* ignore */
  }
  stopTranscribeService({ force: true });
  if (tray) {
    try {
      tray.destroy();
    } catch (_) {
      /* ignore */
    }
    tray = null;
  }
  destroyAllFloatingWindows();
  // 立刻退出，避免转写子进程/托盘拖住关机流程
  app.exit(0);
}

function getWindowFromEvent(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function getWindowEntry(win) {
  if (!win) return null;
  return floatingWindows.get(win.id) || null;
}

function listFloatingWindows() {
  return [...floatingWindows.values()].map(({ win, slot }) => ({ id: win.id, slot }));
}

function canOpenAnotherWindow() {
  return floatingWindows.size < MAX_FLOATING_WINDOWS;
}

function pendingJobCount() {
  return backgroundJobs.filter((job) => job.status === 'queued' || job.status === 'running').length;
}

function activeSessionDirs() {
  const dirs = [];
  for (const session of sessionsByWindowId.values()) {
    if (session.paths?.sessionDir) dirs.push(session.paths.sessionDir);
  }
  for (const job of backgroundJobs) {
    if ((job.status === 'queued' || job.status === 'running') && job.sessionDir) {
      dirs.push(job.sessionDir);
    }
  }
  return dirs;
}

function jobPhaseLabel(payload) {
  if (!payload) return '';
  const { phase, percent } = payload;
  if (phase === 'download' && percent != null) return `下载模型 ${percent}%`;
  if (phase === 'convert') return '转码';
  if (phase === 'load') return '加载模型';
  if (phase === 'prepare') return '准备';
  if (phase === 'transcribe') return '转写';
  if (phase === 'scenario') return '场景梳理';
  return '';
}

function trimFinishedJobs() {
  const finished = backgroundJobs.filter((job) => job.status === 'done' || job.status === 'failed');
  const extra = finished.length - 8;
  if (extra <= 0) return;
  const drop = new Set(finished.slice(0, extra));
  for (let i = backgroundJobs.length - 1; i >= 0; i -= 1) {
    if (drop.has(backgroundJobs[i])) backgroundJobs.splice(i, 1);
  }
}

function jobsSnapshot() {
  const running = backgroundJobs.find((job) => job.status === 'running');
  const pendingCount = pendingJobCount();
  const detail = pendingCount
    ? `后台还有 ${pendingCount} 场${running?.phaseLabel ? ` · ${running.phaseLabel}` : ''}`
    : '';
  return { pendingCount, detail, runningName: running?.baseName || '' };
}

function broadcastJobs({ refreshMenu = true } = {}) {
  const payload = jobsSnapshot();
  for (const { win } of floatingWindows.values()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('meeting:jobs-updated', payload);
    }
  }
  if (tray) {
    tray.setToolTip(payload.pendingCount ? `会议记录 · 后台 ${payload.pendingCount} 场` : '会议记录');
  }
  if (refreshMenu) updateTrayMenu();
}

function markPendingJobsInterrupted() {
  for (const job of backgroundJobs) {
    if (job.status !== 'queued' && job.status !== 'running') continue;
    job.status = 'interrupted';
    if (!job.sessionDir) continue;
    try {
      writeLiveMeta(job.sessionDir, {
        status: 'interrupted',
        lastChunkAt: new Date().toISOString(),
      });
    } catch (_) {
      /* ignore */
    }
  }
}

function frontWindow() {
  for (const { win } of floatingWindows.values()) {
    if (win && !win.isDestroyed() && win.isVisible()) return win;
  }
  const first = [...floatingWindows.values()][0]?.win;
  return first && !first.isDestroyed() ? first : undefined;
}

async function requestQuit() {
  if (isQuitting || quitPromptOpen) return;
  const pending = pendingJobCount();
  if (pending > 0) {
    quitPromptOpen = true;
    try {
      const parent = frontWindow();
      const { response } = await dialog.showMessageBox(parent, {
        type: 'warning',
        title: '会议记录',
        message: `还有 ${pending} 场，退出会中断。`,
        buttons: ['继续退出', '取消'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      });
      if (response !== 0) return;
    } finally {
      quitPromptOpen = false;
    }
  }
  if (isQuitting) return;
  forceQuitApp();
}

function shortMenuLabel(text, max = 42) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function updateTrayMenu() {
  if (!tray) return;
  const items = [];
  floatingWindows.forEach(({ win, slot }) => {
    items.push({
      label: `显示悬浮窗 ${slot}${win.isVisible() ? ' ✓' : ''}`,
      click: () => {
        win.show();
        syncDockWithWindow();
      },
    });
  });
  if (canOpenAnotherWindow()) {
    items.push({
      label: '新建悬浮窗（录下一场会议）',
      click: () => openAnotherFloatingWindow(),
    });
  }

  const pending = backgroundJobs.filter((job) => job.status === 'queued' || job.status === 'running');
  if (pending.length) {
    items.push({ type: 'separator' });
    items.push({ label: `后台转写 ${pending.length} 场`, enabled: false });
    for (const job of pending) {
      const prefix = job.status === 'running' ? '进行中' : '排队';
      const extra = job.phaseLabel ? ` · ${job.phaseLabel}` : '';
      items.push({
        label: shortMenuLabel(`${prefix}：${job.baseName}${extra}`),
        enabled: false,
      });
    }
  }

  const finished = backgroundJobs
    .filter((job) => job.status === 'done' || job.status === 'failed')
    .slice(-6)
    .reverse();
  if (finished.length) {
    items.push({ type: 'separator' });
    for (const job of finished) {
      if (job.status === 'done') {
        const label = job.note ? `已完成：${job.baseName}（${job.note}）` : `已完成：${job.baseName}`;
        const submenu = [];
        if (job.noteDetail) submenu.push({ label: shortMenuLabel(job.noteDetail, 80), enabled: false });
        submenu.push({
          label: '在 Finder 中显示',
          enabled: Boolean(job.openPath),
          click: () => {
            if (job.openPath && fs.existsSync(job.openPath)) shell.showItemInFolder(job.openPath);
          },
        });
        items.push({ label: shortMenuLabel(label, 60), submenu });
      } else {
        items.push({
          label: shortMenuLabel(`转写失败：${job.baseName}`),
          submenu: [
            { label: shortMenuLabel(job.error || '转写失败', 80), enabled: false },
            {
              label: '在 Finder 中显示录音',
              enabled: Boolean(job.sessionDir),
              click: () => {
                const target = job.openPath && fs.existsSync(job.openPath) ? job.openPath : job.sessionDir;
                if (target && fs.existsSync(target)) shell.showItemInFolder(target);
              },
            },
          ],
        });
      }
    }
  }

  items.push({ type: 'separator' });
  items.push({
    label: '转写未完成的录音',
    click: () => {
      recoverIncompleteSessions(frontWindow());
    },
  });
  items.push({ type: 'separator' });
  items.push({ label: '退出应用 (⌘Q)', click: () => requestQuit() });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function openAnotherFloatingWindow() {
  if (!canOpenAnotherWindow()) {
    dialog.showMessageBox({
      type: 'info',
      title: '会议记录',
      message: `最多同时打开 ${MAX_FLOATING_WINDOWS} 个悬浮窗。`,
      buttons: ['好'],
    });
    return null;
  }
  const win = createFloatingWindow();
  if (win) {
    win.show();
    syncDockWithWindow();
  }
  return win;
}

function createFloatingWindow(options = {}) {
  if (!canOpenAnotherWindow() && floatingWindows.size >= MAX_FLOATING_WINDOWS) {
    return null;
  }

  const slot = floatingWindows.size + 1;
  const icon = loadAppIcon();
  const win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    minWidth: 112,
    minHeight: WIN_H,
    maxWidth: 260,
    maxHeight: WIN_H,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    title: slot === 1 ? '会议记录' : `会议记录 ${slot}`,
    backgroundColor: '#00000000',
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const baseX = options.x;
  const baseY = options.y;
  if (typeof baseX === 'number' && typeof baseY === 'number') {
    win.setPosition(baseX + (slot - 1) * 52, baseY + (slot - 1) * 52);
  } else if (slot > 1 && floatingWindows.size >= 1) {
    const first = [...floatingWindows.values()][0]?.win;
    if (first && !first.isDestroyed()) {
      const [x, y] = first.getPosition();
      win.setPosition(x + 52, y + 52);
    }
  }

  win.loadFile(path.join(__dirname, 'floating.html'));

  floatingWindows.set(win.id, { win, slot });

  win.on('closed', () => {
    const session = sessionsByWindowId.get(win.id);
    if (session) {
      closeLiveFd(session.liveFd);
      session.liveFd = null;
      if (session.paths?.sessionDir) {
        try {
          writeLiveMeta(session.paths.sessionDir, {
            status: 'interrupted',
            lastChunkAt: new Date().toISOString(),
          });
        } catch (_) {
          /* ignore */
        }
      }
    }
    floatingWindows.delete(win.id);
    sessionsByWindowId.delete(win.id);
    if (isQuitting) return;
    updateTrayMenu();
    // 仅在非退出态保持至少 1 个悬浮窗；退出/关机时绝不能重建，否则会卡死需强制退出
    if (floatingWindows.size === 0) {
      createFloatingWindow();
      updateTrayMenu();
    }
  });

  win.on('hide', syncDockWithWindow);
  win.on('show', () => {
    syncDockWithWindow();
    updateTrayMenu();
  });

  updateTrayMenu();
  return win;
}

function showPrimaryWindow() {
  const first = [...floatingWindows.values()][0]?.win;
  if (first && !first.isDestroyed()) {
    first.show();
  } else {
    createFloatingWindow();
  }
  syncDockWithWindow();
}

function enqueueTranscribeJob(task) {
  return new Promise((resolve, reject) => {
    transcribeQueue.push({ task, resolve, reject });
    pumpTranscribeQueue();
  });
}

async function pumpTranscribeQueue() {
  if (transcribeQueueRunning || !transcribeQueue.length) return;
  transcribeQueueRunning = true;
  const { task, resolve, reject } = transcribeQueue.shift();
  try {
    resolve(await task());
  } catch (err) {
    reject(err);
  } finally {
    transcribeQueueRunning = false;
    pumpTranscribeQueue();
  }
}

function noteForScenario(result) {
  if (result?.scenarioError) return { note: '场景梳理未生成', noteDetail: result.scenarioError };
  if (result?.scenarioSkipped) return { note: '未生成场景梳理', noteDetail: result.scenarioSkipped };
  return { note: '', noteDetail: '' };
}

function enqueueBackgroundJob(job) {
  backgroundJobs.push(job);
  broadcastJobs();
  enqueueTranscribeJob(async () => {
    if (job.status === 'interrupted') return null;
    job.status = 'running';
    job.phaseLabel = '开始处理';
    broadcastJobs();
    try {
      const result = await job.run(job);
      const scenarioNote = noteForScenario(result);
      job.status = 'done';
      job.phaseLabel = '';
      job.baseName = result?.baseName || job.baseName;
      job.sessionDir = result?.sessionDir || job.sessionDir;
      job.openPath = result?.htmlPath || result?.txtPath || result?.m4aPath || job.openPath;
      job.note = scenarioNote.note;
      job.noteDetail = scenarioNote.noteDetail;
      job.error = '';
      trimFinishedJobs();
      broadcastJobs();
      return result;
    } catch (err) {
      const message = err?.message || String(err);
      if (job.sessionDir) {
        try {
          writeLiveMeta(job.sessionDir, { status: 'interrupted' });
        } catch (_) {
          /* ignore */
        }
      }
      if (job.tempDir) removeDirSafe(job.tempDir);
      job.status = 'failed';
      job.phaseLabel = '';
      job.error = message;
      trimFinishedJobs();
      broadcastJobs();
      console.warn('[meeting-recorder] 后台转写失败:', message);
      return null;
    }
  }).catch((err) => {
    console.warn('[meeting-recorder] 后台队列异常:', err?.message || err);
  });
}

async function runTranscribePipeline({ paths, startedAt, durationMs, tempDir, config, sourceAudioPath, onProgress }) {
  const sendProgress = (payload) => {
    if (typeof onProgress === 'function') onProgress(payload);
  };

  const tempWav = path.join(tempDir, 'transcribe.wav');
  const source = sourceAudioPath || path.join(tempDir, 'capture.webm');
  await convertToWav(source, tempWav);
  const result = await transcribeAudio(tempWav, config, sendProgress);

  const lines = (result.sentences || []).map((s) => ({
    time: formatTimestampMs(s.start_ms || 0),
    speaker: speakerLabel(s.spk),
    text: (s.text || '').trim(),
  }));
  const speakers = new Set(lines.map((l) => l.speaker));
  const transcript = buildTranscriptText({
    startedAt,
    durationMs,
    lines,
    speakerCount: speakers.size,
  });
  fs.writeFileSync(paths.txtPath, transcript, 'utf8');
  removeDirSafe(tempDir);

  let finalPaths = {
    txtPath: paths.txtPath,
    m4aPath: paths.m4aPath,
    sessionDir: paths.sessionDir,
    baseName: paths.baseName,
  };
  let scenarioResult = null;
  let scenarioSkipped = null;

  if (config.scenarioFraming?.enabled !== false) {
    if (!isLlmConfigured(config)) {
      scenarioSkipped =
        '未配置 llm.apiKey。请复制 config.example.json 为 config.json 并填写 API Key，然后对已有 .txt 运行 npm run scenario:from-txt';
    } else {
      try {
        scenarioResult = await generateScenarioFromTranscript(config, {
          transcript,
          paths,
          startedAt,
          durationMs,
          onProgress: sendProgress,
        });
        if (scenarioResult && !scenarioResult.skipped) {
          finalPaths = {
            txtPath: scenarioResult.txtPath,
            m4aPath: scenarioResult.m4aPath,
            sessionDir: scenarioResult.sessionDir,
            baseName: scenarioResult.baseName,
          };
        }
      } catch (err) {
        console.warn('[meeting-recorder] 场景梳理生成失败:', err.message);
        scenarioResult = { ok: false, error: err.message || String(err) };
        if (!fs.existsSync(finalPaths.txtPath)) {
          const monthPath = path.dirname(paths.sessionDir);
          try {
            const dirs = fs
              .readdirSync(monthPath, { withFileTypes: true })
              .filter((d) => d.isDirectory())
              .map((d) => path.join(monthPath, d.name));
            const match = dirs.find((dir) => {
              const base = path.basename(dir);
              return fs.existsSync(path.join(dir, `${base}.txt`));
            });
            if (match) {
              const base = path.basename(match);
              finalPaths = {
                sessionDir: match,
                baseName: base,
                txtPath: path.join(match, `${base}.txt`),
                m4aPath: path.join(match, `${base}.m4a`),
              };
            }
          } catch (_) {
            /* ignore */
          }
        }
      }
    }
  }

  return {
    ok: true,
    txtPath: finalPaths.txtPath,
    m4aPath: finalPaths.m4aPath,
    outputDir: finalPaths.sessionDir,
    sessionDir: finalPaths.sessionDir,
    baseName: finalPaths.baseName,
    htmlPath: scenarioResult?.htmlPath || null,
    meetingTopic: scenarioResult?.meetingTopic || null,
    scenarioError: scenarioResult?.ok === false ? scenarioResult.error : null,
    scenarioSkipped,
    lineCount: lines.length,
  };
}

function cleanupLiveAfterSuccess(originalDir, finalDir) {
  cleanupLiveArtifacts(originalDir);
  if (finalDir && finalDir !== originalDir) cleanupLiveArtifacts(finalDir);
}

function enqueueRecoverItem(item, config) {
  const startedAt = item.startedAt ? new Date(item.startedAt) : new Date();
  const paths = {
    sessionDir: item.sessionDir,
    baseName: item.baseName,
    monthPath: item.monthPath,
    txtPath: item.txtPath,
    m4aPath: item.m4aPath,
  };
  const temp = buildTempSessionDir(path.join(app.getPath('temp'), 'meeting-recorder'));
  writeLiveMeta(item.sessionDir, { status: 'queued' });
  enqueueBackgroundJob({
    id: ++jobSeq,
    baseName: item.baseName,
    sessionDir: item.sessionDir,
    status: 'queued',
    phaseLabel: '',
    error: '',
    note: '',
    noteDetail: '',
    openPath: item.m4aPath,
    tempDir: temp.dir,
    run: async (job) => {
      const onProgress = (payload) => {
        const label = jobPhaseLabel(payload);
        if (!label || label === job.phaseLabel) return;
        job.phaseLabel = label;
        broadcastJobs();
      };
      if (!item.hasM4a) {
        if (!item.hasWebm) throw new Error('没有可恢复的录音文件');
        onProgress({ phase: 'convert' });
        await convertToM4a(item.webmPath, item.m4aPath);
      }
      writeLiveMeta(item.sessionDir, { status: 'transcribing' });
      const result = await runTranscribePipeline({
        paths,
        startedAt,
        durationMs: item.durationMs || 0,
        tempDir: temp.dir,
        config,
        sourceAudioPath: item.m4aPath,
        onProgress,
      });
      cleanupLiveAfterSuccess(item.sessionDir, result.sessionDir);
      return result;
    },
  });
}

async function recoverIncompleteSessions(win, { silentIfNone = false } = {}) {
  const config = loadConfig();
  const excludeDirs = activeSessionDirs();
  const items = findIncompleteSessions(config.saveBaseDir, excludeDirs);
  if (!items.length) {
    if (!silentIfNone && win && !win.isDestroyed()) {
      await dialog.showMessageBox(win, {
        type: 'info',
        title: '会议记录',
        message: '没有未完成的录音。',
        buttons: ['好'],
        defaultId: 0,
        noLink: true,
      });
    }
    return;
  }

  const list = items.map((it, i) => `${i + 1}. ${describeIncomplete(it)}`).join('\n');
  const { response } = await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
    type: 'question',
    title: '发现未完成的会议录音',
    message: `有 ${items.length} 场录音未正常结束（崩溃或未点结束）。\n\n${list}`,
    detail: '立即转写会在后台排队，悬浮窗可以马上录下一场。完成后从菜单栏打开结果。',
    buttons: ['立即转写', '稍后', '删除这些录音'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (response === 1) return;
  if (response === 2) {
    for (const item of items) {
      try {
        fs.rmSync(item.sessionDir, { recursive: true, force: true });
      } catch (err) {
        console.warn('[meeting-recorder] 删除未完成录音失败:', err.message);
      }
    }
    return;
  }

  for (const item of items) enqueueRecoverItem(item, config);
}

function createTray() {
  let icon = loadAppIcon();
  if (icon.isEmpty()) {
    icon = nativeImage.createFromNamedImage('NSMicrophoneTemplate', [-1, 0, 1]);
  } else {
    icon = icon.resize({ width: 22, height: 22 });
  }
  tray = new Tray(icon);
  tray.setToolTip('会议记录');
  updateTrayMenu();
  tray.on('click', () => {
    const visible = [...floatingWindows.values()].some(({ win }) => win.isVisible());
    if (visible) {
      floatingWindows.forEach(({ win }) => win.hide());
    } else {
      showPrimaryWindow();
    }
    syncDockWithWindow();
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (canOpenAnotherWindow()) openAnotherFloatingWindow();
    else showPrimaryWindow();
  });
}

app.whenReady().then(() => {
  applyAppBranding();
  if (process.platform === 'darwin') {
    app.dock.show();
    // Dock / 菜单栏「退出」走 before-quit；显式绑定到 forceQuit，避免关窗后重建导致挂起
    const appMenu = Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: '退出会议记录',
            accelerator: 'Command+Q',
            click: () => requestQuit(),
          },
        ],
      },
      { role: 'editMenu' },
      { role: 'windowMenu' },
    ]);
    Menu.setApplicationMenu(appMenu);
  }
  createFloatingWindow();
  createTray();
  warmTranscribeService(loadConfig());
  setTimeout(() => {
    const first = [...floatingWindows.values()][0]?.win;
    recoverIncompleteSessions(first, { silentIfNone: true }).catch((err) => {
      console.warn('[meeting-recorder] 启动恢复检查失败:', err.message);
    });
  }, 600);

  globalShortcut.register('CommandOrControl+Q', () => {
    requestQuit();
  });

  app.on('activate', () => {
    if (isQuitting) return;
    if (floatingWindows.size === 0) createFloatingWindow();
    else showPrimaryWindow();
  });
});

app.on('before-quit', (event) => {
  if (isQuitting) return;
  // 拦截默认退出，走统一清理（关窗不重建 + 强杀转写进程），再 exit
  event.preventDefault();
  requestQuit();
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {
    /* ignore */
  }
  stopTranscribeService({ force: true });
});

app.on('window-all-closed', () => {
  // macOS 托盘应用：非退出态保持进程；退出态由 forceQuitApp 处理
  if (isQuitting) return;
  if (process.platform !== 'darwin') {
    requestQuit();
  }
});

ipcMain.handle('meeting:get-config', async (event) => {
  const win = getWindowFromEvent(event);
  const entry = getWindowEntry(win);
  const config = loadConfig();
  return {
    saveBaseDir: config.saveBaseDir,
    pythonReady: fs.existsSync(resolvePython(config)),
    scenarioFramingEnabled: config.scenarioFraming?.enabled !== false,
    llmReady: isLlmConfigured(config),
    windowSlot: entry?.slot || 1,
    windowCount: floatingWindows.size,
    maxWindows: MAX_FLOATING_WINDOWS,
    canOpenSecondWindow: canOpenAnotherWindow(),
    ...jobsSnapshot(),
    queueLength: pendingJobCount(),
  };
});

ipcMain.handle('meeting:open-second-window', async () => {
  const win = openAnotherFloatingWindow();
  return { ok: Boolean(win), windowCount: floatingWindows.size };
});

ipcMain.handle('meeting:begin-session', async (event, payload) => {
  const win = getWindowFromEvent(event);
  if (sessionsByWindowId.has(win.id)) {
    throw new Error('当前窗口已有进行中的会议，请先结束或取消');
  }
  const config = loadConfig();
  const startedAt = payload?.startedAt ? new Date(payload.startedAt) : new Date();
  const paths = buildOutputPaths(config, startedAt);
  const tempRoot = path.join(app.getPath('temp'), 'meeting-recorder');
  const temp = buildTempSessionDir(tempRoot);
  const liveFd = openLiveFd(paths.sessionDir);
  writeLiveMeta(paths.sessionDir, {
    status: 'recording',
    startedAt: startedAt.toISOString(),
    mimeType: payload?.mimeType || 'audio/webm',
    bytes: 0,
    chunkCount: 0,
    pid: process.pid,
    baseName: paths.baseName,
  });
  sessionsByWindowId.set(win.id, {
    startedAt,
    paths,
    temp,
    durationMs: 0,
    liveFd,
    bytes: 0,
    chunkCount: 0,
    mimeType: payload?.mimeType || 'audio/webm',
  });
  return { ok: true, baseName: paths.baseName, monthPath: paths.monthPath };
});

ipcMain.handle('meeting:append-chunk', async (event, payload) => {
  const win = getWindowFromEvent(event);
  const session = sessionsByWindowId.get(win?.id);
  if (!session) return { ok: false, error: '未找到录音会话' };
  let buffer;
  if (payload?.audioBytes) buffer = Buffer.from(payload.audioBytes);
  else if (payload?.audioBase64) buffer = Buffer.from(payload.audioBase64, 'base64');
  else buffer = Buffer.alloc(0);
  if (!buffer.length) return { ok: true, bytes: session.bytes || 0 };
  try {
    const written = appendLiveChunk(session.liveFd, buffer);
    session.bytes = (session.bytes || 0) + written;
    session.chunkCount = (session.chunkCount || 0) + 1;
    session.lastChunkAt = new Date().toISOString();
    writeLiveMeta(session.paths.sessionDir, {
      status: 'recording',
      bytes: session.bytes,
      chunkCount: session.chunkCount,
      lastChunkAt: session.lastChunkAt,
    });
    return { ok: true, bytes: session.bytes };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('meeting:save-and-transcribe', async (event, payload) => {
  const win = getWindowFromEvent(event);
  const sessionMeta = sessionsByWindowId.get(win.id);
  if (!sessionMeta) {
    throw new Error('未找到录音会话，请重新开始');
  }

  const config = loadConfig();
  const { paths, startedAt, temp } = sessionMeta;
  const durationMs = Number(payload?.durationMs) || 0;
  closeLiveFd(sessionMeta.liveFd);
  sessionMeta.liveFd = null;

  const liveWebm = liveWebmPath(paths.sessionDir);
  if (payload?.audioBytes || payload?.audioBase64) {
    const fallback = payload.audioBytes
      ? Buffer.from(payload.audioBytes)
      : Buffer.from(payload.audioBase64, 'base64');
    if (fallback.length && liveWebmSize(paths.sessionDir) <= 0) {
      fs.writeFileSync(liveWebm, fallback);
    }
  }

  if (liveWebmSize(paths.sessionDir) <= 0) {
    writeLiveMeta(paths.sessionDir, { status: 'interrupted', durationMs });
    sessionsByWindowId.delete(win.id);
    throw new Error('录音数据为空');
  }

  writeLiveMeta(paths.sessionDir, {
    status: 'queued',
    durationMs,
    lastChunkAt: new Date().toISOString(),
  });
  sessionsByWindowId.delete(win.id);

  enqueueBackgroundJob({
    id: ++jobSeq,
    baseName: paths.baseName,
    sessionDir: paths.sessionDir,
    status: 'queued',
    phaseLabel: '',
    error: '',
    note: '',
    noteDetail: '',
    openPath: paths.m4aPath,
    tempDir: temp.dir,
    run: async (job) => {
      const onProgress = (payload) => {
        const label = jobPhaseLabel(payload);
        if (!label || label === job.phaseLabel) return;
        job.phaseLabel = label;
        broadcastJobs();
      };
      writeLiveMeta(paths.sessionDir, { status: 'transcribing', durationMs });
      if (!fs.existsSync(paths.m4aPath)) {
        onProgress({ phase: 'convert' });
        await convertToM4a(liveWebm, paths.m4aPath);
      }
      const result = await runTranscribePipeline({
        paths,
        startedAt,
        durationMs,
        tempDir: temp.dir,
        config,
        sourceAudioPath: paths.m4aPath,
        onProgress,
      });
      cleanupLiveAfterSuccess(paths.sessionDir, result.sessionDir);
      return result;
    },
  });

  return {
    ok: true,
    queued: true,
    baseName: paths.baseName,
    ...jobsSnapshot(),
  };
});

ipcMain.handle('meeting:open-path', async (_evt, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
    return { ok: true };
  }
  return { ok: false };
});

ipcMain.handle('meeting:cancel-session', async (event) => {
  const win = getWindowFromEvent(event);
  const sessionMeta = sessionsByWindowId.get(win.id);
  if (sessionMeta) {
    closeLiveFd(sessionMeta.liveFd);
    sessionMeta.liveFd = null;
    removeDirSafe(sessionMeta.temp?.dir);
    const { sessionDir } = sessionMeta.paths || {};
    if (sessionDir && fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err) {
        console.warn('[meeting-recorder] 取消会话时删除目录失败:', err.message);
      }
    }
    sessionsByWindowId.delete(win.id);
  }
  return { ok: true };
});

ipcMain.handle('meeting:quit-app', async () => {
  requestQuit();
  return { ok: true };
});

ipcMain.handle('meeting:notify-error', async (event, payload) => {
  const win = getWindowFromEvent(event);
  const title = payload?.title || '会议记录';
  let message = payload?.message || '操作失败';
  if (message.length > 160) message = `${message.slice(0, 160)}…`;
  await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
    type: 'error',
    title,
    message,
    buttons: ['好'],
    defaultId: 0,
    noLink: true,
  });
  return { ok: true };
});

ipcMain.handle('meeting:hide-window', async (event) => {
  const win = getWindowFromEvent(event);
  if (win && !win.isDestroyed()) win.hide();
  syncDockWithWindow();
  updateTrayMenu();
  return { ok: true };
});

ipcMain.on('meeting:window-drag', (event, { dx, dy }) => {
  const win = getWindowFromEvent(event);
  if (!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + dx, y + dy);
});

ipcMain.on('meeting:window-size', (event, { width, height }) => {
  const win = getWindowFromEvent(event);
  if (!win || win.isDestroyed()) return;
  const w = Math.round(Number(width));
  const h = Math.round(Number(height));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return;
  const nextW = Math.min(260, Math.max(112, w));
  const nextH = WIN_H;
  const [cw, ch] = win.getContentSize();
  if (cw === nextW && ch === nextH) return;
  win.setContentSize(nextW, nextH);
});

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EPIPE' || /EPIPE/.test(String(err.message)))) {
    console.warn('[meeting-recorder] ignored EPIPE:', err.message);
    return;
  }
  console.error('[meeting-recorder] uncaughtException:', err);
});
