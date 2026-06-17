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

  function resolveModalEl(el) {
    if (!el) return null;
    if (typeof el === 'string') return document.getElementById(el);
    return el;
  }

  function clearModalInlineStyle(el) {
    if (!el || !el.style) return;
    el.style.removeProperty('display');
    el.style.removeProperty('pointer-events');
  }

  function openModalMask(el) {
    el = resolveModalEl(el);
    if (!el) return el;
    clearModalInlineStyle(el);
    el.removeAttribute('hidden');
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    return el;
  }

  function closeModalMask(el) {
    el = resolveModalEl(el);
    if (!el) return el;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    clearModalInlineStyle(el);
    return el;
  }

  /** 清除历史 inline 遮罩样式，确保未打开弹层不挡点击 */
  function ensureHiddenModals() {
    document.querySelectorAll('.modal-mask').forEach(function (el) {
      clearModalInlineStyle(el);
      if (el.classList.contains('open')) {
        el.setAttribute('aria-hidden', 'false');
      } else {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    document.querySelectorAll('.msf-panel.msf-show').forEach(function (el) {
      el.style.removeProperty('pointer-events');
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
      var obs = new MutationObserver(function (mutations) {
        var touched = mutations.some(function (m) {
          if (m.type === 'childList') return true;
          return m.type === 'attributes' && m.attributeName === 'class'
            && m.target && m.target.classList && m.target.classList.contains('modal-mask');
        });
        if (!touched) return;
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
    openModalMask: openModalMask,
    closeModalMask: closeModalMask,
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
