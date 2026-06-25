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
    return '$' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pct(value) {
    var num = Number(value || 0);
    return (num * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '%';
  }

  function originTag(origin) {
    var cls = origin === '已调整' ? 'override' : 'excel';
    return '<span class="tag-origin ' + cls + '">' + esc(origin) + '</span>';
  }

  function getSamplePeriod() {
    var selected = document.getElementById('qSamplePeriod').value;
    if (selected) return selected;
    var list = store.periods || [];
    return list.length ? list[list.length - 1] : '';
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
    document.getElementById('qSamplePeriod').insertAdjacentHTML('beforeend', periodOpts);
    if (store.periods.length) {
      document.getElementById('qSamplePeriod').value = store.periods[store.periods.length - 1];
    }
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

  function getMatrixRows() {
    var filters = getFilters();
    var period = getSamplePeriod();
    return store.getCustomerDeductionRateMatrix(period).filter(function (row) {
      if (filters.customer && row.customer !== filters.customer) return false;
      return true;
    });
  }

  function ratioCell(value) {
    return '<td class="num">' + pct(value) + '</td>';
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

  function renderMatrixTable() {
    var rows = getMatrixRows();
    var body = document.getElementById('matrixBody');
    var period = getSamplePeriod();
    document.getElementById('matrixTip').textContent = '共 ' + rows.length + ' 条 · 试算期间 ' + period;

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#6b7280;padding:32px;">暂无客户扣款比例</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      var expenseLabel = row.salesExpenseMethod === '预算/固定额'
        ? '预算 ' + money(row.salesExpenseBudget)
        : esc(row.salesExpenseMethod);
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          ratioCell(row.promoRatio) +
          ratioCell(row.salesDiscountRatio) +
          ratioCell(row.cashDiscountRatio) +
          '<td class="num">' + money(row.income) + '</td>' +
          '<td class="num">' + money(row.promoAccrual) + '</td>' +
          '<td class="num">' + money(row.salesDiscountAccrual) + '</td>' +
          '<td class="num">' + money(row.cashDiscountAccrual) + '</td>' +
          '<td>' + expenseLabel + '</td>' +
          '<td class="num">' + money(row.salesExpenseAccrual) + '</td>' +
          '<td>' + originTag(row.origin) + '</td>' +
          '<td><span class="ops">' +
            '<button class="op-link" data-kind="matrix-edit" data-id="' + esc(row.promoRuleId) + '">调促销</button>' +
            '<button class="op-link" data-kind="matrix-edit" data-id="' + esc(row.salesRuleId) + '">调销折</button>' +
            '<button class="op-link" data-kind="matrix-edit" data-id="' + esc(row.cashRuleId) + '">调现折</button>' +
          '</span></td>' +
        '</tr>';
    }).join('');
  }

  function ratioDisplay(row) {
    if (row.feeType === '销售费用' && row.method === 'budget_or_fixed') {
      return '—';
    }
    if (row.method === 'monthly_fixed') {
      return '—';
    }
    return pct(row.ratio);
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
      var amountLabel = row.feeType === '销售费用' && row.method === 'budget_or_fixed'
        ? money(row.baseAmount)
        : money(row.baseAmount);
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td>' + esc(row.feeType) + '</td>' +
          '<td>' + esc(row.methodLabel) + '</td>' +
          '<td class="num">' + ratioDisplay(row) + '</td>' +
          '<td class="num">' + amountLabel + '</td>' +
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
    renderMatrixTable();
    renderFixedTable();
    renderRefundTable();
  }

  function findFixedById(id) {
    if (!id) return null;
    return store.getFixedRules().find(function (row) { return row.id === id; }) || null;
  }

  function findRefundById(id) {
    return store.getRefundRules().find(function (row) { return row.id === id; }) || null;
  }

  function toggleFixedInputs() {
    var row = findFixedById(editingFixedId);
    var method = document.getElementById('fFixedMethod').value;
    var ratio = document.getElementById('fFixedRatio');
    var amount = document.getElementById('fFixedAmount');
    var isRatio = method === 'fixed_ratio';
    var isBudget = method === 'budget_or_fixed';

    ratio.disabled = !isRatio;
    amount.disabled = isRatio;
    document.getElementById('fFixedRatioLabel').textContent = isRatio
      ? (row && row.ratioLabel ? row.ratioLabel : '规则比例') + '（0~1，对应 Excel《扣款比例》）'
      : '参考比例（0~1）';
    document.getElementById('fFixedAmountLabel').textContent = isBudget
      ? '月度预算/固定额（对应 Excel《计提扣款金额》）'
      : '月固定额';
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
    ['qCustomer', 'qFeeType', 'qPeriod', 'qSamplePeriod'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderAll);
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qCustomer').value = '';
      document.getElementById('qFeeType').value = '';
      document.getElementById('qPeriod').value = '';
      document.getElementById('qSamplePeriod').value = store.periods.length ? store.periods[store.periods.length - 1] : '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qFeeType'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qPeriod'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qSamplePeriod'));
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

    document.getElementById('matrixBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-kind][data-id]');
      if (!btn || btn.getAttribute('data-kind') !== 'matrix-edit') return;
      openFixedModal(findFixedById(btn.getAttribute('data-id')));
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
