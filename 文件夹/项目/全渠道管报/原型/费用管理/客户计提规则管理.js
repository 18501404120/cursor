(function () {
  'use strict';

  var store = window.SupermarketAccrualStore;
  var editingRatioId = null;
  var editingRatioCustomer = null;
  var editingExpenseId = null;
  var editingDeptItems = null;
  var deptMasterRows = [];
  var deptCustomerMsf = null;
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
      dept_fixed_ratio: '部门固定比例'
    };
    return map[method] || method || '—';
  }

  function ratioCellDisplay(ratio) {
    return pct(ratio);
  }

  function getAnchorPeriod() {
    var list = store.periods || [];
    return list.length ? list[list.length - 1] : '';
  }

  function normalizeExpenseMethod(method) {
    if (!method || method === 'custom_monthly' || method === 'budget_or_fixed') return 'monthly_fixed';
    if (method === 'monthly_fixed' || method === 'annual_avg' || method === 'fixed_ratio') return method;
    return 'monthly_fixed';
  }

  function getRecalcConfirmMessage() {
    var fromPeriod = store.getRecalcFromPeriod ? store.getRecalcFromPeriod() : '';
    if (!fromPeriod) return '保存后将联动扣款管理重算计提结果。是否继续？';
    return '保存后将联动扣款管理，自 ' + fromPeriod + ' 起未关账月份的计提结果重算（已关账月不变）。是否继续？';
  }

  function confirmRecalc() {
    return window.confirm(getRecalcConfirmMessage());
  }

  function validateRatioValue(value) {
    if (value === '' || value == null) return '请填写计提比例';
    var num = Number(value);
    if (!Number.isFinite(num)) return '计提比例须为数字';
    if (num < 0 || num > 1) return '计提比例须在 0～1 之间';
    return '';
  }

  function populateOptions() {
    var customerOpts = store.deductionCustomers.map(function (item) {
      return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
    }).join('');

    document.getElementById('qCustomer').insertAdjacentHTML('beforeend', customerOpts);
  }

  function applyQueryCustomer() {
    var params = new URLSearchParams(window.location.search);
    var customer = params.get('qCustomer') || params.get('customer') || '';
    if (!customer) return;
    var select = document.getElementById('qCustomer');
    if (!select) return;
    var exists = Array.prototype.some.call(select.options, function (opt) {
      return opt.value === customer;
    });
    if (!exists) return;
    select.value = customer;
    window.FeeMgmtCommon.syncClearableSelect(select);
  }

  function getMatrixRows() {
    var customer = document.getElementById('qCustomer').value;
    var period = getAnchorPeriod();
    return store.getCustomerDeductionRateMatrix(period).filter(function (row) {
      if (customer && row.customer !== customer) return false;
      return true;
    });
  }

  function renderMatrixTable() {
    var rows = getMatrixRows();
    var body = document.getElementById('matrixBody');
    document.getElementById('matrixTip').textContent = '共 ' + rows.length + ' 条 · 金额单位 USD';

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:32px;">暂无零售商计提规则</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      return '' +
        '<tr>' +
          '<td>' + esc(row.customer) + '</td>' +
          '<td class="num clickable-cell" data-action="ratio" data-id="' + esc(row.promoRuleId) + '" title="点击调整促销扣款">' + ratioCellDisplay(row.promoRatio) + '</td>' +
          '<td class="num clickable-cell" data-action="ratio" data-id="' + esc(row.salesRuleId) + '" title="点击调整销售折扣">' + ratioCellDisplay(row.salesDiscountRatio) + '</td>' +
          '<td class="num clickable-cell" data-action="ratio" data-id="' + esc(row.cashRuleId) + '" title="点击调整现金折扣">' + ratioCellDisplay(row.cashDiscountRatio) + '</td>' +
          '<td class="clickable-cell" data-action="expense" data-id="' + esc(row.expenseRuleId) + '" title="点击调整销售费用">' + esc(row.salesExpenseMethod) + '</td>' +
          '<td class="clickable-cell" data-action="expense" data-id="' + esc(row.expenseRuleId) + '" title="点击调整销售费用">' + esc((row.salesExpenseRuleDesc || '—').slice(0, 48)) + '</td>' +
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
        code: item.code || item.id,
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
      var code = row.getAttribute('data-dept-code') || id;
      var name = row.getAttribute('data-dept-name') || '';
      var ratioInput = row.querySelector('[data-dept-ratio]');
      items.push({
        id: id,
        code: code,
        name: name,
        ratio: ratioInput ? readDeptRatioInputValue(ratioInput) : 0
      });
    });
    return items;
  }

  function mergeDeptItemsWithMaster(customer, savedItems) {
    var masterItems = store.getDefaultDeptItems ? store.getDefaultDeptItems(customer) : [];
    var savedMap = {};
    (savedItems || []).forEach(function (item) {
      savedMap[item.id] = item;
    });
    return masterItems.map(function (dept) {
      var saved = savedMap[dept.id];
      return saved ? cloneDeptItems([saved])[0] : dept;
    });
  }

  function refreshRatioDeptGridIfOpen() {
    if (!editingRatioId || !editingRatioCustomer) return;
    var row = findFixedById(editingRatioId);
    if (!row) return;
    var method = normalizeRatioMethod(document.getElementById('fRatioMethod').value);
    if (method !== 'dept_fixed_ratio') return;
    editingDeptItems = mergeDeptItemsWithMaster(
      editingRatioCustomer,
      collectDeptItemsFromDom().length ? collectDeptItemsFromDom() : editingDeptItems
    );
    renderDeptRatioGrid();
  }

  function buildDeptCustomerSelectHtml(selected) {
    var html = '<option value="">请选择</option>';
    store.deductionCustomers.forEach(function (item) {
      html += '<option value="' + esc(item) + '"' + (item === selected ? ' selected' : '') + '>' + esc(item) + '</option>';
    });
    return html;
  }

  function getDeptCustomerFilterOptions() {
    return store.deductionCustomers.map(function (item) {
      return { value: item, label: item };
    });
  }

  function destroyDeptCustomerFilter() {
    if (deptCustomerMsf && deptCustomerMsf.destroy) {
      deptCustomerMsf.destroy();
    }
    deptCustomerMsf = null;
  }

  function mountDeptCustomerFilter(initialValues) {
    if (!window.MultiSelectFilter) return;
    var el = document.getElementById('deptCustomerMsfMount');
    if (!el) return;
    destroyDeptCustomerFilter();
    deptCustomerMsf = window.MultiSelectFilter.mount(el, {
      placeholder: '全部客户',
      showSelectAll: true,
      clearable: true,
      zIndex: 2000,
      useBodyPortal: true,
      maxPanelHeight: 260,
      initialValues: (initialValues || []).map(String),
      onChange: function () {
        loadDeptMasterRows();
      },
      getOptions: function () {
        return getDeptCustomerFilterOptions();
      }
    });
  }

  function getDeptFilterCustomers() {
    if (!deptCustomerMsf || !deptCustomerMsf.getValues) return [];
    return deptCustomerMsf.getValues();
  }

  function appendDeptRowsForCustomer(customer) {
    var maintained = store.getMaintainedDepartments ? store.getMaintainedDepartments(customer) : [];
    var source = maintained.length
      ? maintained
      : (store.getErpOrderDepartments ? store.getErpOrderDepartments(customer) : []);
    source.forEach(function (item) {
      deptMasterRows.push({
        customer: customer,
        code: item.code || item.id,
        name: item.name || ''
      });
    });
  }

  function resolveDeptFilterCustomerList() {
    var filterCustomers = getDeptFilterCustomers();
    if (filterCustomers.length) return filterCustomers;

    var customerSet = {};
    if (store.getAllMaintainedDepartmentRows) {
      store.getAllMaintainedDepartmentRows().forEach(function (item) {
        if (item.customer) customerSet[item.customer] = true;
      });
    }
    (store.deductionCustomers || []).forEach(function (customer) {
      if (store.getErpOrderDepartments && store.getErpOrderDepartments(customer).length) {
        customerSet[customer] = true;
      }
    });
    return Object.keys(customerSet).sort();
  }

  function loadDeptMasterRows() {
    deptMasterRows = [];
    resolveDeptFilterCustomerList().forEach(function (customer) {
      appendDeptRowsForCustomer(customer);
    });
    renderDeptMasterTable();
  }

  function renderDeptMasterTable() {
    var body = document.getElementById('deptMasterBody');
    var tip = document.getElementById('deptMasterTip');
    if (!body) return;

    if (tip) tip.textContent = '共 ' + deptMasterRows.length + ' 条';

    if (!deptMasterRows.length) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:20px;">暂无部门，请点击「新增部门」维护</td></tr>';
      return;
    }

    body.innerHTML = deptMasterRows.map(function (item, index) {
      return '' +
        '<tr data-dept-index="' + index + '">' +
          '<td><select data-dept-customer class="dept-customer-select">' +
            buildDeptCustomerSelectHtml(item.customer || '') +
          '</select></td>' +
          '<td><input type="text" data-dept-code value="' + esc(item.code || '') + '" placeholder="如 1001"></td>' +
          '<td><input type="text" data-dept-name value="' + esc(item.name || '') + '" placeholder="如 北美商超业务部"></td>' +
          '<td><button type="button" class="op-link danger" data-action="dept-remove" data-dept-index="' + index + '">删除</button></td>' +
        '</tr>';
    }).join('');
  }

  function collectDeptMasterRowsFromDom() {
    var rows = [];
    document.querySelectorAll('#deptMasterBody tr[data-dept-index]').forEach(function (row) {
      var customerSelect = row.querySelector('[data-dept-customer]');
      var codeInput = row.querySelector('[data-dept-code]');
      var nameInput = row.querySelector('[data-dept-name]');
      rows.push({
        customer: customerSelect ? String(customerSelect.value || '').trim() : '',
        code: codeInput ? String(codeInput.value || '').trim() : '',
        name: nameInput ? String(nameInput.value || '').trim() : ''
      });
    });
    return rows;
  }

  function openDeptModal() {
    mountDeptCustomerFilter([]);
    loadDeptMasterRows();
    window.FeeMgmtCommon.openModalMask('deptModal');
  }

  function closeDeptModal() {
    deptMasterRows = [];
    destroyDeptCustomerFilter();
    var mount = document.getElementById('deptCustomerMsfMount');
    if (mount) mount.innerHTML = '';
    window.FeeMgmtCommon.closeModalMask('deptModal');
  }

  function saveDeptMaster() {
    var filterCustomers = getDeptFilterCustomers();
    var rows = collectDeptMasterRowsFromDom();
    var grouped = {};
    var seen = {};

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      if (!row.customer && !row.code && !row.name) continue;
      if (!row.customer) {
        window.alert('第 ' + (i + 1) + ' 行请选择客户。');
        return;
      }
      if (!row.code) {
        window.alert('第 ' + (i + 1) + ' 行请填写部门编码。');
        return;
      }
      if (!row.name) {
        window.alert('第 ' + (i + 1) + ' 行请填写部门名称。');
        return;
      }
      if (filterCustomers.length && filterCustomers.indexOf(row.customer) < 0) {
        window.alert('第 ' + (i + 1) + ' 行客户不在当前筛选范围内，请调整客户或清空筛选。');
        return;
      }
      var dupKey = row.customer + '|' + row.code;
      if (seen[dupKey]) {
        window.alert('客户「' + row.customer + '」下部门编码「' + row.code + '」重复，请修改后再保存。');
        return;
      }
      seen[dupKey] = true;
      if (!grouped[row.customer]) grouped[row.customer] = [];
      grouped[row.customer].push({ code: row.code, name: row.name });
    }

    var customersToSave = filterCustomers.length ? filterCustomers.slice() : Object.keys(grouped);

    if (!customersToSave.length) {
      window.alert('请至少维护一条部门记录。');
      return;
    }

    var needClearConfirm = customersToSave.filter(function (customer) {
      return !grouped[customer] || !grouped[customer].length;
    });
    if (needClearConfirm.length) {
      var clearMsg = needClearConfirm.length === 1
        ? '客户「' + needClearConfirm[0] + '」在列表中无部门，保存后将清空其部门清单。是否继续？'
        : '以下客户在列表中无部门，保存后将清空其部门清单：' + needClearConfirm.join('、') + '。是否继续？';
      if (!window.confirm(clearMsg)) return;
    }

    customersToSave.forEach(function (customer) {
      var normalized = grouped[customer] || [];
      store.setCustomerDepartments(customer, normalized);
      appendOpLog(customer, {
        action: '维护部门清单',
        target: customer,
        detail: normalized.length
          ? '共 ' + normalized.length + ' 个部门：' + normalized.map(function (item) {
            return item.code + ' ' + item.name;
          }).join('；')
          : '已清空部门清单'
      });
      if (editingRatioCustomer === customer) {
        var ruleRow = findFixedById(editingRatioId);
        editingDeptItems = mergeDeptItemsWithMaster(
          customer,
          ruleRow && ruleRow.deptItems && ruleRow.deptItems.length ? ruleRow.deptItems : editingDeptItems
        );
        refreshRatioDeptGridIfOpen();
      }
    });

    closeDeptModal();
    renderMatrixTable();
  }

  function renderDeptRatioGrid() {
    var body = document.getElementById('fDeptRatioBody');
    var customer = editingRatioCustomer || '';
    var items = editingDeptItems || mergeDeptItemsWithMaster(customer, []);

    if (!items.length) {
      body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#6b7280;padding:16px;">请先在列表上方点击「部门管理」维护该客户的部门编码与名称</td></tr>';
      return;
    }

    body.innerHTML = items.map(function (item) {
      var displayValue = Number(item.ratio || 0) ? String(item.ratio) : '';
      return '' +
        '<tr data-dept-id="' + esc(item.id) + '" data-dept-code="' + esc(item.code || item.id) + '" data-dept-name="' + esc(item.name || '') + '">' +
          '<td><code>' + esc(item.code || item.id) + '</code></td>' +
          '<td>' + esc(item.name || '') + '</td>' +
          '<td class="num">' +
            '<input type="number" min="0" max="1" step="0.00000001" data-dept-ratio value="' + esc(displayValue) + '" placeholder="0">' +
          '</td>' +
        '</tr>';
    }).join('');
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
    editingRatioCustomer = row.customer;
    editingDeptItems = mergeDeptItemsWithMaster(
      row.customer,
      row.deptItems && row.deptItems.length
        ? row.deptItems
        : (store.resolveDeptItems ? store.resolveDeptItems(row, row.customer) : [])
    );
    document.getElementById('ratioModalTitle').textContent = '调整' + row.ratioLabel;
    document.getElementById('fRatioCustomer').value = row.customer;
    document.getElementById('fRatioFeeType').value = row.feeType;
    document.getElementById('fRatioMethod').value = normalizeRatioMethod(row.method || 'fixed_ratio');
    document.getElementById('fRatioValueLabel').textContent = row.ratioLabel + '（0~1，取自客户计提规则）';
    document.getElementById('fRatioValue').value = Number(row.manualRatio != null ? row.manualRatio : row.ratio || 0);
    document.getElementById('fRatioNote').value = row.note || '';
    toggleRatioFields();
    window.FeeMgmtCommon.openModalMask('ratioModal');
  }

  function closeRatioModal() {
    editingRatioId = null;
    editingRatioCustomer = null;
    editingDeptItems = null;
    window.FeeMgmtCommon.closeModalMask('ratioModal');
  }

  function saveRatioRule() {
    if (!editingRatioId) return;
    var row = findFixedById(editingRatioId);
    if (!row) return;
    if (!confirmRecalc()) return;

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
      editingDeptItems = collectDeptItemsFromDom();
      if (!editingDeptItems.length) {
        window.alert('请先在「部门管理」中维护该客户的部门，再保存部门固定比例。');
        return;
      }
      var invalidDeptRatio = editingDeptItems.find(function (item) {
        var num = Number(item.ratio || 0);
        return num < 0 || num > 1;
      });
      if (invalidDeptRatio) {
        window.alert('部门固定比例须在 0～1 之间。');
        return;
      }
      var allZero = editingDeptItems.every(function (item) {
        return !Number(item.ratio || 0);
      });
      if (allZero && !window.confirm('所有部门比例均为 0，将导致计提为 0。是否仍要保存？')) {
        return;
      }
      payload.deptItems = editingDeptItems.slice();
    } else {
      var ratioError = validateRatioValue(ratioValue);
      if (ratioError) {
        window.alert(ratioError);
        return;
      }
    }

    store.upsertFixedRule(payload);
    var detailMethod = methodLabel(method);
    var detailRatio = method === 'dept_fixed_ratio'
      ? payload.deptItems.map(function (item) {
        return (item.code || item.id) + ' ' + pct(item.ratio || 0);
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
  }

  function openExpenseModal(row) {
    if (!row) return;
    editingExpenseId = row.id;
    var method = normalizeExpenseMethod(row.method);
    document.getElementById('fExpenseCustomer').value = row.customer;
    document.getElementById('fExpenseMethod').value = method;
    document.getElementById('fExpenseMonthlyFixed').value = Number(row.baseAmount || 0);
    document.getElementById('fExpenseAnnualTotal').value = Number(row.baseAmount || 0);
    document.getElementById('fExpenseRatio').value = Number(row.ratio || 0);
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
    if (!confirmRecalc()) return;

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
      var ratioError = validateRatioValue(document.getElementById('fExpenseRatio').value);
      if (ratioError) {
        window.alert(ratioError);
        return;
      }
      payload.ratio = document.getElementById('fExpenseRatio').value;
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

    document.getElementById('btnDeptManage').addEventListener('click', function () {
      openDeptModal();
    });
    document.getElementById('btnDeptAddRow').addEventListener('click', function () {
      deptMasterRows = collectDeptMasterRowsFromDom();
      var filterCustomers = getDeptFilterCustomers();
      var defaultCustomer = filterCustomers.length === 1
        ? filterCustomers[0]
        : (document.getElementById('qCustomer').value || '');
      deptMasterRows.push({
        customer: defaultCustomer,
        code: '',
        name: ''
      });
      renderDeptMasterTable();
    });
    document.getElementById('deptMasterBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="dept-remove"]');
      if (!btn) return;
      var index = Number(btn.getAttribute('data-dept-index'));
      deptMasterRows = collectDeptMasterRowsFromDom();
      if (index >= 0 && index < deptMasterRows.length) {
        deptMasterRows.splice(index, 1);
      }
      renderDeptMasterTable();
    });
    document.getElementById('btnDeptClose').addEventListener('click', closeDeptModal);
    document.getElementById('btnDeptCancel').addEventListener('click', closeDeptModal);
    document.getElementById('btnDeptSave').addEventListener('click', saveDeptMaster);
    document.getElementById('deptModal').addEventListener('click', function (e) {
      if (e.target.id === 'deptModal') closeDeptModal();
    });

    document.getElementById('fRatioMethod').addEventListener('change', toggleRatioFields);
    document.getElementById('btnRatioClose').addEventListener('click', closeRatioModal);
    document.getElementById('btnRatioCancel').addEventListener('click', closeRatioModal);
    document.getElementById('btnRatioSave').addEventListener('click', saveRatioRule);
    document.getElementById('ratioModal').addEventListener('click', function (e) {
      if (e.target.id === 'ratioModal') closeRatioModal();
    });

    document.getElementById('fExpenseMethod').addEventListener('change', toggleExpenseFields);
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
    applyQueryCustomer();
    if (window.FeeMgmtCommon) {
      window.FeeMgmtCommon.wireClearableSelects(document);
    }
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
