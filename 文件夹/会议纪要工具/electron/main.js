const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  buildOutputPaths,
  buildTranscriptText,
  speakerLabel,
  formatTimestampMs,
} = require('./lib/paths');
const { convertToM4a, convertToWav16k, transcribeAudio, resolvePython } = require('./lib/transcribe');

let mainWindow = null;
let tray = null;
let sessionMeta = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 220,
    height: 88,
    minWidth: 220,
    minHeight: 88,
    maxWidth: 220,
    maxHeight: 88,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    title: '会议记录',
    backgroundColor: '#1a2332',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'floating.html'));

  if (isDev) {
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'trayTemplate.png');
  let icon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
  } else {
    icon = nativeImage.createFromNamedImage('NSMicrophoneTemplate', [-1, 0, 1]);
  }
  tray = new Tray(icon);
  tray.setToolTip('会议记录');
  const menu = Menu.buildFromTemplate([
    { label: '显示悬浮窗', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

ipcMain.handle('meeting:get-config', async () => {
  const config = loadConfig();
  return {
    saveBaseDir: config.saveBaseDir,
    pythonReady: fs.existsSync(resolvePython(config)),
  };
});

ipcMain.handle('meeting:begin-session', async (_evt, payload) => {
  const config = loadConfig();
  const startedAt = payload?.startedAt ? new Date(payload.startedAt) : new Date();
  const paths = buildOutputPaths(config, startedAt);
  sessionMeta = {
    startedAt,
    paths,
    durationMs: 0,
  };
  return { ok: true, baseName: paths.baseName, monthPath: paths.monthPath };
});

ipcMain.handle('meeting:save-and-transcribe', async (_evt, payload) => {
  if (!sessionMeta) {
    throw new Error('未找到录音会话，请重新开始');
  }
  const config = loadConfig();
  const { paths, startedAt } = sessionMeta;
  const durationMs = Number(payload?.durationMs) || 0;
  const buffer = Buffer.from(payload?.audioBase64 || '', 'base64');
  if (!buffer.length) {
    throw new Error('录音数据为空');
  }

  const tempWebm = paths.webmPath;
  fs.writeFileSync(tempWebm, buffer);

  try {
    await convertToM4a(tempWebm, paths.m4aPath);
    await convertToWav16k(tempWebm, paths.wavPath);

    const result = await transcribeAudio(paths.wavPath, config);
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

    if (fs.existsSync(tempWebm)) fs.unlinkSync(tempWebm);
    if (fs.existsSync(paths.wavPath)) fs.unlinkSync(paths.wavPath);

    const outputDir = paths.monthPath;
    sessionMeta = null;

    return {
      ok: true,
      txtPath: paths.txtPath,
      m4aPath: paths.m4aPath,
      outputDir,
      lineCount: lines.length,
    };
  } catch (err) {
    if (fs.existsSync(tempWebm)) {
      try {
        fs.unlinkSync(tempWebm);
      } catch (_) {
        /* ignore */
      }
    }
    if (fs.existsSync(paths.wavPath)) {
      try {
        fs.unlinkSync(paths.wavPath);
      } catch (_) {
        /* ignore */
      }
    }
    sessionMeta = null;
    return {
      ok: false,
      error: err.message || String(err),
      partialDir: paths.monthPath,
      m4aPath: fs.existsSync(paths.m4aPath) ? paths.m4aPath : null,
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

ipcMain.handle('meeting:cancel-session', async () => {
  if (sessionMeta?.paths) {
    const { webmPath, wavPath, m4aPath, txtPath } = sessionMeta.paths;
    [webmPath, wavPath, m4aPath, txtPath].forEach((p) => {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_) {
          /* ignore */
        }
      }
    });
  }
  sessionMeta = null;
  return { ok: true };
});

ipcMain.on('meeting:window-drag', (_evt, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

process.on('uncaughtException', (err) => {
  console.error(err);
  dialog.showErrorBox('会议记录', err.message || String(err));
});
