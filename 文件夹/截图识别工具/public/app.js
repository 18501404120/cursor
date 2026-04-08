const API = '';

const fileProtocolWarn = document.getElementById('fileProtocolWarn');
const mainPage = document.getElementById('mainPage');

if (window.location.protocol === 'file:') {
  fileProtocolWarn.hidden = false;
  mainPage.hidden = true;
} else {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const pickBtn = document.getElementById('pickBtn');
  const statusEl = document.getElementById('status');
  const recordList = document.getElementById('recordList');
  const refreshBtn = document.getElementById('refreshBtn');

  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (kind ? ` ${kind}` : '');
  }

  async function fetchRecords() {
    const r = await fetch(`${API}/api/records`);
    if (!r.ok) throw new Error('加载失败');
    const data = await r.json();
    return data.records || [];
  }

  function renderRecords(rows) {
    recordList.innerHTML = '';
    if (!rows.length) {
      const li = document.createElement('li');
      li.className = 'record-empty';
      li.textContent = '暂无记录，上传或粘贴一张截图开始。';
      recordList.appendChild(li);
      return;
    }
    for (const row of rows) {
      const li = document.createElement('li');
      li.className = 'record-item';
      li.innerHTML = `
      <div class="record-meta">#${row.id} · ${row.created_at}</div>
      <div class="record-content"></div>
    `;
      li.querySelector('.record-content').textContent = row.content;
      recordList.appendChild(li);
    }
  }

  async function refreshList() {
    try {
      const rows = await fetchRecords();
      renderRecords(rows);
    } catch (e) {
      const hint =
        e && e.message === 'Failed to fetch'
          ? '无法连接后端：请确认已在项目目录执行 npm start，并用 http://127.0.0.1:3789 打开本页'
          : e.message || '列表加载失败';
      setStatus(hint, 'err');
    }
  }

  async function recognizeBlob(blob) {
    setStatus('正在识别…', 'working');
    const fd = new FormData();
    fd.append('image', blob, 'paste.png');
    const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(data.error || '识别失败');
    }
    setStatus('识别成功');
    await refreshList();
  }

  function onFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('请选择图片文件', 'err');
      return;
    }
    recognizeBlob(file).catch((e) => {
      const hint =
        e && e.message === 'Failed to fetch'
          ? '请求失败：后端未启动或地址不对，请用 http://127.0.0.1:3789 访问'
          : e.message || '请求失败';
      setStatus(hint, 'err');
    });
  }

  pickBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) onFile(f);
    fileInput.value = '';
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target === dropzone || e.target.closest('.dropzone') === dropzone) {
      if (e.target === pickBtn || e.target === fileInput) return;
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  });

  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type && it.type.indexOf('image') === 0) {
        e.preventDefault();
        const blob = it.getAsFile();
        if (blob) {
          onFile(blob);
          return;
        }
      }
    }
  });

  refreshBtn.addEventListener('click', () => {
    setStatus('刷新中…', 'working');
    refreshList().then(() => setStatus(''));
  });

  refreshList();
}
