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

  function flattenTreeOptions(nodes, depth, excludeCode) {
    var options = [];
    nodes.forEach(function (node) {
      if (node.code !== excludeCode) {
        options.push({
          code: node.code,
          label: (depth ? '　'.repeat(depth) + '└ ' : '') + node.name + ' · ' + node.code,
          depth: depth
        });
        if (node.children && node.children.length) {
          options = options.concat(flattenTreeOptions(node.children, depth + 1, excludeCode));
        }
      }
    });
    return options;
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
            '<div class="fee-item-toolbar">' +
              '<div class="fee-item-toolbar-main">' +
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
    var expanded = expandedNodes.has(node.code);
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
      return '<div class="fee-item-tree-empty">暂无节点，请点击「新增节点」</div>';
    }
    return '<ul class="fee-item-tree">' + nodes.map(renderTreeNode).join('') + '</ul>';
  }

  function renderTree() {
    var root = document.getElementById('feeItemTreeRoot');
    if (!root) return;
    root.innerHTML = renderTreeNodes(buildTreeNodes());
  }

  function renderParentSelect(excludeCode, selectedParent) {
    var sel = document.getElementById('feeItemParent');
    if (!sel) return;
    var options = flattenTreeOptions(buildTreeNodes(), 0, excludeCode);
    sel.innerHTML = '<option value="">无（顶级）</option>' + options.map(function (opt) {
      return '<option value="' + escapeHtml(opt.code) + '">' + escapeHtml(opt.label) + '</option>';
    }).join('');
    sel.value = selectedParent || '';
  }

  function openManage() {
    ensureModals();
    ensureExpandedDefaults();
    renderTree();
    openMask('feeItemManageModal');
  }

  function closeManage() {
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
    if (!treeLabels) {
      var list = leavesOnly ? getLeafItems() : items.slice();
      return list.map(function (item) { return { item: item, depth: 0 }; });
    }
    var rows = flattenTreeForDisplay(buildTreeNodes(), 0);
    return rows.filter(function (row) {
      return leavesOnly ? !row.hasChildren : true;
    }).map(function (row) {
      return { item: row.node, depth: row.depth };
    });
  }

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
