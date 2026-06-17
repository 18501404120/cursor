/**
 * 费用管理原型公共脚本 — 对齐《列表页顶部筛选区》《批量导入》全局规范
 */
(function (global) {
  'use strict';

  function syncClearableSelect(sel) {
    if (!sel) return;
    var wrap = sel.closest('.ctl-wrap');
    if (!wrap) return;
    wrap.classList.toggle('has-val', !!sel.value);
  }

  function wireClearableSelects(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.ctl-wrap select.ctl').forEach(function (sel) {
      if (sel.dataset.clearWired === '1') return;
      sel.dataset.clearWired = '1';
      syncClearableSelect(sel);
      sel.addEventListener('change', function () { syncClearableSelect(sel); });
      var btn = sel.parentElement && sel.parentElement.querySelector('.ctl-clear');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!sel.value) return;
        sel.value = '';
        syncClearableSelect(sel);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function ensureHiddenModals() {
    document.querySelectorAll('.modal-mask:not(.open)').forEach(function (el) {
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    });
  }

  function downloadCsv(filename, rows) {
    if (global.ImportModalKit && typeof global.ImportModalKit.downloadCsv === 'function') {
      global.ImportModalKit.downloadCsv(filename, rows);
      return;
    }
    var bom = '\uFEFF';
    var csv = (rows || []).map(function (r) {
      return r.map(function (c) {
        var s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\n');
    var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || '导出.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function initPage() {
    wireClearableSelects(document);
    ensureHiddenModals();
    if (global.MutationObserver) {
      var timer = null;
      var obs = new MutationObserver(function () {
        if (timer) return;
        timer = setTimeout(function () {
          timer = null;
          ensureHiddenModals();
        }, 0);
      });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  global.FeeMgmtCommon = {
    syncClearableSelect: syncClearableSelect,
    wireClearableSelects: wireClearableSelects,
    ensureHiddenModals: ensureHiddenModals,
    downloadCsv: downloadCsv,
    initPage: initPage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})(typeof window !== 'undefined' ? window : this);
