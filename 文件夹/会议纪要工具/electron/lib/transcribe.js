const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const ffmpegPath = require('ffmpeg-static');
const { ROOT } = require('./paths');

/** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
let serviceProcess = null;
let serviceReady = false;
/** @type {Promise<void> | null} */
let serviceBootPromise = null;
/** @type {Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>} */
const pendingJobs = new Map();
let stdoutBuffer = '';

function resolvePython(config) {
  if (config.pythonPath && fs.existsSync(config.pythonPath)) {
    return config.pythonPath;
  }
  const venvPy = path.join(ROOT, 'scripts', '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPy)) return venvPy;
  return 'python3';
}

function isAppleSiliconMac() {
  if (process.platform !== 'darwin') return false;
  try {
    const flag = execSync('sysctl -n hw.optional.arm64 2>/dev/null', { encoding: 'utf8' }).trim();
    return flag === '1';
  } catch (_) {
    return false;
  }
}

/** Rosetta 下 uname -m 可能为 x86_64，须用硬件标志判断 Apple Silicon */
function buildPythonSpawn(config, scriptArgs = []) {
  const wrapper = path.join(ROOT, 'scripts', 'run-python.sh');
  if (fs.existsSync(wrapper)) {
    return { command: '/bin/bash', args: [wrapper, ...scriptArgs] };
  }
  const python = resolvePython(config);
  if (isAppleSiliconMac()) {
    return { command: 'arch', args: ['-arm64', python, ...scriptArgs] };
  }
  return { command: python, args: scriptArgs };
}

function buildPythonEnv(config, extra = {}) {
  const venvBin = path.join(ROOT, 'scripts', '.venv', 'bin');
  const ffmpegDir = ffmpegPath && fs.existsSync(ffmpegPath) ? path.dirname(ffmpegPath) : '';
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const basePath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
  const prefixes = [venvBin, ffmpegDir].filter((p) => p && fs.existsSync(p));
  const pathValue = prefixes.length ? `${prefixes.join(pathSep)}${pathSep}${basePath}` : basePath;
  return {
    ...process.env,
    PATH: pathValue,
    FUNASR_MODEL: config?.transcribeModel || process.env.FUNASR_MODEL || 'paraformer-zh',
    PYTHONUNBUFFERED: '1',
    TQDM_DISABLE: '1',
    ...extra,
  };
}

function spawnPython(config, scriptArgs, options = {}) {
  const { command, args } = buildPythonSpawn(config, scriptArgs);
  return spawn(command, args, options);
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      ...options,
      env: { ...process.env, ...(options.env || {}) },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `命令退出码 ${code}`));
    });
  });
}

function forwardStderr(d) {
  try {
    if (process.stderr.writable) process.stderr.write(d);
  } catch (err) {
    if (err && err.code !== 'EPIPE') {
      console.warn('[meeting-recorder] stderr forward failed:', err.message);
    }
  }
}

function emitProgressFromStderr(text, onProgress) {
  if (!onProgress || !text) return;
  const progressMatch = text.match(/PROGRESS:(\w+)/);
  if (progressMatch) {
    const phase = progressMatch[1];
    if (phase === 'prepare') onProgress({ phase: 'prepare', message: '准备转写…' });
    else if (phase === 'load') onProgress({ phase: 'load', message: '加载模型…' });
    else if (phase === 'transcribe') onProgress({ phase: 'transcribe', message: '转写中…' });
    return;
  }
  const dl = text.match(/Downloading \[([^\]]+)\]:\s*(\d+)%/);
  if (dl) {
    const percent = parseInt(dl[2], 10);
    onProgress({
      phase: 'download',
      percent,
      message: `首次下载模型 ${percent}%（约 1GB，请耐心等待）`,
    });
  }
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function sanitizeTranscribeError(stderr, stdout = '') {
  const blob = stripAnsi(`${stderr}\n${stdout}`);
  if (!blob.trim()) return '';

  if (/No such file or directory.*['"]ffmpeg['"]/i.test(blob) || /FileNotFoundError.*ffmpeg/i.test(blob)) {
    return '转写引擎找不到 ffmpeg，请完全退出后重新打开应用';
  }
  if (/Format not recognised/i.test(blob) || /LibsndfileError/i.test(blob)) {
    return '音频格式无法识别，请重试录音';
  }

  const lines = blob.split('\n').map((s) => s.trim()).filter(Boolean);
  const jsonLine = [...lines].reverse().find((s) => s.startsWith('{"ok": false'));
  if (jsonLine) {
    try {
      const parsed = JSON.parse(jsonLine);
      if (parsed.error) return parsed.error;
    } catch (_) {
      /* ignore */
    }
  }

  const errLine = [...lines].reverse().find(
    (l) =>
      /^(FileNotFoundError|LibsndfileError|RuntimeError|ImportError|ModuleNotFoundError):/.test(l) ||
      /^Error:/.test(l),
  );
  if (errLine) {
    return errLine.replace(/^(?:\w+Error:\s*)/, '').slice(0, 160);
  }

  const interesting = lines.filter(
    (l) =>
      !l.startsWith('File ') &&
      !l.startsWith('Traceback') &&
      !l.startsWith('  ') &&
      !/^WARNING:/.test(l) &&
      !/^DEBUG:/.test(l) &&
      !/^\d+%\|/.test(l) &&
      !/\?it\/s\]/.test(l) &&
      !/^PROGRESS:/.test(l) &&
      l.length < 200,
  );
  const last = interesting[interesting.length - 1] || '';
  if (/^\d+%\|/.test(last) || last.includes('[0m')) return '转写失败，请查看日志或重试';
  return last || '转写失败，请重试';
}

function buildTempSessionDir(tempRoot) {
  const sessionId = randomUUID();
  const dir = path.join(tempRoot, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return {
    dir,
    webmPath: path.join(dir, 'capture.webm'),
  };
}

function removeDirSafe(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function handleServiceLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch (_) {
    return;
  }
  if (msg.type === 'ready') {
    serviceReady = msg.ok === true;
    return;
  }
  if (msg.type !== 'result' || !msg.id) return;
  const job = pendingJobs.get(msg.id);
  if (!job) return;
  clearTimeout(job.timer);
  pendingJobs.delete(msg.id);
  if (msg.ok === false) job.reject(new Error(msg.error || '转写失败'));
  else job.resolve(msg);
}

function onServiceStdout(chunk) {
  stdoutBuffer += chunk.toString();
  const parts = stdoutBuffer.split('\n');
  stdoutBuffer = parts.pop() || '';
  parts.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed) handleServiceLine(trimmed);
  });
}

function ensureTranscribeService(config) {
  if (serviceProcess && serviceReady) return Promise.resolve();
  if (serviceBootPromise) return serviceBootPromise;

  serviceBootPromise = new Promise((resolve, reject) => {
    const script = path.join(ROOT, 'scripts', 'transcribe_service.py');
    serviceProcess = spawnPython(config, [script], {
      cwd: path.join(ROOT, 'scripts'),
      env: buildPythonEnv(config),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const bootTimer = setTimeout(() => {
      reject(new Error('转写服务启动超时（模型加载中，请稍后重试）'));
    }, 10 * 60 * 1000);

    let bootBuffer = '';
    serviceProcess.stdout.on('data', (d) => {
      bootBuffer += d.toString();
      const lines = bootBuffer.split('\n');
      bootBuffer = lines.pop() || '';
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (!serviceReady) {
          try {
            const msg = JSON.parse(trimmed);
            if (msg.type === 'ready') {
              clearTimeout(bootTimer);
              if (msg.ok) {
                serviceReady = true;
                resolve();
              } else {
                reject(new Error(msg.error || '转写服务启动失败'));
              }
            }
          } catch (_) {
            /* ignore non-json during boot */
          }
          return;
        }
        handleServiceLine(trimmed);
      });
    });

    serviceProcess.stderr.on('data', (d) => {
      try {
        if (process.stderr.writable) process.stderr.write(d);
      } catch (err) {
        if (err && err.code !== 'EPIPE') {
          console.warn('[meeting-recorder] stderr forward failed:', err.message);
        }
      }
    });

    serviceProcess.stdin.on('error', (err) => {
      if (err && err.code !== 'EPIPE') {
        console.warn('[meeting-recorder] transcribe stdin error:', err.message);
      }
      resetTranscribeService();
    });

    serviceProcess.on('exit', () => {
      resetTranscribeService();
    });

    serviceProcess.on('error', (err) => {
      clearTimeout(bootTimer);
      reject(err);
    });
  });

  return serviceBootPromise;
}

function warmTranscribeService(config) {
  // 后台尝试预热；失败不影响转写（结束录音时走单次模式）
  setTimeout(() => {
    ensureTranscribeService(config).catch((err) => {
      console.warn('[meeting-recorder] 转写服务预热失败（将使用单次转写）:', err.message);
      resetTranscribeService();
    });
  }, 5000);
}

function resetTranscribeService() {
  serviceProcess = null;
  serviceReady = false;
  serviceBootPromise = null;
  pendingJobs.forEach(({ reject: rej, timer }) => {
    clearTimeout(timer);
    rej(new Error('转写服务已退出'));
  });
  pendingJobs.clear();
}

function stopTranscribeService() {
  if (!serviceProcess) return;
  try {
    serviceProcess.stdin?.end();
  } catch (_) {
    /* ignore */
  }
  serviceProcess.kill();
  resetTranscribeService();
}

function writeServiceJob(payload) {
  return new Promise((resolve, reject) => {
    if (!serviceProcess?.stdin?.writable) {
      reject(new Error('转写服务不可用'));
      return;
    }
    const line = `${JSON.stringify(payload)}\n`;
    const ok = serviceProcess.stdin.write(line, (err) => {
      if (err && err.code !== 'EPIPE') reject(err);
    });
    if (ok) resolve();
    else serviceProcess.stdin.once('drain', resolve);
    serviceProcess.stdin.once('error', (err) => {
      if (err && err.code !== 'EPIPE') reject(err);
      else reject(new Error('转写服务连接已断开'));
    });
  });
}

async function transcribeViaService(audioPath, config) {
  await ensureTranscribeService(config);
  if (!serviceProcess || !serviceReady) {
    throw new Error('转写服务不可用');
  }

  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingJobs.delete(id);
      reject(new Error('转写超时，请稍后重试'));
    }, 3 * 60 * 60 * 1000);

    pendingJobs.set(id, { resolve, reject, timer });
    writeServiceJob({ id, audio: audioPath }).catch(reject);
  });
}

async function transcribeOnce(audioPath, config, onProgress) {
  const script = path.join(ROOT, 'scripts', 'transcribe.py');
  const { command, args } = buildPythonSpawn(config, [script, audioPath]);

  return new Promise((resolve, reject) => {
    if (onProgress) onProgress({ phase: 'prepare', message: '准备转写…' });

    const child = spawn(command, args, {
      cwd: path.join(ROOT, 'scripts'),
      env: buildPythonEnv(config),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
      forwardStderr(d);
      emitProgressFromStderr(chunk, onProgress);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(sanitizeTranscribeError(stderr, stdout) || `转写出错 (${code})`));
        return;
      }
      const lines = stdout
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const line = [...lines].reverse().find((s) => s.startsWith('{')) || lines[lines.length - 1];
      if (!line) {
        reject(new Error(`转写脚本无输出${stderr ? `：${sanitizeTranscribeError(stderr)}` : ''}`));
        return;
      }
      try {
        const parsed = JSON.parse(line);
        if (parsed.ok === false) reject(new Error(parsed.error || '转写失败'));
        else resolve(parsed);
      } catch (err) {
        reject(new Error(`转写结果解析失败：${err.message}`));
      }
    });
  });
}

async function convertToM4a(inputPath, outputPath) {
  if (!ffmpegPath) throw new Error('未找到 ffmpeg，无法生成 m4a');
  await runCommand(ffmpegPath, ['-y', '-i', inputPath, '-c:a', 'aac', '-b:a', '128k', outputPath], {
    env: buildPythonEnv({}),
  });
}

/** FunASR 对 16kHz mono wav 兼容性最好 */
async function convertToWav(inputPath, outputPath) {
  if (!ffmpegPath) throw new Error('未找到 ffmpeg，无法转换音频');
  await runCommand(
    ffmpegPath,
    ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', outputPath],
    { env: buildPythonEnv({}) },
  );
}

async function transcribeAudio(audioPath, config, onProgress) {
  // 仅当常驻服务已就绪时使用；否则直接单次转写，避免首次下载模型时无限等待
  if (serviceProcess && serviceReady) {
    try {
      if (onProgress) onProgress({ phase: 'transcribe', message: '转写中…' });
      return await transcribeViaService(audioPath, config);
    } catch (err) {
      console.warn('[meeting-recorder] 常驻转写失败，回退单次模式:', err.message);
      resetTranscribeService();
    }
  }
  return transcribeOnce(audioPath, config, onProgress);
}

module.exports = {
  resolvePython,
  convertToM4a,
  convertToWav,
  transcribeAudio,
  warmTranscribeService,
  stopTranscribeService,
  buildTempSessionDir,
  removeDirSafe,
  runCommand,
};
