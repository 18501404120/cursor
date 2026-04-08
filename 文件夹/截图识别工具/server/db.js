const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'records.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, '[]', 'utf8');
  }
}

function readAll() {
  ensureStore();
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(rows) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(rows, null, 0), 'utf8');
}

function insertRecord(content) {
  const rows = readAll();
  const id = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
  const created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const row = { id, content, created_at };
  rows.push(row);
  writeAll(rows);
  return row;
}

function listRecordsDesc() {
  const rows = readAll();
  return [...rows].sort((a, b) => b.id - a.id);
}

module.exports = { insertRecord, listRecordsDesc };
