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

  function notifyAnnotationResync() {
    document.dispatchEvent(new CustomEvent('pa:layout-change'));
    if (global.PrototypeAnnotation && typeof global.PrototypeAnnotation.resync === 'function') {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          global.PrototypeAnnotation.resync();
        });
      });
    }
  }

  function openModalMask(el) {
    el = resolveModalEl(el);
    if (!el) return el;
    clearModalInlineStyle(el);
    el.removeAttribute('hidden');
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    notifyAnnotationResync();
    return el;
  }

  function closeModalMask(el) {
    el = resolveModalEl(el);
    if (!el) return el;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    clearModalInlineStyle(el);
    notifyAnnotationResync();
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

  /**
   * 加拿大客户币种按费用域拆分：
   * - 退款/负债：CNY（跟预计负债汇总）
   * - 扣款：Costco CA=USD；D&H CA / HOME DEPOT CANADA / Synnex-CA=CAD
   * 优先读 SupermarketAccrualBaseData.customerCurrencies。
   */
  var CANADIAN_CNY_CUSTOMERS = ['Costco CA', 'D&H CA', 'Synnex-CA', 'HOME DEPOT CANADA'];
  var DEFAULT_CA_DEDUCTION = {
    'Costco CA': 'USD',
    'D&H CA': 'CAD',
    'HOME DEPOT CANADA': 'CAD',
    'Synnex-CA': 'CAD'
  };

  function getCustomerCurrencyMap(customer) {
    var name = String(customer || '').trim();
    var base = global.SupermarketAccrualBaseData || {};
    var map = (base.customerCurrencies && base.customerCurrencies[name]) || null;
    if (map && map.refund && map.deduction) return map;
    if (CANADIAN_CNY_CUSTOMERS.indexOf(name) >= 0) {
      return {
        refund: 'CNY',
        deduction: DEFAULT_CA_DEDUCTION[name] || 'CAD'
      };
    }
    return { refund: 'USD', deduction: 'USD' };
  }

  function getRefundCurrency(customer) {
    return getCustomerCurrencyMap(customer).refund;
  }

  function getDeductionCurrency(customer) {
    return getCustomerCurrencyMap(customer).deduction;
  }

  /** 兼容旧调用：默认取扣款币种；退款页请改用 getRefundCurrency */
  function getCustomerCurrency(customer) {
    return getDeductionCurrency(customer);
  }

  function normalizeCurrencyCode(code) {
    var value = String(code || 'USD').trim().toUpperCase();
    if (value === 'CNY' || value === 'CAD' || value === 'USD') return value;
    return 'USD';
  }

  /**
   * 金额格式化。第二参可为币种码（CNY/USD/CAD）或客户名。
   * 传入客户名时默认取「扣款币种」；退款页务必先 resolve 为 getRefundCurrency(customer) 再传入，
   * 避免加拿大客户误显示 C$/$。
   */
  function formatMoney(amount, customerOrCurrency) {
    var known = { CNY: 1, USD: 1, CAD: 1 };
    var currency = known[String(customerOrCurrency || '').trim().toUpperCase()]
      ? normalizeCurrencyCode(customerOrCurrency)
      : getCustomerCurrency(customerOrCurrency);
    var num = Number(amount || 0);
    var prefix = num < 0 ? '-' : '';
    var abs = Math.abs(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === 'CNY') return prefix + '¥' + abs;
    if (currency === 'CAD') return prefix + 'C$' + abs;
    return prefix + '$' + abs;
  }

  function formatCurrencyAmount(amount, currency) {
    var code = normalizeCurrencyCode(currency);
    var num = Number(amount || 0);
    var prefix = num < 0 ? '-' : '';
    return prefix + code + ' ' + Math.abs(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function resolveStatsCurrency(rows, selectedCustomer, domain) {
    var getter = domain === 'refund' ? getRefundCurrency : getDeductionCurrency;
    if (selectedCustomer) return getter(selectedCustomer);
    if (!rows || !rows.length) return 'USD';
    var map = {};
    rows.forEach(function (row) {
      map[getter(row.customer)] = true;
    });
    var keys = Object.keys(map);
    return keys.length === 1 ? keys[0] : 'USD';
  }

  /** 计提用收入说明：用于比例计提与退款滚动率分母，与实际退款/扣款入账分离 */
  var ACCRUAL_INCOME_NOTE = '计提用收入 = 上述销售收入口径；用于扣款比例计提与退款滚动率分母。实际退款/扣款单独维护，不重复扣减。';

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
    notifyAnnotationResync: notifyAnnotationResync,
    openModalMask: openModalMask,
    closeModalMask: closeModalMask,
    ensureHiddenModals: ensureHiddenModals,
    downloadCsv: downloadCsv,
    shiftPeriodYm: shiftPeriodYm,
    lastDayOfMonthYm: lastDayOfMonthYm,
    currentMonthYm: currentMonthYm,
    salesIncomeLogicDesc: SALES_INCOME_LOGIC_DESC,
    canadianCnyCustomers: CANADIAN_CNY_CUSTOMERS.slice(),
    getCustomerCurrencyMap: getCustomerCurrencyMap,
    getRefundCurrency: getRefundCurrency,
    getDeductionCurrency: getDeductionCurrency,
    getCustomerCurrency: getCustomerCurrency,
    normalizeCurrencyCode: normalizeCurrencyCode,
    formatMoney: formatMoney,
    formatCurrencyAmount: formatCurrencyAmount,
    resolveStatsCurrency: resolveStatsCurrency,
    accrualIncomeNote: ACCRUAL_INCOME_NOTE,
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
