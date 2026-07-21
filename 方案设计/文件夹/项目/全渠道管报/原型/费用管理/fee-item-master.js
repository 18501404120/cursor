/**
 * 费用项主数据 — 树形节点、备注维护，localStorage 持久化，各页下拉同步。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'gb-fee-mgmt-fee-items-v3';
  var LEGACY_STORAGE_KEYS = ['gb-fee-mgmt-fee-items-v2', 'gb-fee-mgmt-fee-items-v1'];
  var SEED_URL = 'fee-item-master-data.json';
  var items = [];
  var usageResolver = null;
  var editingCode = null;
  var remarkEditingCode = null;
  var modalsReady = false;
  var expandedNodes = new Set();
  var pendingEditOptions = null;
  var manageTreeKeyword = '';
  var treeSelectInstances = [];

  var DEFAULT_ITEMS = [
    { code: 'CAT01', name: '平台与交易费用', remark: '平台扣点、杂费等', parentCode: null, sortOrder: 10 },
    { code: 'F001', name: '平台佣金', remark: '平台扣点，系统自动取数', parentCode: 'CAT01', sortOrder: 11 },
    { code: 'F014', name: '其它平台杂费', remark: '平台账单杂费', parentCode: 'CAT01', sortOrder: 12 },
    { code: 'CAT02', name: '物流费用', remark: '尾程、退运、运杂等', parentCode: null, sortOrder: 20 },
    { code: 'F006', name: '退货运费', remark: '买家退货产生的物流费用', parentCode: 'CAT02', sortOrder: 21 },
    { code: 'F007', name: '尾程运费（FBM）', remark: 'FBM 订单尾程配送', parentCode: 'CAT02', sortOrder: 22 },
    { code: 'F019', name: '运杂费', remark: '', parentCode: 'CAT02', sortOrder: 23 },
    { code: 'CAT03', name: '商超渠道费用', remark: '线下商超相关', parentCode: null, sortOrder: 30 },
    { code: 'F008', name: '线下商超销售退款', remark: '', parentCode: 'CAT03', sortOrder: 31 },
    { code: 'F009', name: '线下商超推广费', remark: '商超渠道联合促销', parentCode: 'CAT03', sortOrder: 32 },
    { code: 'CAT04', name: '营销推广费用', remark: '广告、品牌、推广、样品等', parentCode: null, sortOrder: 40 },
    { code: 'F010', name: '广告费', remark: '站内广告投放', parentCode: 'CAT04', sortOrder: 41 },
    { code: 'F011', name: '品牌营销费', remark: '品牌联合投放与营销', parentCode: 'CAT04', sortOrder: 42 },
    { code: 'F015', name: '渠道临时推广费', remark: '临时推广活动', parentCode: 'CAT04', sortOrder: 43 },
    { code: 'F016', name: '品牌联合投放', remark: '跨界品牌联合营销', parentCode: 'CAT04', sortOrder: 44 },
    { code: 'F017', name: '推广费', remark: '', parentCode: 'CAT04', sortOrder: 45 },
    { code: 'F018', name: '样品费', remark: '样品寄送与测评', parentCode: 'CAT04', sortOrder: 46 },
    { code: 'CAT05', name: '内容与活动', remark: '内容制作、展会物料等', parentCode: null, sortOrder: 50 },
    { code: 'F012', name: '内容制作费', remark: '图文/视频等内容制作', parentCode: 'CAT05', sortOrder: 51 },
    { code: 'F013', name: '展会物料费', remark: '展会与线下物料', parentCode: 'CAT05', sortOrder: 52 },
    { code: 'CAT06', name: '其他', remark: '未归类补充', parentCode: null, sortOrder: 60 },
    { code: 'F020', name: '其他补充费用', remark: '未归类补充费用', parentCode: 'CAT06', sortOrder: 61 }
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

  function loadRawStorage(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : (parsed.items || null);
    } catch (e) {
      return null;
    }
  }

  function loadFromStorage() {
    var stored = loadRawStorage(STORAGE_KEY);
    if (stored && stored.length) return stored;
    for (var i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
      stored = loadRawStorage(LEGACY_STORAGE_KEYS[i]);
      if (stored && stored.length) return stored;
    }
    return null;
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

  function normalizeItem(item) {
    return {
      code: String(item.code || '').trim(),
      name: String(item.name || '').trim(),
      remark: String(item.remark || '').trim(),
      parentCode: item.parentCode ? String(item.parentCode).trim() : null,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0
    };
  }

  function normalizeList(list) {
    return (list || []).map(normalizeItem).filter(function (item) { return item.code && item.name; });
  }

  function nextCode() {
    var max = 0;
    items.forEach(function (item) {
      var m = /^[A-Z]+(\d+)$/.exec(item.code);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'N' + String(max + 1).padStart(3, '0');
  }

  function getUsageBlockReason(code, name) {
    if (typeof usageResolver === 'function') {
      return usageResolver(code, name) || null;
    }
    return null;
  }

  function getChildrenCodes(code) {
    return items.filter(function (item) { return item.parentCode === code; }).map(function (item) { return item.code; });
  }

  function hasChildren(code) {
    return getChildrenCodes(code).length > 0;
  }

  function getDescendantCodes(code) {
    var result = [];
    getChildrenCodes(code).forEach(function (childCode) {
      result.push(childCode);
      result = result.concat(getDescendantCodes(childCode));
    });
    return result;
  }

  function ensureExpandedDefaults() {
    items.forEach(function (item) {
      if (hasChildren(item.code)) expandedNodes.add(item.code);
    });
  }

  function buildTreeNodes() {
    var map = {};
    items.forEach(function (item) {
      map[item.code] = Object.assign({}, item, { children: [] });
    });
    var roots = [];
    items.forEach(function (item) {
      var node = map[item.code];
      if (!node) return;
      if (item.parentCode && map[item.parentCode]) map[item.parentCode].children.push(node);
      else roots.push(node);
    });
    function sortNodes(nodes) {
      nodes.sort(function (a, b) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      nodes.forEach(function (node) { sortNodes(node.children); });
    }
    sortNodes(roots);
    return roots;
  }

  function flattenTreeForDisplay(nodes, depth) {
    var rows = [];
    nodes.forEach(function (node) {
      var nodeHasChildren = node.children && node.children.length > 0;
      rows.push({ node: node, depth: depth, hasChildren: nodeHasChildren });
      if (nodeHasChildren && expandedNodes.has(node.code)) {
        rows = rows.concat(flattenTreeForDisplay(node.children, depth + 1));
      }
    });
    return rows;
  }

  function flattenTreeRows(nodes, depth) {
    var rows = [];
    nodes.forEach(function (node) {
      var nodeHasChildren = node.children && node.children.length > 0;
      rows.push({ node: node, depth: depth, hasChildren: nodeHasChildren });
      if (nodeHasChildren) rows = rows.concat(flattenTreeRows(node.children, depth + 1));
    });
    return rows;
  }

  function normalizedKeyword(text) {
    return String(text || '').trim().toLowerCase();
  }

  function matchItemKeyword(item, keyword) {
    if (!keyword) return true;
    return [item.name, item.code, item.remark].some(function (value) {
      return String(value || '').toLowerCase().indexOf(keyword) >= 0;
    });
  }

  function filterTreeByKeyword(nodes, keyword) {
    keyword = normalizedKeyword(keyword);
    if (!keyword) return nodes;
    return nodes.map(function (node) {
      var children = filterTreeByKeyword(node.children || [], keyword);
      if (!matchItemKeyword(node, keyword) && !children.length) return null;
      return Object.assign({}, node, { children: children });
    }).filter(Boolean);
  }

  function buildExcludeMap(opts) {
    var map = {};
    if (!opts || !opts.excludeCode) return map;
    map[opts.excludeCode] = true;
    if (opts.excludeDescendants) {
      getDescendantCodes(opts.excludeCode).forEach(function (code) { map[code] = true; });
    }
    return map;
  }

  function migrateFlatItemsIfNeeded() {
    var hasHierarchy = items.some(function (item) { return item.parentCode; });
    if (hasHierarchy) return;
    var seedMap = {};
    DEFAULT_ITEMS.forEach(function (item) { seedMap[item.code] = item; });
    items = items.map(function (item) {
      var seed = seedMap[item.code];
      if (!seed) return item;
      return Object.assign({}, item, {
        parentCode: seed.parentCode || null,
        sortOrder: seed.sortOrder || 0
      });
    });
    DEFAULT_ITEMS.forEach(function (seed) {
      if (!getByCode(seed.code) && !seed.parentCode) items.push(Object.assign({}, seed));
    });
    persist();
  }

  function modalShellHtml() {
    return (
      '<div class="modal-mask" id="feeItemManageModal" role="dialog" aria-modal="true" aria-labelledby="feeItemManageTitle" aria-hidden="true">' +
        '<div class="modal modal-lg">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemManageTitle">费用项管理</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemManageClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-item-master-lead">维护费用项树形结构：任意节点可新增下级；同一父节点下的子节点即为一组。业务配置仅可选无下级的末级节点。备注通过操作栏「备注」维护。已启用的节点不可删除。</p>' +
            '<div class="fee-item-toolbar" data-pa-key="fee-item-toolbar">' +
              '<div class="fee-item-toolbar-main">' +
                '<input type="search" class="fee-item-tree-search" id="feeItemTreeSearch" placeholder="搜索费用项/编码">' +
                '<button type="button" class="btn" id="btnFeeTreeExpandAll">全部展开</button>' +
                '<button type="button" class="btn" id="btnFeeTreeCollapseAll">全部收拢</button>' +
              '</div>' +
              '<div class="fee-item-toolbar-actions">' +
                '<button type="button" class="btn btn-primary" id="btnFeeNodeAdd">新增节点</button>' +
              '</div>' +
            '</div>' +
            '<div class="fee-item-tree-wrap" id="feeItemTreeRoot"></div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemManageDone">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeItemEditModal" role="dialog" aria-modal="true" aria-labelledby="feeItemEditTitle" aria-hidden="true">' +
        '<div class="modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemEditTitle">新增节点</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemEditClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<div class="form-field" id="feeItemCodeField" hidden>' +
              '<label for="feeItemCodeDisplay">编码</label>' +
              '<input id="feeItemCodeDisplay" type="text" readonly>' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemParent">上级节点</label>' +
              '<select id="feeItemParent">' +
                '<option value="">无（顶级）</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-field">' +
              '<label for="feeItemName"><span class="req">*</span> 名称</label>' +
              '<input id="feeItemName" type="text" maxlength="50" placeholder="请输入节点名称">' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemEditCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeItemEditSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-mask" id="feeItemRemarkModal" role="dialog" aria-modal="true" aria-labelledby="feeItemRemarkTitle" aria-hidden="true">' +
        '<div class="modal">' +
          '<div class="modal-hd">' +
            '<h2 id="feeItemRemarkTitle">备注</h2>' +
            '<div class="modal-hd-actions">' +
              '<button type="button" class="modal-close" id="feeItemRemarkClose" aria-label="关闭">×</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-bd">' +
            '<p class="fee-item-remark-target" id="feeItemRemarkTarget"></p>' +
            '<div class="form-field">' +
              '<label for="feeItemRemarkInput">备注内容</label>' +
              '<textarea id="feeItemRemarkInput" rows="5" placeholder="补充说明、适用场景（非必填）"></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="modal-ft">' +
            '<button type="button" class="btn" id="feeItemRemarkCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="feeItemRemarkSave">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function upgradeManageModalIfNeeded() {
    var modal = document.getElementById('feeItemManageModal');
    if (!modal) return;

    var lead = modal.querySelector('.fee-item-master-lead');
    if (lead) {
      lead.textContent = '维护费用项树形结构：任意节点可新增下级；同一父节点下的子节点即为一组。业务配置仅可选无下级的末级节点。备注通过操作栏「备注」维护。已启用的节点不可删除。';
    }

    var groupBtn = document.getElementById('btnFeeGroupAdd');
    if (groupBtn) groupBtn.remove();

    var addBtn = document.getElementById('btnFeeItemAdd');
    if (addBtn) {
      addBtn.id = 'btnFeeNodeAdd';
      addBtn.textContent = '新增节点';
    }
    if (!document.getElementById('btnFeeNodeAdd') && modal.querySelector('.fee-item-toolbar-actions')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary';
      btn.id = 'btnFeeNodeAdd';
      btn.textContent = '新增节点';
      modal.querySelector('.fee-item-toolbar-actions').appendChild(btn);
    }

    var toolbar = modal.querySelector('.fee-item-toolbar');
    if (toolbar && !toolbar.getAttribute('data-pa-key')) {
      toolbar.setAttribute('data-pa-key', 'fee-item-toolbar');
    }
    var expandBtn = document.getElementById('btnFeeTreeExpandAll');
    if (toolbar && expandBtn && !expandBtn.closest('.fee-item-toolbar-main')) {
      var main = document.createElement('div');
      main.className = 'fee-item-toolbar-main';
      toolbar.insertBefore(main, toolbar.firstChild);
      main.appendChild(expandBtn);
    }
    if (toolbar && !document.getElementById('btnFeeTreeCollapseAll')) {
      var collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'btn';
      collapseBtn.id = 'btnFeeTreeCollapseAll';
      collapseBtn.textContent = '全部收拢';
      var targetWrap = toolbar.querySelector('.fee-item-toolbar-main') || toolbar;
      targetWrap.appendChild(collapseBtn);
    }
    if (toolbar && !document.getElementById('feeItemTreeSearch')) {
      var search = document.createElement('input');
      search.type = 'search';
      search.className = 'fee-item-tree-search';
      search.id = 'feeItemTreeSearch';
      search.placeholder = '搜索费用项/编码';
      var mainWrap = toolbar.querySelector('.fee-item-toolbar-main') || toolbar;
      mainWrap.insertBefore(search, mainWrap.firstChild);
    }

    if (!document.getElementById('feeItemTreeRoot')) {
      var tableWrap = modal.querySelector('.fee-item-table-wrap');
      if (tableWrap) tableWrap.outerHTML = '<div class="fee-item-tree-wrap" id="feeItemTreeRoot"></div>';
    }

    var typeField = document.getElementById('feeItemTypeField');
    if (typeField) typeField.remove();

    var remarkField = document.querySelector('#feeItemEditModal #feeItemRemark');
    if (remarkField && remarkField.closest('.form-field')) remarkField.closest('.form-field').remove();

    var parentLabel = document.querySelector('label[for="feeItemParent"]');
    if (parentLabel) parentLabel.textContent = '上级节点';

    if (!document.getElementById('feeItemRemarkModal')) {
      document.body.insertAdjacentHTML('beforeend',
        '<div class="modal-mask" id="feeItemRemarkModal" role="dialog" aria-modal="true" aria-labelledby="feeItemRemarkTitle" aria-hidden="true">' +
          '<div class="modal"><div class="modal-hd"><h2 id="feeItemRemarkTitle">备注</h2>' +
          '<div class="modal-hd-actions"><button type="button" class="modal-close" id="feeItemRemarkClose" aria-label="关闭">×</button></div></div>' +
          '<div class="modal-bd"><p class="fee-item-remark-target" id="feeItemRemarkTarget"></p>' +
          '<div class="form-field"><label for="feeItemRemarkInput">备注内容</label>' +
          '<textarea id="feeItemRemarkInput" rows="5" placeholder="补充说明、适用场景（非必填）"></textarea></div></div>' +
          '<div class="modal-ft"><button type="button" class="btn" id="feeItemRemarkCancel">取消</button>' +
          '<button type="button" class="btn btn-primary" id="feeItemRemarkSave">保存</button></div></div></div>'
      );
      wireRemarkEvents();
    }

    wireManageToolbarEvents();
    bindTreeEvents();
  }

  function ensureModals() {
    if (modalsReady || document.getElementById('feeItemManageModal')) {
      upgradeManageModalIfNeeded();
      modalsReady = true;
      return;
    }
    var wrap = document.createElement('div');
    wrap.innerHTML = modalShellHtml();
    document.body.appendChild(wrap);
    wireModalEvents();
    wireRemarkEvents();
    modalsReady = true;
  }

  function wireRemarkEvents() {
    var closeBtn = document.getElementById('feeItemRemarkClose');
    if (!closeBtn || closeBtn.dataset.feeRemarkWired === '1') return;
    closeBtn.dataset.feeRemarkWired = '1';
    document.getElementById('feeItemRemarkClose').addEventListener('click', closeRemark);
    document.getElementById('feeItemRemarkCancel').addEventListener('click', closeRemark);
    document.getElementById('feeItemRemarkSave').addEventListener('click', saveRemark);
    document.getElementById('feeItemRemarkModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemRemarkModal') closeRemark();
    });
  }

  function wireModalEvents() {
    if (document.body.dataset.feeItemMasterWired === '1') return;
    document.body.dataset.feeItemMasterWired = '1';

    document.getElementById('feeItemManageClose').addEventListener('click', closeManage);
    document.getElementById('feeItemManageDone').addEventListener('click', closeManage);
    wireManageToolbarEvents();
    document.getElementById('feeItemEditClose').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditCancel').addEventListener('click', closeEdit);
    document.getElementById('feeItemEditSave').addEventListener('click', saveEdit);

    document.getElementById('feeItemManageModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemManageModal') closeManage();
    });
    document.getElementById('feeItemEditModal').addEventListener('click', function (e) {
      if (e.target.id === 'feeItemEditModal') closeEdit();
    });
    bindTreeEvents();
  }

  function wireManageToolbarEvents() {
    var nodeAdd = document.getElementById('btnFeeNodeAdd');
    if (nodeAdd && !nodeAdd.dataset.feeNodeWired) {
      nodeAdd.dataset.feeNodeWired = '1';
      nodeAdd.addEventListener('click', function () { openEdit(null, {}); });
    }

    var expand = document.getElementById('btnFeeTreeExpandAll');
    if (expand && !expand.dataset.feeTreeWired) {
      expand.dataset.feeTreeWired = '1';
      expand.addEventListener('click', expandAllNodes);
    }

    var collapse = document.getElementById('btnFeeTreeCollapseAll');
    if (collapse && !collapse.dataset.feeTreeWired) {
      collapse.dataset.feeTreeWired = '1';
      collapse.addEventListener('click', collapseAllNodes);
    }

    var search = document.getElementById('feeItemTreeSearch');
    if (search && !search.dataset.feeTreeWired) {
      search.dataset.feeTreeWired = '1';
      search.addEventListener('input', function () {
        manageTreeKeyword = search.value;
        renderTree();
      });
    }
  }

  function handleTreeClick(e) {
    var toggle = e.target.closest('[data-fee-tree-toggle]');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      var code = toggle.dataset.feeTreeToggle;
      if (expandedNodes.has(code)) expandedNodes.delete(code);
      else expandedNodes.add(code);
      renderTree();
      return;
    }
    var btn = e.target.closest('[data-fee-item-act][data-code]');
    if (!btn || btn.disabled || btn.classList.contains('is-disabled')) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.dataset.feeItemAct === 'edit') openEdit(btn.dataset.code);
    if (btn.dataset.feeItemAct === 'remark') openRemark(btn.dataset.code);
    if (btn.dataset.feeItemAct === 'add-child') openEdit(null, { parentCode: btn.dataset.code });
    if (btn.dataset.feeItemAct === 'delete') deleteItem(btn.dataset.code);
  }

  function bindTreeEvents() {
    var root = document.getElementById('feeItemTreeRoot');
    if (!root) return;
    if (root.dataset.feeTreeWired !== '1') {
      root.dataset.feeTreeWired = '1';
      root.addEventListener('click', handleTreeClick);
    }
  }

  function expandAllNodes() {
    items.forEach(function (item) {
      if (hasChildren(item.code)) expandedNodes.add(item.code);
    });
    renderTree();
  }

  function collapseAllNodes() {
    expandedNodes.clear();
    renderTree();
  }

  function renderBlockTag(blockReason) {
    if (!blockReason) return '';
    var label = blockReason.indexOf('启用') >= 0 ? '已启用' : '已引用';
    var cls = label === '已启用' ? 'fee-item-enabled-tag' : 'fee-item-enabled-tag is-referenced';
    return '<span class="' + cls + '" title="' + escapeHtml(blockReason) + '">' + label + '</span>';
  }

  function renderDeleteAction(node, blockReason) {
    if (blockReason) {
      return '<button type="button" class="op-link is-disabled" disabled title="' + escapeHtml(blockReason) + '">删除</button>';
    }
    return '<button type="button" class="op-link" data-fee-item-act="delete" data-code="' + escapeHtml(node.code) + '">删除</button>';
  }

  function renderTreeNode(node) {
    var nodeHasChildren = node.children && node.children.length > 0;
    var expanded = manageTreeKeyword ? true : expandedNodes.has(node.code);
    var blockReason = getUsageBlockReason(node.code, node.name);
    var toggleClass = 'fee-item-tree-toggle' + (nodeHasChildren ? '' : ' is-placeholder');
    var toggleLabel = nodeHasChildren ? (expanded ? '▼' : '▶') : '·';
    var remarkCls = node.remark ? ' has-remark-dot' : '';
    var childrenHtml = nodeHasChildren && expanded
      ? '<ul class="fee-item-tree-children">' + node.children.map(renderTreeNode).join('') + '</ul>'
      : '';
    return '<li class="fee-item-tree-node' + (nodeHasChildren ? ' has-children' : '') + '" data-code="' + escapeHtml(node.code) + '">' +
      '<div class="fee-item-tree-row">' +
        '<button type="button" class="' + toggleClass + '" data-fee-tree-toggle="' + escapeHtml(node.code) + '" aria-label="展开或收起">' + toggleLabel + '</button>' +
        '<div class="fee-item-tree-body">' +
          '<div class="fee-item-tree-main">' +
            '<span class="fee-item-tree-name">' + escapeHtml(node.name) + '</span>' +
            '<span class="fee-item-tree-code">' + escapeHtml(node.code) + '</span>' +
            renderBlockTag(blockReason) +
          '</div>' +
        '</div>' +
        '<div class="fee-item-tree-actions">' +
          '<button type="button" class="op-link' + remarkCls + '" data-fee-item-act="remark" data-code="' + escapeHtml(node.code) + '">备注</button>' +
          '<button type="button" class="op-link" data-fee-item-act="add-child" data-code="' + escapeHtml(node.code) + '">新增下级</button>' +
          '<button type="button" class="op-link" data-fee-item-act="edit" data-code="' + escapeHtml(node.code) + '">编辑</button>' +
          renderDeleteAction(node, blockReason) +
        '</div>' +
      '</div>' +
      childrenHtml +
    '</li>';
  }

  function renderTreeNodes(nodes) {
    if (!nodes.length) {
      return '<div class="fee-item-tree-empty">' + (manageTreeKeyword ? '无匹配费用项' : '暂无节点，请点击「新增节点」') + '</div>';
    }
    return '<ul class="fee-item-tree">' + nodes.map(renderTreeNode).join('') + '</ul>';
  }

  function renderTreeHeadHtml() {
    return (
      '<div class="fee-item-tree-head">' +
        '<span class="fee-item-tree-head-label">费用项</span>' +
        '<span class="fee-item-tree-head-actions" data-pa-key="fee-item-actions-col">操作</span>' +
      '</div>'
    );
  }

  function renderTree() {
    var root = document.getElementById('feeItemTreeRoot');
    if (!root) return;
    var nodes = filterTreeByKeyword(buildTreeNodes(), manageTreeKeyword);
    root.innerHTML = renderTreeHeadHtml() + renderTreeNodes(nodes);
    if (global.FeeMgmtCommon && typeof global.FeeMgmtCommon.notifyAnnotationResync === 'function') {
      global.FeeMgmtCommon.notifyAnnotationResync();
    }
  }

  function renderParentSelect(excludeCode, selectedParent) {
    var sel = document.getElementById('feeItemParent');
    if (!sel) return;
    syncSelect(sel, {
      mode: 'code',
      showCode: true,
      forceShowCode: true,
      leavesOnly: false,
      includeAll: true,
      allLabel: '无（顶级）',
      preserve: false,
      excludeCode: excludeCode,
      excludeDescendants: true
    });
    sel.value = selectedParent || '';
    mountTreeSelect(sel, {
      mode: 'code',
      showCode: true,
      forceShowCode: true,
      leavesOnly: false,
      includeAll: true,
      allLabel: '无（顶级）',
      placeholder: '请选择上级节点',
      excludeCode: excludeCode,
      excludeDescendants: true,
      zIndex: 1700
    });
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openManage() {
    ensureModals();
    ensureExpandedDefaults();
    var search = document.getElementById('feeItemTreeSearch');
    if (search) {
      search.value = manageTreeKeyword;
    }
    renderTree();
    openMask('feeItemManageModal');
  }

  function closeManage() {
    manageTreeKeyword = '';
    var search = document.getElementById('feeItemTreeSearch');
    if (search) search.value = '';
    closeMask('feeItemManageModal');
  }

  function openEdit(code, options) {
    ensureModals();
    options = options || pendingEditOptions || {};
    pendingEditOptions = null;
    editingCode = code || null;
    var isNew = !code;
    var item = code ? getByCode(code) : null;
    if (code && !item) return;
    document.getElementById('feeItemEditTitle').textContent = isNew
      ? '新增节点'
      : ('编辑 · ' + item.name + ' · ' + code);
    document.getElementById('feeItemCodeField').hidden = isNew;
    document.getElementById('feeItemCodeDisplay').value = code || '';
    renderParentSelect(code, item ? (item.parentCode || '') : (options.parentCode || ''));
    document.getElementById('feeItemName').value = isNew ? '' : item.name;
    openMask('feeItemEditModal');
    document.getElementById('feeItemName').focus();
  }

  function closeEdit() {
    closeMask('feeItemEditModal');
    editingCode = null;
    pendingEditOptions = null;
  }

  function openRemark(code) {
    ensureModals();
    wireRemarkEvents();
    var item = getByCode(code);
    if (!item) return;
    remarkEditingCode = code;
    document.getElementById('feeItemRemarkTitle').textContent = '备注 · ' + item.name;
    document.getElementById('feeItemRemarkTarget').innerHTML = '当前节点：<strong>' + escapeHtml(item.name) + '</strong> · ' + escapeHtml(item.code);
    document.getElementById('feeItemRemarkInput').value = item.remark || '';
    openMask('feeItemRemarkModal');
    document.getElementById('feeItemRemarkInput').focus();
  }

  function closeRemark() {
    closeMask('feeItemRemarkModal');
    remarkEditingCode = null;
  }

  function saveRemark() {
    if (!remarkEditingCode) return;
    var item = getByCode(remarkEditingCode);
    if (!item) return;
    item.remark = (document.getElementById('feeItemRemarkInput').value || '').trim();
    persist();
    renderTree();
    closeRemark();
  }

  function validateParent(parentCode, selfCode) {
    if (!parentCode) return null;
    var parent = getByCode(parentCode);
    if (!parent) return '请选择有效的上级节点';
    if (selfCode && parentCode === selfCode) return '上级节点不能选择自己';
    if (selfCode && getDescendantCodes(selfCode).indexOf(parentCode) >= 0) return '上级节点不能选择自己的下级';
    return null;
  }

  function saveEdit() {
    var name = (document.getElementById('feeItemName').value || '').trim();
    var parentCode = (document.getElementById('feeItemParent').value || '').trim() || null;
    if (!name) {
      alert('请填写名称');
      return;
    }
    var parentErr = validateParent(parentCode, editingCode);
    if (parentErr) {
      alert(parentErr);
      return;
    }
    var dup = items.find(function (item) {
      return item.name === name && item.code !== editingCode;
    });
    if (dup) {
      alert('名称「' + name + '」已存在，请更换名称');
      return;
    }
    var wasEdit = !!editingCode;
    if (editingCode) {
      var target = getByCode(editingCode);
      if (!target) return;
      target.name = name;
      target.parentCode = parentCode;
    } else {
      var code = nextCode();
      items.push({
        code: code,
        name: name,
        remark: '',
        parentCode: parentCode,
        sortOrder: 0
      });
      if (parentCode) expandedNodes.add(parentCode);
    }
    persist();
    renderTree();
    closeEdit();
    alert(wasEdit ? '已更新' : '已新增');
  }

  function deleteItem(code) {
    return remove(code);
  }

  function remove(code, options) {
    options = options || {};
    var item = getByCode(code);
    if (!item) return false;
    if (hasChildren(code)) {
      alert('请先删除或移走其下级节点后再删除「' + item.name + '」');
      return false;
    }
    var reason = getUsageBlockReason(code, item.name);
    if (reason && !options.force) {
      alert(reason);
      return false;
    }
    if (!options.skipConfirm && !confirm('确认删除「' + item.name + ' · ' + code + '」？删除后不可恢复。')) return false;
    items = items.filter(function (i) { return i.code !== code; });
    expandedNodes.delete(code);
    persist();
    renderTree();
    return true;
  }

  function getAll() {
    return items.slice();
  }

  function getLeafItems() {
    return items.filter(function (item) { return !hasChildren(item.code); });
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

  function buildSelectOptions(opts) {
    opts = opts || {};
    var leavesOnly = opts.leavesOnly !== false;
    var treeLabels = opts.treeLabels !== false;
    var excludeMap = buildExcludeMap(opts);
    if (!treeLabels) {
      var list = leavesOnly ? getLeafItems() : items.slice();
      return list.filter(function (item) { return !excludeMap[item.code]; })
        .map(function (item) { return { item: item, depth: 0, hasChildren: hasChildren(item.code) }; });
    }
    var rows = flattenTreeRows(buildTreeNodes(), 0).filter(function (row) {
      return !excludeMap[row.node.code];
    });
    return rows.filter(function (row) {
      return leavesOnly ? !row.hasChildren : true;
    }).map(function (row) {
      return { item: row.node, depth: row.depth, hasChildren: row.hasChildren };
    });
  }

  function findTreeSelectInstance(sel) {
    for (var i = 0; i < treeSelectInstances.length; i++) {
      if (treeSelectInstances[i].select === sel) return treeSelectInstances[i];
    }
    return null;
  }

  function shouldShowCode(opts) {
    opts = opts || {};
    return (opts.showCode !== false && opts.mode === 'code') || opts.forceShowCode;
  }

  function getTreeSelectRows(inst) {
    var opts = inst.opts || {};
    var keyword = normalizedKeyword(inst.keyword);
    var nodes = filterTreeByKeyword(buildTreeNodes(), keyword);
    var excludeMap = buildExcludeMap(opts);
    var rows = flattenTreeRows(nodes, 0).filter(function (row) {
      return !excludeMap[row.node.code];
    });
    var result = [];
    if (opts.includeAll && !keyword) {
      result.push({
        value: '',
        label: opts.allLabel || '全部',
        depth: 0,
        disabled: false,
        special: true
      });
    }
    rows.forEach(function (row) {
      var item = row.node;
      var value = opts.mode === 'code' ? item.code : item.name;
      var disabled = opts.leavesOnly !== false && row.hasChildren;
      result.push({
        value: value,
        label: item.name,
        code: item.code,
        showCode: shouldShowCode(opts),
        depth: row.depth,
        disabled: disabled,
        hasChildren: row.hasChildren
      });
    });
    return result;
  }

  function syncTreeSelectTrigger(inst) {
    if (!inst || !inst.trigger) return;
    var sel = inst.select;
    var value = sel.value;
    var selected = Array.from(sel.options).find(function (opt) { return opt.value === value; });
    var label = selected ? selected.textContent.replace(/^[　\s└]+/, '') : '';
    if (value && label) inst.trigger.textContent = label;
    else if (value) inst.trigger.textContent = value;
    else if (inst.opts && inst.opts.includeAll) inst.trigger.textContent = inst.opts.allLabel || '全部';
    else inst.trigger.textContent = (inst.opts && inst.opts.placeholder) || '请选择';
    inst.wrap.classList.toggle('has-value', !!value);
  }

  function positionTreeSelectPanel(inst) {
    if (!inst || !inst.open) return;
    var rect = inst.trigger.getBoundingClientRect();
    var panel = inst.panel;
    var width = Math.max(rect.width, inst.opts.panelWidth || 260);
    var maxHeight = Math.min(inst.opts.maxPanelHeight || 320, window.innerHeight - 24);
    var top = rect.bottom + 4;
    panel.style.width = width + 'px';
    panel.style.maxHeight = maxHeight + 'px';
    panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
    if (top + Math.min(maxHeight, 320) > window.innerHeight && rect.top > 220) {
      top = Math.max(8, rect.top - Math.min(maxHeight, 320) - 4);
    }
    panel.style.top = top + 'px';
  }

  function closeTreeSelect(inst) {
    if (!inst || !inst.open) return;
    inst.open = false;
    inst.wrap.classList.remove('is-open');
    inst.panel.classList.remove('show');
    inst.trigger.setAttribute('aria-expanded', 'false');
    window.removeEventListener('scroll', inst.reposition, true);
    window.removeEventListener('resize', inst.reposition);
  }

  function closeOtherTreeSelects(inst) {
    treeSelectInstances.forEach(function (item) {
      if (item !== inst) closeTreeSelect(item);
    });
  }

  function renderTreeSelectPanel(inst) {
    var rows = getTreeSelectRows(inst);
    var value = inst.select.value;
    var list = rows.length ? rows.map(function (row) {
      var cls = 'fee-tree-select-option' +
        (row.disabled ? ' is-disabled' : '') +
        (row.value === value ? ' is-selected' : '') +
        (row.hasChildren ? ' has-children' : '');
      return '<button type="button" class="' + cls + '" data-value="' + escapeHtml(row.value) + '"' +
        (row.disabled ? ' disabled' : '') +
        ' style="padding-left:' + (12 + row.depth * 18) + 'px;">' +
        '<span class="fee-tree-select-label">' + escapeHtml(row.label) + '</span>' +
        (row.code && row.showCode ? '<span class="fee-tree-select-code">' + escapeHtml(row.code) + '</span>' : '') +
        '</button>';
    }).join('') : '<div class="fee-tree-select-empty">无匹配费用项</div>';
    inst.panel.innerHTML = '<div class="fee-tree-select-search-wrap">' +
      '<input type="search" class="fee-tree-select-search" placeholder="搜索名称/编码" value="' + escapeHtml(inst.keyword || '') + '">' +
      '</div><div class="fee-tree-select-list">' + list + '</div>';

    var search = inst.panel.querySelector('.fee-tree-select-search');
    search.addEventListener('input', function () {
      inst.keyword = search.value;
      renderTreeSelectPanel(inst);
      positionTreeSelectPanel(inst);
      var next = inst.panel.querySelector('.fee-tree-select-search');
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    });
    inst.panel.querySelectorAll('.fee-tree-select-option:not(.is-disabled)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        inst.select.value = btn.dataset.value || '';
        inst.select.dispatchEvent(new Event('change', { bubbles: true }));
        closeTreeSelect(inst);
      });
    });
  }

  function openTreeSelect(inst) {
    if (!inst) return;
    closeOtherTreeSelects(inst);
    inst.open = true;
    inst.keyword = '';
    inst.wrap.classList.add('is-open');
    inst.trigger.setAttribute('aria-expanded', 'true');
    renderTreeSelectPanel(inst);
    document.body.appendChild(inst.panel);
    inst.panel.classList.add('show');
    positionTreeSelectPanel(inst);
    window.addEventListener('scroll', inst.reposition, true);
    window.addEventListener('resize', inst.reposition);
    var search = inst.panel.querySelector('.fee-tree-select-search');
    if (search) search.focus();
  }

  function refreshTreeSelect(inst, opts) {
    if (!inst) return;
    inst.opts = Object.assign({}, inst.opts, opts || {});
    syncTreeSelectTrigger(inst);
    if (inst.open) {
      renderTreeSelectPanel(inst);
      positionTreeSelectPanel(inst);
    }
  }

  function mountTreeSelect(selectOrId, opts) {
    opts = opts || {};
    var sel = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!sel) return null;
    var existed = findTreeSelectInstance(sel);
    if (existed) {
      refreshTreeSelect(existed, opts);
      return existed;
    }
    var wrap = document.createElement('div');
    wrap.className = 'fee-tree-select' + (sel.classList.contains('ctl') ? ' is-compact' : '');
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fee-tree-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var panel = document.createElement('div');
    panel.className = 'fee-tree-select-panel';
    panel.style.zIndex = String(opts.zIndex || 1700);
    sel.classList.add('fee-tree-native-select');
    sel.setAttribute('tabindex', '-1');
    sel.insertAdjacentElement('afterend', wrap);
    wrap.appendChild(trigger);
    var inst = {
      select: sel,
      wrap: wrap,
      trigger: trigger,
      panel: panel,
      opts: Object.assign({}, opts),
      keyword: '',
      open: false,
      reposition: function () { positionTreeSelectPanel(inst); }
    };
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inst.open) closeTreeSelect(inst);
      else openTreeSelect(inst);
    });
    sel.addEventListener('change', function () { syncTreeSelectTrigger(inst); });
    document.addEventListener('click', function (e) {
      if (inst.wrap.contains(e.target) || inst.panel.contains(e.target)) return;
      closeTreeSelect(inst);
    });
    treeSelectInstances.push(inst);
    syncTreeSelectTrigger(inst);
    return inst;
  }

  function syncSelect(selectOrId, opts) {
    opts = opts || {};
    var sel = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!sel) return;
    var mode = opts.mode || 'name';
    var showCode = (opts.showCode !== false && mode === 'code') || opts.forceShowCode;
    var prev = sel.value;
    var html = '';
    if (opts.includeAll) {
      html += '<option value="">' + escapeHtml(opts.allLabel || '全部') + '</option>';
    }
    html += buildSelectOptions(opts).map(function (row) {
      var item = row.item;
      var val = mode === 'code' ? item.code : item.name;
      var prefix = row.depth ? '　'.repeat(row.depth) + '└ ' : '';
      var label = prefix + (showCode ? (item.name + ' · ' + item.code) : item.name);
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
    refreshTreeSelect(findTreeSelectInstance(sel), opts);
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
    expandedNodes = new Set();
    ensureExpandedDefaults();
    persist();
    renderTree();
  }

  function init(options) {
    options = options || {};
    if (options.storageKey) STORAGE_KEY = options.storageKey;
    if (options.seedUrl) SEED_URL = options.seedUrl;
    if (options.usageResolver) usageResolver = options.usageResolver;

    var stored = loadFromStorage();
    if (stored && stored.length) {
      items = normalizeList(stored);
      migrateFlatItemsIfNeeded();
      ensureExpandedDefaults();
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
        ensureExpandedDefaults();
        persist();
        ensureModals();
        return getAll();
      })
      .catch(function () {
        items = normalizeList(DEFAULT_ITEMS);
        ensureExpandedDefaults();
        persist();
        ensureModals();
        return getAll();
      });
  }

  global.FeeItemMaster = {
    init: init,
    getAll: getAll,
    getLeafItems: getLeafItems,
    getByCode: getByCode,
    getByName: getByName,
    getName: getName,
    syncSelect: syncSelect,
    mountTreeSelect: mountTreeSelect,
    openManage: openManage,
    openEdit: openEdit,
    openRemark: openRemark,
    mountToolbarButton: mountToolbarButton,
    setUsageResolver: setUsageResolver,
    onChange: onChange,
    resetToSeed: resetToSeed,
    persist: persist,
    remove: remove
  };
})(typeof window !== 'undefined' ? window : this);
