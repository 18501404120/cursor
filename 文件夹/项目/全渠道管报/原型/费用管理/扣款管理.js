(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingId = null;

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

  function diff(actual, accrual) {
    return Number(actual || 0) - Number(accrual || 0);
  }

  function stateOf(row) {
    var delta = diff(row.actualDeduction, row.accrualDeduction);
    if (Math.abs(delta) < 0.01) return '匹配';
    return delta > 0 ? '实际>计提' : '实际<计提';
  }

  function stateTagClass(state) {
    if (state === '匹配') return 'tag tag-match';
    if (state === '实际>计提') return 'tag tag-high';
    return 'tag tag-low';
  }

  function sourceTag(source) {
    var cls = source === '手工录入' ? 'manual' : 'excel';
    return '<span class="tag-source ' + cls + '">' + esc(source) + '</span>';
  }

  function populateOptions() {
    var periodOpts = store.periods.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');
    var customerOpts = store.deductionCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');
    var feeOpts = store.deductionFeeTypes.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qPeriod').insertAdjacentHTML('beforeend', periodOpts);
    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
    document.getElementById('qFeeType').insertAdjacentHTML('beforeend', feeOpts);
  }

  function getFilters() {
    return {
      period: document.getElementById('qPeriod').value,
      customer: document.getElementById('qCustomer').value,
      feeType: document.getElementById('qFeeType').value,
      state: document.getElementById('qState').value
    };
  }

  function getRows() {
    var filters = getFilters();
    return store.getDeductions().filter(function (row) {
      if (filters.period && row.period !== filters.period) return false;
      if (filters.customer && row.customer !== filters.customer) return false;
      if (filters.feeType && row.feeType !== filters.feeType) return false;
      if (filters.state && stateOf(row) !== filters.state) return false;
      return true;
    });
  }

  function renderStats(rows) {
    var list = rows || store.getDeductions();
    var actual = 0;
    var accrual = 0;
    var delta = 0;

    list.forEach(function (row) {
      actual += Number(row.actualDeduction || 0);
      accrual += Number(row.accrualDeduction || 0);
      delta += diff(row.actualDeduction, row.accrualDeduction);
    });

    document.getElementById('statCount').textContent = list.length;
    document.getElementById('statActual').textContent = money(actual);
    document.getElementById('statAccrual').textContent = money(accrual);
    document.getElementById('statDiff').textContent = money(delta);
  }

  function renderTable() {
    var rows = getRows();
    var body = document.getElementById('deductionBody');

    renderStats(rows);
    document.getElementById('resultTip').textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#6b7280;padding:32px;">暂无扣款记录</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      var state = stateOf(row);
      var delta = diff(row.actualDeduction, row.accrualDeduction);
      return '' +
        '<tr>' +
          '<td>' + esc(row.period) + '</td>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td>' + esc(row.feeType) + '</td>' +
          '<td class="num">' + money(row.openingBalance) + '</td>' +
          '<td class="num">' + money(row.actualDeduction) + '</td>' +
          '<td class="num">' + money(row.accrualDeduction) + '</td>' +
          '<td class="num">' + money(row.closingBalance) + '</td>' +
          '<td class="num">' + money(delta) + '</td>' +
          '<td><span class="' + stateTagClass(state) + '">' + esc(state) + '</span></td>' +
          '<td class="num">' + money(row.income) + '</td>' +
          '<td>' + sourceTag(row.actualSource) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 24)) + '</td>' +
          '<td>' + esc(row.updatedAt || '-') + '</td>' +
          '<td><span class="ops"><button class="op-link" data-action="edit" data-id="' + esc(row.id) + '">录入实际值</button><button class="op-link danger" data-action="reset" data-id="' + esc(row.id) + '">恢复 Excel</button></span></td>' +
        '</tr>';
    }).join('');
  }

  function findById(id) {
    return store.getDeductions().find(function (row) { return row.id === id; }) || null;
  }

  function previewClosing() {
    if (!editingId) return;
    var row = findById(editingId);
    if (!row) return;

    var actual = Number(document.getElementById('fActual').value || 0);
    var closing = Number(row.openingBalance || 0) - actual + Number(row.accrualDeduction || 0);
    document.getElementById('fClosing').value = money(closing);
  }

  function openModal(row) {
    if (!row) return;
    editingId = row.id;
    document.getElementById('fPeriod').value = row.period;
    document.getElementById('fCustomer').value = row.customer;
    document.getElementById('fFeeType').value = row.feeType;
    document.getElementById('fOpening').value = money(row.openingBalance);
    document.getElementById('fIncome').value = money(row.income);
    document.getElementById('fAccrual').value = money(row.accrualDeduction);
    document.getElementById('fActual').value = Number(row.actualDeduction || 0);
    document.getElementById('fNote').value = row.note || '';
    previewClosing();
    window.FeeMgmtCommon.openModalMask('editModal');
  }

  function closeModal() {
    editingId = null;
    window.FeeMgmtCommon.closeModalMask('editModal');
  }

  function saveRow() {
    if (!editingId) return;
    var row = findById(editingId);
    if (!row) return;

    store.upsertDeductionActual({
      id: editingId,
      feeType: row.feeType,
      customer: row.customer,
      period: row.period,
      actualAmount: document.getElementById('fActual').value,
      note: document.getElementById('fNote').value.trim()
    });

    closeModal();
    renderTable();
  }

  function bindEvents() {
    ['qPeriod', 'qCustomer', 'qFeeType', 'qState'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderTable);
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qPeriod').value = '';
      document.getElementById('qCustomer').value = '';
      document.getElementById('qFeeType').value = '';
      document.getElementById('qState').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qPeriod'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qFeeType'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qState'));
      renderTable();
    });

    document.getElementById('fActual').addEventListener('input', previewClosing);
    document.getElementById('btnClose').addEventListener('click', closeModal);
    document.getElementById('btnCancel').addEventListener('click', closeModal);
    document.getElementById('btnSave').addEventListener('click', saveRow);
    document.getElementById('editModal').addEventListener('click', function (e) {
      if (e.target.id === 'editModal') closeModal();
    });

    document.getElementById('deductionBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');

      if (action === 'edit') {
        openModal(findById(id));
      } else if (action === 'reset') {
        store.resetDeductionActual(id);
        renderTable();
      }
    });
  }

  function init() {
    populateOptions();
    bindEvents();
    renderTable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
