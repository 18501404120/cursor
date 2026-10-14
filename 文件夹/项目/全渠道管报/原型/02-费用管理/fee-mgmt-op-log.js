/**
 * 费用管理 · 操作日志（localStorage 持久化，按列表行 rowKey 归集）
 */
(function (global) {
  'use strict';

  var STORAGE_PREFIX = 'gb-fee-mgmt-op-log-';
  var MAX_ITEMS = 500;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function storageKey(scope) {
    return STORAGE_PREFIX + String(scope || 'default');
  }

  function formatTime(date) {
    var dt = date || new Date();
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) +
      ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds());
  }

  function read(scope) {
    try {
      var raw = global.localStorage.getItem(storageKey(scope));
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function write(scope, list) {
    try {
      global.localStorage.setItem(storageKey(scope), JSON.stringify(list.slice(0, MAX_ITEMS)));
    } catch (err) {
      /* ignore quota */
    }
  }

  function append(scope, entry) {
    var list = read(scope);
    var item = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      rowKey: String((entry && entry.rowKey) || ''),
      time: formatTime(),
      action: String((entry && entry.action) || ''),
      target: String((entry && entry.target) || ''),
      detail: String((entry && entry.detail) || ''),
      operator: String((entry && entry.operator) || '当前用户')
    };
    list.unshift(item);
    write(scope, list);
    return item;
  }

  function readByRow(scope, rowKey) {
    if (!rowKey) return [];
    return read(scope).filter(function (item) {
      return item.rowKey === rowKey;
    });
  }

  function countByRow(scope, rowKey) {
    return readByRow(scope, rowKey).length;
  }

  function clear(scope) {
    write(scope, []);
  }

  function ensureModal(modalId) {
    var el = document.getElementById(modalId);
    if (el) return el;

    el = document.createElement('div');
    el.className = 'modal-mask';
    el.id = modalId;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '' +
      '<div class="modal modal-lg">' +
        '<div class="modal-hd">' +
          '<h2 id="' + modalId + 'Title">操作日志</h2>' +
          '<button type="button" class="modal-close" data-oplog-close="' + esc(modalId) + '">×</button>' +
        '</div>' +
        '<div class="modal-bd">' +
          '<p class="op-log-tip" id="' + modalId + 'Tip"></p>' +
          '<div class="table-wrap op-log-wrap">' +
            '<table class="data-table op-log-table">' +
              '<thead><tr>' +
                '<th style="width:150px;">时间</th>' +
                '<th style="width:140px;">操作</th>' +
                '<th>说明</th>' +
                '<th style="width:88px;">操作人</th>' +
              '</tr></thead>' +
              '<tbody id="' + modalId + 'Body"></tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
        '<div class="modal-ft">' +
          '<button type="button" class="btn" data-oplog-close="' + esc(modalId) + '">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    el.addEventListener('click', function (e) {
      if (e.target === el) closeModal(modalId);
      var btn = e.target.closest('[data-oplog-close]');
      if (btn && btn.getAttribute('data-oplog-close') === modalId) closeModal(modalId);
    });

    return el;
  }

  function openModal(modalId) {
    if (global.FeeMgmtCommon && global.FeeMgmtCommon.openModalMask) {
      global.FeeMgmtCommon.openModalMask(modalId);
    }
  }

  function closeModal(modalId) {
    if (global.FeeMgmtCommon && global.FeeMgmtCommon.closeModalMask) {
      global.FeeMgmtCommon.closeModalMask(modalId);
    }
  }

  function render(scope, modalId, rowKey, subtitle) {
    var body = document.getElementById(modalId + 'Body');
    var tip = document.getElementById(modalId + 'Tip');
    var title = document.getElementById(modalId + 'Title');
    if (!body) return;

    var list = readByRow(scope, rowKey);
    if (title) title.textContent = '操作日志';
    if (tip) {
      tip.textContent = (subtitle || '') +
        (subtitle ? ' · ' : '') +
        '共 ' + list.length + ' 条记录（按本行归集，最多保留 ' + MAX_ITEMS + ' 条/页）';
    }
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:28px;">本行暂无操作记录</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.time) + '</td>' +
          '<td>' + esc(row.action) + '</td>' +
          '<td title="' + esc(row.detail) + '">' + esc(row.detail || '—') + '</td>' +
          '<td>' + esc(row.operator) + '</td>' +
        '</tr>';
    }).join('');
  }

  function openForRow(options) {
    var scope = options.scope;
    var rowKey = options.rowKey;
    var modalId = options.modalId || ('opLogModal-' + scope);
    if (!scope || !rowKey) return;
    ensureModal(modalId);
    render(scope, modalId, rowKey, options.subtitle || '');
    openModal(modalId);
  }

  function wireTable(options) {
    var scope = options.scope;
    var modalId = options.modalId || ('opLogModal-' + scope);
    var tableBody = typeof options.tableBody === 'string'
      ? document.querySelector(options.tableBody)
      : options.tableBody;
    if (!tableBody || !scope) return;

    ensureModal(modalId);
    tableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="row-log"]');
      if (!btn) return;
      openForRow({
        scope: scope,
        modalId: modalId,
        rowKey: btn.getAttribute('data-row-key') || '',
        subtitle: btn.getAttribute('data-row-label') || ''
      });
    });
  }

  global.FeeMgmtOpLog = {
    append: append,
    read: read,
    readByRow: readByRow,
    countByRow: countByRow,
    clear: clear,
    render: render,
    openForRow: openForRow,
    wireTable: wireTable
  };
})(typeof window !== 'undefined' ? window : this);
