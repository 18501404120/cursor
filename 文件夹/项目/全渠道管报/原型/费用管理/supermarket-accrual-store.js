(function (global) {
  'use strict';

  var base = global.SupermarketAccrualBaseData || {};
  var STORAGE_KEYS = {
    refundActuals: 'gb-fee-mgmt-refund-actual-overrides-v1',
    deductionActuals: 'gb-fee-mgmt-deduction-actual-overrides-v1',
    fixedRules: 'gb-fee-mgmt-fixed-rule-overrides-v1',
    refundRules: 'gb-fee-mgmt-refund-rule-overrides-v1',
    customerDeptMaster: 'gb-fee-mgmt-customer-dept-master-v1'
  };
  var DEDUCTION_FEE_TYPES = ['促销扣款', '销售折扣', '现金折扣', '销售费用'];
  var REFUND_ROLLING_PAST_MONTHS = 3;
  var REFUND_ROLLING_FUTURE_MONTHS = 3;
  var FEE_FIELD_MAP = {
    '促销扣款': 'promoAccrual',
    '销售折扣': 'salesDiscountAccrual',
    '现金折扣': 'cashDiscountAccrual',
    '销售费用': 'salesExpenseAccrual'
  };
  var METHOD_LABELS = {
    fixed_ratio: '固定比例',
    dept_fixed_ratio: '部门固定比例',
    kingdee_doc_ratio: '部门固定比例',
    budget_or_fixed: '月固定金额',
    rolling_refund: '滚动退款率',
    monthly_fixed: '月固定金额',
    annual_avg: '年总金额月均分摊'
  };
  var KINGDEE_ORDER_TAX_FACTOR = 0.9524;
  var DEFAULT_DEPARTMENTS = [
    { id: '1001', code: '1001', name: '北美商超业务部' },
    { id: '2003', code: '2003', name: '电商渠道部' },
    { id: '3008', code: '3008', name: '商超大客户部' }
  ];
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
    var rows = historyUntilForCalc(customer, period);
    var sales = sumWindowRows(rows, 'sales', 12);
    var refund = sumWindowRows(rows, 'refund', 12);
    if (!sales) return 0;
    return round8(refund / sales);
  }

  function computeRefundSalesBasis(customer, period, windowMonths) {
    var rows = historyUntilForCalc(customer, period);
    return round2(sumWindowRows(rows, 'sales', windowMonths));
  }

  function historyBefore(customer, period) {
    return historyRows(customer).filter(function (row) {
      return row.period < period;
    });
  }

  function computeOpeningSalesBasis(customer, period, prevPeriod, windowMonths) {
    var anchorPeriod = prevPeriod || shiftPeriod(period, -1);
    return round2(sumWindowRows(historyUntilForCalc(customer, anchorPeriod), 'sales', windowMonths));
  }

  function comparePeriod(a, b) {
    if (periodIndexMap[a] != null && periodIndexMap[b] != null) {
      return periodIndexMap[a] - periodIndexMap[b];
    }
    return String(a).localeCompare(String(b));
  }

  function getDemoAnchorPeriod() {
    if (base.demoAnchorPeriod) {
      return base.demoAnchorPeriod;
    }
    if (periods.length) {
      return periods[periods.length - 1];
    }
    var now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1);
  }

  function getRefundAnchorPeriod() {
    return getDemoAnchorPeriod();
  }

  function getRollingRefundPeriods(anchorPeriod) {
    var anchor = anchorPeriod || getRefundAnchorPeriod();
    var list = [];
    var i;
    for (i = -REFUND_ROLLING_PAST_MONTHS; i <= REFUND_ROLLING_FUTURE_MONTHS; i += 1) {
      list.push(shiftPeriod(anchor, i));
    }
    return list;
  }

  function parseRefundRuleId(ruleId) {
    var match = /^(.+)\|(\d{4}-\d{2})$/.exec(String(ruleId || ''));
    if (!match) return null;
    return { customer: match[1], period: match[2] };
  }

  function getInheritedRefundWindowMonths(customer, period) {
    var overrides = readOverrides(STORAGE_KEYS.refundRules);
    var latestWindow = null;
    var latestPeriod = null;
    Object.keys(overrides).forEach(function (ruleId) {
      var parsed = parseRefundRuleId(ruleId);
      var overrideRow = overrides[ruleId] || {};
      if (!parsed || parsed.customer !== customer || !hasValue(overrideRow.windowMonths)) return;
      if (period && comparePeriod(parsed.period, period) > 0) return;
      if (!latestPeriod || comparePeriod(parsed.period, latestPeriod) > 0) {
        latestPeriod = parsed.period;
        latestWindow = toPositiveInt(overrideRow.windowMonths, null);
      }
    });
    return latestWindow;
  }

  function getRefundRuleTemplate(customer) {
    var list = refundRuleBaseRows.filter(function (row) {
      return row.customer === customer;
    });
    if (!list.length) return { windowMonths: 3 };
    list.sort(function (a, b) {
      return comparePeriod(a.period, b.period);
    });
    var template = list[list.length - 1];
    var inheritedWindow = getInheritedRefundWindowMonths(customer);
    if (inheritedWindow != null) {
      return Object.assign({}, template, { windowMonths: inheritedWindow });
    }
    return template;
  }

  function getRefundSalesIncome(customer, period) {
    var row = historyRows(customer).find(function (item) {
      return item.period === period;
    });
    if (row) return round2(row.sales);
    return round2(getIncome(customer, period));
  }

  function getRefundActualAmount(customer, period) {
    var row = historyRows(customer).find(function (item) {
      return item.period === period;
    });
    if (row) return round2(Math.abs(row.refund || 0));
    var id = buildKey([customer, period]);
    var override = readOverrides(STORAGE_KEYS.refundActuals)[id] || {};
    if (hasValue(override.actualAmount)) return round2(override.actualAmount);
    var ledger = refundLedgerBaseMap[id] || {};
    if (hasValue(ledger.actualAmount)) return round2(ledger.actualAmount);
    return 0;
  }

  function historyUntilForCalc(customer, period) {
    var byPeriod = {};
    historyUntil(customer, period).forEach(function (row) {
      byPeriod[row.period] = {
        period: row.period,
        sales: Number(row.sales || 0),
        refund: Math.abs(Number(row.refund || 0))
      };
    });
    periods.filter(function (item) {
      return item <= period;
    }).forEach(function (item) {
      if (!byPeriod[item]) {
        byPeriod[item] = {
          period: item,
          sales: getRefundSalesIncome(customer, item),
          refund: getRefundActualAmount(customer, item)
        };
      }
    });
    getRollingRefundPeriods(getRefundAnchorPeriod()).filter(function (item) {
      return item <= period;
    }).forEach(function (item) {
      if (!byPeriod[item]) {
        byPeriod[item] = {
          period: item,
          sales: getRefundSalesIncome(customer, item),
          refund: getRefundActualAmount(customer, item)
        };
      }
    });
    return Object.keys(byPeriod).sort().map(function (item) {
      return byPeriod[item];
    });
  }

  function sumWindowRows(list, field, size) {
    return list.slice(Math.max(list.length - size, 0)).reduce(function (sum, row) {
      return sum + Number(row[field] || 0);
    }, 0);
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

  function getSalesOrderAmountExTax(customer, period) {
    var row = getBaseAccrualRow(customer, period);
    if (row && row.orderAmountExTax != null) return round2(row.orderAmountExTax);
    var kingdeeRows = base.kingdeeOrderAmounts || {};
    var key = buildKey([customer, period]);
    if (kingdeeRows[key] != null) return round2(kingdeeRows[key]);
    return round2(getIncome(customer, period) * KINGDEE_ORDER_TAX_FACTOR);
  }

  function normalizeDeductionMethod(method) {
    if (method === 'kingdee_doc_ratio') return 'dept_fixed_ratio';
    return method || 'fixed_ratio';
  }

  function getClosedPeriods() {
    return Array.isArray(base.closedPeriods) ? base.closedPeriods.slice() : [];
  }

  function isPeriodClosed(period) {
    return getClosedPeriods().indexOf(period) >= 0;
  }

  function getRecalcFromPeriod() {
    var i;
    for (i = 0; i < periods.length; i += 1) {
      if (!isPeriodClosed(periods[i])) return periods[i];
    }
    return periods.length ? periods[0] : '';
  }

  function getErpDeptMaster() {
    return base.erpDeptMaster && typeof base.erpDeptMaster === 'object' ? base.erpDeptMaster : {};
  }

  function getErpOrderDeptAmountsMap() {
    return base.erpOrderDeptAmounts && typeof base.erpOrderDeptAmounts === 'object'
      ? base.erpOrderDeptAmounts
      : {};
  }

  function parseCustomerPeriodKey(key) {
    var idx = String(key || '').lastIndexOf('|');
    if (idx < 0) return null;
    return {
      customer: key.slice(0, idx),
      period: key.slice(idx + 1)
    };
  }

  function getErpOrderDepartments(customer) {
    var master = getErpDeptMaster();
    var amountsMap = getErpOrderDeptAmountsMap();
    var codeSet = {};
    Object.keys(amountsMap).forEach(function (key) {
      var parsed = parseCustomerPeriodKey(key);
      if (!parsed) return;
      if (customer && parsed.customer !== customer) return;
      var split = amountsMap[key];
      if (!split || typeof split !== 'object') return;
      Object.keys(split).forEach(function (code) {
        codeSet[code] = true;
      });
    });
    return Object.keys(codeSet).sort().map(function (code) {
      return {
        id: code,
        code: code,
        name: master[code] || ('部门 ' + code)
      };
    });
  }

  function readCustomerDeptMasterMap() {
    return safeRead(STORAGE_KEYS.customerDeptMaster);
  }

  function normalizeDepartmentMasterItem(item) {
    var code = String(item && (item.code || item.id) ? (item.code || item.id) : '').trim();
    if (!code) return null;
    return {
      id: code,
      code: code,
      name: String(item && item.name != null ? item.name : '').trim()
    };
  }

  function getMaintainedDepartments(customer) {
    if (!customer) return [];
    var map = readCustomerDeptMasterMap();
    var list = map[customer];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeDepartmentMasterItem).filter(function (item) {
      return !!item;
    });
  }

  function getDepartments(customer) {
    var maintained = getMaintainedDepartments(customer);
    if (maintained.length) return maintained;
    var erpDepts = getErpOrderDepartments(customer);
    if (erpDepts.length) return erpDepts;
    if (!customer) return DEFAULT_DEPARTMENTS.slice();
    return [];
  }

  function setCustomerDepartments(customer, departments) {
    if (!customer) return;
    var map = readCustomerDeptMasterMap();
    var normalized = (departments || []).map(normalizeDepartmentMasterItem).filter(function (item) {
      return !!item;
    });
    if (!normalized.length) {
      delete map[customer];
    } else {
      map[customer] = normalized;
    }
    safeWrite(STORAGE_KEYS.customerDeptMaster, map);
  }

  function getDefaultDeptItems(customer) {
    return getDepartments(customer).map(function (dept) {
      return {
        id: dept.id,
        code: dept.code || dept.id,
        name: dept.name,
        ratio: 0
      };
    });
  }

  function normalizeDeptItem(item) {
    var code = String(item && item.code ? item.code : (item && item.id ? item.id : ''));
    return {
      id: code,
      code: code,
      name: String(item && item.name != null ? item.name : '').trim(),
      ratio: round8(Number(item && item.ratio != null ? item.ratio : 0))
    };
  }

  function resolveDeptItems(overrideRow, customer, baseRow) {
    var defaults = getDefaultDeptItems(customer);
    if (!defaults.length) return [];

    var savedMap = {};
    if (overrideRow && Array.isArray(overrideRow.deptItems) && overrideRow.deptItems.length) {
      overrideRow.deptItems.forEach(function (item) {
        var normalized = normalizeDeptItem(item);
        if (normalized.id) savedMap[normalized.id] = normalized;
      });
    } else if (overrideRow && overrideRow.deptRatios) {
      defaults.forEach(function (dept) {
        savedMap[dept.id] = normalizeDeptItem({
          id: dept.id,
          code: dept.code,
          name: dept.name,
          ratio: Number(overrideRow.deptRatios[dept.id] || 0)
        });
      });
    } else if (baseRow && Array.isArray(baseRow.deptItems) && baseRow.deptItems.length) {
      baseRow.deptItems.forEach(function (item) {
        var normalized = normalizeDeptItem(item);
        if (normalized.id) savedMap[normalized.id] = normalized;
      });
    } else if (baseRow && baseRow.deptRatios) {
      defaults.forEach(function (dept) {
        savedMap[dept.id] = normalizeDeptItem({
          id: dept.id,
          code: dept.code,
          name: dept.name,
          ratio: Number(baseRow.deptRatios[dept.id] || 0)
        });
      });
    }

    return defaults.map(function (dept) {
      return savedMap[dept.id] || normalizeDeptItem(dept);
    });
  }

  function deptItemsToRatios(deptItems) {
    var ratios = {};
    (deptItems || []).forEach(function (item) {
      ratios[item.id] = round8(Number(item.ratio || 0));
    });
    return ratios;
  }

  function resolveDeptRatios(overrideRow, customer, baseRow) {
    return deptItemsToRatios(resolveDeptItems(overrideRow, customer, baseRow));
  }

  function getDeptOrderAmounts(customer, period, deptItems) {
    var depts = deptItems && deptItems.length ? deptItems : getDefaultDeptItems(customer);
    var key = buildKey([customer, period]);
    var erpSplits = getErpOrderDeptAmountsMap()[key];
    if (erpSplits && typeof erpSplits === 'object') {
      var erpMapped = {};
      depts.forEach(function (dept) {
        erpMapped[dept.id] = round2(erpSplits[dept.id] || erpSplits[dept.code] || 0);
      });
      return erpMapped;
    }

    var total = getSalesOrderAmountExTax(customer, period);
    var splitMap = base.deptOrderSplits || {};
    if (splitMap[key] && typeof splitMap[key] === 'object') {
      var mapped = {};
      var sum = 0;
      depts.forEach(function (dept) {
        mapped[dept.id] = round2(splitMap[key][dept.id] || 0);
        sum += mapped[dept.id];
      });
      if (sum > 0) return mapped;
    }
    if (!depts.length) return {};
    var each = round2(total / depts.length);
    var amounts = {};
    depts.forEach(function (dept, index) {
      amounts[dept.id] = index === depts.length - 1
        ? round2(total - each * (depts.length - 1))
        : each;
    });
    return amounts;
  }

  function computeDeptFixedAccrual(customer, period, deptItems) {
    var items = deptItems && deptItems.length ? deptItems : getDefaultDeptItems(customer);
    var amounts = getDeptOrderAmounts(customer, period, items);
    return round2(items.reduce(function (sum, dept) {
      return sum + Number(amounts[dept.id] || 0) * Number(dept.ratio || 0);
    }, 0));
  }

  function buildDeptRatioRows(customer, period, deptItems) {
    var items = deptItems && deptItems.length ? deptItems : getDefaultDeptItems(customer);
    var amounts = getDeptOrderAmounts(customer, period, items);
    return items.map(function (dept) {
      var ratio = Number(dept.ratio || 0);
      var orderAmount = Number(amounts[dept.id] || 0);
      return {
        id: dept.id,
        code: dept.code || dept.id,
        name: dept.name,
        ratio: round8(ratio),
        orderAmountExTax: round2(orderAmount),
        accrual: round2(orderAmount * ratio)
      };
    });
  }

  function isSameDeptItems(left, right) {
    var a = (left || []).slice().sort(function (x, y) { return String(x.id).localeCompare(String(y.id)); });
    var b = (right || []).slice().sort(function (x, y) { return String(x.id).localeCompare(String(y.id)); });
    if (a.length !== b.length) return false;
    return a.every(function (item, index) {
      var other = b[index];
      return item.id === other.id &&
        String(item.name || '') === String(other.name || '') &&
        round8(item.ratio || 0) === round8(other.ratio || 0);
    });
  }

  function hasDeptRatioValues(deptItems) {
    if (!Array.isArray(deptItems) || !deptItems.length) return false;
    return deptItems.some(function (item) {
      return Number(item.ratio || 0) > 0;
    });
  }

  function resolveDeductionMethod(baseRow, overrideRow) {
    if (baseRow.feeType === '销售费用') return resolveExpenseMethod(baseRow, overrideRow);
    return normalizeDeductionMethod(overrideRow.method || baseRow.method || 'fixed_ratio');
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
    var method = overrideRow && overrideRow.method ? overrideRow.method : (baseRow.method || 'monthly_fixed');
    if (method === 'custom_monthly') method = 'monthly_fixed';
    if (method !== 'budget_or_fixed') {
      if (method === 'monthly_fixed' || method === 'annual_avg' || method === 'fixed_ratio') return method;
      return 'monthly_fixed';
    }

    var customer = baseRow.customer;
    var monthlyAmounts = periods.map(function (period) {
      return round2(getBaseAccrualAmount(customer, '销售费用', period));
    }).filter(function (value) { return value > 0; });

    if (monthlyAmounts.length > 1) {
      var first = monthlyAmounts[0];
      var allSame = monthlyAmounts.every(function (value) {
        return Math.abs(value - first) < 0.02;
      });
      if (allSame) return 'monthly_fixed';
    }
    if (Number(baseRow.ratio || 0) > 0 && monthlyAmounts.length) {
      var ratioValue = Number(baseRow.ratio);
      var allMatchRatio = periods.every(function (p) {
        var amt = round2(getBaseAccrualAmount(customer, '销售费用', p));
        if (amt <= 0) return true;
        var income = getIncome(customer, p);
        return income > 0 && Math.abs(amt - income * ratioValue) < 1;
      });
      if (allMatchRatio) return 'fixed_ratio';
    }
    if (Number(baseRow.baseAmount || 0) > 0 && monthlyAmounts.length) {
      var annualAvg = round2(Number(baseRow.baseAmount) / 12);
      if (monthlyAmounts.every(function (value) { return Math.abs(value - annualAvg) < 1; })) {
        return 'annual_avg';
      }
      if (Math.abs(monthlyAmounts[0] - Number(baseRow.baseAmount)) < 1) return 'monthly_fixed';
    }
    return 'monthly_fixed';
  }

  function describeExpenseRule(method, ratio, baseAmount, customer, period, excelAccrual, hasOverride) {
    var excelAmt = round2(excelAccrual || 0);
    if (method === 'monthly_fixed') {
      if (hasOverride) return '月固定金额 ' + round2(baseAmount || excelAmt || 0);
      return '月固定金额 ' + round2(excelAmt > 0 ? excelAmt : (baseAmount || 0));
    }
    if (method === 'annual_avg') {
      var monthly = hasOverride
        ? round2(Number(baseAmount || 0) / 12)
        : (excelAmt > 0 ? excelAmt : round2(Number(baseAmount || 0) / 12));
      var annual = hasOverride
        ? round2(baseAmount || 0)
        : (excelAmt > 0 ? round2(excelAmt * 12) : round2(baseAmount || 0));
      return '年总额 ' + round2(annual) + ' ÷ 12 = ' + round2(monthly);
    }
    if (method === 'fixed_ratio') return '当月收入 × ' + round8(ratio || 0);
    return '—';
  }

  function getFixedRule(ruleId) {
    var baseRow = fixedRuleBaseMap[ruleId] || {};
    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    var overrideRow = overrides[ruleId] || {};
    var method = resolveDeductionMethod(baseRow, overrideRow);
    var ratio = numericOrNull(overrideRow.ratio);
    if (ratio == null) ratio = numericOrNull(baseRow.ratio);
    if (ratio == null) ratio = 0;
    var baseAmount = numericOrNull(overrideRow.baseAmount);
    if (baseAmount == null) baseAmount = numericOrNull(baseRow.baseAmount);
    var note = Object.prototype.hasOwnProperty.call(overrideRow, 'note') ? String(overrideRow.note || '') : String(baseRow.note || '');
    var sourcePeriod = baseRow.sourcePeriod || periods[periods.length - 1] || periods[0] || '';
    var previewPeriod = sourcePeriod;
    var sampleIncome = getIncome(baseRow.customer, previewPeriod);
    var sampleOrderAmount = getSalesOrderAmountExTax(baseRow.customer, previewPeriod);
    var deptItems = resolveDeptItems(overrideRow, baseRow.customer, baseRow);
    var deptRatios = resolveDeptRatios(overrideRow, baseRow.customer, baseRow);
    var deptRatioRows = buildDeptRatioRows(baseRow.customer, previewPeriod, deptItems);
    var sampleAccrual = computeDeductionAccrual(baseRow.customer, baseRow.feeType, previewPeriod, true);
    var excelAccrual = round2(getBaseAccrualAmount(baseRow.customer, baseRow.feeType, previewPeriod));
    var hasOverride = hasOverrideValues(overrideRow);
    var effectiveRatio = method === 'dept_fixed_ratio'
      ? (sampleOrderAmount ? round8(sampleAccrual / sampleOrderAmount) : 0)
      : ratio;

    return {
      id: ruleId,
      customer: baseRow.customer || '',
      feeType: baseRow.feeType || '',
      method: method,
      methodLabel: METHOD_LABELS[method] || method || '-',
      ratio: round8(effectiveRatio),
      manualRatio: round8(ratio),
      deptRatios: deptRatios,
      deptItems: deptItems,
      deptRatioRows: deptRatioRows,
      ratioLabel: ratioLabelForFeeType(baseRow.feeType),
      ratioSource: method === 'dept_fixed_ratio' ? '部门固定比例' : (hasValue(overrideRow.ratio) ? '手工覆盖' : '客户计提规则'),
      baseAmount: baseAmount == null ? 0 : baseAmount,
      sourcePeriod: sourcePeriod,
      sampleIncome: sampleIncome,
      sampleOrderAmount: sampleOrderAmount,
      sampleAccrual: sampleAccrual,
      expenseRuleDesc: baseRow.feeType === '销售费用'
        ? describeExpenseRule(method, ratio, baseAmount, baseRow.customer, previewPeriod, excelAccrual, hasOverride)
        : '',
      excelAccrual: excelAccrual,
      formulaDesc: buildFixedFormulaDesc(baseRow.feeType, method),
      note: note,
      origin: hasOverrideValues(overrideRow) ? '已调整' : '系统基线',
      updatedAt: overrideRow.updatedAt || '系统基线'
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
    if (method === 'dept_fixed_ratio') {
      var baseRow = fixedRuleBaseMap[buildKey([customer, feeType])] || {};
      var overrideRow = readOverrides(STORAGE_KEYS.fixedRules)[buildKey([customer, feeType])] || {};
      return computeDeptFixedAccrual(customer, period, resolveDeptItems(overrideRow, customer, baseRow));
    }
    return round2(income * Number(ratio || 0));
  }

  function hasFixedMetricOverride(row) {
    if (!row) return false;
    if (row.deptItems && row.deptItems.length) return true;
    if (row.deptRatios && typeof row.deptRatios === 'object') return true;
    return hasValue(row.method) || hasValue(row.ratio) || hasValue(row.baseAmount);
  }

  function buildFixedFormulaDesc(feeType, method) {
    method = normalizeDeductionMethod(method);
    if (feeType === '销售费用') {
      if (method === 'monthly_fixed') return '销售费用 = 月固定金额';
      if (method === 'annual_avg') return '销售费用 = 年总金额 ÷ 12';
      if (method === 'fixed_ratio') return '销售费用 = 当月收入 × 固定比例';
      return '销售费用按客户计提规则中的月度金额计提';
    }
    if (method === 'monthly_fixed') return '按固定月度金额计提';
    if (method === 'dept_fixed_ratio') return '计提金额 = Σ（部门销售订单金额不含税 × 部门固定比例）';
    return '计提金额 = 当月收入 × 规则比例';
  }

  function getRefundRule(ruleId) {
    var hasBaseRule = !!refundRuleBaseMap[ruleId];
    var baseRow = refundRuleBaseMap[ruleId];
    if (!baseRow) {
      var parsed = parseRefundRuleId(ruleId);
      if (!parsed) return {};
      var template = getRefundRuleTemplate(parsed.customer);
      baseRow = {
        id: ruleId,
        customer: parsed.customer,
        period: parsed.period,
        windowMonths: template.windowMonths || 3,
        note: ''
      };
    }
    var overrides = readOverrides(STORAGE_KEYS.refundRules);
    var overrideRow = overrides[ruleId] || {};
    var metricsOverridden = hasRefundMetricOverride(overrideRow);
    var excelWindow = toPositiveInt(baseRow.windowMonths, 3);
    var inheritedWindow = getInheritedRefundWindowMonths(baseRow.customer, baseRow.period);
    var baseWindow = inheritedWindow != null ? inheritedWindow : excelWindow;
    var windowMonths = hasValue(overrideRow.windowMonths)
      ? toPositiveInt(overrideRow.windowMonths, baseWindow)
      : baseWindow;
    var windowInherited = inheritedWindow != null && !hasValue(overrideRow.windowMonths) && windowMonths !== excelWindow;
    var systemRatio = computeRefundRatio(baseRow.customer, baseRow.period);
    var ratio = metricsOverridden
      ? numericOrNull(overrideRow.ratio)
      : (hasBaseRule ? numericOrNull(baseRow.ratio) : null);
    if (ratio == null) ratio = systemRatio != null ? systemRatio : 0;
    var salesBasis = (metricsOverridden || windowInherited || !hasBaseRule)
      ? computeRefundSalesBasis(baseRow.customer, baseRow.period, windowMonths)
      : round2(baseRow.salesBasis || 0);
    if (!salesBasis) salesBasis = computeRefundSalesBasis(baseRow.customer, baseRow.period, windowMonths);
    var targetClosing = metricsOverridden || windowInherited || !hasBaseRule
      ? null
      : (hasBaseRule ? numericOrNull(baseRow.targetClosing) : null);
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
      origin: hasOverrideValues(overrideRow) ? '已调整' : '系统基线',
      updatedAt: overrideRow.updatedAt || '系统基线'
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
    var method = resolveDeductionMethod(baseRow, overrideRow);
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
      if (excelAmount || excelAmount === 0) return round2(excelAmount);
      return round2(ledgerBase ? ledgerBase.excelAccrual : 0);
    }

    if (method === 'monthly_fixed') return round2(baseAmount || 0);
    if (method === 'dept_fixed_ratio') {
      return computeDeptFixedAccrual(customer, period, resolveDeptItems(overrideRow, customer, baseRow));
    }
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
      var expenseBaseRow = fixedRuleBaseMap[buildKey([customer, '销售费用'])] || null;
      var expenseOverride = expenseBaseRow
        ? (readOverrides(STORAGE_KEYS.fixedRules)[buildKey([customer, '销售费用'])] || {})
        : {};
      var expenseMethodCode = expenseBaseRow ? resolveExpenseMethod(expenseBaseRow, expenseOverride) : '';
      var expenseMethodLabel = METHOD_LABELS[expenseMethodCode] || expenseMethodCode || '—';
      var excelExpense = round2(getBaseAccrualAmount(customer, '销售费用', period));
      var expenseRatio = expenseRule ? Number(expenseRule.manualRatio != null ? expenseRule.manualRatio : (expenseRule.ratio || 0)) : 0;
      var expenseBaseAmount = expenseRule ? round2(expenseRule.baseAmount || 0) : 0;
      var expenseDesc = expenseRule
        ? describeExpenseRule(
          expenseMethodCode,
          expenseRatio,
          expenseBaseAmount,
          customer,
          period,
          excelExpense,
          hasOverrideValues(expenseOverride)
        )
        : '—';

      return {
        customer: customer,
        period: period,
        income: income,
        promoRatio: promoRule ? Number(promoRule.ratio || 0) : 0,
        salesDiscountRatio: salesRule ? Number(salesRule.ratio || 0) : 0,
        cashDiscountRatio: cashRule ? Number(cashRule.ratio || 0) : 0,
        promoMethod: promoRule ? promoRule.methodLabel : '—',
        salesDiscountMethod: salesRule ? salesRule.methodLabel : '—',
        cashDiscountMethod: cashRule ? cashRule.methodLabel : '—',
        promoAccrual: promoAccrual,
        salesDiscountAccrual: salesAccrual,
        cashDiscountAccrual: cashAccrual,
        salesExpenseAccrual: expenseAccrual,
        salesExpenseMethod: expenseMethodLabel,
        salesExpenseMethodCode: expenseMethodCode,
        salesExpenseRuleDesc: expenseDesc,
        salesExpenseBudget: expenseRule ? round2(expenseRule.baseAmount || 0) : 0,
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
    var rollingPeriods = getRollingRefundPeriods(getRefundAnchorPeriod());

    refundRuleBaseRows.forEach(function (row) {
      if (!rowsByCustomer[row.customer]) rowsByCustomer[row.customer] = [];
      rowsByCustomer[row.customer].push(row.period);
    });

    Object.keys(rowsByCustomer).forEach(function (customer) {
      rollingPeriods.forEach(function (period) {
        if (rowsByCustomer[customer].indexOf(period) < 0) {
          rowsByCustomer[customer].push(period);
        }
      });
      rowsByCustomer[customer].sort(comparePeriod);
    });

    var result = [];

    Object.keys(rowsByCustomer).forEach(function (customer) {
      var previousClosing = null;
      var hasPriorDelta = false;

      rowsByCustomer[customer].forEach(function (period, index) {
        var id = buildKey([customer, period]);
        var baseLedger = refundLedgerBaseMap[id] || {};
        var hasBaseLedger = Object.keys(baseLedger).length > 0;
        var actualOverride = actualOverrides[id] || {};
        var isProjected = !hasBaseLedger && !hasValue(actualOverride.actualAmount);
        var ruleOverride = ruleOverrides[id] || {};
        var rule = getRefundRule(id);
        var prevPeriod = index > 0 ? rowsByCustomer[customer][index - 1] : null;
        var prevRatio = getPreviousRefundRatio(customer, period, rowsByCustomer[customer], index);
        var inheritedWindow = getInheritedRefundWindowMonths(customer, period);
        var excelRuleWindow = toPositiveInt((refundRuleBaseMap[id] || {}).windowMonths, 3);
        var windowInherited = inheritedWindow != null && !hasValue(ruleOverride.windowMonths) && inheritedWindow !== excelRuleWindow;
        var openingSalesBasis = computeOpeningSalesBasis(
          customer,
          period,
          prevPeriod,
          rule.windowMonths
        );
        var openingBalance;
        var actualRefund;
        var targetClosing;
        var accrualAmount;
        var closingBalance;
        var affectsCalc = hasPriorDelta || hasValue(actualOverride.actualAmount) || hasRefundMetricOverride(ruleOverride) || isProjected || windowInherited;
        var needsRecalcOpening = hasPriorDelta || hasRefundMetricOverride(ruleOverride) || isProjected || windowInherited;

        if (!affectsCalc && hasBaseLedger) {
          openingBalance = round2(baseLedger.openingBalance || 0);
          actualRefund = round2(baseLedger.actualAmount || 0);
          targetClosing = round2(baseLedger.closingBalance || 0);
          accrualAmount = round2(baseLedger.excelAccrual || 0);
          closingBalance = round2(baseLedger.closingBalance || 0);
        } else {
          openingBalance = needsRecalcOpening
            ? round2(prevRatio * openingSalesBasis)
            : round2(baseLedger.openingBalance || 0);
          actualRefund = hasValue(actualOverride.actualAmount)
            ? round2(actualOverride.actualAmount)
            : (hasBaseLedger ? round2(baseLedger.actualAmount || 0) : 0);
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
          salesIncome: getRefundSalesIncome(customer, period),
          isProjected: isProjected,
          note: actualOverride.note || '',
          actualSource: hasValue(actualOverride.actualAmount) ? '手工录入' : (isProjected ? '规则测算' : '系统基线'),
          updatedAt: actualOverride.updatedAt || (isProjected ? '规则测算' : '系统基线'),
          excelAccrual: round2(baseLedger.excelAccrual || 0),
          excelClosing: round2(baseLedger.closingBalance || 0)
        });
      });
    });

    return result.sort(function (a, b) {
      if (a.period !== b.period) return comparePeriod(a.period, b.period);
      return a.customer.localeCompare(b.customer, 'en');
    });
  }

  function getDeductions() {
    var actualOverrides = readOverrides(STORAGE_KEYS.deductionActuals);
    var fixedRuleOverrides = readOverrides(STORAGE_KEYS.fixedRules);
    var grouped = {};
    var rollingPeriods = getRollingRefundPeriods(getRefundAnchorPeriod());

    deductionLedgerBaseRows.forEach(function (row) {
      var groupKey = buildKey([row.feeType, row.customer]);
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(row.period);
    });

    fixedRuleBaseRows.forEach(function (row) {
      var groupKey = buildKey([row.feeType, row.customer]);
      if (!grouped[groupKey]) grouped[groupKey] = [];
    });

    Object.keys(grouped).forEach(function (groupKey) {
      rollingPeriods.forEach(function (period) {
        if (grouped[groupKey].indexOf(period) < 0) {
          grouped[groupKey].push(period);
        }
      });
      grouped[groupKey].sort(comparePeriod);
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
        var hasBaseLedger = Object.keys(baseLedger).length > 0;
        var actualOverride = actualOverrides[id] || {};
        var isProjected = !hasBaseLedger && !hasValue(actualOverride.actualAmount);
        var openingBalance;
        var actualDeduction;
        var accrualDeduction;
        var closingBalance;
        var affectsCalc = hasPriorDelta || hasValue(actualOverride.actualAmount) || isProjected;
        var needsRecalcOpening = hasPriorDelta || isProjected;
        var rule = fixedRuleBaseMap[buildKey([customer, feeType])] ? getFixedRule(buildKey([customer, feeType])) : null;
        var ruleDeptItems = rule ? (rule.deptItems || []) : [];
        var ruleDeptRatios = rule ? (rule.deptRatios || {}) : {};
        var ruleDeptRatioRows = rule && rule.method === 'dept_fixed_ratio'
          ? buildDeptRatioRows(customer, period, ruleDeptItems)
          : [];

        if (!affectsCalc && hasBaseLedger) {
          openingBalance = round2(baseLedger.openingBalance || 0);
          actualDeduction = round2(baseLedger.actualAmount || 0);
          accrualDeduction = round2(baseLedger.excelAccrual || 0);
          closingBalance = round2(baseLedger.closingBalance || 0);
        } else {
          openingBalance = needsRecalcOpening
            ? round2(previousClosing || 0)
            : round2(baseLedger.openingBalance || 0);
          actualDeduction = hasValue(actualOverride.actualAmount)
            ? round2(actualOverride.actualAmount)
            : (hasBaseLedger ? round2(baseLedger.actualAmount || 0) : 0);
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
          updatedAt: actualOverride.updatedAt || (isProjected ? '规则测算' : '系统基线'),
          isProjected: isProjected,
          actualSource: hasValue(actualOverride.actualAmount) ? '手工录入' : (isProjected ? '规则测算' : '系统基线'),
          income: round2(getIncome(customer, period)),
          orderAmountExTax: round2(getSalesOrderAmountExTax(customer, period)),
          ruleRatio: rule ? Number(rule.ratio || 0) : 0,
          ruleManualRatio: rule ? Number(rule.manualRatio || rule.ratio || 0) : 0,
          ruleDeptItems: ruleDeptItems,
          ruleDeptRatios: ruleDeptRatios,
          ruleDeptRatioRows: ruleDeptRatioRows,
          ruleBaseAmount: rule ? round2(rule.baseAmount || 0) : 0,
          ruleMethod: rule ? rule.method : '',
          ruleMethodLabel: rule ? rule.methodLabel : '系统默认',
          excelBaseAccrual: round2(getBaseAccrualAmount(customer, feeType, period)),
          excelAccrual: round2(baseLedger.excelAccrual || 0),
          excelClosing: round2(baseLedger.closingBalance || 0)
        });
      });
    });

    return result.sort(function (a, b) {
      if (a.period !== b.period) return comparePeriod(a.period, b.period);
      if (a.customer !== b.customer) return a.customer.localeCompare(b.customer, 'en');
      return DEDUCTION_FEE_TYPES.indexOf(a.feeType) - DEDUCTION_FEE_TYPES.indexOf(b.feeType);
    });
  }

  function upsertFixedRule(payload) {
    var baseRow = fixedRuleBaseMap[payload.id];
    if (!baseRow) return null;

    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    var nextMethod = normalizeDeductionMethod(payload.method || baseRow.method);
    var nextRow = {
      method: nextMethod,
      ratio: nextMethod === 'dept_fixed_ratio' ? null : numericOrNull(payload.ratio),
      baseAmount: numericOrNull(payload.baseAmount),
      note: String(payload.note || ''),
      updatedAt: nowText()
    };

    if (payload.deptItems && Array.isArray(payload.deptItems)) {
      nextRow.deptItems = payload.deptItems.map(normalizeDeptItem).filter(function (item) {
        return item.name;
      });
      nextRow.deptRatios = deptItemsToRatios(nextRow.deptItems);
    } else if (payload.deptRatios && typeof payload.deptRatios === 'object') {
      nextRow.deptRatios = payload.deptRatios;
    }

    if (nextRow.ratio == null && nextMethod !== 'dept_fixed_ratio') {
      nextRow.ratio = numericOrNull(baseRow.ratio);
    }
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
    var baseMethod = resolveDeductionMethod(baseRow, {});
    var overrideMethod = normalizeDeductionMethod(overrideRow.method || baseMethod);
    if (overrideMethod !== baseMethod) return false;
    if (overrideMethod === 'dept_fixed_ratio') {
      return isSameDeptItems(
        resolveDeptItems(overrideRow, baseRow.customer, baseRow),
        resolveDeptItems({}, baseRow.customer, baseRow)
      ) &&
        round2(overrideRow.baseAmount || 0) === round2(baseRow.baseAmount || 0) &&
        String(overrideRow.note || '') === String(baseRow.note || '');
    }
    return round8(overrideRow.ratio || 0) === round8(baseRow.ratio || 0) &&
      round2(overrideRow.baseAmount || 0) === round2(baseRow.baseAmount || 0) &&
      String(overrideRow.note || '') === String(baseRow.note || '');
  }

  function resetFixedRule(ruleId) {
    var overrides = readOverrides(STORAGE_KEYS.fixedRules);
    delete overrides[ruleId];
    writeOverrides(STORAGE_KEYS.fixedRules, overrides);
  }

  function upsertRefundRule(payload) {
    var baseRow = refundRuleBaseMap[payload.id];
    if (!baseRow) {
      var parsed = parseRefundRuleId(payload.id);
      if (!parsed) return null;
      var template = getRefundRuleTemplate(parsed.customer);
      baseRow = {
        customer: parsed.customer,
        period: parsed.period,
        windowMonths: template.windowMonths || 3,
        ratio: computeRefundRatio(parsed.customer, parsed.period),
        note: ''
      };
    }

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
    refundRollingPastMonths: REFUND_ROLLING_PAST_MONTHS,
    refundRollingFutureMonths: REFUND_ROLLING_FUTURE_MONTHS,
    getRules: getRules,
    getFixedRules: getFixedRules,
    getRefundRules: getRefundRules,
    getRefunds: getRefunds,
    getDeductions: getDeductions,
    getFixedRule: getFixedRule,
    getIncome: getIncome,
    getDepartments: getDepartments,
    getMaintainedDepartments: getMaintainedDepartments,
    getErpOrderDepartments: getErpOrderDepartments,
    setCustomerDepartments: setCustomerDepartments,
    getDefaultDeptItems: getDefaultDeptItems,
    getRecalcFromPeriod: getRecalcFromPeriod,
    isPeriodClosed: isPeriodClosed,
    resolveDeptItems: resolveDeptItems,
    getSalesOrderAmountExTax: getSalesOrderAmountExTax,
    getDeptOrderAmounts: getDeptOrderAmounts,
    computeDeptFixedAccrual: computeDeptFixedAccrual,
    buildDeptRatioRows: buildDeptRatioRows,
    getRefundSalesIncome: getRefundSalesIncome,
    getBaseAccrualAmount: getBaseAccrualAmount,
    computeDeductionAccrual: computeDeductionAccrual,
    getCustomerDeductionRateMatrix: getCustomerDeductionRateMatrix,
    getRefundRule: getRefundRule,
    getRefundAnchorPeriod: getRefundAnchorPeriod,
    getRollingRefundPeriods: getRollingRefundPeriods,
    getRefundHistoryUntil: historyUntilForCalc,
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
