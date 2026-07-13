(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var base = window.SupermarketAccrualBaseData || {};
  var refundHistoryMap = base.refundHistory || {};
  var editingId = null;
  var calcState = null;
  var qMonthRangePicker = null;
  var OP_LOG_SCOPE = 'refund';

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
    if (!num) return '0%';
    return (num * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
  }

  function getCalcHistoryUntil(customer, period) {
    if (store.getRefundHistoryUntil) {
      return store.getRefundHistoryUntil(customer, period);
    }
    return getHistoryUntil(customer, period);
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function getHistoryRows(customer) {
    var rows = refundHistoryMap[customer];
    return Array.isArray(rows) ? rows.slice() : [];
  }

  function getHistoryUntil(customer, period) {
    return getHistoryRows(customer).filter(function (row) {
      return row.period <= period;
    });
  }

  function getHistoryBefore(customer, period) {
    return getHistoryRows(customer).filter(function (row) {
      return row.period < period;
    });
  }

  function getCurrentSales(customer, period) {
    if (store.getRefundSalesIncome) {
      return round2(store.getRefundSalesIncome(customer, period));
    }
    var match = getHistoryRows(customer).find(function (row) { return row.period === period; });
    return round2(match ? match.sales : 0);
  }

  function takeLast(rows, count) {
    return rows.slice(Math.max(rows.length - count, 0));
  }

  function sum(rows, field, absolute) {
    return round2(rows.reduce(function (total, row) {
      var value = Number(row[field] || 0);
      return total + (absolute ? Math.abs(value) : value);
    }, 0));
  }

  function getDefaultMonthRange() {
    var anchor = store.getRefundAnchorPeriod ? store.getRefundAnchorPeriod() : window.FeeMgmtCommon.currentMonthYm();
    return window.FeeMgmtCommon.getRecentMonthsRange(3, anchor);
  }

  function getMonthRangeFilter() {
    var range;
    if (!qMonthRangePicker || !qMonthRangePicker.get) {
      range = getDefaultMonthRange();
    } else {
      range = qMonthRangePicker.get();
    }
    if (!range.start && !range.end) {
      return getDefaultMonthRange();
    }
    if (range.start && range.end && range.start > range.end) {
      return { start: range.end, end: range.start };
    }
    return range;
  }

  function mountMonthRangeFilter() {
    if (!window.MonthRangePicker) return;
    var defaults = getDefaultMonthRange();
    qMonthRangePicker = window.MonthRangePicker.mount(document.getElementById('qMonthRangeMount'), {
      start: defaults.start,
      end: defaults.end,
      useBodyPortal: true,
      onChange: renderTable
    });
  }

  function resetMonthRangeFilter() {
    var defaults = getDefaultMonthRange();
    if (qMonthRangePicker && qMonthRangePicker.set) {
      qMonthRangePicker.set(defaults.start, defaults.end);
    }
  }

  function getRows() {
    var range = getMonthRangeFilter();
    var customer = document.getElementById('qCustomer').value;

    return store.getRefunds().filter(function (row) {
      if (!window.FeeMgmtCommon.periodInMonthRange(row.period, range.start, range.end)) return false;
      if (customer && row.customer !== customer) return false;
      return true;
    });
  }

  function getFilterTipText() {
    var range = getMonthRangeFilter();
    if (!range.start && !range.end) return '';
    if (range.start && range.end) return ' · 筛选 ' + range.start + ' - ' + range.end;
    return '';
  }

  function getRefundRowsByCustomer(customer) {
    return store.getRefunds().filter(function (row) {
      return row.customer === customer;
    }).sort(function (a, b) {
      return a.period.localeCompare(b.period);
    });
  }

  function shiftPeriod(period, delta) {
    var parts = period.split('-').map(Number);
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

  function getPreviousRatio(row) {
    if (row.prevRatio != null && Number(row.prevRatio) > 0) {
      return Number(row.prevRatio);
    }
    var prevPeriod = shiftPeriod(row.period, -1);
    if (store.computeRefundRatio) {
      return Number(store.computeRefundRatio(row.customer, prevPeriod) || 0);
    }
    return 0;
  }

  function buildCalcScenario(row, previewWindow) {
    var customerRows = getRefundRowsByCustomer(row.customer);
    var rowIndex = customerRows.findIndex(function (item) { return item.id === row.id; });
    var previousRow = rowIndex > 0 ? customerRows[rowIndex - 1] : null;
    var prevPeriodLabel = shiftPeriod(row.period, -1);
    var history12 = takeLast(getCalcHistoryUntil(row.customer, row.period), 12);
    var prevHistory12 = takeLast(getCalcHistoryUntil(row.customer, prevPeriodLabel), 12);
    var history12Sales = sum(history12, 'sales', false);
    var history12Refund = sum(history12, 'refund', true);
    var prevHistory12Sales = sum(prevHistory12, 'sales', false);
    var prevHistory12Refund = sum(prevHistory12, 'refund', true);
    var currentSales = getCurrentSales(row.customer, row.period);
    var windowMonths = Math.max(1, Number(previewWindow || row.windowMonths || 1));
    var isWindowPreview = previewWindow != null && Number(previewWindow) !== Number(row.windowMonths || 1);
    var basisRows = takeLast(getCalcHistoryUntil(row.customer, row.period), windowMonths);
    var openingBasisRows = takeLast(getCalcHistoryUntil(row.customer, prevPeriodLabel), windowMonths);
    var salesBasis = sum(basisRows, 'sales', false);
    var openingSalesBasis = sum(openingBasisRows, 'sales', false);
    var ratio = Number(row.ratio || 0);
    if (!ratio && store.computeRefundRatio) {
      ratio = Number(store.computeRefundRatio(row.customer, row.period) || 0);
    }
    if (!ratio && history12Sales) {
      ratio = round2(history12Refund / history12Sales);
    }
    var openingRatio = store.computeRefundRatio
      ? Number(store.computeRefundRatio(row.customer, prevPeriodLabel) || 0)
      : getPreviousRatio(row);
    if (!openingRatio && prevHistory12Sales) {
      openingRatio = round2(prevHistory12Refund / prevHistory12Sales);
    }
    var computedOpening = round2(openingRatio * openingSalesBasis);
    var computedClosing = round2(ratio * salesBasis);
    var actualRefund = round2(row.actualRefund || 0);

    return {
      row: row,
      previousRow: previousRow,
      currentSales: currentSales,
      windowMonths: windowMonths,
      ratio: ratio,
      prevPeriodLabel: prevPeriodLabel,
      prevHistory12: prevHistory12,
      prevHistory12Sales: prevHistory12Sales,
      prevHistory12Refund: prevHistory12Refund,
      history12: history12,
      history12Sales: history12Sales,
      history12Refund: history12Refund,
      openingBasisRows: openingBasisRows,
      openingSalesBasis: openingSalesBasis,
      openingRatio: openingRatio,
      basisRows: basisRows,
      salesBasis: salesBasis,
      openingBalance: computedOpening,
      actualRefund: actualRefund,
      targetClosing: computedClosing,
      accrualAmount: round2(actualRefund + computedClosing - computedOpening),
      closingBalance: computedClosing,
      isWindowPreview: isWindowPreview
    };
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

  function calcButton(row, field, text) {
    return '<button type="button" class="calc-link" data-action="calc" data-field="' + esc(field) + '" data-id="' + esc(row.id) + '">' + esc(text) + '</button>';
  }

  function renderTable() {
    var rows = getRows();
    if (!rows.length && store.getRefunds().length) {
      resetMonthRangeFilter();
      rows = getRows();
    }
    var body = document.getElementById('refundBody');

    renderStats(rows);
    document.getElementById('resultTip').textContent = '共 ' + rows.length + ' 条' + getFilterTipText() + ' · 金额单位 USD';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="13" style="text-align:center;color:#6b7280;padding:32px;">暂无退款记录</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      var salesIncome = row.salesIncome != null ? row.salesIncome : getCurrentSales(row.customer, row.period);
      var periodLabel = row.isProjected
        ? esc(row.period) + ' <span class="tag-projected">滚动测算</span>'
        : esc(row.period);
      return '' +
        '<tr>' +
          '<td>' + periodLabel + '</td>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td class="num">' + money(salesIncome) + '</td>' +
          '<td class="num">' + calcButton(row, 'opening', money(row.openingBalance)) + '</td>' +
          '<td class="num">' + money(row.actualRefund) + '</td>' +
          '<td class="num">' + calcButton(row, 'prevRatio', pct(getPreviousRatio(row))) + '</td>' +
          '<td class="num">' + calcButton(row, 'ratio', pct(row.ratio)) + '</td>' +
          '<td class="num">' + calcButton(row, 'window', String(row.windowMonths)) + '</td>' +
          '<td class="num">' + calcButton(row, 'accrual', money(row.accrualAmount)) + '</td>' +
          '<td class="num">' + calcButton(row, 'closing', money(row.closingBalance)) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 24)) + '</td>' +
          '<td>' + esc(row.updatedAt || '-') + '</td>' +
          '<td><span class="ops">' +
            '<button class="op-link" data-action="edit" data-id="' + esc(row.id) + '">录入实际值</button>' +
            '<button class="op-link" data-action="row-log" data-row-key="' + esc(row.id) + '" data-row-label="' + esc(row.customer + ' · ' + row.period) + '">' + esc(logCountLabel(row.id)) + '</button>' +
          '</span></td>' +
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

  function openEditModal(row) {
    if (!row) return;
    editingId = row.id;
    document.getElementById('fPeriod').value = row.period;
    document.getElementById('fCustomer').value = row.customer;
    document.getElementById('fOpening').value = money(row.openingBalance);
    document.getElementById('fPrevRatio').value = pct(getPreviousRatio(row));
    document.getElementById('fRatio').value = pct(row.ratio);
    document.getElementById('fTarget').value = money(row.targetClosing);
    document.getElementById('fActual').value = Number(row.actualRefund || 0);
    document.getElementById('fNote').value = row.note || '';
    previewAccrual();
    window.FeeMgmtCommon.openModalMask('editModal');
  }

  function closeEditModal() {
    editingId = null;
    window.FeeMgmtCommon.closeModalMask('editModal');
  }

  function salesIncomeLogicNote() {
    return window.FeeMgmtCommon && window.FeeMgmtCommon.salesIncomeLogicDesc
      ? window.FeeMgmtCommon.salesIncomeLogicDesc
      : '销售收入 − 退货退款的收入（金蝶-销售退货单，type=退货退款）';
  }

  function renderMiniTable(rows, activePeriods) {
    if (!rows.length) {
      return '<p style="margin:0;font-size:12px;color:#6b7280;">无可用历史数据。</p>';
    }

    var activeMap = {};
    (activePeriods || []).forEach(function (item) { activeMap[item] = true; });

    return '' +
      '<table class="mini-table">' +
        '<thead><tr><th>期间</th><th title="' + esc(salesIncomeLogicNote()) + '">销售收入</th><th>实际退款数据</th></tr></thead>' +
        '<tbody>' +
          rows.map(function (item) {
            return '' +
              '<tr class="' + (activeMap[item.period] ? 'active' : '') + '">' +
                '<td>' + esc(item.period) + '</td>' +
                '<td>' + money(item.sales) + '</td>' +
                '<td>' + money(Math.abs(item.refund || 0)) + '</td>' +
              '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>';
  }

  function focusCalcSection(field) {
    var targetId = 'sectionRatio';
    if (field === 'prevRatio') targetId = 'sectionPrevRatio';
    if (field === 'opening') targetId = 'sectionOpening';
    if (field === 'window' || field === 'closing') targetId = 'sectionClosing';
    if (field === 'ratio') targetId = 'sectionRatio';
    if (field === 'accrual') targetId = 'sectionAccrual';

    var target = document.getElementById(targetId);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderCalcModal() {
    if (!calcState || !calcState.row) return;

    var row = calcState.row;
    var scenario = buildCalcScenario(row, document.getElementById('calcWindowInput').value);
    var basisPeriods = scenario.basisRows.map(function (item) { return item.period; });
    var triggerLabel = {
      prevRatio: '上月滚动退款率',
      ratio: '本月滚动退款率',
      window: '目标窗口（月）',
      opening: '期初计提退款余额',
      accrual: '当月计提退款',
      closing: '期末计提退款余额'
    }[calcState.field] || '退款计算';

    document.getElementById('calcTitle').textContent = triggerLabel + '计算过程';
    document.getElementById('calcPrevRatioInput').value = pct(scenario.openingRatio);
    document.getElementById('calcRatioInput').value = pct(scenario.ratio);
    document.getElementById('calcSalesIncomeInput').value = money(scenario.currentSales);

    document.getElementById('calcSummary').innerHTML = '' +
      '<div class="item"><div class="label">期间</div><div class="value">' + esc(row.period) + '</div></div>' +
      '<div class="item"><div class="label">客户</div><div class="value">' + esc(row.customer) + '</div></div>' +
      '<div class="item"><div class="label" title="' + esc(salesIncomeLogicNote()) + '">销售收入</div><div class="value">' + money(scenario.currentSales) + '</div></div>' +
      '<div class="item"><div class="label">目标窗口</div><div class="value">' + esc(String(scenario.windowMonths)) + ' 月</div></div>';

    document.getElementById('ratioFormula').textContent =
      '本月滚动退款率 = 截至 ' + esc(row.period) + ' 近12个月实际退款合计 ' + money(scenario.history12Refund) +
      ' / 近12个月销售收入合计 ' + money(scenario.history12Sales) +
      ' = ' + pct(scenario.ratio);

    document.getElementById('ratioHistoryWrap').innerHTML = renderMiniTable(scenario.history12, []);

    document.getElementById('prevRatioFormula').textContent =
      '上月滚动退款率 = 截至 ' + esc(scenario.prevPeriodLabel) + ' 近12个月实际退款合计 ' + money(scenario.prevHistory12Refund) +
      ' / 近12个月销售收入合计 ' + money(scenario.prevHistory12Sales) +
      ' = ' + pct(scenario.openingRatio);

    document.getElementById('prevRatioHistoryWrap').innerHTML = renderMiniTable(scenario.prevHistory12, []);

    document.getElementById('openingFormula').textContent =
      '本月期初计提退款余额 = 上月滚动退款率 ' + pct(scenario.openingRatio) +
      ' × 过去近 ' + scenario.windowMonths + ' 个月销售收入（截至 ' + esc(scenario.prevPeriodLabel) + '，' +
      scenario.openingBasisRows.map(function (item) { return money(item.sales); }).join(' + ') +
      '） = ' + money(scenario.openingBalance);

    document.getElementById('openingHistoryWrap').innerHTML = renderMiniTable(
      scenario.openingBasisRows,
      scenario.openingBasisRows.map(function (item) { return item.period; })
    );

    document.getElementById('closingFormula').textContent =
      '本月期末计提退款余额 = 本月滚动退款率 ' + pct(scenario.ratio) +
      ' × 过去近 ' + scenario.windowMonths + ' 个月销售收入（截至 ' + esc(row.period) + '，' +
      scenario.basisRows.map(function (item) { return money(item.sales); }).join(' + ') +
      '） = ' + money(scenario.closingBalance);

    document.getElementById('closingHistoryWrap').innerHTML = renderMiniTable(scenario.basisRows, basisPeriods);

    document.getElementById('accrualFormula').textContent =
      '当月计提退款 = 实际退款金额 ' + money(scenario.actualRefund) +
      ' + 期末计提退款余额 ' + money(scenario.targetClosing) +
      ' - 期初计提退款余额 ' + money(scenario.openingBalance) +
      ' = ' + money(scenario.accrualAmount);

    focusCalcSection(calcState.field);
  }

  function openCalcModal(row, field) {
    if (!row) return;
    calcState = { id: row.id, field: field, row: row };
    document.getElementById('calcWindowInput').value = row.windowMonths;
    renderCalcModal();
    window.FeeMgmtCommon.openModalMask('calcModal');
  }

  function closeCalcModal() {
    calcState = null;
    window.FeeMgmtCommon.closeModalMask('calcModal');
  }

  function saveCalcWindow() {
    if (!calcState || !calcState.id) return;
    var row = findById(calcState.id);
    var currentRule = store.getRefundRule(calcState.id);
    if (!row || !currentRule) return;

    store.upsertRefundRule({
      id: calcState.id,
      ratio: currentRule.ratio,
      windowMonths: document.getElementById('calcWindowInput').value,
      note: currentRule.note || ''
    });

    appendOpLog(calcState.id, {
      action: '调整目标窗口',
      target: row.customer + ' · ' + row.period,
      detail: '目标窗口 ' + row.windowMonths + ' 月 → ' + document.getElementById('calcWindowInput').value + ' 月'
    });

    calcState.row = findById(calcState.id);
    renderTable();
    renderCalcModal();
  }

  function saveRow() {
    if (!editingId) return;
    var row = findById(editingId);
    if (!row) return;

    var actualAmount = document.getElementById('fActual').value;
    var note = document.getElementById('fNote').value.trim();

    store.upsertRefundActual({
      id: editingId,
      customer: row.customer,
      period: row.period,
      actualAmount: actualAmount,
      note: note
    });

    appendOpLog(editingId, {
      action: '录入实际退款',
      target: row.customer + ' · ' + row.period,
      detail: '实际退款 ' + money(actualAmount) + (note ? '；备注：' + note : '')
    });

    closeEditModal();
    renderTable();
  }

  function populateOptions() {
    var customerOpts = store.refundCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
  }

  function buildImportTemplateRows() {
    return [
      ['期间', '客户', '实际退款金额', '备注'],
      ['2026-01', 'Target', '298568.84', '账单核对后录入']
    ];
  }

  function mountImportKit() {
    if (!window.ImportModalKit) return;
    window.ImportModalKit.mount({
      trigger: '#btnImport',
      title: '导入实际退款',
      introHtml: '<p>批量导入各客户、各期间的实际退款金额。系统会按「期间 + 客户」匹配台账记录，覆盖对应行的实际退款（录入）值，并自动重算当月计提退款与期末计提退款余额。</p>' +
        '<p><strong>注意：</strong>仅「实际退款金额」支持导入；滚动退款率、目标窗口等仍由系统按规则计算。</p>',
      templateExt: 'CSV',
      templateFileName: '退款实际值导入模版.csv',
      columns: [
        { group: '主键', name: '期间', required: true, desc: '格式 YYYY-MM，须与系统已有期间一致' },
        { group: '主键', name: '客户', required: true, desc: '零售商名称，须与系统客户主数据一致' },
        { group: '录入', name: '实际退款金额', required: true, desc: '正数金额，可带或不带 $ 符号' },
        { group: '录入', name: '备注', required: false, desc: '可填写账单来源、差异说明' }
      ],
      requirements: [
        '期间与客户组合须在退款台账中已存在，否则该行导入失败。',
        '实际退款金额为必填，填写数字即可，例如 298568.84。',
        '导入后会标记为「手工录入」来源，并触发后续月份余额顺延重算。',
        '原型示意中不做真实文件解析，确认导入后会模拟批量覆盖当前筛选结果中的前几条记录。'
      ],
      onDownload: function () {
        window.ImportModalKit.downloadCsv('退款实际值导入模版.csv', buildImportTemplateRows());
      },
      onConfirm: function (file, resultEl) {
        if (!file) {
          resultEl.textContent = '请先选择已填写的模版文件。';
          return;
        }
        var rows = getRows();
        var count = 0;
        rows.slice(0, 3).forEach(function (row, index) {
          var amount = Number(row.actualRefund || 0) + (index + 1) * 100;
          store.upsertRefundActual({
            id: row.id,
            customer: row.customer,
            period: row.period,
            actualAmount: amount,
            note: '批量导入示意'
          });
          appendOpLog(row.id, {
            action: '批量导入实际退款',
            target: row.customer + ' · ' + row.period,
            detail: '实际退款 ' + money(amount)
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
    document.getElementById('qCustomer').addEventListener('change', renderTable);

    document.getElementById('btnReset').addEventListener('click', function () {
      resetMonthRangeFilter();
      document.getElementById('qCustomer').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      renderTable();
    });

    document.getElementById('fActual').addEventListener('input', previewAccrual);
    document.getElementById('btnClose').addEventListener('click', closeEditModal);
    document.getElementById('btnCancel').addEventListener('click', closeEditModal);
    document.getElementById('btnSave').addEventListener('click', saveRow);
    document.getElementById('editModal').addEventListener('click', function (e) {
      if (e.target.id === 'editModal') closeEditModal();
    });

    document.getElementById('calcWindowInput').addEventListener('input', renderCalcModal);
    document.getElementById('btnCalcClose').addEventListener('click', closeCalcModal);
    document.getElementById('btnCalcCancel').addEventListener('click', closeCalcModal);
    document.getElementById('btnCalcSave').addEventListener('click', saveCalcWindow);
    document.getElementById('calcModal').addEventListener('click', function (e) {
      if (e.target.id === 'calcModal') closeCalcModal();
    });

    document.getElementById('refundBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');

      if (action === 'edit') {
        openEditModal(findById(id));
      } else if (action === 'calc') {
        openCalcModal(findById(id), btn.getAttribute('data-field'));
      }
    });
  }

  function init() {
    if (!store || typeof store.getRefunds !== 'function') {
      var tip = document.getElementById('resultTip');
      if (tip) {
        tip.textContent = '共 0 条 · 台账数据未加载，请确认 supermarket-accrual-base.js 可访问';
      }
      return;
    }
    try {
      populateOptions();
      mountMonthRangeFilter();
      mountImportKit();
      if (window.FeeMgmtOpLog) {
        window.FeeMgmtOpLog.wireTable({
          scope: OP_LOG_SCOPE,
          tableBody: '#refundBody'
        });
      }
      bindEvents();
    } catch (err) {
      console.error('退款管理 init:', err);
    }
    renderTable();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
