const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const { ROOT } = require('./paths');

function resolvePython(config) {
  if (config.pythonPath && fs.existsSync(config.pythonPath)) {
    return config.pythonPath;
  }
  const venvPy = path.join(ROOT, 'scripts', '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPy)) return venvPy;
  return 'python3';
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

async function convertToM4a(inputPath, outputPath) {
  if (!ffmpegPath) {
    throw new Error('未找到 ffmpeg，无法生成 m4a');
  }
  await runCommand(ffmpegPath, [
    '-y',
    '-i',
    inputPath,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    outputPath,
  ]);
}

async function convertToWav16k(inputPath, outputPath) {
  if (!ffmpegPath) {
    throw new Error('未找到 ffmpeg，无法转换 wav');
  }
  await runCommand(ffmpegPath, [
    '-y',
    '-i',
    inputPath,
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'pcm_s16le',
    outputPath,
  ]);
}

async function transcribeAudio(audioPath, config) {
  const python = resolvePython(config);
  const script = path.join(ROOT, 'scripts', 'transcribe.py');
  const { stdout } = await runCommand(python, [script, audioPath], {
    cwd: ROOT,
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
  if (parsed.ok === false) {
    throw new Error(parsed.error || '转写失败');
  }
  return parsed;
}

module.exports = {
  resolvePython,
  convertToM4a,
  convertToWav16k,
  transcribeAudio,
  runCommand,
};
