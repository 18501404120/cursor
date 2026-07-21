const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { insertRecord, listRecordsDesc } = require('./db');
const { recognizeImage, shutdown } = require('./ocr');

const app = express();
const PORT = Number(process.env.PORT) || 3789;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

async function handleRecognizeBuffer(buffer, res) {
  if (!buffer || !buffer.length) {
    return res.status(400).json({ error: '未收到有效图片数据' });
  }
  let text;
  try {
    text = await recognizeImage(buffer);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '识别失败，请稍后重试' });
  }
  const row = insertRecord(text || '(未识别到文字)');
  return res.json({ record: row });
}

app.post('/api/upload', upload.single('image'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: '请选择图片文件' });
  }
  return handleRecognizeBuffer(file.buffer, res);
});

app.post('/api/recognize', async (req, res) => {
  const base64 = req.body && req.body.image;
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: '缺少 image 字段（Base64）' });
  }
  const m = base64.match(/^data:image\/\w+;base64,(.+)$/);
  const raw = m ? m[1] : base64;
  let buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    return res.status(400).json({ error: 'Base64 无效' });
  }
  return handleRecognizeBuffer(buffer, res);
});

app.get('/api/records', (req, res) => {
  try {
    const rows = listRecordsDesc();
    return res.json({ records: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '读取记录失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, HOST, () => {
  console.log('截图识别服务已启动。请在浏览器打开：');
  console.log(`  http://127.0.0.1:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log('（局域网其它设备可用本机 IP 访问同一端口）');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `端口 ${PORT} 已被占用。请关闭已运行的实例，或换端口启动：PORT=3790 npm start`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

function graceful() {
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
}

process.on('SIGINT', graceful);
process.on('SIGTERM', graceful);
