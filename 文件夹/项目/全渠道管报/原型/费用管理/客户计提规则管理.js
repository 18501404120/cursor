(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingRatioId = null;
  var editingExpenseId = null;
  var editingDeptItems = null;
  var CUSTOM_MONTHLY_FUTURE_COUNT = 13;
  var OP_LOG_SCOPE = 'customer-rule';

  function appendOpLog(rowKey, entry) {
    if (!window.FeeMgmtOpLog) return;
    var payload = Object.assign({}, entry || {}, { rowKey: rowKey });
    window.FeeMgmtOpLog.append(OP_LOG_SCOPE, payload);
  }

  function logCountLabel(rowKey) {
    if (!window.FeeMgmtOpLog || !rowKey) return '日志';
    var count = window.FeeMgmtOpLog.countByRow(OP_LOG_SCOPE, rowKey);
    return count ? '日志(' + count + ')' : '日志';
  }

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

  function methodLabel(method) {
    var map = {
      monthly_fixed: '月固定金额',
      annual_avg: '年总金额月均分摊',
      fixed_ratio: '固定比例',
      kingdee_doc_ratio: '部门固定比例',
      dept_fixed_ratio: '部门固定比例',
      custom_monthly: '自定义月金额'
    };
    return map[method] || method || '—';
  }

  function ratioCellDisplay(ratio, methodLabelText) {
    var label = methodLabelText && methodLabelText !== '固定比例' ? ' · ' + methodLabelText : '';
    return pct(ratio) + (label ? '<div style="font-size:11px;color:#6b7280;margin-top:2px;">' + esc(methodLabelText) + '</div>' : '');
  }

  function getAnchorPeriod() {
    var list = store.periods || [];
    return list.length ? list[list.length - 1] : '';
  }

  function addMonths(period, offset) {
    if (!period) return '';
    var parts = String(period).split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    month += offset;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    return year + '-' + String(month).padStart(2, '0');
  }

  function getMaintainableMonthPeriods(anchorPeriod) {
    var anchor = anchorPeriod || getAnchorPeriod() || (store.periods && store.periods[0]) || '';
    var list = [];
    for (var i = 0; i <= CUSTOM_MONTHLY_FUTURE_COUNT; i += 1) {
      list.push(addMonths(anchor, i));
    }
    return list;
  }

  function readCustomMonthlyInputValue(input) {
    var raw = String(input.value == null ? '' : input.value).trim();
    if (!raw) return 0;
    var num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  function getCustomMonthlyInputValue(period) {
    var input = document.querySelector('#fExpenseCustomMonthlyBody input[data-period="' + period + '"]');
    return input ? readCustomMonthlyInputValue(input) : 0;
  }

  function collectCustomMonthlyAmounts() {
    var amounts = {};
    document.querySelectorAll('#fExpenseCustomMonthlyBody input[data-period]').forEach(function (input) {
      amounts[input.getAttribute('data-period')] = readCustomMonthlyInputValue(input);
    });
    return amounts;
  }

  function resolveCustomMonthlySeedAmount(row, period) {
    var saved = row.monthlyAmounts || {};
    if (Object.prototype.hasOwnProperty.call(saved, period)) {
      return Number(saved[period]) || 0;
    }
    return Number(store.computeDeductionAccrual(row.customer, '销售费用', period, true)) || 0;
  }

  function renderCustomMonthlyGrid(row) {
    var anchor = getAnchorPeriod();
    var periods = getMaintainableMonthPeriods(anchor);
    var body = document.getElementById('fExpenseCustomMonthlyBody');
    var hint = document.getElementById('fExpenseCustomMonthlyHint');
    if (!row) {
      body.innerHTML = '';
      return;
    }

    body.innerHTML = periods.map(function (period) {
      var amount = resolveCustomMonthlySeedAmount(row, period);
      var displayValue = amount ? String(amount) : '';
      return '' +
        '<tr>' +
          '<td>' + esc(period) + '</td>' +
          '<td class="num">' +
            '<input type="number" min="0" step="0.01" data-period="' + esc(period) + '" value="' + esc(displayValue) + '" placeholder="0">' +
          '</td>' +
        '</tr>';
    }).join('');

    if (hint) {
      hint.textContent = '当前月 ' + anchor + ' 及未来 ' + CUSTOM_MONTHLY_FUTURE_COUNT + ' 个月（共 ' + periods.length + ' 个月）；不填视为 0，保存后与扣款管理联动重算。';
    }
  }

  function populateOptions() {
    var customerOpts = store.deductionCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
  }

  function getMatrixRows() {
    var customer = document.getElementById('qCustomer').value;
    var period = getAnchorPeriod();
    return store.getCustomerDeductionRateMatrix(period).filter(function (row) {
      if (customer && row.customer !== customer) return false;
      return true;
    });
  }

  function renderStats(rows) {
    var list = rows || getMatrixRows();
    var adjusted = list.filter(function (row) { return row.origin === '已调整'; }).length;
    document.getElementById('statCustomers').textContent = list.length;
    document.getElementById('statAdjusted').textContent = adjusted;
    document.getElementById('statSource').textContent = adjusted ? '含调整' : 'Excel';
  }

  function renderMatrixTable() {
    var rows = getMatrixRows();
    var body = document.getElementById('matrixBody');
    document.getElementById('matrixTip').textContent = '共 ' + rows.length + ' 条';
    renderStats(rows);

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:32px;">暂无零售商计提规则</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td class="num">' + ratioCellDisplay(row.promoRatio, row.promoMethod) + '</td>' +
          '<td class="num">' + ratioCellDisplay(row.salesDiscountRatio, row.salesDiscountMethod) + '</td>' +
          '<td class="num">' + ratioCellDisplay(row.cashDiscountRatio, row.cashDiscountMethod) + '</td>' +
          '<td>' + esc(row.salesExpenseMethod) + '</td>' +
          '<td title="' + esc(row.salesExpenseRuleDesc || '') + '">' + esc((row.salesExpenseRuleDesc || '—').slice(0, 48)) + '</td>' +
          '<td><span class="ops">' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.promoRuleId) + '">促销</button>' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.salesRuleId) + '">销折</button>' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.cashRuleId) + '">现折</button>' +
            '<button class="op-link" data-action="expense" data-id="' + esc(row.expenseRuleId) + '">销费</button>' +
            '<button class="op-link" data-action="row-log" data-row-key="' + esc(row.customer) + '" data-row-label="' + esc(row.customer) + '">' + esc(logCountLabel(row.customer)) + '</button>' +
          '</span></td>' +
        '</tr>';
    }).join('');
  }

  function findFixedById(id) {
    if (!id) return null;
    return store.getFixedRules().find(function (row) { return row.id === id; }) || null;
  }

  function normalizeRatioMethod(method) {
    return method === 'kingdee_doc_ratio' ? 'dept_fixed_ratio' : (method || 'fixed_ratio');
  }

  function cloneDeptItems(items) {
    return (items || []).map(function (item) {
      return {
        id: item.id,
        name: item.name,
        ratio: Number(item.ratio || 0)
      };
    });
  }

  function readDeptRatioInputValue(input) {
    var raw = String(input.value == null ? '' : input.value).trim();
    if (!raw) return 0;
    var num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  }

  function collectDeptItemsFromDom() {
    var items = [];
    document.querySelectorAll('#fDeptRatioBody tr[data-dept-id]').forEach(function (row) {
      var id = row.getAttribute('data-dept-id');
      var nameInput = row.querySelector('[data-dept-name]');
      var ratioInput = row.querySelector('[data-dept-ratio]');
      var name = nameInput ? String(nameInput.value || '').trim() : '';
      if (!name) return;
      items.push({
        id: id,
        name: name,
        ratio: ratioInput ? readDeptRatioInputValue(ratioInput) : 0
      });
    });
    return items;
  }

  function renderDeptRatioGrid() {
    var body = document.getElementById('fDeptRatioBody');
    var items = editingDeptItems || [];
    if (!items.length && store.getDefaultDeptItems) {
      editingDeptItems = cloneDeptItems(store.getDefaultDeptItems());
      items = editingDeptItems;
    }

    body.innerHTML = items.map(function (item) {
      var displayValue = Number(item.ratio || 0) ? String(item.ratio) : '';
      return '' +
        '<tr data-dept-id="' + esc(item.id) + '">' +
          '<td><input type="text" data-dept-name value="' + esc(item.name || '') + '" placeholder="请输入部门名称"></td>' +
          '<td class="num">' +
            '<input type="number" min="0" max="1" step="0.00000001" data-dept-ratio value="' + esc(displayValue) + '" placeholder="0">' +
          '</td>' +
          '<td><button type="button" class="op-link danger" data-action="delete-dept" data-dept-id="' + esc(item.id) + '">删除</button></td>' +
        '</tr>';
    }).join('');
  }

  function addDeptRow() {
    if (!editingDeptItems) editingDeptItems = [];
    editingDeptItems.push({
      id: 'dept_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: '',
      ratio: 0
    });
    renderDeptRatioGrid();
  }

  function deleteDeptRow(deptId) {
    if (!editingDeptItems) return;
    editingDeptItems = editingDeptItems.filter(function (item) {
      return item.id !== deptId;
    });
    renderDeptRatioGrid();
  }

  function syncDeptItemsFromDom() {
    editingDeptItems = collectDeptItemsFromDom();
  }

  function toggleRatioFields() {
    var method = normalizeRatioMethod(document.getElementById('fRatioMethod').value);
    var isDept = method === 'dept_fixed_ratio';
    document.getElementById('fieldRatioValue').classList.toggle('hidden', isDept);
    document.getElementById('fieldDeptRatioGrid').classList.toggle('hidden', !isDept);
    if (isDept) {
      renderDeptRatioGrid();
    }
  }

  function openRatioModal(row) {
    if (!row) return;
    editingRatioId = row.id;
    editingDeptItems = cloneDeptItems(
      row.deptItems && row.deptItems.length
        ? row.deptItems
        : (store.resolveDeptItems ? store.resolveDeptItems(row) : (store.getDefaultDeptItems ? store.getDefaultDeptItems() : []))
    );
    document.getElementById('ratioModalTitle').textContent = '调整' + row.ratioLabel;
    document.getElementById('fRatioCustomer').value = row.customer;
    document.getElementById('fRatioFeeType').value = row.feeType;
    document.getElementById('fRatioMethod').value = normalizeRatioMethod(row.method || 'fixed_ratio');
    document.getElementById('fRatioValueLabel').textContent = row.ratioLabel + '（0~1，对应 Excel《扣款比例》）';
    document.getElementById('fRatioValue').value = Number(row.manualRatio != null ? row.manualRatio : row.ratio || 0);
    document.getElementById('fRatioNote').value = row.note || '';
    toggleRatioFields();
    window.FeeMgmtCommon.openModalMask('ratioModal');
  }

  function closeRatioModal() {
    editingRatioId = null;
    editingDeptItems = null;
    window.FeeMgmtCommon.closeModalMask('ratioModal');
  }

  function saveRatioRule() {
    if (!editingRatioId) return;
    var row = findFixedById(editingRatioId);
    if (!row) return;
    var method = normalizeRatioMethod(document.getElementById('fRatioMethod').value);
    var ratioValue = method === 'dept_fixed_ratio' ? null : document.getElementById('fRatioValue').value;
    var note = document.getElementById('fRatioNote').value.trim();
    var payload = {
      id: editingRatioId,
      method: method,
      ratio: ratioValue,
      note: note
    };
    if (method === 'dept_fixed_ratio') {
      syncDeptItemsFromDom();
      payload.deptItems = editingDeptItems.slice();
    }
    store.upsertFixedRule(payload);
    var detailMethod = methodLabel(method);
    var detailRatio = method === 'dept_fixed_ratio'
      ? payload.deptItems.map(function (item) {
        return item.name + ' ' + pct(item.ratio || 0);
      }).join('；')
      : row.ratioLabel + ' ' + pct(ratioValue);
    appendOpLog(row.customer, {
      action: '调整' + row.ratioLabel,
      target: row.customer + ' · ' + row.feeType,
      detail: '方式：' + detailMethod + '；' + detailRatio + (note ? '；备注：' + note : '')
    });
    closeRatioModal();
    renderMatrixTable();
  }

  function toggleExpenseFields() {
    var method = document.getElementById('fExpenseMethod').value;
    document.getElementById('fieldMonthlyFixed').classList.toggle('hidden', method !== 'monthly_fixed');
    document.getElementById('fieldAnnualTotal').classList.toggle('hidden', method !== 'annual_avg');
    document.getElementById('fieldExpenseRatio').classList.toggle('hidden', method !== 'fixed_ratio');
    document.getElementById('fieldCustomMonthlyGrid').classList.toggle('hidden', method !== 'custom_monthly');
  }

  function openExpenseModal(row) {
    if (!row) return;
    editingExpenseId = row.id;
    document.getElementById('fExpenseCustomer').value = row.customer;
    document.getElementById('fExpenseMethod').value = row.method || 'custom_monthly';
    document.getElementById('fExpenseMonthlyFixed').value = Number(row.baseAmount || 0);
    document.getElementById('fExpenseAnnualTotal').value = Number(row.baseAmount || 0);
    document.getElementById('fExpenseRatio').value = Number(row.ratio || 0);
    renderCustomMonthlyGrid(row);
    document.getElementById('fExpenseNote').value = row.note || '';
    toggleExpenseFields();
    window.FeeMgmtCommon.openModalMask('expenseModal');
  }

  function closeExpenseModal() {
    editingExpenseId = null;
    window.FeeMgmtCommon.closeModalMask('expenseModal');
  }

  function saveExpenseRule() {
    if (!editingExpenseId) return;
    var row = findFixedById(editingExpenseId);
    if (!row) return;
    var method = document.getElementById('fExpenseMethod').value;
    var payload = {
      id: editingExpenseId,
      method: method,
      note: document.getElementById('fExpenseNote').value.trim()
    };

    if (method === 'monthly_fixed') {
      payload.baseAmount = document.getElementById('fExpenseMonthlyFixed').value;
    } else if (method === 'annual_avg') {
      payload.baseAmount = document.getElementById('fExpenseAnnualTotal').value;
    } else if (method === 'fixed_ratio') {
      payload.ratio = document.getElementById('fExpenseRatio').value;
    } else {
      var monthlyAmounts = collectCustomMonthlyAmounts();
      var samplePeriod = getAnchorPeriod();
      payload.monthlyAmounts = monthlyAmounts;
      payload.baseAmount = monthlyAmounts[samplePeriod] || 0;
    }

    store.upsertFixedRule(payload);
    appendOpLog(row.customer, {
      action: '调整销售费用计提规则',
      target: row.customer + ' · 销售费用',
      detail: '方式：' + methodLabel(method) + (payload.note ? '；备注：' + payload.note : '')
    });
    closeExpenseModal();
    renderMatrixTable();
  }

  function bindEvents() {
    document.getElementById('qCustomer').addEventListener('change', renderMatrixTable);

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qCustomer').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      renderMatrixTable();
    });

    document.getElementById('fRatioMethod').addEventListener('change', toggleRatioFields);
    document.getElementById('btnAddDeptRow').addEventListener('click', addDeptRow);
    document.getElementById('fDeptRatioBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="delete-dept"]');
      if (!btn) return;
      deleteDeptRow(btn.getAttribute('data-dept-id'));
    });
    document.getElementById('btnRatioClose').addEventListener('click', closeRatioModal);
    document.getElementById('btnRatioCancel').addEventListener('click', closeRatioModal);
    document.getElementById('btnRatioSave').addEventListener('click', saveRatioRule);
    document.getElementById('ratioModal').addEventListener('click', function (e) {
      if (e.target.id === 'ratioModal') closeRatioModal();
    });

    document.getElementById('fExpenseMethod').addEventListener('change', function () {
      if (document.getElementById('fExpenseMethod').value === 'custom_monthly' && editingExpenseId) {
        renderCustomMonthlyGrid(findFixedById(editingExpenseId));
      }
      toggleExpenseFields();
    });
    document.getElementById('btnExpenseClose').addEventListener('click', closeExpenseModal);
    document.getElementById('btnExpenseCancel').addEventListener('click', closeExpenseModal);
    document.getElementById('btnExpenseSave').addEventListener('click', saveExpenseRule);
    document.getElementById('expenseModal').addEventListener('click', function (e) {
      if (e.target.id === 'expenseModal') closeExpenseModal();
    });

    document.getElementById('matrixBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'ratio') {
        openRatioModal(findFixedById(btn.getAttribute('data-id')));
      } else if (action === 'expense') {
        openExpenseModal(findFixedById(btn.getAttribute('data-id')));
      }
    });
  }

  function init() {
    populateOptions();
    if (window.FeeMgmtOpLog) {
      window.FeeMgmtOpLog.wireTable({
        scope: OP_LOG_SCOPE,
        tableBody: '#matrixBody'
      });
    }
    bindEvents();
    renderMatrixTable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
