(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingFixedId = null;
  var editingRefundId = null;

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(value) {
    var num = Number(value || 0);
    return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pct(value) {
    var num = Number(value || 0);
    return (num * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '%';
  }

  function originTag(origin) {
    var cls = origin === '已调整' ? 'override' : 'excel';
    return '<span class="tag-origin ' + cls + '">' + esc(origin) + '</span>';
  }

  function populateOptions() {
    var customerOpts = store.customers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');
    var feeOpts = store.deductionFeeTypes.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');
    var periodOpts = store.periods.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
    document.getElementById('qFeeType').insertAdjacentHTML('beforeend', feeOpts);
    document.getElementById('qPeriod').insertAdjacentHTML('beforeend', periodOpts);
  }

  function getFilters() {
    return {
      customer: document.getElementById('qCustomer').value,
      feeType: document.getElementById('qFeeType').value,
      period: document.getElementById('qPeriod').value
    };
  }

  function getFixedRows() {
    var filters = getFilters();
    return store.getFixedRules().filter(function (row) {
      if (filters.customer && row.customer !== filters.customer) return false;
      if (filters.feeType && row.feeType !== filters.feeType) return false;
      return true;
    });
  }

  function getRefundRows() {
    var filters = getFilters();
    return store.getRefundRules().filter(function (row) {
      if (filters.customer && row.customer !== filters.customer) return false;
      if (filters.period && row.period !== filters.period) return false;
      return true;
    });
  }

  function renderStats() {
    var fixed = store.getFixedRules();
    var refund = store.getRefundRules();
    var adjusted = fixed.concat(refund).filter(function (row) {
      return row.origin === '已调整';
    }).length;

    document.getElementById('statFixed').textContent = fixed.length;
    document.getElementById('statRefund').textContent = refund.length;
    document.getElementById('statAdjusted').textContent = adjusted;
    document.getElementById('statPeriods').textContent = store.periods.length;
  }

  function renderFixedTable() {
    var rows = getFixedRows();
    var body = document.getElementById('fixedBody');
    document.getElementById('fixedTip').textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#6b7280;padding:32px;">暂无固定规则</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td>' + esc(row.feeType) + '</td>' +
          '<td>' + esc(row.methodLabel) + '</td>' +
          '<td class="num">' + pct(row.ratio) + '</td>' +
          '<td class="num">' + money(row.baseAmount) + '</td>' +
          '<td class="num">' + money(row.sampleIncome) + '</td>' +
          '<td class="num">' + money(row.sampleAccrual) + '</td>' +
          '<td>' + esc(row.sourcePeriod) + '</td>' +
          '<td>' + originTag(row.origin) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 28)) + '</td>' +
          '<td><span class="ops"><button class="op-link" data-kind="fixed-edit" data-id="' + esc(row.id) + '">调整</button><button class="op-link danger" data-kind="fixed-reset" data-id="' + esc(row.id) + '">恢复 Excel</button></span></td>' +
        '</tr>';
    }).join('');
  }

  function renderRefundTable() {
    var rows = getRefundRows();
    var body = document.getElementById('refundRuleBody');
    document.getElementById('refundTip').textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#6b7280;padding:32px;">暂无退款滚动规则</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.period) + '</td>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td>' + esc(row.ratioSource) + '</td>' +
          '<td class="num">' + pct(row.ratio) + '</td>' +
          '<td class="num">' + esc(row.windowMonths) + '</td>' +
          '<td class="num">' + money(row.salesBasis) + '</td>' +
          '<td class="num">' + money(row.targetClosing) + '</td>' +
          '<td>' + originTag(row.origin) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 28)) + '</td>' +
          '<td><span class="ops"><button class="op-link" data-kind="refund-edit" data-id="' + esc(row.id) + '">调整</button><button class="op-link danger" data-kind="refund-reset" data-id="' + esc(row.id) + '">恢复 Excel</button></span></td>' +
        '</tr>';
    }).join('');
  }

  function renderAll() {
    renderStats();
    renderFixedTable();
    renderRefundTable();
  }

  function findFixedById(id) {
    return store.getFixedRules().find(function (row) { return row.id === id; }) || null;
  }

  function findRefundById(id) {
    return store.getRefundRules().find(function (row) { return row.id === id; }) || null;
  }

  function toggleFixedInputs() {
    var method = document.getElementById('fFixedMethod').value;
    var ratio = document.getElementById('fFixedRatio');
    var amount = document.getElementById('fFixedAmount');
    var isRatio = method === 'fixed_ratio';

    ratio.disabled = !isRatio;
    amount.disabled = isRatio;
  }

  function openFixedModal(row) {
    if (!row) return;
    editingFixedId = row.id;
    document.getElementById('fFixedCustomer').value = row.customer;
    document.getElementById('fFixedFeeType').value = row.feeType;
    document.getElementById('fFixedMethod').value = row.method;
    document.getElementById('fFixedRatio').value = Number(row.ratio || 0);
    document.getElementById('fFixedAmount').value = Number(row.baseAmount || 0);
    document.getElementById('fFixedSource').value = row.sourcePeriod || '';
    document.getElementById('fFixedNote').value = row.note || '';
    toggleFixedInputs();
    window.FeeMgmtCommon.openModalMask('fixedModal');
  }

  function closeFixedModal() {
    editingFixedId = null;
    window.FeeMgmtCommon.closeModalMask('fixedModal');
  }

  function saveFixedRule() {
    if (!editingFixedId) return;
    store.upsertFixedRule({
      id: editingFixedId,
      method: document.getElementById('fFixedMethod').value,
      ratio: document.getElementById('fFixedRatio').value,
      baseAmount: document.getElementById('fFixedAmount').value,
      note: document.getElementById('fFixedNote').value.trim()
    });
    closeFixedModal();
    renderAll();
  }

  function openRefundModal(row) {
    if (!row) return;
    editingRefundId = row.id;
    document.getElementById('fRefundPeriod').value = row.period;
    document.getElementById('fRefundCustomer').value = row.customer;
    document.getElementById('fRefundRatio').value = Number(row.ratio || 0);
    document.getElementById('fRefundWindow').value = Number(row.windowMonths || 1);
    document.getElementById('fRefundBasis').value = money(row.salesBasis);
    document.getElementById('fRefundTarget').value = money(row.targetClosing);
    document.getElementById('fRefundNote').value = row.note || '';
    window.FeeMgmtCommon.openModalMask('refundModal');
  }

  function closeRefundModal() {
    editingRefundId = null;
    window.FeeMgmtCommon.closeModalMask('refundModal');
  }

  function saveRefundRule() {
    if (!editingRefundId) return;
    store.upsertRefundRule({
      id: editingRefundId,
      ratio: document.getElementById('fRefundRatio').value,
      windowMonths: document.getElementById('fRefundWindow').value,
      note: document.getElementById('fRefundNote').value.trim()
    });
    closeRefundModal();
    renderAll();
  }

  function bindEvents() {
    ['qCustomer', 'qFeeType', 'qPeriod'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderAll);
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qCustomer').value = '';
      document.getElementById('qFeeType').value = '';
      document.getElementById('qPeriod').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qFeeType'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qPeriod'));
      renderAll();
    });

    document.getElementById('fFixedMethod').addEventListener('change', toggleFixedInputs);

    document.getElementById('btnFixedClose').addEventListener('click', closeFixedModal);
    document.getElementById('btnFixedCancel').addEventListener('click', closeFixedModal);
    document.getElementById('btnFixedSave').addEventListener('click', saveFixedRule);
    document.getElementById('fixedModal').addEventListener('click', function (e) {
      if (e.target.id === 'fixedModal') closeFixedModal();
    });

    document.getElementById('btnRefundClose').addEventListener('click', closeRefundModal);
    document.getElementById('btnRefundCancel').addEventListener('click', closeRefundModal);
    document.getElementById('btnRefundSave').addEventListener('click', saveRefundRule);
    document.getElementById('refundModal').addEventListener('click', function (e) {
      if (e.target.id === 'refundModal') closeRefundModal();
    });

    document.getElementById('fixedBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-kind][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-kind');
      if (action === 'fixed-edit') {
        openFixedModal(findFixedById(id));
      } else if (action === 'fixed-reset') {
        store.resetFixedRule(id);
        renderAll();
      }
    });

    document.getElementById('refundRuleBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-kind][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-kind');
      if (action === 'refund-edit') {
        openRefundModal(findRefundById(id));
      } else if (action === 'refund-reset') {
        store.resetRefundRule(id);
        renderAll();
      }
    });
  }

  function init() {
    populateOptions();
    bindEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
