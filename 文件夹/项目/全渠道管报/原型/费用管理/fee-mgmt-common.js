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

  function syncClearableInput(inp) {
    if (!inp) return;
    var wrap = inp.closest('.ctl-wrap');
    if (!wrap) return;
    wrap.classList.toggle('has-val', !!inp.value.trim());
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

  function wireClearableInputs(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.ctl-wrap input.ctl').forEach(function (inp) {
      if (inp.dataset.clearWired === '1') return;
      inp.dataset.clearWired = '1';
      syncClearableInput(inp);
      inp.addEventListener('input', function () { syncClearableInput(inp); });
      var btn = inp.parentElement && inp.parentElement.querySelector('.ctl-clear');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!inp.value.trim()) return;
        inp.value = '';
        syncClearableInput(inp);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
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

  function shiftPeriodYm(period, delta) {
    var parts = String(period || '').split('-').map(Number);
    if (!parts[0] || !parts[1]) return period;
    var y = parts[0];
    var m = parts[1] + delta;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    return y + '-' + String(m).padStart(2, '0');
  }

  function lastDayOfMonthYm(period) {
    var parts = String(period || '').split('-').map(Number);
    if (!parts[0] || !parts[1]) return period;
    var day = new Date(parts[0], parts[1], 0).getDate();
    return period + '-' + String(day).padStart(2, '0');
  }

  function currentMonthYm() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }

  /** 商超扣款/退款页共用的「销售收入」取值口径说明 */
  var SALES_INCOME_LOGIC_DESC = '销售收入 − 退货退款的收入（金蝶-销售退货单，type=退货退款）';

  /** 近 N 个自然月（含锚点月）的起止月份 YYYY-MM，供 MonthRangePicker 默认值 */
  function getRecentMonthsRange(monthCount, anchorPeriod) {
    var anchor = anchorPeriod || currentMonthYm();
    var count = Math.max(1, Number(monthCount) || 3);
    var startYm = shiftPeriodYm(anchor, -(count - 1));
    return {
      start: startYm,
      end: anchor
    };
  }

  /** 业务期间 YYYY-MM 是否落在月份范围（闭区间） */
  function periodInMonthRange(period, startYm, endYm) {
    if (!period) return false;
    if (!startYm && !endYm) return true;
    if (startYm && period < startYm) return false;
    if (endYm && period > endYm) return false;
    return true;
  }

  /** @deprecated 请用 getRecentMonthsRange + MonthRangePicker */
  function getRecentMonthsDateRange(monthCount, anchorPeriod) {
    var range = getRecentMonthsRange(monthCount, anchorPeriod);
    return {
      start: range.start + '-01',
      end: lastDayOfMonthYm(range.end)
    };
  }

  /** @deprecated 请用 periodInMonthRange */
  function periodInDateRange(period, startYmd, endYmd) {
    if (!period) return false;
    if (!startYmd && !endYmd) return true;
    var periodStart = period + '-01';
    var periodEnd = lastDayOfMonthYm(period);
    if (startYmd && periodEnd < startYmd) return false;
    if (endYmd && periodStart > endYmd) return false;
    return true;
  }

  function initPage() {
    wireClearableSelects(document);
    wireClearableInputs(document);
    ensureHiddenModals();
    if (global.MutationObserver) {
      var timer = null;
      var obs = new MutationObserver(function (mutations) {
        var touched = mutations.some(function (m) {
          if (m.type === 'childList') return true;
          if (m.type !== 'attributes' || m.attributeName !== 'class') return false;
          var t = m.target;
          if (!t || !t.classList) return false;
          return t.classList.contains('modal-mask') || t.classList.contains('msf-panel');
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
    syncClearableInput: syncClearableInput,
    wireClearableSelects: wireClearableSelects,
    wireClearableInputs: wireClearableInputs,
    openModalMask: openModalMask,
    closeModalMask: closeModalMask,
    ensureHiddenModals: ensureHiddenModals,
    downloadCsv: downloadCsv,
    shiftPeriodYm: shiftPeriodYm,
    lastDayOfMonthYm: lastDayOfMonthYm,
    currentMonthYm: currentMonthYm,
    salesIncomeLogicDesc: SALES_INCOME_LOGIC_DESC,
    getRecentMonthsRange: getRecentMonthsRange,
    periodInMonthRange: periodInMonthRange,
    getRecentMonthsDateRange: getRecentMonthsDateRange,
    periodInDateRange: periodInDateRange,
    initPage: initPage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})(typeof window !== 'undefined' ? window : this);
