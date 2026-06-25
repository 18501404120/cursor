(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingId = null;
  var calcState = null;

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

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
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

  function ruleIdOf(row) {
    return row.customer + '|' + row.feeType;
  }

  function isSalesExpenseRule(row) {
    return row.feeType === '销售费用';
  }

  function isRatioBasedFee(row) {
    if (!isSalesExpenseRule(row)) return true;
    return row.ruleMethod === 'fixed_ratio';
  }

  function isBudgetFeeType(row) {
    return isSalesExpenseRule(row) && !isRatioBasedFee(row);
  }

  function isMonthlyFixed(row) {
    return row.ruleMethod === 'monthly_fixed';
  }

  function getRowsByGroup(customer, feeType) {
    return store.getDeductions().filter(function (row) {
      return row.customer === customer && row.feeType === feeType;
    }).sort(function (a, b) {
      return a.period.localeCompare(b.period);
    });
  }

  function buildCalcScenario(row) {
    var rule = store.getFixedRule ? store.getFixedRule(ruleIdOf(row)) : null;
    var groupRows = getRowsByGroup(row.customer, row.feeType);
    var rowIndex = groupRows.findIndex(function (item) { return item.id === row.id; });
    var previousRow = rowIndex > 0 ? groupRows[rowIndex - 1] : null;
    var income = round2(row.income || 0);
    var ratio = Number(row.ruleRatio || 0);
    var budgetFee = isBudgetFeeType(row);
    var monthlyFixed = isMonthlyFixed(row);
    var excelBaseAccrual = round2(row.excelBaseAccrual || 0);
    var computedAccrual;

    if (budgetFee) {
      computedAccrual = store.computeDeductionAccrual
        ? round2(store.computeDeductionAccrual(row.customer, row.feeType, row.period, true))
        : round2(row.excelBaseAccrual || row.accrualDeduction || 0);
    } else if (monthlyFixed) {
      computedAccrual = round2(row.ruleBaseAmount || (rule ? rule.baseAmount : 0));
    } else {
      computedAccrual = store.computeDeductionAccrual
        ? round2(store.computeDeductionAccrual(row.customer, row.feeType, row.period, true))
        : round2(income * ratio);
    }

    return {
      row: row,
      rule: rule,
      previousRow: previousRow,
      income: income,
      ratio: ratio,
      budgetFee: budgetFee,
      monthlyFixed: monthlyFixed,
      computedAccrual: computedAccrual,
      openingBalance: round2(row.openingBalance || 0),
      actualDeduction: round2(row.actualDeduction || 0),
      accrualDeduction: round2(row.accrualDeduction || 0),
      closingBalance: round2(row.closingBalance || 0),
      previousClosing: previousRow ? round2(previousRow.closingBalance || 0) : null
    };
  }

  function ratioDisplay(row) {
    if (isSalesExpenseRule(row)) {
      return row.ruleMethodLabel || '销售费用';
    }
    if (isMonthlyFixed(row)) return '月固定额';
    return pct(row.ruleRatio);
  }

  function calcButton(row, field, text) {
    return '<button type="button" class="calc-link" data-action="calc" data-field="' + esc(field) + '" data-id="' + esc(row.id) + '">' + esc(text) + '</button>';
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
    var opening = 0;
    var actual = 0;
    var closing = 0;

    list.forEach(function (row) {
      opening += Number(row.openingBalance || 0);
      actual += Number(row.actualDeduction || 0);
      closing += Number(row.closingBalance || 0);
    });

    document.getElementById('statCount').textContent = list.length;
    document.getElementById('statOpening').textContent = money(opening);
    document.getElementById('statActual').textContent = money(actual);
    document.getElementById('statClosing').textContent = money(closing);
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
      var ratioCell = isRatioBasedFee(row)
        ? calcButton(row, 'ratio', ratioDisplay(row))
        : calcButton(row, 'accrual', ratioDisplay(row));

      return '' +
        '<tr>' +
          '<td>' + esc(row.period) + '</td>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td>' + esc(row.feeType) + '</td>' +
          '<td class="num">' + calcButton(row, 'opening', money(row.openingBalance)) + '</td>' +
          '<td class="num">' + money(row.actualDeduction) + '</td>' +
          '<td class="num">' + ratioCell + '</td>' +
          '<td class="num">' + calcButton(row, 'accrual', money(row.accrualDeduction)) + '</td>' +
          '<td class="num">' + calcButton(row, 'closing', money(row.closingBalance)) + '</td>' +
          '<td class="num">' + money(delta) + '</td>' +
          '<td><span class="' + stateTagClass(state) + '">' + esc(state) + '</span></td>' +
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
    document.getElementById('fRatio').value = ratioDisplay(row);
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

  function focusCalcSection(field) {
    var targetId = 'sectionAccrual';
    if (field === 'ratio') targetId = 'sectionRatio';
    if (field === 'opening') targetId = 'sectionOpening';
    if (field === 'closing') targetId = 'sectionClosing';
    if (field === 'accrual') {
      targetId = calcState && calcState.row && isBudgetFeeType(calcState.row) ? 'sectionBudget' : 'sectionAccrual';
    }

    var target = document.getElementById(targetId);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderCalcModal() {
    if (!calcState || !calcState.row) return;

    var row = calcState.row;
    var scenario = buildCalcScenario(row);
    var rule = scenario.rule;
    var triggerLabel = {
      ratio: '客户计提比例/规则',
      opening: '期初余额',
      accrual: '计提扣款',
      closing: '期末余额'
    }[calcState.field] || '扣款';

    document.getElementById('calcTitle').textContent = triggerLabel + '计算过程';
    document.getElementById('calcSummary').innerHTML = '' +
      '<div class="item"><div class="label">期间</div><div class="value">' + esc(row.period) + '</div></div>' +
      '<div class="item"><div class="label">客户</div><div class="value">' + esc(row.customer) + '</div></div>' +
      '<div class="item"><div class="label">费用项</div><div class="value">' + esc(row.feeType) + '</div></div>' +
      '<div class="item"><div class="label">当月销售收入</div><div class="value">' + money(scenario.income) + '</div></div>';

    document.getElementById('sectionRatio').hidden = scenario.budgetFee;
    document.getElementById('sectionBudget').hidden = !scenario.budgetFee;

    if (!scenario.budgetFee && !scenario.monthlyFixed) {
      var ratioName = row.feeType === '促销扣款' ? '促销扣款比例' : (row.feeType === '销售折扣' ? '销售折扣比例' : (row.feeType === '现金折扣' ? '现金折扣比例' : '计提比例'));
      document.getElementById('ratioFormula').textContent =
        row.feeType + ' 计提扣款 = 当月销售收入 ' + money(scenario.income) +
        ' × ' + ratioName + ' ' + pct(scenario.ratio) +
        '（来源：Excel《扣款比例》' + esc(row.customer) + '）' +
        ' = ' + money(scenario.computedAccrual);
    } else if (scenario.monthlyFixed) {
      document.getElementById('ratioFormula').textContent =
        row.feeType + ' 按固定月度金额计提：' + money(scenario.computedAccrual);
    }

    if (scenario.budgetFee) {
      var method = row.ruleMethodLabel || '销售费用';
      var formulaText = {
        monthly_fixed: '销售费用计提 = 月固定金额 ' + money(scenario.computedAccrual),
        annual_avg: '销售费用计提 = 年总金额 ' + money(row.ruleBaseAmount) + ' ÷ 12 = ' + money(scenario.computedAccrual),
        custom_monthly: '销售费用计提 = ' + esc(row.period) + ' 自定义月金额 ' + money(scenario.computedAccrual),
        fixed_ratio: '销售费用计提 = 当月收入 ' + money(scenario.income) + ' × ' + pct(scenario.ratio) + ' = ' + money(scenario.computedAccrual)
      }[row.ruleMethod] || ('销售费用计提 = ' + money(scenario.accrualDeduction));
      document.getElementById('budgetFormula').textContent = formulaText + (rule && rule.note ? '（' + rule.note + '）' : '');
    }

    document.getElementById('openingFormula').textContent = scenario.previousRow
      ? '本月期初余额 = 上月（' + esc(scenario.previousRow.period) + '）期末余额 = ' + money(scenario.openingBalance)
      : '本月期初余额 = Excel 冲销记录期初值 = ' + money(scenario.openingBalance);

    if (scenario.budgetFee) {
      document.getElementById('accrualFormula').textContent =
        '计提扣款 = ' + (row.ruleMethodLabel || '销售费用规则') + ' → ' + money(scenario.accrualDeduction);
    } else if (scenario.monthlyFixed) {
      document.getElementById('accrualFormula').textContent =
        '计提扣款 = 固定月度金额 ' + money(scenario.accrualDeduction);
    } else {
      document.getElementById('accrualFormula').textContent =
        '计提扣款 = 当月销售收入 ' + money(scenario.income) +
        ' × 计提比例 ' + pct(scenario.ratio) +
        ' = ' + money(scenario.accrualDeduction);
    }

    document.getElementById('closingFormula').textContent =
      '期末余额 = 期初余额 ' + money(scenario.openingBalance) +
      ' - 实际扣款 ' + money(scenario.actualDeduction) +
      ' + 计提扣款 ' + money(scenario.accrualDeduction) +
      ' = ' + money(scenario.closingBalance);

    focusCalcSection(calcState.field);
  }

  function openCalcModal(row, field) {
    if (!row) return;
    calcState = { id: row.id, field: field, row: row };
    renderCalcModal();
    window.FeeMgmtCommon.openModalMask('calcModal');
  }

  function closeCalcModal() {
    calcState = null;
    window.FeeMgmtCommon.closeModalMask('calcModal');
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

  function buildImportTemplateRows() {
    return [
      ['期间', '客户', '费用项', '实际扣款金额', '备注'],
      ['2026-01', 'Target', '促销扣款', '44956.16', '账单核对后录入']
    ];
  }

  function mountImportKit() {
    if (!window.ImportModalKit) return;
    window.ImportModalKit.mount({
      trigger: '#btnImport',
      title: '导入实际扣款',
      introHtml: '<p>批量导入各客户、各费用项、各期间的实际扣款金额。系统按「期间 + 客户 + 费用项」匹配台账，覆盖实际扣款（录入）值，并自动重算期末余额。</p>' +
        '<p><strong>注意：</strong>仅「实际扣款金额」支持导入；计提比例、计提扣款仍由系统按 Excel 规则计算。</p>',
      templateExt: 'CSV',
      templateFileName: '扣款实际值导入模版.csv',
      columns: [
        { group: '主键', name: '期间', required: true, desc: '格式 YYYY-MM' },
        { group: '主键', name: '客户', required: true, desc: '零售商名称' },
        { group: '主键', name: '费用项', required: true, desc: '促销扣款 / 销售折扣 / 现金折扣 / 销售费用' },
        { group: '录入', name: '实际扣款金额', required: true, desc: '正数金额，可带或不带 $ 符号' },
        { group: '录入', name: '备注', required: false, desc: '账单来源、差异说明' }
      ],
      requirements: [
        '期间、客户、费用项组合须在扣款台账中已存在。',
        '实际扣款金额为必填，填写数字即可。',
        '导入后标记为「手工录入」，并触发同客户同费用项后续月份余额顺延。',
        '原型示意中不做真实文件解析，确认导入后模拟批量覆盖当前筛选结果前几条。'
      ],
      onDownload: function () {
        window.ImportModalKit.downloadCsv('扣款实际值导入模版.csv', buildImportTemplateRows());
      },
      onConfirm: function (file, resultEl) {
        if (!file) {
          resultEl.textContent = '请先选择已填写的模版文件。';
          return;
        }
        var rows = getRows();
        var count = 0;
        rows.slice(0, 3).forEach(function (row, index) {
          store.upsertDeductionActual({
            id: row.id,
            feeType: row.feeType,
            customer: row.customer,
            period: row.period,
            actualAmount: Number(row.actualDeduction || 0) + (index + 1) * 50,
            note: '批量导入示意'
          });
          count += 1;
        });
        renderTable();
        resultEl.textContent = '导入完成：成功 ' + count + ' 行，失败 0 行。';
      }
    });
    if (window.FeeMgmtCommon) window.FeeMgmtCommon.ensureHiddenModals();
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

    document.getElementById('btnCalcClose').addEventListener('click', closeCalcModal);
    document.getElementById('btnCalcClose2').addEventListener('click', closeCalcModal);
    document.getElementById('calcModal').addEventListener('click', function (e) {
      if (e.target.id === 'calcModal') closeCalcModal();
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
      } else if (action === 'calc') {
        openCalcModal(findById(id), btn.getAttribute('data-field'));
      }
    });
  }

  function init() {
    populateOptions();
    mountImportKit();
    bindEvents();
    renderTable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
