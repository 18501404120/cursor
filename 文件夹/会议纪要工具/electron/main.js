const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } = require('electron');
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
const { convertToM4a, transcribeAudio, warmTranscribeService, stopTranscribeService, buildTempSessionDir, removeDirSafe, resolvePython } = require('./lib/transcribe');

let mainWindow = null;
let tray = null;
let sessionMeta = null;

const isDev = !app.isPackaged;
const APP_ICON_PATH = path.join(ROOT, 'assets', 'app-icon.png');

function loadAppIcon() {
  if (!fs.existsSync(APP_ICON_PATH)) return nativeImage.createEmpty();
  const img = nativeImage.createFromPath(APP_ICON_PATH);
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function applyAppBranding() {
  app.setName('会议记录');
  if (process.platform !== 'darwin') return;
  const icon = loadAppIcon();
  if (!icon.isEmpty()) {
    app.dock.setIcon(icon);
  }
}

function syncDockWithWindow() {
  if (process.platform !== 'darwin' || !app.dock) return;
  if (mainWindow?.isVisible()) app.dock.show();
  else app.dock.hide();
}

function showMainWindow() {
  if (!mainWindow) createWindow();
  else mainWindow.show();
  syncDockWithWindow();
}

function hideMainWindow() {
  mainWindow?.hide();
  syncDockWithWindow();
}

const WIN_W = 176;
const WIN_H = 44;

function createWindow() {
  const icon = loadAppIcon();
  mainWindow = new BrowserWindow({
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
    title: '会议记录',
    backgroundColor: '#00000000',
    icon: icon.isEmpty() ? undefined : icon,
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

  mainWindow.on('hide', syncDockWithWindow);
  mainWindow.on('show', syncDockWithWindow);
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
  const menu = Menu.buildFromTemplate([
    { label: '显示悬浮窗', click: () => showMainWindow() },
    { label: '隐藏悬浮窗', click: () => hideMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) {
      showMainWindow();
      return;
    }
    if (mainWindow.isVisible()) hideMainWindow();
    else showMainWindow();
  });
}

app.whenReady().then(() => {
  applyAppBranding();
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  createWindow();
  createTray();
  warmTranscribeService(loadConfig());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showMainWindow();
  });
});

app.on('before-quit', () => {
  stopTranscribeService();
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
  const tempRoot = path.join(app.getPath('temp'), 'meeting-recorder');
  const temp = buildTempSessionDir(tempRoot);
  sessionMeta = {
    startedAt,
    paths,
    temp,
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

  const tempWebm = sessionMeta.temp.webmPath;
  fs.writeFileSync(tempWebm, buffer);

  try {
    await convertToM4a(tempWebm, paths.m4aPath);
    const result = await transcribeAudio(paths.m4aPath, config);
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
    removeDirSafe(sessionMeta.temp.dir);

    const outputDir = paths.sessionDir;
    sessionMeta = null;

    return {
      ok: true,
      txtPath: paths.txtPath,
      m4aPath: paths.m4aPath,
      outputDir,
      sessionDir: paths.sessionDir,
      lineCount: lines.length,
    };
  } catch (err) {
    removeDirSafe(sessionMeta.temp?.dir);
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
    sessionMeta = null;
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

ipcMain.handle('meeting:cancel-session', async () => {
  if (sessionMeta) {
    removeDirSafe(sessionMeta.temp?.dir);
    const { sessionDir, m4aPath, txtPath } = sessionMeta.paths || {};
    [m4aPath, txtPath].forEach((p) => {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_) {
          /* ignore */
        }
      }
    });
    if (sessionDir && fs.existsSync(sessionDir)) {
      try {
        fs.rmdirSync(sessionDir);
      } catch (_) {
        /* ignore */
      }
    }
  }
  sessionMeta = null;
  return { ok: true };
});

ipcMain.handle('meeting:hide-window', async () => {
  hideMainWindow();
  return { ok: true };
});

ipcMain.on('meeting:window-drag', (_evt, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

process.on('uncaughtException', (err) => {
  if (err && (err.code === 'EPIPE' || /EPIPE/.test(String(err.message)))) {
    console.warn('[meeting-recorder] ignored EPIPE:', err.message);
    return;
  }
  console.error(err);
  dialog.showErrorBox('会议记录', err.message || String(err));
});
