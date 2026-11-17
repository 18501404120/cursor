(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var base = window.SupermarketAccrualBaseData || {};
  var refundHistoryMap = base.refundHistory || {};
  var editingId = null;
  var editingSnapshot = null;
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

  function getIncomeCurrency(customer) {
    if (window.FeeMgmtCommon && window.FeeMgmtCommon.getRefundCurrency) {
      return window.FeeMgmtCommon.getRefundCurrency(customer);
    }
    if (window.FeeMgmtCommon && window.FeeMgmtCommon.getCustomerCurrency) {
      return window.FeeMgmtCommon.getCustomerCurrency(customer);
    }
    return 'USD';
  }

  /** 退款域金额展示：必须按退款币种（加拿大四客户 CNY→¥），禁止落到扣款币种 CAD/USD */
  function money(value, customerOrCurrency) {
    var currency = getIncomeCurrency(customerOrCurrency);
    if (window.FeeMgmtCommon && window.FeeMgmtCommon.formatMoney) {
      return window.FeeMgmtCommon.formatMoney(value, currency);
    }
    var num = Number(value || 0);
    var prefix = num < 0 ? '-' : '';
    var abs = Math.abs(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === 'CNY') return prefix + '¥' + abs;
    if (currency === 'CAD') return prefix + 'C$' + abs;
    return prefix + '$' + abs;
  }

  function formatCurrencyAmount(amount, currency) {
    if (window.FeeMgmtCommon && window.FeeMgmtCommon.formatCurrencyAmount) {
      return window.FeeMgmtCommon.formatCurrencyAmount(amount, currency);
    }
    return 'USD ' + Number(amount || 0).toFixed(2);
  }

  function setCurrencyDisplay(customer) {
    var input = document.getElementById('fCurrency');
    var incomeInput = document.getElementById('fIncomeCurrency');
    var currency = getIncomeCurrency(customer);
    if (input) input.value = currency;
    if (incomeInput) incomeInput.value = currency;
  }

  function exportText(value) {
    return '="' + String(value || '') + '"';
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
    var incomeStatus = document.getElementById('qIncomeStatus') ? document.getElementById('qIncomeStatus').value : '';

    return store.getRefunds().filter(function (row) {
      if (!window.FeeMgmtCommon.periodInMonthRange(row.period, range.start, range.end)) return false;
      if (customer && row.customer !== customer) return false;
      if (incomeStatus) {
        if (incomeStatus === '已关账') {
          if (!row.periodClosed) return false;
        } else if (incomeStatus === '未确认') {
          if (row.periodClosed || row.incomeStatus !== '未确认') return false;
        } else if (row.incomeStatus !== incomeStatus) {
          return false;
        }
      }
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
    var selectedCustomer = document.getElementById('qCustomer').value;
    var statsCurrency = window.FeeMgmtCommon && window.FeeMgmtCommon.resolveStatsCurrency
      ? window.FeeMgmtCommon.resolveStatsCurrency(list, selectedCustomer, 'refund')
      : 'USD';

    list.forEach(function (row) {
      opening += Number(row.openingBalance || 0);
      actual += Number(row.actualRefund || 0);
      closing += Number(row.closingBalance || 0);
    });

    document.getElementById('statCount').textContent = list.length;
    document.getElementById('statOpening').textContent = money(opening, statsCurrency);
    document.getElementById('statActual').textContent = money(actual, statsCurrency);
    document.getElementById('statClosing').textContent = money(closing, statsCurrency);
  }

  function calcButton(row, field, text) {
    return '<button type="button" class="calc-link" data-action="calc" data-field="' + esc(field) + '" data-id="' + esc(row.id) + '">' + esc(text) + '</button>';
  }

  function incomeStatusTag(row) {
    if (row.periodClosed) {
      return '<span class="tag tag-closed">已关账</span>';
    }
    var isConfirmed = row.incomeStatus === '已确认';
    return '<span class="tag ' + (isConfirmed ? 'tag-ready' : 'tag-pending') + '">' + esc(row.incomeStatus || '未确认') + '</span>';
  }

  function renderIncomeCell(row) {
    var customer = row.customer;
    var salesIncome = row.salesIncome != null ? row.salesIncome : getCurrentSales(customer, row.period);
    var systemIncome = row.systemSalesIncome != null ? row.systemSalesIncome : salesIncome;
    var html = '<div class="income-cell">';
    if (row.periodClosed) {
      html += '<div title="已关账，不能改收入">' + money(salesIncome, customer) + '</div>';
    } else {
      html += '<button type="button" class="calc-link" data-action="edit" data-id="' + esc(row.id) + '" title="点击录入或调整销售收入">' + money(salesIncome, customer) + '</button>';
    }
    if (row.incomeStatus === '已确认' && round2(systemIncome) !== round2(salesIncome)) {
      html += '<div class="sys">系统 ' + money(systemIncome, customer) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function selectedRefundIds() {
    return Array.prototype.slice.call(document.querySelectorAll('#refundBody input[data-row-check]:checked'))
      .map(function (el) { return el.getAttribute('data-row-check'); });
  }

  function syncCheckAll() {
    var chkAll = document.getElementById('chkAll');
    if (!chkAll) return;
    var boxes = document.querySelectorAll('#refundBody input[data-row-check]');
    var checked = document.querySelectorAll('#refundBody input[data-row-check]:checked');
    chkAll.checked = boxes.length > 0 && checked.length === boxes.length;
    chkAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }

  function renderTable() {
    var rows = getRows();
    if (!rows.length && store.getRefunds().length) {
      var statusEl = document.getElementById('qIncomeStatus');
      if (statusEl && statusEl.value) {
        // keep empty-state when status filter has no match
      } else {
        resetMonthRangeFilter();
        rows = getRows();
      }
    }
    var body = document.getElementById('refundBody');

    renderStats(rows);
    document.getElementById('resultTip').textContent = '共 ' + rows.length + ' 条' + getFilterTipText() + ' · 点销售收入金额或「录入收入/退款」可改收入';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="15" style="text-align:center;color:#6b7280;padding:32px;">暂无退款记录</td></tr>';
      syncCheckAll();
      return;
    }

    body.innerHTML = rows.map(function (row) {
      var customer = row.customer;
      var canConfirm = row.incomeStatus !== '已确认' && !row.periodClosed;
      var ops = '';
      if (row.periodClosed) {
        ops += '<button class="op-link" data-action="edit" data-id="' + esc(row.id) + '">查看详情</button>';
      } else {
        if (canConfirm) {
          ops += '<button class="op-link" data-action="confirm" data-id="' + esc(row.id) + '">确认</button>';
        }
        ops += '<button class="op-link" data-action="edit" data-id="' + esc(row.id) + '">录入收入/退款</button>';
      }
      ops += '<button class="op-link" data-action="row-log" data-row-key="' + esc(row.id) + '" data-row-label="' + esc(row.customer + ' · ' + row.period) + '">' + esc(logCountLabel(row.id)) + '</button>';
      return '' +
        '<tr>' +
          '<td class="col-check"><input type="checkbox" ' + (row.periodClosed ? 'disabled ' : '') + 'data-row-check="' + esc(row.id) + '" aria-label="选择 ' + esc(row.customer) + ' ' + esc(row.period) + '"></td>' +
          '<td>' + esc(row.period) + (row.isProjected ? '<span class="tag-projected">滚动测算</span>' : '') + '</td>' +
          '<td>' + esc(customer) + '</td>' +
          '<td class="num">' + renderIncomeCell(row) + '</td>' +
          '<td>' + incomeStatusTag(row) + '</td>' +
          '<td class="num">' + calcButton(row, 'opening', money(row.openingBalance, customer)) + '</td>' +
          '<td class="num">' + money(row.actualRefund, customer) + '</td>' +
          '<td class="num">' + calcButton(row, 'prevRatio', pct(getPreviousRatio(row))) + '</td>' +
          '<td class="num">' + calcButton(row, 'ratio', pct(row.ratio)) + '</td>' +
          '<td class="num">' + calcButton(row, 'window', String(row.windowMonths)) + '</td>' +
          '<td class="num">' + calcButton(row, 'accrual', money(row.accrualAmount, customer)) + '</td>' +
          '<td class="num">' + calcButton(row, 'closing', money(row.closingBalance, customer)) + '</td>' +
          '<td title="' + esc(row.note || '') + '">' + esc((row.note || '').slice(0, 24)) + '</td>' +
          '<td>' + esc(row.updatedAt || '-') + '</td>' +
          '<td><span class="ops">' + ops + '</span></td>' +
        '</tr>';
    }).join('');
    syncCheckAll();
  }

  function exportRows() {
    var rows = getRows();
    if (!rows.length) {
      window.alert('当前筛选结果为空，无可导出数据');
      return;
    }
    var csvRows = [
      ['期间', '客户', '销售收入', '收入状态', '系统销售收入', '期初计提退款余额', '实际退款(录入)', '上月滚动退款率', '本月滚动退款率', '目标窗口(月)', '当月计提退款', '期末计提退款余额', '备注', '更新时间']
    ].concat(rows.map(function (row) {
      var salesIncome = row.salesIncome != null ? row.salesIncome : getCurrentSales(row.customer, row.period);
      var customer = row.customer;
      return [
        exportText(row.period),
        row.customer,
        exportText(money(salesIncome, customer)),
        row.incomeStatus || '未确认',
        exportText(money(row.systemSalesIncome != null ? row.systemSalesIncome : salesIncome, customer)),
        exportText(money(row.openingBalance, customer)),
        exportText(money(row.actualRefund, customer)),
        pct(getPreviousRatio(row)),
        pct(row.ratio),
        String(row.windowMonths),
        exportText(money(row.accrualAmount, customer)),
        exportText(money(row.closingBalance, customer)),
        row.note || '',
        row.updatedAt || '-'
      ];
    }));
    window.FeeMgmtCommon.downloadCsv('退款管理导出.csv', csvRows);
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
    document.getElementById('fAccrual').value = money(accrual, row.customer);
  }

  function openEditModal(row) {
    if (!row) return;
    editingId = row.id;
    var salesIncome = row.salesIncome != null ? row.salesIncome : getCurrentSales(row.customer, row.period);
    document.getElementById('fPeriod').value = row.period;
    document.getElementById('fCustomer').value = row.customer;
    document.getElementById('fOpening').value = money(row.openingBalance, row.customer);
    document.getElementById('fPrevRatio').value = pct(getPreviousRatio(row));
    document.getElementById('fRatio').value = pct(row.ratio);
    document.getElementById('fTarget').value = money(row.targetClosing, row.customer);

    var isClosed = !!row.periodClosed;
    var fSalesIncome = document.getElementById('fSalesIncome');
    var fActual = document.getElementById('fActual');
    var fNote = document.getElementById('fNote');
    var modalTitle = document.getElementById('editModalTitle');
    var lblIncome = document.getElementById('lblSalesIncome');
    var lblActual = document.getElementById('lblActual');
    var btnSave = document.getElementById('btnSave');
    var btnCancel = document.getElementById('btnCancel');
    var hint = document.getElementById('fIncomeHint');

    fSalesIncome.value = Number(salesIncome || 0);
    fActual.value = Number(row.actualRefund || 0);
    fNote.value = row.note || '';

    if (isClosed) {
      if (modalTitle) modalTitle.textContent = '收入与退款详情（已关账）';
      if (lblIncome) lblIncome.textContent = '销售收入（已关账锁定）';
      if (lblActual) lblActual.textContent = '实际退款金额（已关账锁定）';
      fSalesIncome.readOnly = true;
      fSalesIncome.classList.add('readonly-box');
      fActual.readOnly = true;
      fActual.classList.add('readonly-box');
      fNote.readOnly = true;
      fNote.classList.add('readonly-box');
      if (btnSave) btnSave.style.display = 'none';
      if (btnCancel) btnCancel.textContent = '关闭';
      if (hint) {
        hint.textContent = '该期间已完成财务关账，数据已冻结归档，不支持修改。';
        hint.style.color = '#d46b08';
      }
    } else {
      if (modalTitle) modalTitle.textContent = '录入收入与实际退款';
      if (lblIncome) lblIncome.textContent = '销售收入（可改）';
      if (lblActual) lblActual.textContent = '实际退款金额（可改）';
      fSalesIncome.readOnly = false;
      fSalesIncome.classList.remove('readonly-box');
      fActual.readOnly = false;
      fActual.classList.remove('readonly-box');
      fNote.readOnly = false;
      fNote.classList.remove('readonly-box');
      if (btnSave) btnSave.style.display = 'inline-block';
      if (btnCancel) btnCancel.textContent = '取消';
      if (hint) {
        hint.textContent = '当前状态：' + (row.incomeStatus || '未确认') + '。系统计算值 ' + money(row.systemSalesIncome != null ? row.systemSalesIncome : salesIncome, row.customer) + '。改收入并保存 → 已确认；只改退款/备注不改变收入状态。保存后按新收入重算滚动率与计提。';
        hint.style.color = '#6b7280';
      }
    }
    editingSnapshot = {
      income: round2(salesIncome),
      actual: round2(row.actualRefund || 0),
      note: String(row.note || '')
    };
    setCurrencyDisplay(row.customer);
    previewAccrual();
    window.FeeMgmtCommon.openModalMask('editModal');
    setTimeout(function () {
      var el = document.getElementById('fSalesIncome');
      if (!el || el.readOnly) return;
      el.focus();
      if (typeof el.select === 'function') el.select();
    }, 50);
  }

  function closeEditModal() {
    editingId = null;
    editingSnapshot = null;
    window.FeeMgmtCommon.closeModalMask('editModal');
  }

  function salesIncomeLogicNote() {
    return window.FeeMgmtCommon && window.FeeMgmtCommon.salesIncomeLogicDesc
      ? window.FeeMgmtCommon.salesIncomeLogicDesc
      : '销售收入 − 退货退款的收入（金蝶-销售退货单，type=退货退款）';
  }

  function renderMiniTable(rows, activePeriods, customer) {
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
                '<td>' + money(item.sales, customer) + '</td>' +
                '<td>' + money(Math.abs(item.refund || 0), customer) + '</td>' +
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
    var customer = row.customer;
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
    document.getElementById('calcSalesIncomeInput').value = money(scenario.currentSales, customer);

    document.getElementById('calcSummary').innerHTML = '' +
      '<div class="item"><div class="label">期间</div><div class="value">' + esc(row.period) + '</div></div>' +
      '<div class="item"><div class="label">客户</div><div class="value">' + esc(customer) + '</div></div>' +
      '<div class="item"><div class="label" title="' + esc(salesIncomeLogicNote()) + '">销售收入</div><div class="value">' + money(scenario.currentSales, customer) + '</div></div>' +
      '<div class="item"><div class="label">收入状态</div><div class="value">' + esc(row.incomeStatus || '未确认') + '</div></div>' +
      '<div class="item"><div class="label">目标窗口</div><div class="value">' + esc(String(scenario.windowMonths)) + ' 月</div></div>';

    document.getElementById('ratioFormula').textContent =
      '本月滚动退款率 = 截至 ' + esc(row.period) + ' 近12个月实际退款合计 ' + money(scenario.history12Refund, customer) +
      ' / 近12个月销售收入合计 ' + money(scenario.history12Sales, customer) +
      ' = ' + pct(scenario.ratio);

    document.getElementById('ratioHistoryWrap').innerHTML = renderMiniTable(scenario.history12, [], customer);

    document.getElementById('prevRatioFormula').textContent =
      '上月滚动退款率 = 截至 ' + esc(scenario.prevPeriodLabel) + ' 近12个月实际退款合计 ' + money(scenario.prevHistory12Refund, customer) +
      ' / 近12个月销售收入合计 ' + money(scenario.prevHistory12Sales, customer) +
      ' = ' + pct(scenario.openingRatio);

    document.getElementById('prevRatioHistoryWrap').innerHTML = renderMiniTable(scenario.prevHistory12, [], customer);

    document.getElementById('openingFormula').textContent =
      '本月期初计提退款余额 = 上月滚动退款率 ' + pct(scenario.openingRatio) +
      ' × 过去近 ' + scenario.windowMonths + ' 个月销售收入（截至 ' + esc(scenario.prevPeriodLabel) + '，' +
      scenario.openingBasisRows.map(function (item) { return money(item.sales, customer); }).join(' + ') +
      '） = ' + money(scenario.openingBalance, customer);

    document.getElementById('openingHistoryWrap').innerHTML = renderMiniTable(
      scenario.openingBasisRows,
      scenario.openingBasisRows.map(function (item) { return item.period; }),
      customer
    );

    document.getElementById('closingFormula').textContent =
      '本月期末计提退款余额 = 本月滚动退款率 ' + pct(scenario.ratio) +
      ' × 过去近 ' + scenario.windowMonths + ' 个月销售收入（截至 ' + esc(row.period) + '，' +
      scenario.basisRows.map(function (item) { return money(item.sales, customer); }).join(' + ') +
      '） = ' + money(scenario.closingBalance, customer);

    document.getElementById('closingHistoryWrap').innerHTML = renderMiniTable(scenario.basisRows, basisPeriods, customer);

    document.getElementById('accrualFormula').textContent =
      '当月计提退款 = 实际退款金额 ' + money(scenario.actualRefund, customer) +
      ' + 期末计提退款余额 ' + money(scenario.targetClosing, customer) +
      ' - 期初计提退款余额 ' + money(scenario.openingBalance, customer) +
      ' = ' + money(scenario.accrualAmount, customer);

    var btnCalcEdit = document.getElementById('btnCalcEditIncome');
    if (btnCalcEdit) {
      if (row.periodClosed) {
        btnCalcEdit.style.display = 'none';
      } else {
        btnCalcEdit.style.display = 'inline-flex';
      }
    }

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

  function confirmRow(row) {
    if (!row) return;
    if (row.periodClosed) {
      window.alert('已关账月份不能确认收入。');
      return;
    }
    if (row.incomeStatus === '已确认') return;
    var amount = row.salesIncome != null ? row.salesIncome : getCurrentSales(row.customer, row.period);
    if (!window.confirm('将 ' + row.customer + ' · ' + row.period + ' 的当前收入 ' + money(amount, row.customer) + ' 确认为业务确认值？')) {
      return;
    }
    var result = store.confirmRefundIncome(row.id);
    if (!result || !result.ok) {
      window.alert(result && result.reason === 'closed' ? '已关账月份不能确认收入。' : '确认失败。');
      return;
    }
    appendOpLog(row.id, {
      action: '确认销售收入',
      target: row.customer + ' · ' + row.period,
      detail: '确认收入 ' + formatCurrencyAmount(amount, getIncomeCurrency(row.customer)) + '（系统计算值）'
    });
    renderTable();
  }

  function batchConfirmIncome() {
    var ids = selectedRefundIds();
    if (!ids.length) {
      window.alert('请先勾选要确认的行。');
      return;
    }
    var targets = ids.map(findById).filter(function (row) {
      return row && row.incomeStatus !== '已确认' && !row.periodClosed;
    });
    if (!window.confirm('将勾选行中未确认、未关账的记录，按当前展示收入确认为业务确认值？已确认和已关账行会跳过。')) {
      return;
    }
    var results = store.confirmRefundIncomes(targets.map(function (row) { return row.id; }));
    targets.forEach(function (row) {
      appendOpLog(row.id, {
        action: '批量确认销售收入',
        target: row.customer + ' · ' + row.period,
        detail: '确认收入 ' + formatCurrencyAmount(row.salesIncome, getIncomeCurrency(row.customer))
      });
    });
    renderTable();
    window.alert('已确认 ' + (results.ok || 0) + ' 行，其余勾选行因已确认或已关账已跳过。');
  }

  function saveRow() {
    if (!editingId || !editingSnapshot) return;
    var row = findById(editingId);
    if (!row) return;

    var incomeRaw = document.getElementById('fSalesIncome').value;
    var actualRaw = document.getElementById('fActual').value;
    var note = document.getElementById('fNote').value.trim();
    var incomeAmount = round2(incomeRaw === '' ? editingSnapshot.income : Number(incomeRaw || 0));
    var actualAmount = round2(actualRaw === '' ? 0 : Number(actualRaw || 0));
    var incomeChanged = round2(incomeAmount) !== round2(editingSnapshot.income);
    var actualChanged = round2(actualAmount) !== round2(editingSnapshot.actual);
    var noteChanged = note !== editingSnapshot.note;
    var currency = getIncomeCurrency(row.customer);

    if (!incomeChanged && !actualChanged && !noteChanged) {
      window.alert('未修改，无需保存。');
      return;
    }
    if (incomeChanged && row.periodClosed) {
      window.alert('已关账月份不能改收入。');
      return;
    }

    if (incomeChanged) {
      var incomeResult = store.upsertRefundIncome({
        id: editingId,
        customer: row.customer,
        period: row.period,
        confirmedAmount: incomeAmount,
        source: 'enter'
      });
      if (!incomeResult || !incomeResult.ok) {
        window.alert(incomeResult && incomeResult.reason === 'closed' ? '已关账月份不能改收入。' : '保存收入失败。');
        return;
      }
      appendOpLog(editingId, {
        action: '录入销售收入',
        target: row.customer + ' · ' + row.period,
        detail: '销售收入 ' + formatCurrencyAmount(editingSnapshot.income, currency) + ' → ' + formatCurrencyAmount(incomeAmount, currency) + '，状态已确认'
      });
    }

    if (actualChanged || noteChanged) {
      var actualPayload = {
        id: editingId,
        customer: row.customer,
        period: row.period,
        currency: currency
      };
      if (actualChanged) actualPayload.actualAmount = actualAmount;
      if (noteChanged) actualPayload.note = note;
      store.upsertRefundActual(actualPayload);
      appendOpLog(editingId, {
        action: actualChanged ? '录入实际退款' : '更新备注',
        target: row.customer + ' · ' + row.period,
        detail: (actualChanged ? ('实际退款 ' + formatCurrencyAmount(actualAmount, currency)) : '') +
          (noteChanged ? ((actualChanged ? '；' : '') + '备注：' + note) : '')
      });
    }

    closeEditModal();
    renderTable();
  }

  function populateOptions() {
    var customerOpts = store.refundCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
  }

  var IMPORT_TEMPLATE_DOC_URL = 'https://alidocs.dingtalk.com/i/nodes/YndMj49yWjPGo3reIRRww7RKJ3pmz5aA';

  function parseAmountCell(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return null;
    var cleaned = raw.replace(/C\$/g, '').replace(/[$¥]/g, '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    var num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }

  function splitCsvLine(line) {
    var cells = [];
    var current = '';
    var inQuotes = false;
    var i;
    for (i = 0; i < line.length; i += 1) {
      var ch = line.charAt(i);
      if (inQuotes) {
        if (ch === '"' && line.charAt(i + 1) === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === '\t') {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  }

  function parseRefundImportText(text) {
    var lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (line) {
      return line.trim();
    });
    if (lines.length < 2) return [];
    var headers = splitCsvLine(lines[0]).map(function (item) { return item.trim(); });
    function colIndex(matcher) {
      var idx = -1;
      headers.forEach(function (header, i) {
        if (idx < 0 && matcher.test(header)) idx = i;
      });
      return idx;
    }
    var periodIdx = colIndex(/期间/);
    var customerIdx = colIndex(/客户/);
    var incomeIdx = colIndex(/收入金额/);
    var refundIdx = colIndex(/实际退款/);
    var noteIdx = colIndex(/备注/);
    if (periodIdx < 0 || customerIdx < 0) return [];
    return lines.slice(1).map(function (line) {
      var cells = splitCsvLine(line);
      return {
        period: String(cells[periodIdx] || '').trim(),
        customer: String(cells[customerIdx] || '').trim(),
        incomeAmount: incomeIdx >= 0 ? parseAmountCell(cells[incomeIdx]) : null,
        refundAmount: refundIdx >= 0 ? parseAmountCell(cells[refundIdx]) : null,
        note: noteIdx >= 0 ? String(cells[noteIdx] || '').trim() : ''
      };
    });
  }

  function applyIncomeRefundImport(row, incomeAmount, refundAmount, note, sourceLabel) {
    var currency = getIncomeCurrency(row.customer);
    var incomeTouched = incomeAmount != null && !Number.isNaN(incomeAmount);
    var refundTouched = refundAmount != null && !Number.isNaN(refundAmount);
    var noteTouched = !!(note && String(note).trim());
    if (!incomeTouched && !refundTouched) return { ok: false, reason: 'empty' };
    if (incomeTouched && row.periodClosed) return { ok: false, reason: 'closed' };

    if (incomeTouched) {
      var incomeResult = store.upsertRefundIncome({
        id: row.id,
        customer: row.customer,
        period: row.period,
        confirmedAmount: incomeAmount,
        source: 'import'
      });
      if (!incomeResult || !incomeResult.ok) return { ok: false, reason: incomeResult ? incomeResult.reason : 'income' };
      appendOpLog(row.id, {
        action: sourceLabel || '导入销售收入',
        target: row.customer + ' · ' + row.period,
        detail: '销售收入 ' + formatCurrencyAmount(incomeAmount, currency) + '，状态已确认'
      });
    }
    if (refundTouched || noteTouched) {
      var payload = {
        id: row.id,
        customer: row.customer,
        period: row.period,
        currency: currency
      };
      if (refundTouched) payload.actualAmount = refundAmount;
      if (noteTouched) payload.note = note;
      store.upsertRefundActual(payload);
      appendOpLog(row.id, {
        action: refundTouched ? (sourceLabel || '导入实际退款') : '导入备注',
        target: row.customer + ' · ' + row.period,
        detail: (refundTouched ? ('实际退款 ' + formatCurrencyAmount(refundAmount, currency)) : '') +
          (noteTouched ? ((refundTouched ? '；' : '') + '备注：' + note) : '')
      });
    }
    return { ok: true };
  }

  function findRefundByPeriodCustomer(period, customer) {
    return store.getRefunds().find(function (row) {
      return row.period === period && row.customer === customer;
    }) || null;
  }

  function mountImportKit() {
    if (!window.ImportModalKit) return;
    window.ImportModalKit.mount({
      trigger: '#btnImport',
      title: '导入收入与实际退款',
      introHtml: '<p>同一张表按「期间 + 客户」匹配台账。收入金额、实际退款金额可只填一列：空单元格表示不更新该列，<strong>空 ≠ 0</strong>。填了收入金额的行会将收入状态改为已确认。</p>' +
        '<p><strong>注意：</strong>币种随客户收入币种自动带入（加拿大客户为 CNY，其余为 USD），无需在表中填写币种列。已关账月份不能导入收入。</p>',
      templateButtonLabel: '打开导入模版（钉钉文档）',
      columns: [
        { group: '主键', name: '期间', required: true, desc: '格式 YYYY-MM，须与系统已有期间一致' },
        { group: '主键', name: '客户', required: true, desc: '零售商名称，须与系统客户主数据一致' },
        { group: '录入', name: '收入金额', required: false, desc: '可空。空=不改收入状态；填数字（含 0）则覆盖收入并已确认。币种同该客户收入币种' },
        { group: '录入', name: '实际退款金额', required: false, desc: '可空。空=不改退款；填数字（含 0）则覆盖实际退款。币种同该客户收入币种' },
        { group: '录入', name: '备注', required: false, desc: '行级备注，收入与退款共用' }
      ],
      requirements: [
        '期间与客户组合须在退款台账中已存在，否则该行导入失败。',
        '收入金额与实际退款金额至少填一列，两列都空则失败。',
        '空单元格不更新对应字段，不要把空当成 0。',
        '导入收入后该行收入状态变为已确认；只导退款不改变收入状态。',
        '已关账月份导入收入会失败；只导退款仍按现有台账规则处理。',
        '若上传 CSV，原型会按列解析；Excel 在原型中走示意覆盖。'
      ],
      onDownload: function () {
        window.open(IMPORT_TEMPLATE_DOC_URL, '_blank', 'noopener,noreferrer');
      },
      onConfirm: function (file, resultEl) {
        if (!file) {
          resultEl.textContent = '请先选择已填写的模版文件。';
          return;
        }
        var finishSimulated = function () {
          var rows = getRows().filter(function (row) { return !row.periodClosed; });
          var count = 0;
          var failed = 0;
          rows.slice(0, 3).forEach(function (row, index) {
            var incomeAmount = index === 1 ? null : round2((row.salesIncome || 0) + (index + 1) * 1000);
            var refundAmount = index === 2 ? null : round2(Number(row.actualRefund || 0) + (index + 1) * 100);
            var result = applyIncomeRefundImport(row, incomeAmount, refundAmount, '批量导入示意', '导入收入与退款');
            if (result.ok) count += 1;
            else failed += 1;
          });
          renderTable();
          resultEl.textContent = '导入完成（示意）：成功 ' + count + ' 行，失败 ' + failed + ' 行。第 1 行收入+退款，第 2 行只导退款（收入保持未确认），第 3 行只导收入。正式环境将按文件解析。';
        };

        var name = String(file.name || '').toLowerCase();
        if ((name.endsWith('.csv') || name.endsWith('.txt')) && typeof FileReader !== 'undefined') {
          var reader = new FileReader();
          reader.onload = function () {
            var parsed = parseRefundImportText(String(reader.result || ''));
            if (!parsed.length) {
              finishSimulated();
              return;
            }
            var ok = 0;
            var fail = 0;
            parsed.forEach(function (item) {
              var row = findRefundByPeriodCustomer(item.period, item.customer);
              if (!row) {
                fail += 1;
                return;
              }
              var result = applyIncomeRefundImport(row, item.incomeAmount, item.refundAmount, item.note, '导入收入与退款');
              if (result.ok) ok += 1;
              else fail += 1;
            });
            renderTable();
            resultEl.textContent = '导入完成：成功 ' + ok + ' 行，失败 ' + fail + ' 行。';
          };
          reader.onerror = finishSimulated;
          reader.readAsText(file, 'utf-8');
          return;
        }
        finishSimulated();
      }
    });
    if (window.FeeMgmtCommon) window.FeeMgmtCommon.ensureHiddenModals();
  }

  function bindEvents() {
    document.getElementById('qCustomer').addEventListener('change', renderTable);
    document.getElementById('qIncomeStatus').addEventListener('change', renderTable);
    document.getElementById('btnExport').addEventListener('click', exportRows);
    document.getElementById('btnBatchConfirm').addEventListener('click', batchConfirmIncome);

    document.getElementById('btnReset').addEventListener('click', function () {
      resetMonthRangeFilter();
      document.getElementById('qCustomer').value = '';
      document.getElementById('qIncomeStatus').value = '';
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qCustomer'));
      window.FeeMgmtCommon.syncClearableSelect(document.getElementById('qIncomeStatus'));
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
    document.getElementById('btnCalcEditIncome').addEventListener('click', function () {
      if (!calcState || !calcState.row) return;
      var row = findById(calcState.id) || calcState.row;
      closeCalcModal();
      openEditModal(row);
    });
    document.getElementById('calcModal').addEventListener('click', function (e) {
      if (e.target.id === 'calcModal') closeCalcModal();
    });

    document.getElementById('chkAll').addEventListener('change', function () {
      var checked = document.getElementById('chkAll').checked;
      document.querySelectorAll('#refundBody input[data-row-check]').forEach(function (el) {
        el.checked = checked;
      });
    });

    document.getElementById('refundBody').addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute('data-row-check')) {
        syncCheckAll();
        return;
      }
      var btn = e.target.closest('[data-action][data-id]');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');

      if (action === 'edit') {
        openEditModal(findById(id));
      } else if (action === 'confirm') {
        confirmRow(findById(id));
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
