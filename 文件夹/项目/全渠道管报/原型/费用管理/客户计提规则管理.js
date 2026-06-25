(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingRatioId = null;
  var editingExpenseId = null;
  var CUSTOM_MONTHLY_FUTURE_COUNT = 13;

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
    var anchor = anchorPeriod || getSamplePeriod() || (store.periods && store.periods[0]) || '';
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
    var anchor = getSamplePeriod();
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
    var periodOpts = store.periods.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
    document.getElementById('qSamplePeriod').insertAdjacentHTML('beforeend', periodOpts);
    if (store.periods.length) {
      document.getElementById('qSamplePeriod').value = store.periods[store.periods.length - 1];
    }
  }

  function getMatrixRows() {
    var customer = document.getElementById('qCustomer').value;
    var period = getSamplePeriod();
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
    document.getElementById('statPeriod').textContent = getSamplePeriod() || '—';
    document.getElementById('statSource').textContent = adjusted ? '含调整' : 'Excel';
  }

  function renderMatrixTable() {
    var rows = getMatrixRows();
    var body = document.getElementById('matrixBody');
    var period = getSamplePeriod();
    document.getElementById('matrixTip').textContent = '共 ' + rows.length + ' 条 · 试算期间 ' + period;
    renderStats(rows);

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="13" style="text-align:center;color:#6b7280;padding:32px;">暂无零售商计提规则</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td class="num">' + pct(row.promoRatio) + '</td>' +
          '<td class="num">' + pct(row.salesDiscountRatio) + '</td>' +
          '<td class="num">' + pct(row.cashDiscountRatio) + '</td>' +
          '<td>' + esc(row.salesExpenseMethod) + '</td>' +
          '<td title="' + esc(row.salesExpenseRuleDesc || '') + '">' + esc((row.salesExpenseRuleDesc || '—').slice(0, 36)) + '</td>' +
          '<td class="num">' + money(row.income) + '</td>' +
          '<td class="num">' + money(row.promoAccrual) + '</td>' +
          '<td class="num">' + money(row.salesDiscountAccrual) + '</td>' +
          '<td class="num">' + money(row.cashDiscountAccrual) + '</td>' +
          '<td class="num">' + money(row.salesExpenseAccrual) + '</td>' +
          '<td>' + originTag(row.origin) + '</td>' +
          '<td><span class="ops">' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.promoRuleId) + '">促销</button>' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.salesRuleId) + '">销折</button>' +
            '<button class="op-link" data-action="ratio" data-id="' + esc(row.cashRuleId) + '">现折</button>' +
            '<button class="op-link" data-action="expense" data-id="' + esc(row.expenseRuleId) + '">销费</button>' +
            '<button class="op-link danger" data-action="reset-customer" data-customer="' + esc(row.customer) + '">恢复</button>' +
          '</span></td>' +
        '</tr>';
    }).join('');
  }

  function findFixedById(id) {
    if (!id) return null;
    return store.getFixedRules().find(function (row) { return row.id === id; }) || null;
  }

  function previewRatioModal() {
    if (!editingRatioId) return;
    var row = findFixedById(editingRatioId);
    if (!row) return;
    var period = getSamplePeriod();
    var income = store.getIncome(row.customer, period);
    var ratio = Number(document.getElementById('fRatioValue').value || 0);
    document.getElementById('fRatioPreviewIncome').value = money(income);
    document.getElementById('fRatioPreviewAccrual').value = money(income * ratio);
  }

  function openRatioModal(row) {
    if (!row) return;
    editingRatioId = row.id;
    document.getElementById('ratioModalTitle').textContent = '调整' + row.ratioLabel;
    document.getElementById('fRatioCustomer').value = row.customer;
    document.getElementById('fRatioFeeType').value = row.feeType;
    document.getElementById('fRatioValueLabel').textContent = row.ratioLabel + '（0~1，对应 Excel《扣款比例》）';
    document.getElementById('fRatioValue').value = Number(row.ratio || 0);
    document.getElementById('fRatioNote').value = row.note || '';
    previewRatioModal();
    window.FeeMgmtCommon.openModalMask('ratioModal');
  }

  function closeRatioModal() {
    editingRatioId = null;
    window.FeeMgmtCommon.closeModalMask('ratioModal');
  }

  function saveRatioRule() {
    if (!editingRatioId) return;
    store.upsertFixedRule({
      id: editingRatioId,
      method: 'fixed_ratio',
      ratio: document.getElementById('fRatioValue').value,
      note: document.getElementById('fRatioNote').value.trim()
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
    previewExpenseModal();
  }

  function previewExpenseModal() {
    if (!editingExpenseId) return;
    var row = findFixedById(editingExpenseId);
    if (!row) return;
    var period = getSamplePeriod();
    var income = store.getIncome(row.customer, period);
    var method = document.getElementById('fExpenseMethod').value;
    var accrual = 0;

    if (method === 'monthly_fixed') {
      accrual = Number(document.getElementById('fExpenseMonthlyFixed').value || 0);
    } else if (method === 'annual_avg') {
      accrual = Number(document.getElementById('fExpenseAnnualTotal').value || 0) / 12;
    } else if (method === 'fixed_ratio') {
      accrual = income * Number(document.getElementById('fExpenseRatio').value || 0);
    } else {
      accrual = getCustomMonthlyInputValue(period);
    }

    document.getElementById('fExpensePreviewIncome').value = money(income);
    document.getElementById('fExpensePreviewAccrual').value = money(accrual);
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
      var samplePeriod = getSamplePeriod();
      payload.monthlyAmounts = monthlyAmounts;
      payload.baseAmount = monthlyAmounts[samplePeriod] || 0;
    }

    store.upsertFixedRule(payload);
    closeExpenseModal();
    renderMatrixTable();
  }

  function resetCustomerRules(customer) {
    ['促销扣款', '销售折扣', '现金折扣', '销售费用'].forEach(function (feeType) {
      var id = customer + '|' + feeType;
      if (findFixedById(id)) store.resetFixedRule(id);
    });
    renderMatrixTable();
  }

  function bindEvents() {
    ['qCustomer', 'qSamplePeriod'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () {
        renderMatrixTable();
        if (editingExpenseId && document.getElementById('expenseModal').classList.contains('open')) {
          renderCustomMonthlyGrid(findFixedById(editingExpenseId));
          previewExpenseModal();
        }
      });
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      document.getElementById('qCustomer').value = '';
      document.getElementById('qSamplePeriod').value = store.periods.length ? store.periods[store.periods.length - 1] : '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qSamplePeriod'));
      renderMatrixTable();
    });

    document.getElementById('fRatioValue').addEventListener('input', previewRatioModal);
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
    ['fExpenseMonthlyFixed', 'fExpenseAnnualTotal', 'fExpenseRatio'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', previewExpenseModal);
      document.getElementById(id).addEventListener('change', previewExpenseModal);
    });
    document.getElementById('fExpenseCustomMonthlyBody').addEventListener('input', previewExpenseModal);
    document.getElementById('fExpenseCustomMonthlyBody').addEventListener('change', previewExpenseModal);
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
      } else if (action === 'reset-customer') {
        resetCustomerRules(btn.getAttribute('data-customer'));
      }
    });
  }

  function init() {
    populateOptions();
    bindEvents();
    renderMatrixTable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
