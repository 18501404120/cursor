/** @typedef {'idle'|'recording'|'paused'|'transcribing'} AppState */

const statusDot = document.getElementById('statusDot');
const timerEl = document.getElementById('timer');
const statusText = document.getElementById('statusText');
const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');
const actionRow = document.getElementById('actionRow');
const progressRow = document.getElementById('progressRow');
const progressText = document.getElementById('progressText');
const dragHandle = document.getElementById('dragHandle');

/** @type {AppState} */
let state = 'idle';
let mediaStream = null;
/** @type {MediaRecorder|null} */
let mediaRecorder = null;
let chunks = [];
let startedAt = null;
let elapsedBeforePause = 0;
let tickTimer = null;
let sessionStartedAt = null;

function formatTimer(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function currentDurationMs() {
  if (!startedAt) return elapsedBeforePause;
  if (state === 'paused') return elapsedBeforePause;
  return elapsedBeforePause + (Date.now() - startedAt);
}

function updateTimerDisplay() {
  timerEl.textContent = formatTimer(currentDurationMs());
}

function setState(next) {
  state = next;
  statusDot.className = 'dot';
  if (next === 'recording') statusDot.classList.add('recording');
  if (next === 'paused') statusDot.classList.add('paused');
  if (next === 'transcribing') statusDot.classList.add('busy');

  const map = {
    idle: '待机',
    recording: '录音中',
    paused: '已暂停',
    transcribing: '转写中',
  };
  statusText.textContent = map[next] || next;

  btnStart.disabled = next === 'recording' || next === 'transcribing';
  btnPause.disabled = next !== 'recording' && next !== 'paused';
  btnStop.disabled = next !== 'recording' && next !== 'paused';
  btnPause.textContent = next === 'paused' ? '继续' : '暂停';

  actionRow.classList.toggle('hidden', next === 'transcribing');
  progressRow.classList.toggle('hidden', next !== 'transcribing');
}

function startTick() {
  stopTick();
  tickTimer = setInterval(updateTimerDisplay, 250);
}

function stopTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

async function ensureMic() {
  if (mediaStream) return mediaStream;
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  return mediaStream;
}

function pickMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

async function handleStart() {
  if (state === 'recording' || state === 'transcribing') return;
  try {
    await ensureMic();
    if (state === 'idle') {
      sessionStartedAt = new Date();
      await window.meetingApi.beginSession({ startedAt: sessionStartedAt.toISOString() });
      chunks = [];
      elapsedBeforePause = 0;
    }
    const mimeType = pickMimeType();
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.start(1000);
    startedAt = Date.now();
    setState('recording');
    startTick();
  } catch (err) {
    alert(`无法开始录音：${err.message || err}`);
    setState('idle');
  }
}

function handlePauseToggle() {
  if (!mediaRecorder) return;
  if (state === 'recording') {
    mediaRecorder.pause();
    elapsedBeforePause += Date.now() - startedAt;
    startedAt = null;
    setState('paused');
    stopTick();
    updateTimerDisplay();
  } else if (state === 'paused') {
    mediaRecorder.resume();
    startedAt = Date.now();
    setState('recording');
    startTick();
  }
}

async function handleStop() {
  if (!mediaRecorder || (state !== 'recording' && state !== 'paused')) return;

  const durationMs = currentDurationMs();
  setState('transcribing');
  progressText.textContent = '正在保存并转写，请稍候…';
  stopTick();

  await new Promise((resolve) => {
    mediaRecorder.onstop = resolve;
    try {
      mediaRecorder.stop();
    } catch (_) {
      resolve();
    }
  });

  const mime = mediaRecorder.mimeType || 'audio/webm';
  const blob = new Blob(chunks, { type: mime });
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const audioBase64 = btoa(binary);

  try {
    const result = await window.meetingApi.saveAndTranscribe({ audioBase64, durationMs });
    if (!result.ok) {
      throw new Error(result.error || '转写失败');
    }
    progressText.textContent = '完成，正在打开文件夹…';
    await window.meetingApi.openPath(result.txtPath);
    resetToIdle();
  } catch (err) {
    progressText.textContent = '转写失败';
    alert(
      `转写失败：${err.message || err}\n\n若尚未安装 Python 环境，请在终端执行 npm run setup:python\n录音文件如已生成，可在保存目录中查看 .m4a。`,
    );
    resetToIdle();
  }
}

function resetToIdle() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
  }
  mediaStream = null;
  mediaRecorder = null;
  chunks = [];
  startedAt = null;
  elapsedBeforePause = 0;
  sessionStartedAt = null;
  stopTick();
  timerEl.textContent = '00:00:00';
  setState('idle');
}

btnStart.addEventListener('click', handleStart);
btnPause.addEventListener('click', handlePauseToggle);
btnStop.addEventListener('click', handleStop);

let dragging = false;
let lastX = 0;
let lastY = 0;

dragHandle.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) return;
  dragging = true;
  lastX = e.screenX;
  lastY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - lastX;
  const dy = e.screenY - lastY;
  lastX = e.screenX;
  lastY = e.screenY;
  window.meetingApi.dragWindow(dx, dy);
});

window.addEventListener('mouseup', () => {
  dragging = false;
});

window.meetingApi.getConfig().then((cfg) => {
  statusText.title = `保存至：${cfg.saveBaseDir}`;
  if (!cfg.pythonReady) {
    statusText.textContent = '待安装转写环境';
  }
});

setState('idle');
