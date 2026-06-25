(function (global) {
  'use strict';

  var base = global.SupermarketAccrualBaseData || {};
  var STORAGE_KEYS = {
    refundActuals: 'gb-fee-mgmt-refund-actual-overrides-v1',
    deductionActuals: 'gb-fee-mgmt-deduction-actual-overrides-v1',
    fixedRules: 'gb-fee-mgmt-fixed-rule-overrides-v1',
    refundRules: 'gb-fee-mgmt-refund-rule-overrides-v1'
  };
  var DEDUCTION_FEE_TYPES = ['促销扣款', '销售折扣', '现金折扣', '销售费用'];
  var FEE_FIELD_MAP = {
    '促销扣款': 'promoAccrual',
    '销售折扣': 'salesDiscountAccrual',
    '现金折扣': 'cashDiscountAccrual',
    '销售费用': 'salesExpenseAccrual'
  };
  var METHOD_LABELS = {
    fixed_ratio: '固定比例',
    budget_or_fixed: '自定义月金额',
    rolling_refund: '滚动退款率',
    monthly_fixed: '月固定金额',
    annual_avg: '年总金额月均分摊',
    custom_monthly: '自定义月金额'
  };
  var storage = getStorage();
  var periods = Array.isArray(base.periods) ? base.periods.slice() : [];
  var periodIndexMap = createIndexMap(periods);
  var refundHistory = base.refundHistory || {};
  var accrualRows = Array.isArray(base.accrualRows) ? base.accrualRows.slice() : [];
  var fixedRuleBaseRows = (Array.isArray(base.fixedRules) ? base.fixedRules : []).filter(function (row) {
    return isValidCustomer(row.customer) && DEDUCTION_FEE_TYPES.indexOf(row.feeType) >= 0;
  });
  var refundRuleBaseRows = (Array.isArray(base.refundRules) ? base.refundRules : []).filter(function (row) {
    return isValidCustomer(row.customer) && row.feeType === '销售退款' && periodIndexMap.hasOwnProperty(row.period);
  });
  var refundLedgerBaseRows = (Array.isArray(base.refundLedgers) ? base.refundLedgers : []).filter(function (row) {
    return isValidCustomer(row.customer) && periodIndexMap.hasOwnProperty(row.period);
  });
  var deductionLedgerBaseRows = (Array.isArray(base.deductionLedgers) ? base.deductionLedgers : []).filter(function (row) {
    return isValidCustomer(row.customer) && DEDUCTION_FEE_TYPES.indexOf(row.feeType) >= 0 && periodIndexMap.hasOwnProperty(row.period);
  });
  var fixedRuleBaseMap = indexById(fixedRuleBaseRows);
  var refundRuleBaseMap = indexById(refundRuleBaseRows);
  var refundLedgerBaseMap = indexById(refundLedgerBaseRows);
  var deductionLedgerBaseMap = indexById(deductionLedgerBaseRows);
  var accrualMap = indexAccrualRows(accrualRows);
  var customerBuckets = collectCustomerBuckets();

  function getStorage() {
    try {
      if (global.localStorage) return global.localStorage;
    } catch (err) {
      // ignore
    }
    var memory = {};
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      },
      setItem: function (key, value) {
        memory[key] = String(value);
      },
      removeItem: function (key) {
        delete memory[key];
      }
    };
  }

  function createIndexMap(list) {
    var map = {};
    list.forEach(function (item, index) {
      map[item] = index;
    });
    return map;
  }

  function indexById(list) {
    var map = {};
    list.forEach(function (row) {
      map[row.id] = row;
    });
    return map;
  }

  function indexAccrualRows(list) {
    var map = {};
    list.forEach(function (row) {
      map[row.customer + '|' + row.period] = row;
    });
    return map;
  }

  function safeRead(key) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function safeWrite(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function clone(row) {
    return row ? JSON.parse(JSON.stringify(row)) : row;
  }

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function nowText() {
    var dt = new Date();
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
  }

  function round(num, digits) {
    var factor = Math.pow(10, digits);
    return Math.round((Number(num) || 0) * factor) / factor;
  }

  function round2(num) {
    return round(num, 2);
  }

  function round8(num) {
    return round(num, 8);
  }

  function numericOrNull(value) {
    if (value === '' || value == null) return null;
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function toPositiveInt(value, fallback) {
    var num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Math.round(num);
  }

  function isValidCustomer(name) {
    return !!name && name !== '参数' && name !== '合计' && !/[\u3400-\u9FFF]/.test(name);
  }

  function localeSort(list) {
    return list.slice().sort(function (a, b) {
      return a.localeCompare(b, 'en');
    });
  }

  function orderedUnique(baseList, additions) {
    var seen = {};
    var result = [];

    function push(value) {
      if (!value || seen[value]) return;
      seen[value] = true;
      result.push(value);
    }

    (baseList || []).forEach(push);
    localeSort(additions || []).forEach(push);
    return result;
  }

  function collectCustomerBuckets() {
    var baseCustomers = (Array.isArray(base.customers) ? base.customers : []).filter(isValidCustomer);
    var extraCustomers = [];

    fixedRuleBaseRows.forEach(function (row) { extraCustomers.push(row.customer); });
    refundRuleBaseRows.forEach(function (row) { extraCustomers.push(row.customer); });
    refundLedgerBaseRows.forEach(function (row) { extraCustomers.push(row.customer); });
    deductionLedgerBaseRows.forEach(function (row) { extraCustomers.push(row.customer); });
    Object.keys(refundHistory).forEach(function (key) {
      if (isValidCustomer(key)) extraCustomers.push(key);
    });

    var allCustomers = orderedUnique(baseCustomers, extraCustomers);
    var refundCustomers = orderedUnique([], refundRuleBaseRows.map(function (row) { return row.customer; }));
    var deductionCustomers = orderedUnique([], deductionLedgerBaseRows.map(function (row) { return row.customer; }));

    return {
      all: allCustomers,
      refund: refundCustomers,
      deduction: deductionCustomers
    };
  }

  function historyRows(customer) {
    var list = refundHistory[customer];
    return Array.isArray(list) ? list.slice() : [];
  }

  function historyUntil(customer, period) {
    return historyRows(customer).filter(function (row) {
      return row.period <= period;
    });
  }

  function sumWindow(list, field, size) {
    return list.slice(Math.max(list.length - size, 0)).reduce(function (sum, row) {
      return sum + Number(row[field] || 0);
    }, 0);
  }

  function computeRefundRatio(customer, period) {
    var rows = historyUntil(customer, period);
    var sales = sumWindow(rows, 'sales', 12);
    var refund = sumWindow(rows, 'refund', 12);
    if (!sales) return 0;
    return round8(Math.abs(refund) / sales);
  }

  function computeRefundSalesBasis(customer, period, windowMonths) {
    var rows = historyUntil(customer, period);
    return round2(sumWindow(rows, 'sales', windowMonths));
  }

  function historyBefore(customer, period) {
    return historyRows(customer).filter(function (row) {
      return row.period < period;
    });
  }

  function computeOpeningSalesBasis(customer, period, prevPeriod, prevWindowMonths, currentWindowMonths) {
    if (prevPeriod) {
      return round2(sumWindow(historyUntil(customer, prevPeriod), 'sales', prevWindowMonths));
    }
    return round2(sumWindow(historyBefore(customer, period), 'sales', currentWindowMonths));
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
    return y + '-' + pad(m);
  }

  function getPreviousRefundRatio(customer, period, customerPeriods, index) {
    if (index > 0) {
      var prevLedgerPeriod = customerPeriods[index - 1];
      return getRefundRule(buildKey([customer, prevLedgerPeriod])).ratio;
    }
    return computeRefundRatio(customer, shiftPeriod(period, -1));
  }

  function buildKey(parts) {
    return parts.join('|');
  }

  function readOverrides(key) {
    return safeRead(key);
  }

  function writeOverrides(key, value) {
    safeWrite(key, value);
  }

  function getBaseAccrualRow(customer, period) {
    return accrualMap[customer + '|' + period] || null;
  }

  function getIncome(customer, period) {
    var row = getBaseAccrualRow(customer, period);
    return row ? Number(row.income || 0) : 0;
  }

  function getBaseAccrualAmount(customer, feeType, period) {
    var row = getBaseAccrualRow(customer, period);
    if (!row) return 0;
    return Number(row[FEE_FIELD_MAP[feeType]] || 0);
  }

  function getBaseLedgerAccrual(customer, feeType, period) {
    var ledgerRow = deductionLedgerBaseMap[buildKey([feeType, customer, period])];
    return ledgerRow ? Number(ledgerRow.excelAccrual || 0) : 0;
  }

  function resolveExpenseMethod(baseRow, overrideRow) {
    var method = overrideRow && overrideRow.method ? overrideRow.method : (baseRow.method || 'custom_monthly');
    if (method !== 'budget_or_fixed') return method;

    var customer = baseRow.customer;
    var monthlyAmounts = periods.map(function (period) {
      return round2(getBaseAccrualAmount(customer, '销售费用', period));
    }).filter(function (value) { return value > 0; });

    if (monthlyAmounts.length > 1) {
      var first = monthlyAmounts[0];
      var allSame = monthlyAmounts.every(function (value) {
        return Math.abs(value - first) < 0.02;
      });
      if (!allSame) return 'custom_monthly';
    }
    if (Number(baseRow.baseAmount || 0) > 0 && monthlyAmounts.length) {
      var annualAvg = round2(Number(baseRow.baseAmount) / 12);
      if (monthlyAmounts.every(function (value) { return Math.abs(value - annualAvg) < 1; })) {
        return 'annual_avg';
      }
      if (Math.abs(monthlyAmounts[0] - Number(baseRow.baseAmount)) < 1) return 'monthly_fixed';
    }
    if (Number(baseRow.ratio || 0) > 0 && monthlyAmounts.length) {
      var income = getIncome(customer, periods[periods.length - 1] || '');
      if (Math.abs(monthlyAmounts[monthlyAmounts.length - 1] - income * Number(baseRow.ratio)) < 1) {
        return 'fixed_ratio';
      }
    }
    return monthlyAmounts.length ? 'custom_monthly' : 'monthly_fixed';
  }

  function getCustomMonthlyAmount(customer, period, overrideRow, baseRow) {
    var map = (overrideRow && overrideRow.monthlyAmounts) || {};
    if (Object.prototype.hasOwnProperty.call(map, period)) {
      return round2(Number(map[period]) || 0);
    }
    var excelAmount = getBaseAccrualAmount(customer, '销售费用', period);
    if (excelAmount || excelAmount === 0) return round2(excelAmount);
    return 0;
  }

  function describeExpenseRule(method, ratio, baseAmount, customer, period, overrideRow, baseRow) {
    if (method === 'monthly_fixed') return '月固定金额 ' + round2(baseAmount || 0);
    if (method === 'annual_avg') return '年总额 ' + round2(baseAmount || 0) + ' ÷ 12 = ' + round2(Number(baseAmount || 0) / 12);
    if (method === 'fixed_ratio') return '当月收入 × ' + round8(ratio || 0);
    if (method === 'custom_monthly') {
      return period + ' 月金额 ' + getCustomMonthlyAmount(customer, period, overrideRow || {}, baseRow || {});
    }
    return '—';
  }

  function getFixedRule(ruleId) {
    var baseRow = fixedRuleBaseMap[ruleId] || {};
    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    var overrideRow = overrides[ruleId] || {};
    var method = baseRow.feeType === '销售费用'
      ? resolveExpenseMethod(baseRow, overrideRow)
      : (overrideRow.method || baseRow.method || 'fixed_ratio');
    var ratio = numericOrNull(overrideRow.ratio);
    if (ratio == null) ratio = numericOrNull(baseRow.ratio);
    var baseAmount = numericOrNull(overrideRow.baseAmount);
    if (baseAmount == null) baseAmount = numericOrNull(baseRow.baseAmount);
    var note = Object.prototype.hasOwnProperty.call(overrideRow, 'note') ? String(overrideRow.note || '') : String(baseRow.note || '');
    var sourcePeriod = baseRow.sourcePeriod || periods[0] || '';
    var previewPeriod = sourcePeriod;
    var sampleIncome = getIncome(baseRow.customer, previewPeriod);
    var sampleAccrual = computeDeductionAccrual(baseRow.customer, baseRow.feeType, previewPeriod, true);

    return {
      id: ruleId,
      customer: baseRow.customer || '',
      feeType: baseRow.feeType || '',
      method: method,
      methodLabel: METHOD_LABELS[method] || method || '-',
      ratio: ratio == null ? 0 : ratio,
      ratioLabel: ratioLabelForFeeType(baseRow.feeType),
      baseAmount: baseAmount == null ? 0 : baseAmount,
      sourcePeriod: sourcePeriod,
      sampleIncome: sampleIncome,
      sampleAccrual: sampleAccrual,
      expenseRuleDesc: baseRow.feeType === '销售费用'
        ? describeExpenseRule(method, ratio, baseAmount, baseRow.customer, previewPeriod, overrideRow, baseRow)
        : '',
      monthlyAmounts: overrideRow.monthlyAmounts || null,
      formulaDesc: buildFixedFormulaDesc(baseRow.feeType, method),
      note: note,
      origin: hasOverrideValues(overrideRow) ? '已调整' : 'Excel',
      updatedAt: overrideRow.updatedAt || 'Excel基线'
    };
  }

  function getSampleAccrual(customer, feeType, period, method, ratio, baseAmount, useOverrideLogic) {
    var income = getIncome(customer, period);
    var baseAccrual = getBaseAccrualAmount(customer, feeType, period);
    var ledgerAccrual = getBaseLedgerAccrual(customer, feeType, period);

    if (!useOverrideLogic) {
      return round2(ledgerAccrual || baseAccrual);
    }

    if (feeType === '销售费用') {
      if (method === 'fixed_ratio') return round2(income * Number(ratio || 0));
      if (hasValue(baseAmount)) return round2(baseAmount);
      return round2(baseAccrual);
    }

    if (method === 'monthly_fixed') return round2(baseAmount);
    return round2(income * Number(ratio || 0));
  }

  function hasFixedMetricOverride(row) {
    if (!row) return false;
    if (row.monthlyAmounts && Object.keys(row.monthlyAmounts).length) return true;
    return hasValue(row.method) || hasValue(row.ratio) || hasValue(row.baseAmount);
  }

  function buildFixedFormulaDesc(feeType, method) {
    if (feeType === '销售费用') {
      if (method === 'monthly_fixed') return '销售费用 = 月固定金额';
      if (method === 'annual_avg') return '销售费用 = 年总金额 ÷ 12';
      if (method === 'custom_monthly') return '销售费用 = 按期间自定义月金额';
      if (method === 'fixed_ratio') return '销售费用 = 当月收入 × 固定比例';
      return '销售费用按 Excel 月度值计提';
    }
    if (method === 'monthly_fixed') return '按固定月度金额计提';
    return '计提金额 = 当月收入 × 规则比例';
  }

  function getRefundRule(ruleId) {
    var baseRow = refundRuleBaseMap[ruleId] || {};
    var overrides = readOverrides(STORAGE_KEYS.refundRules);
    var overrideRow = overrides[ruleId] || {};
    var metricsOverridden = hasRefundMetricOverride(overrideRow);
    var baseWindow = toPositiveInt(baseRow.windowMonths, 3);
    var windowMonths = toPositiveInt(overrideRow.windowMonths, baseWindow);
    var systemRatio = computeRefundRatio(baseRow.customer, baseRow.period);
    var ratio = metricsOverridden
      ? numericOrNull(overrideRow.ratio)
      : numericOrNull(baseRow.ratio);
    if (ratio == null) ratio = systemRatio || 0;
    var salesBasis = metricsOverridden
      ? computeRefundSalesBasis(baseRow.customer, baseRow.period, windowMonths)
      : round2(baseRow.salesBasis || 0);
    if (!salesBasis) salesBasis = computeRefundSalesBasis(baseRow.customer, baseRow.period, windowMonths);
    var targetClosing = metricsOverridden ? numericOrNull(overrideRow.targetClosing) : numericOrNull(baseRow.targetClosing);
    if (targetClosing == null) targetClosing = round2(ratio * salesBasis);
    var note = Object.prototype.hasOwnProperty.call(overrideRow, 'note') ? String(overrideRow.note || '') : String(baseRow.note || '');

    return {
      id: ruleId,
      customer: baseRow.customer || '',
      period: baseRow.period || '',
      feeType: '销售退款',
      method: 'rolling_refund',
      methodLabel: '滚动退款率',
      ratio: round8(ratio),
      windowMonths: windowMonths,
      salesBasis: round2(salesBasis),
      targetClosing: round2(targetClosing),
      note: note,
      ratioSource: hasValue(overrideRow.ratio) ? '手工覆盖' : 'Excel滚动结果',
      origin: hasOverrideValues(overrideRow) ? '已调整' : 'Excel',
      updatedAt: overrideRow.updatedAt || 'Excel基线'
    };
  }

  function hasRefundMetricOverride(row) {
    if (!row) return false;
    return hasValue(row.ratio) || hasValue(row.windowMonths) || hasValue(row.targetClosing);
  }

  function hasValue(value) {
    return !(value === '' || value == null);
  }

  function hasOverrideValues(row) {
    if (!row) return false;
    return Object.keys(row).some(function (key) {
      return key !== 'updatedAt' && hasValue(row[key]);
    });
  }

  function getDeductionAccrual(customer, feeType, period) {
    var ruleId = buildKey([customer, feeType]);
    var overrideRow = readOverrides(STORAGE_KEYS.fixedRules)[ruleId] || null;
    return computeDeductionAccrual(customer, feeType, period, hasFixedMetricOverride(overrideRow));
  }

  function computeDeductionAccrual(customer, feeType, period, forceRuleFormula) {
    var ruleId = buildKey([customer, feeType]);
    var baseRow = fixedRuleBaseMap[ruleId] || {};
    var overrideRow = readOverrides(STORAGE_KEYS.fixedRules)[ruleId] || {};
    var method = overrideRow.method || baseRow.method || (feeType === '销售费用' ? 'budget_or_fixed' : 'fixed_ratio');
    var ratio = numericOrNull(overrideRow.ratio);
    if (ratio == null) ratio = numericOrNull(baseRow.ratio);
    if (ratio == null) ratio = 0;
    var baseAmount = numericOrNull(overrideRow.baseAmount);
    if (baseAmount == null) baseAmount = numericOrNull(baseRow.baseAmount);
    if (baseAmount == null) baseAmount = 0;
    var income = getIncome(customer, period);
    var excelAmount = getBaseAccrualAmount(customer, feeType, period);
    var ledgerBase = deductionLedgerBaseMap[buildKey([feeType, customer, period])];

    if (!forceRuleFormula) {
      if (ledgerBase && Object.keys(ledgerBase).length) return round2(ledgerBase.excelAccrual || 0);
      if (excelAmount || excelAmount === 0) return round2(excelAmount);
    }

    if (feeType === '销售费用') {
      var expenseMethod = resolveExpenseMethod(baseRow, overrideRow);
      if (!forceRuleFormula) {
        if (ledgerBase && Object.keys(ledgerBase).length) return round2(ledgerBase.excelAccrual || 0);
        if (excelAmount || excelAmount === 0) return round2(excelAmount);
      }
      if (expenseMethod === 'monthly_fixed') return round2(baseAmount || 0);
      if (expenseMethod === 'annual_avg') return round2(Number(baseAmount || 0) / 12);
      if (expenseMethod === 'fixed_ratio') return round2(income * Number(ratio || 0));
      if (expenseMethod === 'custom_monthly') {
        return getCustomMonthlyAmount(customer, period, overrideRow, baseRow);
      }
      if (excelAmount || excelAmount === 0) return round2(excelAmount);
      return round2(ledgerBase ? ledgerBase.excelAccrual : 0);
    }

    if (method === 'monthly_fixed') return round2(baseAmount || 0);
    if (method === 'fixed_ratio') return round2(income * Number(ratio || 0));

    return round2(excelAmount);
  }

  function getCustomerDeductionRateMatrix(samplePeriod) {
    var period = samplePeriod || periods[0] || '';
    var customerSet = {};
    fixedRuleBaseRows.forEach(function (row) {
      customerSet[row.customer] = true;
    });

    return Object.keys(customerSet).sort(function (a, b) {
      return a.localeCompare(b, 'en');
    }).map(function (customer) {
      var promoRule = fixedRuleBaseMap[buildKey([customer, '促销扣款'])] ? getFixedRule(buildKey([customer, '促销扣款'])) : null;
      var salesRule = fixedRuleBaseMap[buildKey([customer, '销售折扣'])] ? getFixedRule(buildKey([customer, '销售折扣'])) : null;
      var cashRule = fixedRuleBaseMap[buildKey([customer, '现金折扣'])] ? getFixedRule(buildKey([customer, '现金折扣'])) : null;
      var expenseRule = fixedRuleBaseMap[buildKey([customer, '销售费用'])] ? getFixedRule(buildKey([customer, '销售费用'])) : null;
      var income = round2(getIncome(customer, period));
      var promoAccrual = computeDeductionAccrual(customer, '促销扣款', period, true);
      var salesAccrual = computeDeductionAccrual(customer, '销售折扣', period, true);
      var cashAccrual = computeDeductionAccrual(customer, '现金折扣', period, true);
      var expenseAccrual = computeDeductionAccrual(customer, '销售费用', period, true);
      var origins = [promoRule, salesRule, cashRule, expenseRule].filter(Boolean).map(function (item) {
        return item.origin;
      });
      var hasAdjusted = origins.indexOf('已调整') >= 0;

      var expenseMethod = expenseRule ? expenseRule.method : '';
      var expenseDesc = expenseRule ? expenseRule.expenseRuleDesc : '—';

      return {
        customer: customer,
        period: period,
        income: income,
        promoRatio: promoRule ? Number(promoRule.ratio || 0) : 0,
        salesDiscountRatio: salesRule ? Number(salesRule.ratio || 0) : 0,
        cashDiscountRatio: cashRule ? Number(cashRule.ratio || 0) : 0,
        promoAccrual: promoAccrual,
        salesDiscountAccrual: salesAccrual,
        cashDiscountAccrual: cashAccrual,
        salesExpenseAccrual: expenseAccrual,
        salesExpenseMethod: expenseRule ? expenseRule.methodLabel : '—',
        salesExpenseMethodCode: expenseMethod,
        salesExpenseRuleDesc: expenseDesc,
        salesExpenseBudget: expenseRule ? round2(expenseRule.baseAmount || 0) : 0,
        origin: hasAdjusted ? '已调整' : 'Excel',
        promoRuleId: promoRule ? promoRule.id : '',
        salesRuleId: salesRule ? salesRule.id : '',
        cashRuleId: cashRule ? cashRule.id : '',
        expenseRuleId: expenseRule ? expenseRule.id : ''
      };
    });
  }

  function ratioLabelForFeeType(feeType) {
    if (feeType === '促销扣款') return '促销扣款比例';
    if (feeType === '销售折扣') return '销售折扣比例';
    if (feeType === '现金折扣') return '现金折扣比例';
    if (feeType === '销售费用') return '参考比例';
    return '计提比例';
  }

  function getFixedRules() {
    return fixedRuleBaseRows.map(function (row) {
      return getFixedRule(row.id);
    }).sort(function (a, b) {
      if (a.customer !== b.customer) return a.customer.localeCompare(b.customer, 'en');
      return a.feeType.localeCompare(b.feeType, 'zh');
    });
  }

  function getRefundRules() {
    return refundRuleBaseRows.map(function (row) {
      return getRefundRule(row.id);
    }).sort(function (a, b) {
      if (a.period !== b.period) return periodIndexMap[a.period] - periodIndexMap[b.period];
      return a.customer.localeCompare(b.customer, 'en');
    });
  }

  function getRules() {
    return getFixedRules().concat(getRefundRules());
  }

  function getRefunds() {
    var actualOverrides = readOverrides(STORAGE_KEYS.refundActuals);
    var ruleOverrides = readOverrides(STORAGE_KEYS.refundRules);
    var rowsByCustomer = {};

    refundRuleBaseRows.forEach(function (row) {
      if (!rowsByCustomer[row.customer]) rowsByCustomer[row.customer] = [];
      rowsByCustomer[row.customer].push(row.period);
    });

    Object.keys(rowsByCustomer).forEach(function (customer) {
      rowsByCustomer[customer].sort(function (a, b) {
        return periodIndexMap[a] - periodIndexMap[b];
      });
    });

    var result = [];

    Object.keys(rowsByCustomer).forEach(function (customer) {
      var previousClosing = null;
      var hasPriorDelta = false;

      rowsByCustomer[customer].forEach(function (period, index) {
        var id = buildKey([customer, period]);
        var baseLedger = refundLedgerBaseMap[id] || {};
        var actualOverride = actualOverrides[id] || {};
        var ruleOverride = ruleOverrides[id] || {};
        var rule = getRefundRule(id);
        var prevPeriod = index > 0 ? rowsByCustomer[customer][index - 1] : null;
        var prevRule = prevPeriod ? getRefundRule(buildKey([customer, prevPeriod])) : null;
        var prevRatio = getPreviousRefundRatio(customer, period, rowsByCustomer[customer], index);
        var openingSalesBasis = computeOpeningSalesBasis(
          customer,
          period,
          prevPeriod,
          prevRule ? prevRule.windowMonths : rule.windowMonths,
          rule.windowMonths
        );
        var openingBalance;
        var actualRefund;
        var targetClosing;
        var accrualAmount;
        var closingBalance;
        var affectsCalc = hasPriorDelta || hasValue(actualOverride.actualAmount) || hasRefundMetricOverride(ruleOverride);
        var needsRecalcOpening = hasPriorDelta || hasRefundMetricOverride(ruleOverride);

        if (!affectsCalc && Object.keys(baseLedger).length) {
          openingBalance = round2(baseLedger.openingBalance || 0);
          actualRefund = round2(baseLedger.actualAmount || 0);
          targetClosing = round2(baseLedger.closingBalance || 0);
          accrualAmount = round2(baseLedger.excelAccrual || 0);
          closingBalance = round2(baseLedger.closingBalance || 0);
        } else {
          openingBalance = needsRecalcOpening
            ? round2(prevRatio * openingSalesBasis)
            : round2(baseLedger.openingBalance || 0);
          actualRefund = hasValue(actualOverride.actualAmount) ? round2(actualOverride.actualAmount) : round2(baseLedger.actualAmount || 0);
          targetClosing = round2(rule.targetClosing || 0);
          accrualAmount = round2(actualRefund + targetClosing - openingBalance);
          closingBalance = round2(targetClosing);
        }

        previousClosing = closingBalance;
        if (affectsCalc) hasPriorDelta = true;

        result.push({
          id: id,
          customer: customer,
          period: period,
          openingBalance: openingBalance,
          actualRefund: actualRefund,
          accrualAmount: accrualAmount,
          closingBalance: closingBalance,
          prevRatio: round8(prevRatio),
          ratio: rule.ratio,
          windowMonths: rule.windowMonths,
          salesBasis: rule.salesBasis,
          targetClosing: targetClosing,
          note: actualOverride.note || '',
          actualSource: hasValue(actualOverride.actualAmount) ? '手工录入' : 'Excel基线',
          updatedAt: actualOverride.updatedAt || 'Excel基线',
          excelAccrual: round2(baseLedger.excelAccrual || 0),
          excelClosing: round2(baseLedger.closingBalance || 0)
        });
      });
    });

    return result.sort(function (a, b) {
      if (a.period !== b.period) return periodIndexMap[a.period] - periodIndexMap[b.period];
      return a.customer.localeCompare(b.customer, 'en');
    });
  }

  function getDeductions() {
    var actualOverrides = readOverrides(STORAGE_KEYS.deductionActuals);
    var fixedRuleOverrides = readOverrides(STORAGE_KEYS.fixedRules);
    var grouped = {};

    deductionLedgerBaseRows.forEach(function (row) {
      var groupKey = buildKey([row.feeType, row.customer]);
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(row.period);
    });

    Object.keys(grouped).forEach(function (groupKey) {
      grouped[groupKey].sort(function (a, b) {
        return periodIndexMap[a] - periodIndexMap[b];
      });
    });

    var result = [];

    Object.keys(grouped).forEach(function (groupKey) {
      var parts = groupKey.split('|');
      var feeType = parts[0];
      var customer = parts.slice(1).join('|');
      var previousClosing = null;
      var ruleOverride = fixedRuleOverrides[buildKey([customer, feeType])] || null;
      var hasPriorDelta = !!hasFixedMetricOverride(ruleOverride);

      grouped[groupKey].forEach(function (period, index) {
        var id = buildKey([feeType, customer, period]);
        var baseLedger = deductionLedgerBaseMap[id] || {};
        var actualOverride = actualOverrides[id] || {};
        var openingBalance;
        var actualDeduction;
        var accrualDeduction;
        var closingBalance;
        var affectsCalc = hasPriorDelta || hasValue(actualOverride.actualAmount);
        var rule = fixedRuleBaseMap[buildKey([customer, feeType])] ? getFixedRule(buildKey([customer, feeType])) : null;

        if (!affectsCalc && Object.keys(baseLedger).length) {
          openingBalance = round2(baseLedger.openingBalance || 0);
          actualDeduction = round2(baseLedger.actualAmount || 0);
          accrualDeduction = round2(baseLedger.excelAccrual || 0);
          closingBalance = round2(baseLedger.closingBalance || 0);
        } else {
          openingBalance = hasPriorDelta ? round2(previousClosing) : round2(baseLedger.openingBalance || 0);
          actualDeduction = hasValue(actualOverride.actualAmount) ? round2(actualOverride.actualAmount) : round2(baseLedger.actualAmount || 0);
          accrualDeduction = getDeductionAccrual(customer, feeType, period);
          closingBalance = round2(openingBalance - actualDeduction + accrualDeduction);
        }

        previousClosing = closingBalance;
        if (affectsCalc) hasPriorDelta = true;

        result.push({
          id: id,
          feeType: feeType,
          customer: customer,
          period: period,
          openingBalance: openingBalance,
          actualDeduction: actualDeduction,
          accrualDeduction: accrualDeduction,
          closingBalance: closingBalance,
          note: actualOverride.note || '',
          updatedAt: actualOverride.updatedAt || 'Excel基线',
          actualSource: hasValue(actualOverride.actualAmount) ? '手工录入' : 'Excel基线',
          income: round2(getIncome(customer, period)),
          ruleRatio: rule ? Number(rule.ratio || 0) : 0,
          ruleBaseAmount: rule ? round2(rule.baseAmount || 0) : 0,
          ruleMethod: rule ? rule.method : '',
          ruleMethodLabel: rule ? rule.methodLabel : 'Excel基线',
          excelBaseAccrual: round2(getBaseAccrualAmount(customer, feeType, period)),
          excelAccrual: round2(baseLedger.excelAccrual || 0),
          excelClosing: round2(baseLedger.closingBalance || 0)
        });
      });
    });

    return result.sort(function (a, b) {
      if (a.period !== b.period) return periodIndexMap[a.period] - periodIndexMap[b.period];
      if (a.customer !== b.customer) return a.customer.localeCompare(b.customer, 'en');
      return DEDUCTION_FEE_TYPES.indexOf(a.feeType) - DEDUCTION_FEE_TYPES.indexOf(b.feeType);
    });
  }

  function upsertFixedRule(payload) {
    var baseRow = fixedRuleBaseMap[payload.id];
    if (!baseRow) return null;

    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    var nextRow = {
      method: payload.method || baseRow.method,
      ratio: numericOrNull(payload.ratio),
      baseAmount: numericOrNull(payload.baseAmount),
      note: String(payload.note || ''),
      updatedAt: nowText()
    };

    if (payload.monthlyAmounts && typeof payload.monthlyAmounts === 'object') {
      nextRow.monthlyAmounts = payload.monthlyAmounts;
    }

    if (nextRow.ratio == null) nextRow.ratio = numericOrNull(baseRow.ratio);
    if (nextRow.baseAmount == null) nextRow.baseAmount = numericOrNull(baseRow.baseAmount);

    if (isSameFixedRule(nextRow, baseRow)) {
      delete overrides[payload.id];
    } else {
      overrides[payload.id] = nextRow;
    }

    writeOverrides(STORAGE_KEYS.fixedRules, overrides);
    return getFixedRule(payload.id);
  }

  function isSameFixedRule(overrideRow, baseRow) {
    var baseMethod = baseRow.feeType === '销售费用'
      ? resolveExpenseMethod(baseRow, {})
      : (baseRow.method || '');
    var overrideMethod = baseRow.feeType === '销售费用' && overrideRow.method
      ? overrideRow.method
      : (overrideRow.method || baseMethod);
    return overrideMethod === baseMethod &&
      round8(overrideRow.ratio || 0) === round8(baseRow.ratio || 0) &&
      round2(overrideRow.baseAmount || 0) === round2(baseRow.baseAmount || 0) &&
      String(overrideRow.note || '') === String(baseRow.note || '') &&
      !overrideRow.monthlyAmounts;
  }

  function resetFixedRule(ruleId) {
    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    delete overrides[ruleId];
    writeOverrides(STORAGE_KEYS.fixedRules, overrides);
  }

  function upsertRefundRule(payload) {
    var baseRow = refundRuleBaseMap[payload.id];
    if (!baseRow) return null;

    var overrides = readOverrides(STORAGE_KEYS.refundRules);
    var nextRow = {
      ratio: numericOrNull(payload.ratio),
      windowMonths: toPositiveInt(payload.windowMonths, baseRow.windowMonths || 3),
      note: String(payload.note || ''),
      updatedAt: nowText()
    };

    if (isSameRefundRule(nextRow, baseRow)) {
      delete overrides[payload.id];
    } else {
      overrides[payload.id] = nextRow;
    }

    writeOverrides(STORAGE_KEYS.refundRules, overrides);
    return getRefundRule(payload.id);
  }

  function isSameRefundRule(overrideRow, baseRow) {
    return round8(overrideRow.ratio || computeRefundRatio(baseRow.customer, baseRow.period)) === round8(baseRow.ratio || 0) &&
      toPositiveInt(overrideRow.windowMonths, 3) === toPositiveInt(baseRow.windowMonths, 3) &&
      String(overrideRow.note || '') === String(baseRow.note || '');
  }

  function resetRefundRule(ruleId) {
    var overrides = readOverrides(STORAGE_KEYS.refundRules);
    delete overrides[ruleId];
    writeOverrides(STORAGE_KEYS.refundRules, overrides);
  }

  function upsertRefundActual(payload) {
    var id = payload.id || buildKey([payload.customer, payload.period]);
    var overrides = readOverrides(STORAGE_KEYS.refundActuals);
    var baseLedger = refundLedgerBaseMap[id] || {};
    var actualAmount = numericOrNull(payload.actualAmount);
    var note = String(payload.note || '');

    if (round2(actualAmount || 0) === round2(baseLedger.actualAmount || 0) && note === '') {
      delete overrides[id];
    } else {
      overrides[id] = {
        actualAmount: actualAmount == null ? 0 : round2(actualAmount),
        note: note,
        updatedAt: nowText()
      };
    }

    writeOverrides(STORAGE_KEYS.refundActuals, overrides);
  }

  function resetRefundActual(id) {
    var overrides = readOverrides(STORAGE_KEYS.refundActuals);
    delete overrides[id];
    writeOverrides(STORAGE_KEYS.refundActuals, overrides);
  }

  function upsertDeductionActual(payload) {
    var id = payload.id || buildKey([payload.feeType, payload.customer, payload.period]);
    var overrides = readOverrides(STORAGE_KEYS.deductionActuals);
    var baseLedger = deductionLedgerBaseMap[id] || {};
    var actualAmount = numericOrNull(payload.actualAmount);
    var note = String(payload.note || '');

    if (round2(actualAmount || 0) === round2(baseLedger.actualAmount || 0) && note === '') {
      delete overrides[id];
    } else {
      overrides[id] = {
        actualAmount: actualAmount == null ? 0 : round2(actualAmount),
        note: note,
        updatedAt: nowText()
      };
    }

    writeOverrides(STORAGE_KEYS.deductionActuals, overrides);
  }

  function resetDeductionActual(id) {
    var overrides = readOverrides(STORAGE_KEYS.deductionActuals);
    delete overrides[id];
    writeOverrides(STORAGE_KEYS.deductionActuals, overrides);
  }

  global.SupermarketAccrualStore = {
    periods: periods.slice(),
    feeTypes: (Array.isArray(base.feeTypes) ? base.feeTypes : []).slice(),
    deductionFeeTypes: DEDUCTION_FEE_TYPES.slice(),
    customers: customerBuckets.all.slice(),
    refundCustomers: customerBuckets.refund.slice(),
    deductionCustomers: customerBuckets.deduction.slice(),
    getRules: getRules,
    getFixedRules: getFixedRules,
    getRefundRules: getRefundRules,
    getRefunds: getRefunds,
    getDeductions: getDeductions,
    getFixedRule: getFixedRule,
    getIncome: getIncome,
    getBaseAccrualAmount: getBaseAccrualAmount,
    computeDeductionAccrual: computeDeductionAccrual,
    getCustomerDeductionRateMatrix: getCustomerDeductionRateMatrix,
    getRefundRule: getRefundRule,
    upsertFixedRule: upsertFixedRule,
    resetFixedRule: resetFixedRule,
    upsertRefundRule: upsertRefundRule,
    resetRefundRule: resetRefundRule,
    upsertRefundActual: upsertRefundActual,
    resetRefundActual: resetRefundActual,
    upsertDeductionActual: upsertDeductionActual,
    resetDeductionActual: resetDeductionActual,
    computeRefundRatio: computeRefundRatio
  };
})(typeof window !== 'undefined' ? window : this);
