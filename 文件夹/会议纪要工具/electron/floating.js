/** @typedef {'idle'|'recording'|'paused'|'transcribing'} AppState */

const statusDot = document.getElementById('statusDot');
const timerEl = document.getElementById('timer');
const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnStop = document.getElementById('btnStop');
const actionRow = document.getElementById('actionRow');
const busySpinner = document.getElementById('busySpinner');
const btnClose = document.getElementById('btnClose');

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

const STATUS_TITLE = {
  idle: '待机',
  recording: '录音中',
  paused: '已暂停',
  transcribing: '转写中',
};

/** @type {(() => void) | null} */
let progressUnsub = null;

function updateTranscribeProgress(payload) {
  if (state !== 'transcribing') return;
  const { phase, percent, message } = payload || {};
  if (phase === 'download' && percent != null) {
    timerEl.textContent = `${percent}%`;
    const tip = message || `首次下载模型 ${percent}%（约 1GB）`;
    statusDot.title = tip;
    busySpinner.title = tip;
    return;
  }
  if (message) {
    statusDot.title = message;
    busySpinner.title = message;
    if (phase === 'transcribe') {
      timerEl.textContent = formatTimer(currentDurationMs());
    } else if (phase === 'scenario') {
      timerEl.textContent = '梳理';
    } else if (phase === 'load') {
      timerEl.textContent = '加载';
    } else if (phase === 'prepare') {
      timerEl.textContent = '准备';
    }
  }
}

function formatTimer(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function currentDurationMs() {
  if (!startedAt) return elapsedBeforePause;
  if (state === 'paused') return elapsedBeforePause;
  return elapsedBeforePause + (Date.now() - startedAt);
}

function updateTimerDisplay() {
  timerEl.textContent = formatTimer(currentDurationMs());
}

function updateCloseButton() {
  if (state === 'recording' || state === 'paused') {
    btnClose.title = '取消录音（放弃本次，不转写）';
    btnClose.setAttribute('aria-label', '取消录音');
  } else if (state === 'transcribing') {
    btnClose.title = '转写进行中';
    btnClose.setAttribute('aria-label', '转写进行中');
  } else {
    btnClose.title = '隐藏悬浮窗';
    btnClose.setAttribute('aria-label', '隐藏');
  }
}

function setState(next) {
  state = next;
  statusDot.className = 'dot';
  if (next === 'recording') statusDot.classList.add('recording');
  if (next === 'paused') statusDot.classList.add('paused');
  if (next === 'transcribing') statusDot.classList.add('busy');
  statusDot.title = STATUS_TITLE[next] || next;

  btnStart.disabled = next === 'recording' || next === 'transcribing';
  btnPause.disabled = next !== 'recording' && next !== 'paused';
  btnStop.disabled = next !== 'recording' && next !== 'paused';
  btnPause.classList.toggle('is-resume', next === 'paused');
  btnPause.title = next === 'paused' ? '继续' : '暂停';
  btnClose.disabled = next === 'transcribing';

  btnStart.classList.toggle('hidden', next === 'transcribing');
  btnPause.classList.toggle('hidden', next === 'transcribing');
  btnStop.classList.toggle('hidden', next === 'transcribing');
  busySpinner.classList.toggle('hidden', next !== 'transcribing');
  updateCloseButton();
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
  stopTick();
  timerEl.textContent = '…';
  statusDot.title = '转写中（首次可能需下载模型）';
  busySpinner.title = statusDot.title;
  progressUnsub = window.meetingApi.onTranscribeProgress(updateTranscribeProgress);

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
  const audioBytes = await blob.arrayBuffer();

  try {
    const result = await window.meetingApi.saveAndTranscribe({ audioBytes, durationMs });
    if (!result.ok) {
      throw new Error(result.error || '转写失败');
    }
    const openTarget = result.htmlPath || result.txtPath;
    await window.meetingApi.openPath(openTarget);
    if (result.scenarioSkipped) {
      await window.meetingApi.notifyError({
        title: '场景梳理未生成',
        message: result.scenarioSkipped.slice(0, 160),
      });
    } else if (result.scenarioError) {
      await window.meetingApi.notifyError({
        title: '场景梳理未生成',
        message: `转写已完成，但场景梳理页生成失败：${result.scenarioError.slice(0, 120)}`,
      });
    }
    resetToIdle();
  } catch (err) {
    const msg = String(err.message || err);
    const brief = msg.includes('PyTorch') || msg.includes('架构')
      ? '转写环境异常，请完全退出后重新打开应用。'
      : msg.includes('下载') || msg.includes('模型')
        ? `${msg.slice(0, 100)}。可先运行：npm run download:models`
        : msg.slice(0, 120);
    await window.meetingApi.notifyError({ title: '转写失败', message: brief });
    resetToIdle();
  } finally {
    progressUnsub?.();
    progressUnsub = null;
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
  timerEl.textContent = '00:00';
  setState('idle');
}

btnStart.addEventListener('click', handleStart);
btnPause.addEventListener('click', handlePauseToggle);
btnStop.addEventListener('click', handleStop);

async function handleClose() {
  if (state === 'transcribing') {
    alert('转写进行中，请等待完成。如需退出应用请使用菜单栏 ⌘Q。');
    return;
  }

  if (state === 'recording' || state === 'paused') {
    const ok = confirm(
      '放弃本次会议录音？\n\n已录内容将删除，不会保存也不会转写。',
    );
    if (!ok) return;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = null;
      try {
        mediaRecorder.stop();
      } catch (_) {
        /* ignore */
      }
    }
    await window.meetingApi.cancelSession();
    resetToIdle();
    return;
  }

  await window.meetingApi.hideWindow();
}

btnClose.addEventListener('click', (e) => {
  e.stopPropagation();
  handleClose();
});

const dragHandle = document.getElementById('dragHandle');
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
  dragHandle.title = `拖动 · 保存至 ${cfg.saveBaseDir}`;
  if (!cfg.pythonReady) {
    statusDot.title = '待安装转写环境';
  } else if (cfg.scenarioFramingEnabled && !cfg.llmReady) {
    statusDot.title = '转写就绪 · 未配置 LLM（仅输出 txt）';
  }
});

setState('idle');
