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

const MAX_FLOATING_WINDOWS = 2;
const WIN_W = 176;
const WIN_H = 44;
const APP_ICON_PATH = path.join(ROOT, 'assets', 'app-icon.png');

/** @type {Map<number, { win: import('electron').BrowserWindow, slot: number }>} */
const floatingWindows = new Map();
/** @type {Map<number, object>} */
const sessionsByWindowId = new Map();
/** @type {import('electron').Tray | null} */
let tray = null;

/** 转写 + 场景梳理串行队列，避免双窗口同时跑模型 */
const transcribeQueue = [];
let transcribeQueueRunning = false;

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

function forceQuitApp() {
  stopTranscribeService();
  if (tray) {
    tray.destroy();
    tray = null;
  }
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
  items.push({ type: 'separator' });
  items.push({ label: '退出应用 (⌘Q)', click: () => forceQuitApp() });
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
    minWidth: WIN_W,
    minHeight: WIN_H,
    maxWidth: WIN_W,
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
    floatingWindows.delete(win.id);
    sessionsByWindowId.delete(win.id);
    updateTrayMenu();
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

async function runTranscribePipeline({ win, paths, startedAt, durationMs, tempDir, config }) {
  const sendProgress = (payload) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('meeting:transcribe-progress', payload);
    }
  };

  const tempWav = path.join(tempDir, 'transcribe.wav');
  await convertToWav(path.join(tempDir, 'capture.webm'), tempWav);
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

function createTray() {
  let icon = loadAppIcon();
  if (icon.isEmpty()) {
    icon = nativeImage.createFromNamedImage('NSMicrophoneTemplate', [-1, 0, 1]);
  } else {
    icon = icon.resize({ width: 22, height: 22 });
  }
  tray = new Tray(icon);
  tray.setToolTip('会议记录（最多 2 个悬浮窗）');
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
  if (process.platform === 'darwin') app.dock.show();
  createFloatingWindow();
  createTray();
  warmTranscribeService(loadConfig());

  globalShortcut.register('CommandOrControl+Q', () => {
    forceQuitApp();
  });

  app.on('activate', () => {
    if (floatingWindows.size === 0) createFloatingWindow();
    else showPrimaryWindow();
  });
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  stopTranscribeService();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
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
    queueLength: transcribeQueue.length + (transcribeQueueRunning ? 1 : 0),
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
  sessionsByWindowId.set(win.id, {
    startedAt,
    paths,
    temp,
    durationMs: 0,
  });
  return { ok: true, baseName: paths.baseName, monthPath: paths.monthPath };
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
  let buffer;
  if (payload?.audioBytes) {
    buffer = Buffer.from(payload.audioBytes);
  } else if (payload?.audioBase64) {
    buffer = Buffer.from(payload.audioBase64, 'base64');
  } else {
    buffer = Buffer.alloc(0);
  }
  if (!buffer.length) {
    throw new Error('录音数据为空');
  }

  const tempWebm = temp.webmPath;
  fs.writeFileSync(tempWebm, buffer);

  try {
    await convertToM4a(tempWebm, paths.m4aPath);
    sessionsByWindowId.delete(win.id);

    const pipelineMeta = {
      win,
      paths,
      startedAt,
      durationMs,
      tempDir: temp.dir,
      config,
    };

    return await enqueueTranscribeJob(() => runTranscribePipeline(pipelineMeta));
  } catch (err) {
    removeDirSafe(temp?.dir);
    if (fs.existsSync(paths.txtPath)) {
      try {
        fs.unlinkSync(paths.txtPath);
      } catch (_) {
        /* ignore */
      }
    }
    const hasM4a = fs.existsSync(paths.m4aPath);
    if (!hasM4a && paths.sessionDir && fs.existsSync(paths.sessionDir)) {
      try {
        fs.rmdirSync(paths.sessionDir);
      } catch (_) {
        /* ignore */
      }
    }
    sessionsByWindowId.delete(win.id);
    return {
      ok: false,
      error: err.message || String(err),
      partialDir: paths.sessionDir || paths.monthPath,
      m4aPath: hasM4a ? paths.m4aPath : null,
    };
  }
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
  forceQuitApp();
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

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EPIPE' || /EPIPE/.test(String(err.message)))) {
    console.warn('[meeting-recorder] ignored EPIPE:', err.message);
    return;
  }
  console.error('[meeting-recorder] uncaughtException:', err);
});
