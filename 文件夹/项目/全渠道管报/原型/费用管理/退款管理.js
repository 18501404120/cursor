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

  function pct(value) {
    var num = Number(value || 0);
    return (num * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '%';
  }

  function sourceTag(source) {
    var cls = source === '手工录入' ? 'manual' : 'excel';
    return '<span class="tag-source ' + cls + '">' + esc(source) + '</span>';
  }

  function populateOptions() {
    var periodOpts = store.periods.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');
    var customerOpts = store.refundCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qPeriod').insertAdjacentHTML('beforeend', periodOpts);
    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
  }

  function getFilters() {
    return {
      period: document.getElementById('qPeriod').value,
      customer: document.getElementById('qCustomer').value
    };
  }

  function getRows() {
    var filters = getFilters();
    return store.getRefunds().filter(function (row) {
      if (filters.period && row.period !== filters.period) return false;
      if (filters.customer && row.customer !== filters.customer) return false;
      return true;
    });
  }

  function renderStats(rows) {
    var list = rows || store.getRefunds();
    var opening = 0;
    var actual = 0;
    var closing = 0;

    list.forEach(function (row) {
      opening += Number(row.openingBalance || 0);
      actual += Number(row.actualRefund || 0);
      closing += Number(row.closingBalance || 0);
    });

    document.getElementById('statCount').textContent = list.length;
    document.getElementById('statOpening').textContent = money(opening);
    document.getElementById('statActual').textContent = money(actual);
    document.getElementById('statClosing').textContent = money(closing);
  }

  function renderTable() {
    var rows = getRows();
    var body = document.getElementById('refundBody');

    renderStats(rows);
    document.getElementById('resultTip').textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="13" style="text-align:center;color:#6b7280;padding:32px;">暂无退款记录</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.period) + '</td>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td class="num">' + money(row.openingBalance) + '</td>' +
          '<td class="num">' + money(row.actualRefund) + '</td>' +
          '<td class="num">' + pct(row.ratio) + '</td>' +
          '<td class="num">' + esc(row.windowMonths) + '</td>' +
          '<td class="num">' + money(row.salesBasis) + '</td>' +
          '<td class="num">' + money(row.accrualAmount) + '</td>' +
          '<td class="num">' + money(row.closingBalance) + '</td>' +
          '<td>' + sourceTag(row.actualSource) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 24)) + '</td>' +
          '<td>' + esc(row.updatedAt || '-') + '</td>' +
          '<td><span class="ops"><button class="op-link" data-action="edit" data-id="' + esc(row.id) + '">录入实际值</button><button class="op-link danger" data-action="reset" data-id="' + esc(row.id) + '">恢复 Excel</button></span></td>' +
        '</tr>';
    }).join('');
  }

  function findById(id) {
    return store.getRefunds().find(function (row) { return row.id === id; }) || null;
  }

  function previewAccrual() {
    if (!editingId) return;
    var row = findById(editingId);
    if (!row) return;

    var actual = Number(document.getElementById('fActual').value || 0);
    var accrual = actual + Number(row.targetClosing || 0) - Number(row.openingBalance || 0);
    document.getElementById('fAccrual').value = money(accrual);
  }

  function openModal(row) {
    if (!row) return;
    editingId = row.id;
    document.getElementById('fPeriod').value = row.period;
    document.getElementById('fCustomer').value = row.customer;
    document.getElementById('fOpening').value = money(row.openingBalance);
    document.getElementById('fRatio').value = pct(row.ratio);
    document.getElementById('fBasis').value = money(row.salesBasis);
    document.getElementById('fTarget').value = money(row.targetClosing);
    document.getElementById('fActual').value = Number(row.actualRefund || 0);
    document.getElementById('fNote').value = row.note || '';
    previewAccrual();
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

    store.upsertRefundActual({
      id: editingId,
      customer: row.customer,
      period: row.period,
      actualAmount: document.getElementById('fActual').value,
      note: document.getElementById('fNote').value.trim()
    });

    closeModal();
    renderTable();
  }

  function bindEvents() {
    document.getElementById('qPeriod').addEventListener('change', renderTable);
    document.getElementById('qCustomer').addEventListener('change', renderTable);

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qPeriod').value = '';
      document.getElementById('qCustomer').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qPeriod'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      renderTable();
    });

    document.getElementById('fActual').addEventListener('input', previewAccrual);
    document.getElementById('btnClose').addEventListener('click', closeModal);
    document.getElementById('btnCancel').addEventListener('click', closeModal);
    document.getElementById('btnSave').addEventListener('click', saveRow);
    document.getElementById('editModal').addEventListener('click', function (e) {
      if (e.target.id === 'editModal') closeModal();
    });

    document.getElementById('refundBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');

      if (action === 'edit') {
        openModal(findById(id));
      } else if (action === 'reset') {
        store.resetRefundActual(id);
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
