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

/** 桌面/Electron 下 Python 可能误跑 x86_64，与 arm64 版 PyTorch 不兼容 */
function buildPythonSpawn(pythonPath, scriptArgs = []) {
  if (process.platform === 'darwin') {
    try {
      const machine = execSync('uname -m', { encoding: 'utf8' }).trim();
      if (machine === 'arm64') {
        return { command: 'arch', args: ['-arm64', pythonPath, ...scriptArgs] };
      }
    } catch (_) {
      /* fall through */
    }
  }
  return { command: pythonPath, args: scriptArgs };
}

function spawnPython(config, scriptArgs, options = {}) {
  const python = resolvePython(config);
  const { command, args } = buildPythonSpawn(python, scriptArgs);
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
      env: {
        ...process.env,
        FUNASR_MODEL: config.transcribeModel || 'paraformer-zh',
        PYTHONUNBUFFERED: '1',
      },
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
  // 延迟预热，避免启动瞬间与桌面启动器日志管道冲突
  setTimeout(() => {
    ensureTranscribeService(config).catch((err) => {
      console.warn('[meeting-recorder] 转写服务预热失败，结束录音时将自动单次转写:', err.message);
    });
  }, 3000);
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
    }, 60 * 60 * 1000);

    pendingJobs.set(id, { resolve, reject, timer });
    writeServiceJob({ id, audio: audioPath }).catch(reject);
  });
}

async function transcribeOnce(audioPath, config) {
  const script = path.join(ROOT, 'scripts', 'transcribe.py');
  const python = resolvePython(config);
  const { command, args } = buildPythonSpawn(python, [script, audioPath]);
  const { stdout, stderr } = await runCommand(command, args, {
    cwd: path.join(ROOT, 'scripts'),
    env: {
      ...process.env,
      FUNASR_MODEL: config.transcribeModel || 'paraformer-zh',
    },
  });
  const lines = stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const line = [...lines].reverse().find((s) => s.startsWith('{')) || lines[lines.length - 1];
  if (!line) throw new Error(`转写脚本无输出${stderr ? `：${stderr.slice(-400)}` : ''}`);
  const parsed = JSON.parse(line);
  if (parsed.ok === false) throw new Error(parsed.error || '转写失败');
  return parsed;
}

async function convertToM4a(inputPath, outputPath) {
  if (!ffmpegPath) throw new Error('未找到 ffmpeg，无法生成 m4a');
  await runCommand(ffmpegPath, ['-y', '-i', inputPath, '-c:a', 'aac', '-b:a', '128k', outputPath]);
}

async function transcribeAudio(audioPath, config) {
  try {
    return await transcribeViaService(audioPath, config);
  } catch (err) {
    console.warn('[meeting-recorder] 常驻转写失败，回退单次模式:', err.message);
    return transcribeOnce(audioPath, config);
  }
}

module.exports = {
  resolvePython,
  convertToM4a,
  transcribeAudio,
  warmTranscribeService,
  stopTranscribeService,
  buildTempSessionDir,
  removeDirSafe,
  runCommand,
};
