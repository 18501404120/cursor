/**
 * 费用项主数据 — 费用管理模块内统一维护名称/备注，localStorage 持久化，各页下拉同步。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'gb-fee-mgmt-fee-items-v1';
  var SEED_URL = 'fee-item-master-data.json';
  var items = [];
  var usageResolver = null;
  var editingCode = null;
  var modalsReady = false;

  var DEFAULT_ITEMS = [
    { code: 'F001', name: '平台佣金', remark: '平台扣点，系统自动取数' },
    { code: 'F006', name: '退货运费', remark: '买家退货产生的物流费用' },
    { code: 'F007', name: '尾程运费（FBM）', remark: 'FBM 订单尾程配送' },
    { code: 'F008', name: '线下商超销售退款', remark: '' },
    { code: 'F009', name: '线下商超推广费', remark: '商超渠道联合促销' },
    { code: 'F010', name: '广告费', remark: '站内广告投放' },
    { code: 'F011', name: '品牌营销费', remark: '品牌联合投放与营销' },
    { code: 'F012', name: '内容制作费', remark: '图文/视频等内容制作' },
    { code: 'F013', name: '展会物料费', remark: '展会与线下物料' },
    { code: 'F014', name: '其它平台杂费', remark: '平台账单杂费' },
    { code: 'F015', name: '渠道临时推广费', remark: '临时推广活动' },
    { code: 'F016', name: '品牌联合投放', remark: '跨界品牌联合营销' },
    { code: 'F017', name: '推广费', remark: '' },
    { code: 'F018', name: '样品费', remark: '样品寄送与测评' },
    { code: 'F019', name: '运杂费', remark: '' },
    { code: 'F020', name: '其他补充费用', remark: '未归类补充费用' }
  ];

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openMask(id) {
    if (global.FeeMgmtCommon) global.FeeMgmtCommon.openModalMask(id);
    else document.getElementById(id).classList.add('open');
  }

  function closeMask(id) {
    if (global.FeeMgmtCommon) global.FeeMgmtCommon.closeModalMask(id);
    else document.getElementById(id).classList.remove('open');
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.items || null);
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('FeeItemMaster: localStorage 写入失败', e);
    }
    dispatchChange();
  }

  function dispatchChange() {
    document.dispatchEvent(new CustomEvent('feeitemschange', {
      bubbles: true,
      detail: { items: getAll() }
    }));
  }

  function normalizeList(list) {
    return (list || []).map(function (item) {
      return {
        code: String(item.code || '').trim(),
        name: String(item.name || '').trim(),
        remark: String(item.remark || '').trim()
      };
    }).filter(function (item) { return item.code && item.name; });
  }

  function remarkPreviewHtml(text) {
    if (!text) return '<span style="color:#9ca3af;">—</span>';
    var t = String(text);
    var short = t.length > 28 ? t.slice(0, 28) + '…' : t;
    return '<span title="' + escapeHtml(t) + '" style="font-size:12px;color:#374151;">' + escapeHtml(short) + '</span>';
  }

  function nextCode() {
    var max = 0;
    items.forEach(function (item) {
      var m = /^F(\d+)$/.exec(item.code);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'F' + String(max + 1).padStart(3, '0');
  }

  function getUsageBlockReason(code, name) {
    if (typeof usageResolver === 'function') {
      return usageResolver(code, name) || null;
    }
    return null;
  }

  function ensureModals() {
    if (modalsReady || document.getElementById('feeItemManageModal')) {
      modalsReady = true;
      return;
    }
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal-mask" id="feeItemManageModal" role="dialog" aria-modal="true" aria-labelledby="feeItemManageTitle" aria-hidden="true">' +
        '<div class="modal modal-lg">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemManageTitle">费用项管理</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemManageClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-item-master-lead">维护费用项主数据（名称、备注）。数据保存在浏览器本地，各费用管理页面下拉选项自动同步。已被业务数据引用的费用项不可删除。</p>' +
            '<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">' +
              '<button type="button" class="btn btn-primary" id="btnFeeItemAdd">新增费用项</button>' +
            '</div>' +
            '<div class="fee-item-table-wrap">' +
              '<table class="data-table">' +
                '<thead><tr>' +
                  '<th style="width:88px;">编码</th>' +
                  '<th style="width:180px;">名称</th>' +
                  '<th>备注</th>' +
                  '<th style="width:120px;">操作</th>' +
                '</tr></thead>' +
                '<tbody id="feeItemBody"></tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemManageDone">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeItemEditModal" role="dialog" aria-modal="true" aria-labelledby="feeItemEditTitle" aria-hidden="true">' +
        '<div class="modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemEditTitle">新增费用项</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemEditClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<div class="form-field" id="feeItemCodeField" hidden>' +
              '<label for="feeItemCodeDisplay">费用项编码</label>' +
              '<input id="feeItemCodeDisplay" type="text" readonly>' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemName"><span class="req">*</span> 名称</label>' +
              '<input id="feeItemName" type="text" maxlength="50" placeholder="请输入费用项名称">' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemRemark">备注</label>' +
              '<textarea id="feeItemRemark" rows="3" placeholder="补充费用项说明、适用场景（非必填）"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemEditCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeItemEditSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wireModalEvents();
    modalsReady = true;
  }

  function wireModalEvents() {
    if (document.body.dataset.feeItemMasterWired === '1') return;
    document.body.dataset.feeItemMasterWired = '1';

    document.getElementById('feeItemManageClose').addEventListener('click', closeManage);
    document.getElementById('feeItemManageDone').addEventListener('click', closeManage);
    document.getElementById('btnFeeItemAdd').addEventListener('click', function () { openEdit(null); });
    document.getElementById('feeItemEditClose').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditCancel').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditSave').addEventListener('click', saveEdit);

    document.getElementById('feeItemManageModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemManageModal') closeManage();
    });
    document.getElementById('feeItemEditModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemEditModal') closeEdit();
    });
    document.getElementById('feeItemBody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-fee-item-act][data-code]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if (btn.dataset.feeItemAct === 'edit') openEdit(btn.dataset.code);
      if (btn.dataset.feeItemAct === 'delete') deleteItem(btn.dataset.code);
    });
  }

  function renderTable() {
    var body = document.getElementById('feeItemBody');
    if (!body) return;
    body.innerHTML = items.map(function (item) {
      var reason = getUsageBlockReason(item.code, item.name);
      var delBtn = reason
        ? '<span style="color:#9ca3af;font-size:12px;" title="' + escapeHtml(reason) + '">删除</span>'
        : '<button type="button" class="op-link" data-fee-item-act="delete" data-code="' + escapeHtml(item.code) + '">删除</button>';
      return '<tr>' +
        '<td class="mono">' + escapeHtml(item.code) + '</td>' +
        '<td><strong>' + escapeHtml(item.name) + '</strong></td>' +
        '<td>' + remarkPreviewHtml(item.remark) + '</td>' +
        '<td><button type="button" class="op-link" data-fee-item-act="edit" data-code="' + escapeHtml(item.code) + '">编辑</button> ' + delBtn + '</td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:24px;">暂无费用项，请点击「新增费用项」</td></tr>';
  }

  function openManage() {
    ensureModals();
    renderTable();
    openMask('feeItemManageModal');
  }

  function closeManage() {
    closeMask('feeItemManageModal');
  }

  function openEdit(code) {
    ensureModals();
    editingCode = code || null;
    var isNew = !code;
    document.getElementById('feeItemEditTitle').textContent = isNew ? '新增费用项' : '编辑费用项 · ' + code;
    document.getElementById('feeItemCodeField').hidden = isNew;
    document.getElementById('feeItemCodeDisplay').value = code || '';
    if (isNew) {
      document.getElementById('feeItemName').value = '';
      document.getElementById('feeItemRemark').value = '';
    } else {
      var item = getByCode(code);
      if (!item) return;
      document.getElementById('feeItemName').value = item.name;
      document.getElementById('feeItemRemark').value = item.remark || '';
    }
    openMask('feeItemEditModal');
    document.getElementById('feeItemName').focus();
  }

  function closeEdit() {
    closeMask('feeItemEditModal');
    editingCode = null;
  }

  function saveEdit() {
    var name = (document.getElementById('feeItemName').value || '').trim();
    var remark = (document.getElementById('feeItemRemark').value || '').trim();
    if (!name) {
      alert('请填写费用项名称');
      return;
    }
    var dup = items.find(function (item) {
      return item.name === name && item.code !== editingCode;
    });
    if (dup) {
      alert('费用项名称「' + name + '」已存在，请更换名称');
      return;
    }
    var wasEdit = !!editingCode;
    if (editingCode) {
      var target = getByCode(editingCode);
      if (!target) return;
      target.name = name;
      target.remark = remark;
    } else {
      items.push({ code: nextCode(), name: name, remark: remark });
    }
    persist();
    renderTable();
    closeEdit();
    alert(wasEdit ? '费用项已更新' : '费用项已新增');
  }

  function deleteItem(code) {
    return remove(code);
  }

  function remove(code, options) {
    options = options || {};
    var item = getByCode(code);
    if (!item) return false;
    var reason = getUsageBlockReason(code, item.name);
    if (reason && !options.force) {
      alert(reason);
      return false;
    }
    if (!options.skipConfirm && !confirm('确认删除费用项「' + item.name + '」（' + code + '）？删除后不可恢复。')) return false;
    items = items.filter(function (i) { return i.code !== code; });
    persist();
    renderTable();
    return true;
  }

  function getAll() {
    return items.slice();
  }

  function getByCode(code) {
    return items.find(function (i) { return i.code === code; }) || null;
  }

  function getByName(name) {
    return items.find(function (i) { return i.name === name; }) || null;
  }

  function getName(code) {
    var item = getByCode(code);
    return item ? item.name : code;
  }

  /**
   * @param {HTMLSelectElement|string} selectOrId
   * @param {{ mode?: 'code'|'name', includeAll?: boolean, allLabel?: string, showCode?: boolean, preserve?: boolean }} opts
   */
  function syncSelect(selectOrId, opts) {
    opts = opts || {};
    var sel = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!sel) return;
    var mode = opts.mode || 'name';
    var showCode = opts.showCode !== false && mode === 'code';
    var prev = sel.value;
    var html = '';
    if (opts.includeAll) {
      html += '<option value="">' + escapeHtml(opts.allLabel || '全部') + '</option>';
    }
    html += items.map(function (item) {
      var val = mode === 'code' ? item.code : item.name;
      var label = showCode ? (item.name + '（' + item.code + '）') : item.name;
      return '<option value="' + escapeHtml(val) + '">' + escapeHtml(label) + '</option>';
    }).join('');
    sel.innerHTML = html;
    if (opts.preserve !== false && prev) {
      var ok = Array.from(sel.options).some(function (opt) { return opt.value === prev; });
      if (ok) sel.value = prev;
    }
    if (global.FeeMgmtCommon && global.FeeMgmtCommon.syncClearableSelect) {
      global.FeeMgmtCommon.syncClearableSelect(sel);
    }
  }

  function mountToolbarButton(container, options) {
    options = options || {};
    var host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host || host.querySelector('[data-fee-item-master-btn]')) return null;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = options.className || 'btn';
    btn.id = options.id || 'btnManageFeeItems';
    btn.setAttribute('data-fee-item-master-btn', '1');
    btn.textContent = options.label || '费用项管理';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openManage();
    });
    if (options.prepend) host.insertBefore(btn, host.firstChild);
    else if (options.before) {
      var ref = host.querySelector(options.before);
      if (ref) host.insertBefore(btn, ref);
      else host.appendChild(btn);
    } else {
      host.appendChild(btn);
    }
    return btn;
  }

  function setUsageResolver(fn) {
    usageResolver = fn;
  }

  function onChange(fn) {
    document.addEventListener('feeitemschange', fn);
  }

  function resetToSeed() {
    items = normalizeList(DEFAULT_ITEMS);
    persist();
    renderTable();
  }

  function init(options) {
    options = options || {};
    if (options.storageKey) STORAGE_KEY = options.storageKey;
    if (options.seedUrl) SEED_URL = options.seedUrl;
    if (options.usageResolver) usageResolver = options.usageResolver;

    var stored = loadFromStorage();
    if (stored && stored.length) {
      items = normalizeList(stored);
      ensureModals();
      return Promise.resolve(getAll());
    }

    var seedUrl = options.seedUrl || SEED_URL;
    return fetch(seedUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('seed load failed');
        return r.json();
      })
      .then(function (data) {
        items = normalizeList(data.items || data);
        if (!items.length) items = normalizeList(DEFAULT_ITEMS);
        persist();
        ensureModals();
        return getAll();
      })
      .catch(function () {
        items = normalizeList(DEFAULT_ITEMS);
        persist();
        ensureModals();
        return getAll();
      });
  }

  global.FeeItemMaster = {
    init: init,
    getAll: getAll,
    getByCode: getByCode,
    getByName: getByName,
    getName: getName,
    syncSelect: syncSelect,
    openManage: openManage,
    openEdit: openEdit,
    mountToolbarButton: mountToolbarButton,
    setUsageResolver: setUsageResolver,
    onChange: onChange,
    resetToSeed: resetToSeed,
    persist: persist,
    remove: remove
  };
})(typeof window !== 'undefined' ? window : this);
