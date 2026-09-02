(function () {
  'use strict';

  var KEY = EomSeed.KEY;
  var STATE;
  var UI = {
    page: 'workbench',
    orderNo: '',
    materialNo: '',
    detailTab: 'overview',
    wizardStep: 1,
    form: null,
    materialShow: {},
    highlightConfirm: false
  };

  var LEGACY = { 1: ['待提交', 'blue'], 2: ['待计划确认', 'orange'], 3: ['计划驳回', 'red'], 4: ['已关闭', 'gray'], 5: ['完结', 'green'] };
  var MAT_STATUS = { 1: ['核料中', 'orange'], 2: ['核料失败', 'red'], 3: ['草稿', 'blue'], 4: ['定版', 'green'] };
  var STAGE_TAG = { '草稿': 'gray', '启动 EOM': 'blue', '核料中': 'orange', '待方案决策': 'orange', 'EOM执行': 'blue', '清尾中': 'orange', 'EOL已闭环': 'green', '已关闭': 'gray' };
  var TASK_TAG = { '待处理': 'orange', '处理中': 'blue', '已完成': 'green', '已驳回': 'red', '已转交': 'gray' };
  var ACTIVE = ['同市场定位的替代新品已立项', '其他'];
  var PASSIVE = ['生命周期进入衰退期', '销量流速大幅下滑且DOS过高', '利润持续下降或低于预期', '营销和销售费用超出', '无法满足供应链MOQ', '法律法规不允许继续销售', '组件/软件不可获得且无法替代', '其他'];
  var CONCLUSIONS = ['lastbuy 后报废', '不补单报废'];
  var REASONS = ['MOQ 物料结余', '销售需求变化', '供应链需求外风险备料', '物料报废金额小于等于 2 万'];

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) {
    if (n == null || n === '') return '-';
    var x = Number(n);
    if (isNaN(x)) return esc(n);
    return x.toLocaleString('en-US');
  }
  function money(n, ccy) {
    if (n == null || n === '') return '-';
    return '¥' + Number(n).toLocaleString('en-US') + (ccy && ccy !== 'CNY' ? ' ' + ccy : '');
  }
  function tag(text, cls) { return '<span class="tag ' + (cls || 'gray') + '">' + esc(text || '-') + '</span>'; }
  function nowStr() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function today() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function progress(v) {
    var n = Number(v) || 0;
    var cls = n < 40 ? 'danger' : n < 70 ? 'warn' : '';
    return '<div class="progress ' + cls + '"><div class="track"><i style="width:' + Math.min(100, n) + '%"></i></div><span>' + n + '%</span></div>';
  }

  function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || 'success');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { el.className = 'toast'; }, 4000);
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(STATE)); } catch (e) { toast('本地保存失败，数据可能过大', 'error'); }
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.orders && parsed.materials) { STATE = parsed; return; }
      }
    } catch (e) {}
    STATE = EomSeed.buildSeed();
    persist();
  }
  function resetSeed() {
    if (!confirm('将清除本机已保存的操作，恢复 S1–S16 示例数据？')) return;
    localStorage.removeItem(KEY);
    STATE = EomSeed.buildSeed();
    persist();
    UI.orderNo = '';
    UI.materialNo = '';
    toast('已恢复示例数据', 'success');
    go('workbench');
  }

  function findOrder(no) { return STATE.orders.find(function (o) { return o.no === no; }); }
  function findMaterial(serial) { return STATE.materials.find(function (m) { return m.serialNo === serial; }); }
  function materialOfOrder(order) { return order && order.materialNo ? findMaterial(order.materialNo) : null; }
  function leaderName() {
    return (STATE.planDeptLeader && STATE.planDeptLeader.name) || '比杰';
  }
  function uniqueSkuRows(details) {
    var seen = {};
    var out = [];
    (details || []).forEach(function (d) {
      if (!seen[d.sku]) { seen[d.sku] = 1; out.push(d); }
    });
    return out;
  }
  function defaultPlanForRow(d) {
    var owners = STATE.skuPlanOwners || {};
    if (d && d.msku && owners[d.msku]) return { name: owners[d.msku], source: 'master' };
    if (d && d.sku && owners[d.sku]) return { name: owners[d.sku], source: 'master' };
    return { name: leaderName(), source: 'leader' };
  }
  function defaultPlanForSku(sku) {
    return defaultPlanForRow({ sku: sku });
  }
  function applyPlanUserToRow(d, name, source) {
    if (!d) return;
    d.planUser = name;
    d.planUserSource = source;
  }
  function refreshMaterialPlanUsers(m, opts) {
    opts = opts || {};
    if (!m) return;
    (m.details || []).forEach(function (row) {
      var next = defaultPlanForRow(row);
      var prev = row.planUser;
      var prevSource = row.planUserSource;
      if (next.source === 'master' && (prev !== next.name || prevSource === 'leader')) {
        applyPlanUserToRow(row, next.name, 'master');
        if (opts.unlockOnRefresh) applySkuPatch(m, row.sku, { skuLocked: false });
      } else if (!row.planUser || row.planUser === '-') {
        applyPlanUserToRow(row, next.name, next.source);
      }
    });
    if (!m.confirmFlags) m.confirmFlags = {};
    uniquePlanOwners(m).forEach(function (n) {
      if (m.confirmFlags[n] == null) m.confirmFlags[n] = false;
    });
    syncOrderPlanUsers(m);
  }
  function uniquePlanOwners(m) {
    var names = [];
    (m && m.details || []).forEach(function (d) {
      var n = d.planUser && d.planUser !== '-' ? d.planUser : leaderName();
      if (names.indexOf(n) < 0) names.push(n);
    });
    return names;
  }
  function syncOrderPlanUsers(m) {
    if (!m || !m.eomNo) return;
    var o = findOrder(m.eomNo);
    if (!o) return;
    var owners = uniquePlanOwners(m);
    o.planUsers = owners.join('、');
  }
  function syncConfirmFlags(m) {
    if (!m) return;
    m.confirmFlags = m.confirmFlags || {};
    uniquePlanOwners(m).forEach(function (n) {
      var skus = [];
      (m.details || []).forEach(function (d) {
        if (d.planUser !== n) return;
        if (skus.indexOf(d.sku) < 0) skus.push(d.sku);
      });
      m.confirmFlags[n] = skus.length > 0 && skus.every(function (sku) {
        return uniqueSkuRows(m.details).some(function (d) { return d.sku === sku && d.skuLocked; });
      });
    });
  }
  function confirmProgress(m) {
    var skus = uniqueSkuRows(m && m.details);
    var done = skus.filter(function (d) { return d.skuLocked; }).length;
    var owners = uniquePlanOwners(m);
    syncConfirmFlags(m);
    return {
      owners: owners,
      done: done,
      total: skus.length,
      text: (skus.length ? done + '/' + skus.length : '0/0') + ' 个 SKU 已确认'
    };
  }
  function isMineSku(d) {
    return d && d.planUser === STATE.currentUser.name;
  }
  function skuHasMine(m, sku) {
    return (m.details || []).some(function (d) { return d.sku === sku && isMineSku(d); });
  }
  function emptySkuLevelFields(d) {
    if (!d) return ['最终下单数量'];
    var miss = [];
    if (d.deliveryTime === '' || d.deliveryTime == null || d.deliveryTime === '-' || isNaN(Number(d.deliveryTime))) miss.push('下单后最快交付时间');
    if (d.finalOrderNum === '' || d.finalOrderNum == null) miss.push('最终下单数量');
    if (d.finalScrapAmount === '' || d.finalScrapAmount == null) miss.push('最终报废金额');
    if (!d.finalScrapAmountReason || d.finalScrapAmountReason === '-') miss.push('原因');
    return miss;
  }
  function conclusionEmpty(d) {
    return !d || !d.conclusion || d.conclusion === '-';
  }
  function skuEmptyRemind(m, sku) {
    var rows = (m.details || []).filter(function (d) { return d.sku === sku; });
    if (!rows.length) return sku + ' 无明细';
    var parts = [];
    var skuMiss = emptySkuLevelFields(rows[0]);
    if (skuMiss.length) parts.push(sku + ' 的' + skuMiss.join('、') + '为空');
    var emptyMskus = rows.filter(conclusionEmpty).map(function (d) { return d.msku || sku; });
    if (emptyMskus.length) parts.push(sku + ' 下 ' + emptyMskus.join('、') + ' 的结论为空');
    if (!parts.length) return '';
    return parts.join('；') + '，请先在页面填写或导入后再确认';
  }
  function myDetailRows(m) {
    return (m.details || []).filter(isMineSku);
  }
  function canEditMaterial(m, d) {
    if (!m || !d) return false;
    if (m.status === 4) return false;
    if (m.status !== 1) return false;
    if ((m.clcStatus || '').indexOf('失败') >= 0) return false;
    if (d.skuLocked) return false;
    return true;
  }
  function canEditSkuLevel(m, d) {
    return canEditMaterial(m, d) && skuHasMine(m, d.sku);
  }
  function canEditConclusion(m, d) {
    return canEditMaterial(m, d) && isMineSku(d);
  }
  function canConfirmSku(m, d) {
    if (!canEditSkuLevel(m, d)) return false;
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    return !!(o && o.stage === '核料中');
  }
  function applyRowPatch(m, id, patch) {
    (m.details || []).forEach(function (d) {
      if (d.id !== id) return;
      Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    });
  }
  function canImportMaterial(m) {
    if (!m) return '无核料单';
    if (!m.eomNo) return '仅支持按工单导入，请从已关联 EOM 的核料单进入';
    var o = findOrder(m.eomNo);
    if (!o) return '未找到关联工单';
    if (o.stage !== '核料中') return '工单已过核料节点，不能导入';
    if (m.status === 4) return '核料已定版，不能导入';
    if (m.status === 3) return '草稿核料单不能导入结论';
    if (m.status === 2 || (m.clcStatus || '').indexOf('失败') >= 0) return '核料计算失败，不能导入';
    if (m.status !== 1) return '当前核料状态不能导入';
    return '';
  }
  function applySkuPatch(m, sku, patch) {
    (m.details || []).forEach(function (d) {
      if (d.sku !== sku) return;
      Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    });
  }
  function displayDays(v) {
    if (v === '' || v == null || v === '-') return '-';
    return v + ' 天';
  }
  function planUsersCell(o) {
    var m = materialOfOrder(o);
    if (!m || o.stage !== '核料中') return esc(o.planUsers || '-');
    var p = confirmProgress(m);
    var flags = m.confirmFlags || {};
    var names = p.owners.map(function (n) {
      return esc(n) + (flags[n] ? ' ✓' : '');
    }).join('；');
    return names + '<div class="muted">' + esc(p.text) + '</div>';
  }
  function canShowMaterialConfirm(o) {
    var m = materialOfOrder(o);
    if (!m || o.stage !== '核料中') return false;
    if (m.status !== 1 || (m.clcStatus || '').indexOf('失败') >= 0) return false;
    return uniquePlanOwners(m).indexOf(STATE.currentUser.name) >= 0;
  }
  function renderUserBar() {
    var box = document.getElementById('userBox');
    if (!box) return;
    var users = EomSeed.USERS || [];
    var cur = STATE.currentUser || users[0];
    box.innerHTML = '<select id="userSwitch" class="user-switch">' + users.map(function (u) {
      return '<option value="' + esc(u.id) + '"' + (u.id === cur.id ? ' selected' : '') + '>' + esc(u.name) + ' · ' + esc(u.role) + '</option>';
    }).join('') + '</select>';
  }
  function addLog(order, action, content) {
    if (!order.logs) order.logs = [];
    order.logs.unshift({ time: nowStr(), user: STATE.currentUser.name, action: action, content: content });
  }
  function nextNo(prefix, field) {
    STATE.seq[field] += 1;
    return prefix + STATE.seq[field];
  }

  function go(page, extra) {
    UI.page = page;
    if (page === 'order') UI.orderNo = extra || UI.orderNo;
    if (page === 'material') UI.materialNo = extra || UI.materialNo || defaultMaterialNo();
    location.hash = page === 'order' ? 'order/' + UI.orderNo : page === 'material' ? 'material/' + (UI.materialNo || '') : page;
    renderAll();
  }
  function defaultMaterialNo() {
    if (UI.materialNo && findMaterial(UI.materialNo)) return UI.materialNo;
    var first = STATE.materials[0];
    return first ? first.serialNo : '';
  }
  function applyHash() {
    var h = (location.hash || '#workbench').replace(/^#/, '');
    var parts = h.split('/');
    var page = parts[0] || 'workbench';
    if (page === 'order') { UI.page = 'orders'; UI.orderNo = parts[1] || ''; }
    else if (page === 'material') { UI.page = 'material'; UI.materialNo = parts[1] || defaultMaterialNo(); }
    else UI.page = page;
    renderAll();
  }

  function setActivePage(id) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.toggle('active', p.id === 'page-' + id); });
    document.querySelectorAll('.menu-item').forEach(function (m) {
      m.classList.toggle('active', m.getAttribute('data-page') === (id === 'order' ? 'orders' : id));
    });
    var names = {
      workbench: 'EOM工作台', orders: 'EOM工单', ledger: 'EOM产品台账',
      materials: '核料信息管理', material: '核料信息详情', statusFlow: '规则 / 状态流转'
    };
    document.getElementById('breadcrumb').textContent = 'GTM系统 / 管理 / ' + (names[id] || 'EOM管理');
  }

  function renderAll() {
    renderUserBar();
    STATE.materials.forEach(function (m) { refreshMaterialPlanUsers(m); });
    var drawer = document.getElementById('detailDrawer');
    if (location.hash.indexOf('#order/') === 0 && UI.orderNo) {
      setActivePage('orders');
      renderOrders();
      renderOrderDetail();
      drawer.classList.add('show');
    } else {
      drawer.classList.remove('show');
      setActivePage(UI.page);
      if (UI.page === 'workbench') renderWorkbench();
      if (UI.page === 'orders') renderOrders();
      if (UI.page === 'ledger') renderLedger();
      if (UI.page === 'materials') renderMaterials();
      if (UI.page === 'material') renderMaterialPage();
      if (UI.page === 'statusFlow') renderStatusFlow();
    }
  }

  function stats() {
    var orders = STATE.orders;
    var running = orders.filter(function (o) { return o.stage !== '已关闭' && o.stage !== 'EOL已闭环' && o.stage !== '草稿'; });
    var myTasks = [];
    orders.forEach(function (o) {
      (o.tasks || []).forEach(function (t) {
        if (t.status === '待处理' || t.status === '处理中') myTasks.push({ order: o, task: t });
      });
    });
    var skus = [];
    orders.forEach(function (o) { (o.skus || []).forEach(function (s) { skus.push(s); }); });
    var execSku = skus.filter(function (s) { return s.status === 'EOM'; }).length;
    var tailSku = orders.filter(function (o) { return o.stage === '清尾中'; }).reduce(function (n, o) { return n + (o.skus || []).length; }, 0);
    var clear = skus.length ? Math.round(skus.reduce(function (a, s) { return a + (Number(s.clearPct) || 0); }, 0) / skus.length * 10) / 10 : 0;
    var matClose = orders.length ? Math.round(orders.reduce(function (a, o) { return a + (Number(o.materialClose) || 0); }, 0) / orders.length * 10) / 10 : 0;
    var stageMap = {};
    orders.forEach(function (o) { stageMap[o.stage] = (stageMap[o.stage] || 0) + 1; });
    return { running: running.length, mine: myTasks.length, myTasks: myTasks, execSku: execSku, tailSku: tailSku, clear: clear, matClose: matClose, stageMap: stageMap, orders: orders.length };
  }

  function renderWorkbench() {
    var s = stats();
    var stages = ['启动 EOM', '核料中', '待方案决策', 'EOM执行', '清尾中', 'EOL已闭环', '草稿', '已关闭'];
    var max = Math.max.apply(null, stages.map(function (k) { return s.stageMap[k] || 0; }).concat([1]));
    var chips = EomSeed.SCENES.map(function (c) {
      return '<button class="chip" data-act="scene" data-id="' + c.id + '" data-no="' + esc(c.no) + '" data-action="' + (c.action || '') + '">' + esc(c.label) + '</button>';
    }).join('');
    var stageHtml = stages.map(function (k) {
      var n = s.stageMap[k] || 0;
      return '<div class="stage-row"><span>' + k + '</span><div class="bar"><span style="width:' + (n / max * 100) + '%"></span></div><b>' + n + '</b></div>';
    }).join('');
    var todos = s.myTasks.slice(0, 6).map(function (x) {
      return '<div class="task-item"><span><a data-act="open-order" data-no="' + x.order.no + '">' + x.order.no + '</a>　' + esc(x.task.name) + '</span><span>' + esc(x.task.owner) + '</span><span class="muted">' + esc(x.task.due) + '</span>' + tag(x.task.status, TASK_TAG[x.task.status]) + '</div>';
    }).join('') || '<div class="empty">暂无待办</div>';
    var tails = STATE.orders.filter(function (o) { return o.stage === 'EOM执行' || o.stage === '清尾中'; }).slice(0, 5).map(function (o) {
      var sku = (o.skus || [])[0] || {};
      return '<div class="task-item"><span><a data-act="open-order" data-no="' + o.no + '">' + esc(sku.sku || o.model) + '</a>　当前库存 ' + num(sku.stock) + '</span><span>清库 ' + (sku.clearPct || 0) + '%</span><span class="muted">PSI DOS ' + (sku.dos || '-') + '天</span>' + tag(o.stage, STAGE_TAG[o.stage]) + '</div>';
    }).join('');
    document.getElementById('page-workbench').innerHTML =
      '<div class="page-title"><span>EOM工作台<span class="page-sub">数据更新于 ' + esc(STATE.generatedAt) + '　操作会保存到本机</span></span><div><button class="btn" data-act="reset-seed">恢复示例数据</button></div></div>' +
      '<div class="alert">同一套数据驱动工作台、工单、台账和核料信息。点下方场景可直接进入对应工单。S3 演示核料页按 SKU 确认：右上角切换为「刘洋 / 陈琳 / 比杰」，工单点「确认」会跳到核料页勾选。S11 打开发起向导做校验。</div>' +
      '<div class="chips" style="margin-bottom:14px">' + chips + '</div>' +
      '<div class="cards">' +
        card('工', 'blue', s.running, '进行中工单', 'orders') +
        card('待', 'orange', s.mine, '待处理任务', 'orders') +
        card('执', 'blue', s.execSku, 'EOM执行中SKU', 'ledger') +
        card('尾', 'orange', s.tailSku, '清尾中SKU', 'ledger') +
        card('库', 'green', s.clear + '%', '清库达成率', 'ledger') +
        card('料', 'blue', s.matClose + '%', '专用料关闭率', 'ledger') +
      '</div>' +
      '<div class="board-grid"><div class="card"><div class="card-title"><span>工单阶段分布</span><small>共 ' + s.orders + ' 单</small></div>' + stageHtml + '</div>' +
      '<div class="card"><div class="card-title"><span>我的待办</span><a data-act="go" data-page="orders">查看全部</a></div><div class="task-list">' + todos + '</div></div></div>' +
      '<div class="card"><div class="card-title"><span>清尾产品进度</span><a data-act="go" data-page="ledger">查看产品台账</a></div><div class="task-list">' + tails + '</div></div>';
  }
  function card(icon, color, val, label, page) {
    return '<div class="card stat-card" data-act="go" data-page="' + page + '"><div class="stat-icon ' + color + '">' + icon + '</div><div><div class="stat-value">' + val + '</div><div class="stat-label">' + label + '</div></div></div>';
  }

  function sfNode(name, cls, sub) {
    return '<div class="sf-node ' + (cls || 'gray') + '">' + esc(name) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }
  function sfEdge(label, back) {
    return '<div class="sf-edge' + (back ? ' back' : '') + '"><i>' + (back ? '↩' : '→') + '</i><span>' + esc(label) + '</span></div>';
  }
  function sfTable(headers, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th class="left">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td class="left">' + c + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function renderStatusFlow() {
    document.getElementById('page-statusFlow').innerHTML =
      '<div class="sf-page">' +
      '<div class="page-title"><span>状态流转<span class="page-sub">主路径 · 回退/关闭/驳回 · 方案变更不改阶段 · 现网对照</span></span></div>' +
      '<div class="alert">工单阶段看流程走到哪；产品状态看 SKU 生命周期；方案版本和异常贴纸都不替代主阶段。本期不含「已暂停」，不含核料单四态。</div>' +

      '<div class="sf-h">一、工单阶段 · 主路径</div>' +
      '<div class="sf-board">' +
        '<div class="sf-path">' +
          sfNode('草稿', 'gray', '未提交') + sfEdge('提交') +
          sfNode('启动 EOM', 'blue', '刷新预测') + sfEdge('预测完成并核料') +
          sfNode('核料中', 'orange', '按 SKU 确认') + sfEdge('全部 SKU 确认') +
          sfNode('待方案决策', 'orange', '核料已定版') + sfEdge('方案确认') +
          sfNode('EOM 执行', 'blue', '现网映射完结') + sfEdge('开始清尾') +
          sfNode('清尾中', 'orange') + sfEdge('全部 SKU 达 EOL') +
          sfNode('EOL 已闭环', 'green', '终态') +
        '</div>' +
        '<div class="sf-legend">主路径从左到右。方案确认后现网记「完结」，2.0 继续清尾，页面不得显示业务完结。草稿没有撤回，只能继续编辑、提交或关闭。</div>' +
      '</div>' +

      '<div class="sf-h">二、工单阶段 · 撤回 / 关闭 / 方案驳回</div>' +
      '<div class="sf-board">' +
        '<div class="sf-branch-row"><div class="sf-kicker">撤回</div><div class="sf-path">' +
          sfNode('启动 EOM', 'blue') + sfEdge('仅此阶段可撤回', true) + sfNode('草稿', 'gray', 'SKU 释放回原状态') +
        '</div></div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">关闭</div><div class="sf-path">' +
          sfNode('草稿', 'gray') + sfEdge('关闭', true) + sfNode('已关闭', 'red', '须填原因') +
          sfEdge('或从启动 EOM') + sfNode('启动 EOM', 'blue') + sfEdge('关闭', true) + sfNode('已关闭', 'red') +
        '</div></div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">重新发起</div><div class="sf-path">' +
          sfNode('已关闭', 'red') + sfEdge('原单回草稿') + sfNode('草稿', 'gray', '流水号不变') +
        '</div></div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">方案驳回</div><div class="sf-path">' +
          sfNode('待方案决策', 'orange') + sfEdge('尚未正式 EOM', true) + sfNode('核料中', 'orange', '整单解锁') +
          sfNode('已驳回', 'red', '异常贴纸') +
        '</div></div>' +
        '<div class="sf-branches">' +
          '<div class="sf-card danger"><b>硬闸</b>核料中及之后不可撤回、不可关闭。节点任务驳回不允许核料中 → 启动 EOM。</div>' +
          '<div class="sf-card"><b>核料「确认」</b>工单列表同名按钮只跳转核料页。按 8 位 SKU 勾选确认；未完成前阶段仍为核料中。</div>' +
          '<div class="sf-card warn"><b>方案驳回 vs 节点驳回</b>方案驳回才退工单阶段（回核料中，整单解锁）。节点任务驳回只改任务，工单阶段不动。</div>' +
        '</div>' +
      '</div>' +
      '<div class="sf-wrap">' +
        sfTable(['操作', '谁', '当前阶段', '下一阶段', '连带'], [
          ['保存草稿', '发起人', '—', '草稿', 'SKU 仍为原产品状态；草稿不可撤回'],
          ['提交', '发起人', '草稿', '启动 EOM', 'SKU → 准备 EOM；现网：待计划确认'],
          ['撤回', '发起人', '仅启动 EOM', '草稿', 'SKU 从准备 EOM 释放回已上市/未上市；现网：待提交'],
          ['关闭', '发起人', '草稿 / 启动 EOM', '已关闭', '必须填原因并写日志；若已是准备 EOM 则释放 SKU'],
          ['重新发起', '发起人', '已关闭', '草稿', '原单、原流水号；关闭原因与历史日志保留；再提交才进入准备 EOM'],
          ['销售提交预测并进入核料', '销售 / 需求计划', '启动 EOM', '核料中', '此后不可再撤回/关闭'],
          ['工单「确认」', '该 SKU 计划负责人', '核料中', '仍核料中', '跳转核料页，不在工单上提交'],
          ['核料页确认所选 SKU', '该 SKU 计划负责人', '核料中', '仍核料中', '锁定已填齐的 SKU；进度按 SKU'],
          ['全部 SKU 确认', '系统', '核料中', '待方案决策', '核料自动定版'],
          ['方案确认', '方案角色', '待方案决策', 'EOM 执行', 'SKU → EOM；现网映射完结'],
          ['方案驳回', '方案角色', '待方案决策', '核料中', '仅尚未正式 EOM 可退；整单解锁；贴纸：已驳回'],
          ['节点任务驳回', '当前任务处理人', '任意进行中阶段', '阶段不变', '必须填原因；禁止核料中退回启动 EOM'],
          ['开始清尾', '销售 / 采购 / PMC', 'EOM 执行', '清尾中', '三路并行'],
          ['工单内全部 SKU 达 EOL', '系统', '清尾中', 'EOL 已闭环', '终态']
        ]) +
      '</div>' +

      '<div class="sf-h">三、方案变更与反 EOM（不改工单阶段）</div>' +
      '<div class="sf-board">' +
        '<div class="sf-branch-row"><div class="sf-kicker">方案改版</div><div class="sf-path">' +
          sfNode('EOM 执行 / 清尾中', 'blue') + sfEdge('会签 + 新版本') + sfNode('仍该阶段', 'blue', 'SKU 仍为 EOM') +
        '</div></div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">反 EOM</div><div class="sf-path">' +
          sfNode('清尾中（典型）', 'orange') + sfEdge('BOM已禁用追加LB') + sfNode('仍清尾中', 'orange') +
          sfNode('反 EOM 中', 'red', '异常贴纸，阻断 EOL') +
        '</div></div>' +
        '<div class="sf-legend">方案变更 = 新版本 + 会签，阶段不退回。方案驳回 = 尚未正式 EOM，才退回核料中。BOM 已禁用追加 Last Buy 走反 EOM，不走改版。</div>' +
      '</div>' +
      '<div class="sf-wrap">' +
        sfTable(['场景', '发生阶段', '工单阶段', '产品状态', '怎么处理'], [
          ['待方案决策前改方案草稿', '待方案决策', '不变', '准备 EOM', '尚未生效，仍走方案确认或方案驳回'],
          ['OA / 计委会审批未返回', '待方案决策', '停在待方案决策', '准备 EOM', '方案不得生效，不得进 EOM 执行'],
          ['OA 不同意报废', '待方案决策', '不关单、不退核料', '准备 EOM', '退回 GTM 再出一版，继续待方案决策'],
          ['正式 EOM 后改版（新品延期、清库偏低、调 LB 计划等）', 'EOM 执行 / 清尾中', '不退回', '仍 EOM', '必须会签、必须留版本；执行人切到当前生效版'],
          ['BOM 已禁用且需追加 Last Buy', '清尾中（典型）', '一般仍清尾中', '仍 EOM', '必须反 EOM，禁止用改版 / 撤回 / 关闭 / 重新发起代替']
        ]) +
      '</div>' +

      '<div class="sf-h">现网流程状态对照</div>' +
      '<div class="sf-wrap">' +
        sfTable(['现网状态', '2.0 工单阶段', '说明'], [
          ['待提交', '草稿', '一对一；含撤回后的草稿、重新发起后的原单草稿'],
          ['待计划确认', '启动 EOM / 核料中 / 待方案决策', '现网一个状态覆盖 2.0 三段；核料「确认」不再把整单变成完结'],
          ['计划驳回', '核料中 + 异常「已驳回」', '2.0 方案驳回回核料中并整单解锁，不单独作为主阶段'],
          ['已关闭', '已关闭', '一对一；仅草稿、启动 EOM 可关；重新发起仍用原流水号'],
          ['完结', 'EOM 执行 / 清尾中 / EOL 已闭环', '现网终态；2.0 只作映射，页面展示真实阶段']
        ]) +
      '</div>' +

      '<div class="sf-h">四、产品状态（SKU）</div>' +
      '<div class="sf-board">' +
        '<div class="sf-path">' +
          sfNode('未上市', 'gray', '主数据') + sfEdge('上市') +
          sfNode('已上市', 'blue', '可发起 EOM') + sfEdge('工单提交') +
          sfNode('准备 EOM', 'orange') + sfEdge('方案确认') +
          sfNode('EOM', 'blue') + sfEdge('四条件同时满足') +
          sfNode('EOL', 'green', '终态') +
        '</div>' +
        '<div class="sf-branch-row"><div class="sf-kicker">释放</div><div class="sf-path">' +
          sfNode('准备 EOM', 'orange') + sfEdge('撤回或关闭', true) + sfNode('已上市 / 未上市', 'blue', '进行中占用解除') +
        '</div></div>' +
        '<div class="sf-branches">' +
          '<div class="sf-card"><b>不可发起</b>已 EOL、已有进行中 EOM 的 SKU 不得纳入新工单。撤回/关闭后占用解除，允许再发起。</div>' +
          '<div class="sf-card"><b>未上市</b>无销售记录时提示主数据治理，不强制完整清库流程。</div>' +
          '<div class="sf-card"><b>不回拨</b>方案驳回、方案改版、反 EOM 都不把产品状态往回拨。反 EOM 中仍为 EOM，不得切 EOL。</div>' +
        '</div>' +
      '</div>' +
      '<div class="sf-wrap">' +
        sfTable(['操作 / 事件', '当前产品状态', '下一产品状态', '条件'], [
          ['主数据上市', '未上市', '已上市', '产品主数据，不在 EOM 工单内完成'],
          ['EOM 工单提交', '已上市 / 未上市', '准备 EOM', '随工单提交；草稿、重新发起后的草稿不改产品状态'],
          ['撤回 / 关闭', '准备 EOM', '提交前原状态', '释放占用，允许纳入新工单或原单再提交'],
          ['方案确认（正式 EOM）', '准备 EOM', 'EOM', '工单进入 EOM 执行'],
          ['方案驳回 / 方案改版', '准备 EOM 或 EOM', '不变', '驳回仍准备 EOM；改版仍 EOM'],
          ['自动 / 人工 EOL', 'EOM', 'EOL', '成品库存 0、专用料数量 0、无未完成 LB/在途、无执行中反 EOM'],
          ['发起反 EOM', 'EOM', 'EOM（不变）', '挂异常「反 EOM 中」，阻断 EOL']
        ]) +
      '</div>' +

      '<div class="sf-h">五、异常标识</div>' +
      '<div class="sf-board">' +
        '<div class="sf-host">' +
          '<div class="sf-host-box"><strong>工单主阶段</strong><span class="muted">仍显示核料中 / 清尾中等</span></div>' +
          '<div><span class="sf-stick">已驳回</span><span class="sf-stick">数据异常</span><span class="sf-stick">反 EOM 中</span></div>' +
        '</div>' +
        '<div class="sf-legend">异常与主阶段并存，列表打在阶段旁。本期不做「已暂停」。</div>' +
      '</div>' +
      '<div class="sf-wrap">' +
        sfTable(['标识', '挂上', '主阶段如何变', '摘掉'], [
          ['已驳回', '待方案决策时方案驳回', '回到核料中，整单核料结论解锁', '再次全部 SKU 确认并重新进入待方案决策'],
          ['数据异常', '预测为空/刷新失败、核料计算失败等', '主阶段不动（仍为启动 EOM 或核料中）', '数据恢复；未恢复前不得带入方案决策'],
          ['反 EOM 中', '发起反 EOM', '一般停在清尾中，不改产品状态', '追加 Last Buy 入库并重新禁用 BOM 后']
        ]) +
      '</div>' +
      '</div>';
  }

  function renderOrders() {
    var qNo = (document.getElementById('qNo') || {}).value || '';
    var qMat = (document.getElementById('qMat') || {}).value || '';
    var qModel = (document.getElementById('qModel') || {}).value || '';
    var qType = (document.getElementById('qType') || {}).value || '';
    var qStage = (document.getElementById('qStage') || {}).value || '';
    var qLegacy = (document.getElementById('qLegacy') || {}).value || '';
    var list = STATE.orders.filter(function (o) {
      if (qNo && o.no.indexOf(qNo) < 0) return false;
      if (qMat && (o.materialNo || '').indexOf(qMat) < 0) return false;
      if (qModel && (o.scope || '').toLowerCase().indexOf(qModel.toLowerCase()) < 0 && (o.model || '').toLowerCase().indexOf(qModel.toLowerCase()) < 0) return false;
      if (qType && o.type !== qType) return false;
      if (qStage && o.stage !== qStage) return false;
      if (qLegacy && String(o.legacyStatus) !== qLegacy) return false;
      return true;
    });
    var rows = list.map(function (o) {
      var lg = LEGACY[o.legacyStatus] || ['-', 'gray'];
      var scene = (o.products[0] || {}).scene || '-';
      var cat = (o.products[0] || {}).cat || '-';
      var ops = orderOps(o);
      return '<tr>' +
        '<td><input type="checkbox"></td>' +
        '<td><a data-act="open-order" data-no="' + o.no + '">' + o.no + '</a><div class="muted">' + esc(o.sceneLabel || o.sceneKey || '') + '</div></td>' +
        '<td>' + esc(o.user) + '</td>' +
        '<td>' + (o.materialNo ? '<a data-act="open-material" data-no="' + o.materialNo + '">' + o.materialNo + '</a>' : '-') + '</td>' +
        '<td>' + esc(o.type) + '<div class="muted">' + esc(o.bu) + '</div></td>' +
        '<td class="left">' + esc(o.reason) + '</td>' +
        '<td>' + esc(scene) + '</td><td>' + esc(cat) + '</td><td>' + esc(o.scope) + '</td>' +
        '<td>' + tag(o.stage, STAGE_TAG[o.stage]) + (o.exception ? '<div style="margin-top:4px">' + tag(o.exception, 'red') + '</div>' : '') + '</td>' +
        '<td>' + tag(lg[0], lg[1]) + '</td>' +
        '<td>' + esc(o.owner) + '</td>' +
        '<td class="left">' + esc(o.remark || '-') + '</td>' +
        '<td>' + (o.fileName ? '<a data-act="toast" data-msg="已下载 ' + esc(o.fileName) + '">' + esc(o.fileName) + '</a>' : '-') + '</td>' +
        '<td>' + progress(o.stock) + '</td><td>' + progress(o.materialClose) + '</td>' +
        '<td>' + planUsersCell(o) + '</td><td>' + esc(o.time) + '</td><td>' + esc(o.confirmTime) + '</td>' +
        '<td class="left">' + ops + '</td></tr>';
    }).join('');
    document.getElementById('page-orders').innerHTML =
      '<div class="page-title">EOM工单<span class="page-sub">现网列（核料信息/方案附件/流程状态）+ 2.0 工单阶段</span></div>' +
      '<div class="filter-bar">' +
        '<input class="input" id="qNo" placeholder="EOM流水号" value="' + esc(qNo) + '" />' +
        '<input class="input" id="qMat" placeholder="核料流水号" value="' + esc(qMat) + '" />' +
        '<input class="input" id="qModel" placeholder="Model/SKU" value="' + esc(qModel) + '" />' +
        '<select class="select" id="qType"><option value="">退市类型</option><option>主动退市</option><option>被动退市</option></select>' +
        '<select class="select" id="qStage"><option value="">工单阶段</option><option>草稿</option><option>启动 EOM</option><option>核料中</option><option>待方案决策</option><option>EOM执行</option><option>清尾中</option><option>EOL已闭环</option><option>已关闭</option></select>' +
        '<select class="select" id="qLegacy"><option value="">流程状态</option><option value="1">待提交</option><option value="2">待计划确认</option><option value="3">计划驳回</option><option value="4">已关闭</option><option value="5">完结</option></select>' +
        '<button class="btn btn-primary" data-act="filter-orders">搜索</button>' +
        '<button class="btn" data-act="reset-orders">重置</button>' +
      '</div>' +
      '<div class="toolbar"><button class="btn btn-primary" data-act="open-create">发起EOM</button>' +
        '<button class="btn" data-act="export-orders">导出台账</button>' +
        '<div class="toolbar-right">当前筛选共 ' + list.length + ' 条（全部 ' + STATE.orders.length + ' 条）</div></div>' +
      '<div class="table-wrap"><table style="min-width:2400px"><thead><tr>' +
        '<th></th><th>EOM流水号</th><th>准备EOM发起人</th><th>核料信息</th><th>退市类型</th><th>退市原因</th><th>场景</th><th>品类</th><th>Model/SKU</th>' +
        '<th>工单阶段</th><th>流程状态</th><th>当前责任人</th><th>备注</th><th>EOM方案</th><th>清库进度</th><th>专用料关闭率</th><th>计划确认人员</th><th>发起时间</th><th>确认时间</th><th>操作</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="20" class="empty">无数据</td></tr>') + '</tbody></table></div>' +
      '<div class="pager"><span>共 ' + list.length + ' 条</span></div>';
    if (qType) document.getElementById('qType').value = qType;
    if (qStage) document.getElementById('qStage').value = qStage;
    if (qLegacy) document.getElementById('qLegacy').value = qLegacy;
  }
  function orderOps(o) {
    var html = '';
    if (o.legacyStatus === 1 && o.userId === STATE.currentUser.id) html += '<a data-act="open-create" data-edit="' + o.no + '">编辑</a> ';
    if (o.legacyStatus === 3 && o.userId === STATE.currentUser.id) html += '<a data-act="open-create" data-edit="' + o.no + '">编辑</a> ';
    if (canShowMaterialConfirm(o)) html += '<a data-act="material-confirm" data-no="' + o.no + '">确认</a> ';
    if (o.stage === '待方案决策' && o.legacyStatus === 2) html += '<a data-act="plan-confirm" data-no="' + o.no + '">方案确认</a> <a data-act="plan-reject" data-no="' + o.no + '">驳回</a> ';
    if (o.stage === '启动 EOM' && o.userId === STATE.currentUser.id) html += '<a data-act="withdraw" data-no="' + o.no + '">撤回</a> ';
    if ((o.stage === '草稿' || o.stage === '启动 EOM') && o.userId === STATE.currentUser.id) html += '<a data-act="close-order" data-no="' + o.no + '">关闭</a> ';
    if (o.legacyStatus === 4 && o.userId === STATE.currentUser.id) html += '<a data-act="reopen" data-no="' + o.no + '">重新发起</a> ';
    var openTask = (o.tasks || []).find(function (t) { return t.status === '待处理' || t.status === '处理中'; });
    if (openTask) html += '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + openTask.id + '">处理</a> ';
    html += '<a data-act="open-order" data-no="' + o.no + '">查看</a> <a data-act="open-logs" data-no="' + o.no + '">日志</a>';
    return html;
  }

  function renderLedger() {
    var rows = [];
    STATE.orders.forEach(function (o) {
      (o.skus || []).forEach(function (s, idx) {
        rows.push({ o: o, s: s, idx: idx });
      });
    });
    var html = rows.map(function (x, i) {
      var s = x.s, o = x.o;
      return '<tr>' +
        '<td><a data-act="toggle-ledger" data-i="' + i + '">展开</a></td>' +
        '<td><a data-act="open-order" data-no="' + o.no + '">' + o.no + '</a></td>' +
        '<td>' + esc(o.time.slice(0, 10)) + '</td><td>' + esc(s.model) + '</td><td>' + esc(s.sku) + '</td>' +
        '<td>' + esc(s.scene) + '</td><td>' + esc(s.cat) + '</td><td>' + esc(s.country) + '</td>' +
        '<td>' + tag(s.status, s.status === 'EOL' ? 'green' : s.status === 'EOM' ? 'blue' : 'orange') + '</td>' +
        '<td>' + esc(s.onMarketDate) + '</td><td>' + esc(s.daysOn) + '天</td><td>' + esc(s.type || o.type) + '</td>' +
        '<td>' + esc(s.newFlag) + '</td><td>' + esc(s.newSku) + '</td><td>' + esc(s.newCr) + '</td><td>' + esc(s.newList) + '</td>' +
        '<td>' + esc(s.startTime || o.time) + '</td><td>' + esc(s.eol || o.eol) + '</td><td>' + esc(s.eomDays) + '</td>' +
        '<td>' + esc(s.lbPlan) + '</td><td>' + esc(s.lbOrder) + '</td><td>' + esc(s.lbDone) + '</td>' +
        '<td>' + num(s.lbQty) + '</td><td>' + tag(s.lbStatus, 'orange') + '</td>' +
        '<td>' + num(s.lbBaseStock) + '</td><td>' + num(s.stock) + '</td><td>' + num(s.stale) + '</td><td>' + esc(s.staleRate) + '</td>' +
        '<td>' + money(s.specialAmt) + '</td><td>' + money(s.commonAmt) + '</td>' +
        '<td>' + num(s.m3) + '</td><td>' + num(s.m2) + '</td><td>' + num(s.m1) + '</td>' +
        '<td>' + num(s.forecast) + '</td><td>' + num(s.eolForecast) + '</td><td>' + (s.dos || '-') + '天</td>' +
        '<td>' + progress(s.clearPct) + '</td><td><a data-act="open-order" data-no="' + o.no + '" data-tab="plans">' + esc(s.plan || o.planVersion) + '</a></td>' +
        '<td><a data-act="open-order" data-no="' + o.no + '">查看</a>　<a data-act="open-material" data-no="' + esc(o.materialNo) + '">核料</a></td></tr>' +
        '<tr class="ledger-detail" data-ledger="' + i + '" style="display:none;background:#fafafa"><td colspan="39" class="left"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:12px 24px">' +
          '<div><b>渠道/平台</b><p class="muted" style="margin-top:7px">' + esc((s.channels || []).join('；') || '无') + '</p></div>' +
          '<div><b>Last Buy明细</b><p class="muted" style="margin-top:7px">' + esc(s.lbDetail || '-') + '</p></div>' +
          '<div><b>库存构成</b><p class="muted" style="margin-top:7px">' + esc(s.stockSplit || '-') + '</p></div>' +
          '<div><b>物料构成</b><p class="muted" style="margin-top:7px">' + esc(s.materialSplit || ('专用料 ' + money(s.specialAmt))) + '</p></div>' +
        '</div></td></tr>';
    }).join('');
    document.getElementById('page-ledger').innerHTML =
      '<div class="page-title"><span>EOM产品台账<span class="page-sub">字段来自工单 SKU + 核料定版结果，操作后会同步</span></span></div>' +
      '<div class="toolbar"><button class="btn" data-act="export-ledger">导出当前结果</button><div class="toolbar-right">共 ' + rows.length + ' 个SKU　数量单位：台　金额单位：CNY</div></div>' +
      '<div class="table-wrap"><table style="min-width:3100px"><thead><tr>' +
        '<th>展开</th><th>EOM流水号</th><th>提报时间</th><th>Model</th><th>SKU</th><th>场景</th><th>品类</th><th>国家规格</th>' +
        '<th>产品状态</th><th>上市时间</th><th>在售时长</th><th>退市类型</th><th>是否新品迭代</th><th>迭代新品SKU</th>' +
        '<th>新品预计CR</th><th>新品上市时间</th><th>发起EOM时间</th><th>预计EOL</th><th>EOM时长</th>' +
        '<th>LB计划时间</th><th>LB下单时间</th><th>LB完成时间</th><th>LB数量</th><th>LB状态</th><th>LB后基准库存</th><th>当前库存</th><th>呆滞库存</th>' +
        '<th>呆滞占比</th><th>专用料库存</th><th>通用料库存</th><th>M-3月</th><th>M-2月</th><th>M-1月</th>' +
        '<th>销售总预测</th><th>EOL前总预测</th><th>PSI DOS</th><th>清库进度</th><th>清库方案</th><th>操作</th>' +
      '</tr></thead><tbody>' + html + '</tbody></table></div>';
  }

  function renderMaterials() {
    var q = (document.getElementById('mqNo') || {}).value || '';
    var qEom = (document.getElementById('mqEom') || {}).value || '';
    var qSt = (document.getElementById('mqSt') || {}).value || '';
    var list = STATE.materials.filter(function (m) {
      if (q && m.serialNo.indexOf(q) < 0) return false;
      if (qEom && (m.eomNo || '').indexOf(qEom) < 0) return false;
      if (qSt && String(m.status) !== qSt) return false;
      return true;
    });
    var rows = list.map(function (m) {
      var st = MAT_STATUS[m.status];
      var canEdit = m.status === 3 && m.initiator === STATE.currentUser.id && !m.eomNo;
      var ops = '';
      if (canEdit) ops += '<a data-act="edit-material" data-no="' + m.serialNo + '">编辑</a> ';
      if (m.eomNo && m.status === 3) ops += '<a data-act="open-order" data-no="' + m.eomNo + '">编辑(转EOM)</a> ';
      ops += '<a data-act="open-material" data-no="' + m.serialNo + '">查看</a> <a data-act="open-mat-log" data-no="' + m.serialNo + '">日志</a>';
      return '<tr><td><input type="checkbox"></td><td><a data-act="open-material" data-no="' + m.serialNo + '">' + m.serialNo + '</a></td>' +
        '<td>' + esc(m.initiatorName) + '</td><td>' + tag(st[0], st[1]) + '</td>' +
        '<td>' + (m.eomNo ? '<a data-act="open-order" data-no="' + m.eomNo + '">' + m.eomNo + '</a>' : '-') + '</td>' +
        '<td>' + esc(m.latestReviewTime || '-') + '</td><td>' + esc(m.finalizeTime || '-') + '</td>' +
        '<td class="left">' + ops + '</td></tr>';
    }).join('');
    document.getElementById('page-materials').innerHTML =
      '<div class="page-title">核料信息管理</div>' +
      '<div class="filter-bar">' +
        '<input class="input" id="mqNo" placeholder="核料流水号" value="' + esc(q) + '" />' +
        '<input class="input" id="mqEom" placeholder="EOM流水号" value="' + esc(qEom) + '" />' +
        '<select class="select" id="mqSt"><option value="">状态</option><option value="3">草稿</option><option value="1">核料中</option><option value="2">核料失败</option><option value="4">定版</option></select>' +
        '<button class="btn btn-primary" data-act="filter-mat">搜索</button></div>' +
      '<div class="toolbar"><button class="btn btn-primary" data-act="create-material">发起核料</button><div class="toolbar-right">共 ' + list.length + ' 条</div></div>' +
      '<div class="table-wrap"><table><thead><tr><th></th><th>核料流水号</th><th>核料发起人</th><th>状态</th><th>EOM流水号</th><th>最新核料时间</th><th>定版时间</th><th>按钮</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
    if (qSt) document.getElementById('mqSt').value = qSt;
  }

  function renderMaterialPage() {
    var m = findMaterial(UI.materialNo) || STATE.materials[0];
    UI.materialNo = m ? m.serialNo : '';
    document.getElementById('page-material').innerHTML = m ? renderMaterialHtml(m, true) : '<div class="empty">请从核料信息管理或 EOM 工单进入</div>';
    if (UI.highlightConfirm) {
      var bar = document.querySelector('#page-material .footer-bar');
      if (bar) {
        bar.classList.add('confirm-focus');
        bar.scrollIntoView({ block: 'nearest' });
      }
      UI.highlightConfirm = false;
    }
  }

  function renderMaterialHtml(m, pageMode) {
    var st = MAT_STATUS[m.status];
    var locked = m.status === 4;
    var details = m.details || [];
    var counts = {};
    details.forEach(function (r) { counts[r.sku] = (counts[r.sku] || 0) + 1; });
    var seen = {};
    var spanAt = details.map(function (r) {
      if (!seen[r.sku]) { seen[r.sku] = 1; return counts[r.sku]; }
      return 0;
    });
    var prog = m.eomNo ? confirmProgress(m) : null;
    var rows = details.map(function (r, idx) {
      var show = UI.materialShow[r.id];
      var consume = r.materialConsume || [];
      var infos = r.materialInfos || [];
      var consumeView = (show ? consume : consume.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (consume.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var infoView = (show ? infos : infos.slice(0, 3)).map(function (x) {
        return '<div><a title="' + esc(x.material) + '">' + esc(x.materialCode) + '</a> ' + num(x.qty) + '</div>';
      }).join('') + (infos.length > 3 ? '<a data-act="toggle-more" data-id="' + r.id + '">' + (show ? '收起' : '更多') + '</a>' : '');
      var fittings = (r.eomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') || '-';
      var clc = (r.clcEomFittings || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
      var skuSpan = spanAt[idx];
      var first = skuSpan > 0;
      var rs = skuSpan > 1 ? ' rowspan="' + skuSpan + '"' : '';
      var mine = skuHasMine(m, r.sku);
      var canPlan = canEditSkuLevel(m, r);
      if (first && !locked) clc += ' <span class="icon-btn" data-act="edit-fitting" data-mid="' + m.serialNo + '" data-id="' + r.id + '">✎</span>';
      var lockIcon = (!locked && first) ? '<span class="icon-btn ' + (r.lockFlag ? 'lock' : 'unlock') + '" data-act="toggle-lock" data-mid="' + m.serialNo + '" data-id="' + r.id + '">' + (r.lockFlag ? '锁定' : '未锁') + '</span>' : '';
      var edit = function (field, label) {
        return canPlan ? ' <span class="icon-btn" data-act="edit-field" data-mid="' + m.serialNo + '" data-id="' + r.id + '" data-field="' + field + '" data-label="' + label + '">✎</span>' : '';
      };
      var editConc = canEditConclusion(m, r) ? ' <span class="icon-btn" data-act="edit-field" data-mid="' + m.serialNo + '" data-id="' + r.id + '" data-field="conclusion" data-label="结论">✎</span>' : '';
      var ownerTip = r.planUserSource === 'leader' ? '<div class="sub">计划部门负责人兜底</div>' : '<div class="sub">主数据</div>';
      var ownerAct = (!locked && r.planUserSource === 'leader')
        ? '<div><a data-act="assign-plan-user" data-mid="' + m.serialNo + '" data-msku="' + esc(r.msku) + '">模拟主数据维护负责人</a></div>' : '';
      var canPick = first && canConfirmSku(m, r);
      var checkCell = first ? (
        '<td class="sku-check-cell"' + rs + '>' +
          (canPick ? '<input type="checkbox" class="sku-pick" data-sku="' + esc(r.sku) + '" data-mid="' + m.serialNo + '" />'
            : (r.skuLocked && mine ? '<span class="muted">已确认</span>' : '')) +
        '</td>'
      ) : '';
      var lockTip = r.skuLocked ? '<div class="sub">已确认锁定</div>' : '';
      var skuCells = first ? (
        checkCell +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.model) + '</a><div class="sub">状态：' + esc(r.modelStatus) + '</div></td>' +
        '<td class="cell-stack"' + rs + '><a>' + esc(r.sku) + '</a><div class="sub">状态：' + esc(r.skuStatus) + '</div>' +
          '<div class="sub">平均总日销：' + (r.avgDailySales == null ? '-' : r.avgDailySales) + '</div>' +
          '<div class="sub">近一个月销量：' + num(r.lastMonthSales) + '</div>' +
          '<div>建议下单：' + num(r.suggestOrderNum) + ' ' + lockIcon + '</div>' +
          '<div class="sub">预计消耗天数：' + num(r.consumeDay) + '</div>' +
          (mine ? '<div class="sub">我负责</div>' : '') + lockTip + '</td>' +
        '<td class="cell-stack"' + rs + '>' + fittings + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (clc || '-') + '</td>' +
        '<td' + rs + '>' + (r.initMaterialRemainAmount == null ? '-' : (r.initMaterialRemainAmount + ' ' + (r.currency || ''))) + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (consumeView || '-') + '</td>' +
        '<td class="cell-stack"' + rs + '>' + (infoView || '-') + '</td>' +
        '<td' + rs + '>' + (r.totalMaterialMoney == null ? '-' : (r.totalMaterialMoney + ' ' + (r.currency || ''))) + '</td>' +
        '<td' + rs + '><a data-act="open-chart" data-mid="' + m.serialNo + '" data-id="' + r.id + '">📈</a></td>' +
        '<td' + rs + '>' + displayDays(r.deliveryTime) + edit('deliveryTime', '下单后最快交付时间') + '</td>' +
        '<td' + rs + '>' + num(r.finalOrderNum) + edit('finalOrderNum', '最终下单数量') + '</td>' +
        '<td' + rs + '>' + num(r.finalScrapAmount) + edit('finalScrapAmount', '最终报废金额') + '</td>' +
        '<td' + rs + '>' + esc(r.finalScrapAmountReason || '-') + edit('finalScrapAmountReason', '原因') + '</td>'
      ) : '';
      return '<tr>' + skuCells +
        '<td class="cell-stack">' + esc(r.planUser) + ownerTip + ownerAct + '</td>' +
        '<td>' + esc(r.conclusion || '-') + editConc + '</td>' +
        '<td class="cell-stack">' + esc(r.msku) + '<div class="sub">店铺：' + esc(r.mskuShop) + '</div><div class="sub">状态：' + esc(r.mskuStatus) + '</div></td>' +
        '<td class="cell-stack"><div>' + num(r.totalStock) + ' / ' + num(r.innerStock) + '</div><div>' + num(r.overseasStock) + ' / ' + num(r.buyingOnWay) + '</div></td>' +
        '<td>' + (r.mskuAvgDailySales == null ? '-' : r.mskuAvgDailySales) + '</td>' +
        '<td class="cell-stack"><div>' + num(r.surplus) + '</div><div>' + esc(r.money) + '</div></td>' +
        '<td class="cell-stack"><div>' + esc(r.overseasSalesDate) + '</div><div>' + esc(r.finishProductSalesDate) + '</div><div>' + esc(r.prepareMaterialsSalesDate) + '</div></td>' +
        '<td class="left"><a data-act="toast" data-msg="已跳转销售 Forecast（原型占位）">查看forecast</a><br><a data-act="open-mat-log" data-no="' + m.serialNo + '">日志</a></td></tr>';
    }).join('');
    var oRel = m.eomNo ? findOrder(m.eomNo) : null;
    var canPageConfirm = oRel && canShowMaterialConfirm(oRel);
    var importBlock = !canImportMaterial(m) && m.eomNo;
    var footer = '<div class="footer-bar">' +
      (pageMode ? '<button class="btn" data-act="go" data-page="materials">关闭</button>' : '') +
      (m.status !== 4 ? '<button class="btn" data-act="reclc" data-no="' + m.serialNo + '">重新核料</button>' : '') +
      (m.eomNo ? '<button class="btn" data-act="export-mat" data-no="' + m.serialNo + '">导出核料结论</button>' : '') +
      (importBlock ? '<button class="btn" data-act="import-mat" data-no="' + m.serialNo + '">导入核料结论</button>' : '') +
      (canPageConfirm ? '<button class="btn btn-primary" data-act="sku-confirm" data-no="' + m.serialNo + '">确认所选 SKU</button>' : '') +
      '</div>';
    var banner = '';
    if (m.status === 2) banner = '<div class="alert danger" style="margin-top:12px">计算失败不得显示为成功，不可进入方案决策。可点「重新核料」。</div>';
    else if (m.status === 4) banner = '<div class="alert success" style="margin-top:12px">已定版：建议下单、EOM 配件、计划字段只读。全部 SKU 已确认。</div>';
    else if (prog) banner = '<div class="alert" style="margin-top:12px">数量/金额/原因按 8 位 SKU 一份；计划负责人、结论按 MSKU 各填。勾选 SKU 后确认，该 SKU 下任一 MSKU 结论为空会提醒。导入只用于快录。当前 ' + esc(prog.text) + '。</div>';
    return '<div class="page-title"><span>核料信息<span class="page-sub">' + (pageMode ? '' : '来自工单 ' + esc(m.eomNo || '')) + (prog ? '　' + esc(prog.text) : '') + '</span></span>' +
      '<div><span class="icon-btn" data-act="share-mat" data-no="' + m.serialNo + '">分享</span></div></div>' +
      '<div class="detail-head">' +
        '<div><label>核料流水号</label><b>' + (pageMode ? m.serialNo : '<a data-act="open-material" data-no="' + m.serialNo + '">' + m.serialNo + '</a>') + '</b></div>' +
        '<div><label>核料申请人</label><b>' + esc(m.initiatorName) + '</b></div>' +
        '<div><label>最新核料时间</label><b>' + esc(m.latestReviewTime || '-') + '</b></div>' +
        '<div><label>状态</label>' + tag(st[0], st[1]) + '</div>' +
        '<div><label>核料计算状态</label><b>' + esc(m.clcStatus || '-') + '</b></div>' +
        '<div><label>EOM流水号</label>' + (m.eomNo ? '<a data-act="open-order" data-no="' + m.eomNo + '">' + m.eomNo + '</a>' : '-') + '</div>' +
        (prog ? '<div><label>计划确认进度</label><b>' + esc(prog.text) + '</b></div>' : '') +
      '</div>' + banner +
      '<div class="filter-bar" style="margin-top:12px">' +
        '<input class="input" placeholder="店铺" /><input class="input" placeholder="部门" /><input class="input" placeholder="model" /><input class="input" placeholder="sku" />' +
        '<button class="btn btn-primary" data-act="toast" data-msg="已按当前核料单明细筛选">搜索</button></div>' +
      '<div class="table-wrap"><table style="min-width:3280px"><thead><tr>' +
        '<th class="sku-check-cell">' + (canPageConfirm ? '<input type="checkbox" data-act="sku-pick-all" title="全选我负责且未确认的 SKU" />' : '') + '</th>' +
        '<th>model</th><th>sku</th><th>同步EOM配件</th><th>同步EOM配件（参与计算）</th><th>初始物料结余金额</th><th>物料消耗</th><th>实际总物料结余</th><th>实际总物料金额</th>' +
        '<th>余料消耗图</th><th>下单后最快交付时间</th><th>最终下单数量</th><th>最终报废金额</th><th>原因</th><th>计划负责人</th><th>结论</th>' +
        '<th>msku</th><th>总库存/国内在库/<br>海外库存/采购在途</th><th>平均日销</th><th>EOM发起时DM结余数量<br>EOM发起时DM结余金额</th>' +
        '<th>理论海外库存售完日期<br>理论全流程成品库存售完日期<br>理论全流程库存备料售完日期</th><th>按钮</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' + footer;
  }

  function renderOrderDetail() {
    var o = findOrder(UI.orderNo);
    if (!o) { document.getElementById('detailDrawer').classList.remove('show'); return; }
    var m = materialOfOrder(o);
    var lg = LEGACY[o.legacyStatus] || ['-', 'gray'];
    document.getElementById('detailHeader').innerHTML =
      '<span class="drawer-title">EOM工单详情</span>' + tag(o.stage, STAGE_TAG[o.stage]) + tag(lg[0], lg[1]) +
      (o.exception ? tag(o.exception, 'red') : '') +
      '<span class="muted">' + o.no + '　' + esc(o.sceneLabel || '') + '</span>' +
      '<span class="drawer-close" data-act="close-drawer">×</span>';
    var tabs = ['overview', 'timeline', 'sku', 'material', 'execution', 'tasks', 'plans', 'logs'];
    var tabName = { overview: '概要', timeline: '流程时间轴', sku: 'SKU台账', material: '核料信息详情', execution: '执行跟踪', tasks: '节点任务', plans: '清库方案', logs: '操作日志' };
    if (tabs.indexOf(UI.detailTab) < 0) UI.detailTab = 'overview';
    var tabHtml = tabs.map(function (t) {
      return '<div class="tab' + (UI.detailTab === t ? ' active' : '') + '" data-act="detail-tab" data-tab="' + t + '">' + tabName[t] + '</div>';
    }).join('');
    document.getElementById('detailBody').innerHTML =
      '<div class="detail-head">' +
        '<div><label>退市类型</label><b>' + esc(o.type) + '</b></div><div><label>业务单元</label><b>' + esc(o.bu) + '</b></div>' +
        '<div><label>发起人</label><b>' + esc(o.user) + '</b></div><div><label>发起时间</label><b>' + esc(o.time) + '</b></div>' +
        '<div><label>预计EOL</label><b>' + esc(o.eol) + '</b></div><div><label>当前责任人</label><b>' + esc(o.owner) + '</b></div>' +
        '<div><label>Model / SKU数</label><b>' + esc(o.scope) + '</b></div><div><label>清库进度</label><b>' + (o.stock || 0) + '%</b></div>' +
        '<div><label>专用料关闭率</label><b>' + (o.materialClose || 0) + '%</b></div>' +
        '<div><label>核料单号</label>' + (o.materialNo ? '<a data-act="open-material" data-no="' + o.materialNo + '">' + o.materialNo + '</a>' : '-') + '</div>' +
        '<div><label>EOM方案</label>' + (o.fileName ? '<a>' + esc(o.fileName) + '</a> / ' + esc(o.planVersion) : esc(o.planVersion || '-')) + '</div>' +
        '<div><label>抄送人员</label><b>' + esc(o.cc) + '</b></div>' +
      '</div><div class="tabs">' + tabHtml + '</div><div id="detailPanel">' + renderDetailPanel(o, m) + '</div>';
  }
  function renderDetailPanel(o, m) {
    var t = UI.detailTab;
    if (t === 'overview') {
      return '<div class="alert">现网工单「确认」跳转核料页按 SKU 勾选确认。数量/金额/原因按 SKU；计划负责人、结论按 MSKU。不是业务完结。</div>' +
        '<div class="check-summary">' +
          '<div class="check-card"><span class="check-mark">✓</span><div><b>流程状态（现网）</b><p class="muted">' + (LEGACY[o.legacyStatus] || [])[0] + ' → 2.0 阶段 ' + o.stage + '</p></div></div>' +
          '<div class="check-card"><span class="check-mark">✓</span><div><b>核料协同</b><p class="muted">' + (m ? (MAT_STATUS[m.status][0] + '　' + (m.clcStatus || '') + (o.stage === '核料中' ? '　' + confirmProgress(m).text : '')) : '未关联核料单') + '</p></div></div>' +
          '<div class="check-card"><span class="check-mark' + (o.exception ? ' bad' : '') + '">' + (o.exception ? '!' : '✓') + '</span><div><b>异常标识</b><p class="muted">' + (o.exception || '无') + '</p></div></div>' +
        '</div>';
    }
    if (t === 'timeline') {
      return '<div class="timeline">' + (o.timeline || []).map(function (x) {
        return '<div class="timeline-item ' + (x.done ? 'done' : '') + (x.fail ? ' fail' : '') + '"><span class="timeline-dot"></span>' +
          '<div class="timeline-title">' + esc(x.title) + '</div><div class="timeline-meta"><span>' + esc(x.meta) + '</span></div>' +
          '<div class="timeline-content">' + esc(x.content) + '</div></div>';
      }).join('') + '</div>';
    }
    if (t === 'sku') {
      var rows = (o.skus || []).map(function (s) {
        return '<tr><td>' + esc(s.model) + '</td><td>' + esc(s.sku) + '</td><td>' + tag(s.status, 'blue') + '</td><td>' + esc(s.newSku) + '</td>' +
          '<td>' + num(s.lbQty) + ' / ' + esc(s.lbStatus) + '</td><td>' + num(s.stock) + '</td><td>' + num(s.stale) + '</td>' +
          '<td>' + (s.specialQty || 0) + '项 / ' + money(s.specialAmt) + '</td><td>' + num(s.m3) + ' / ' + num(s.m2) + ' / ' + num(s.m1) + '</td>' +
          '<td>' + num(s.eolForecast) + '</td><td>' + (s.dos || '-') + '天</td><td>' + (s.clearPct || 0) + '%</td></tr>';
      }).join('');
      return '<div class="table-wrap"><table style="min-width:1600px"><thead><tr><th>Model</th><th>SKU</th><th>产品状态</th><th>新品SKU</th><th>LB数量/状态</th><th>当前库存</th><th>呆滞库存</th><th>专用料</th><th>M-3/M-2/M-1</th><th>EOL前预测</th><th>PSI DOS</th><th>清库进度</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    if (t === 'material') {
      if (!m) return '<div class="alert warning">尚未关联核料单。<button class="btn btn-primary" data-act="create-material-for" data-no="' + o.no + '">创建核料单</button></div>';
      return renderMaterialHtml(m, false);
    }
    if (t === 'execution') {
      var ex = o.execution;
      if (!ex) return '<div class="empty">正式 EOM 前不展示三路执行。当前阶段：' + esc(o.stage) + '</div>';
      var eol = ex.eol || {};
      return '<div class="alert">正式 EOM 后，销售清成品、采购跟踪 Last Buy、PMC 清专用料并行；反 EOM 执行中不得 EOL。</div>' +
        '<div class="cards" style="grid-template-columns:repeat(3,1fr)">' +
          execCard('销售 · 成品清库', ex.fg, [['基准库存', ex.fg.base + '台'], ['当前库存', ex.fg.current + '台'], ['清库进度', ex.fg.pct + '%'], ['PSI DOS', ex.fg.dos + '天']]) +
          execCard('采购 · Last Buy', ex.lb, [['计划时间', ex.lb.planTime], ['下单时间', ex.lb.orderTime], ['完成时间', ex.lb.doneTime], ['数量进度', ex.lb.qty]]) +
          execCard('PMC · 专用料清理', ex.pmc, [['专用料', ex.pmc.items + '项'], ['专用料金额', money(ex.pmc.amount)], ['处理方式', ex.pmc.way], ['完成条件', '数量为0']]) +
        '</div>' +
        '<div class="card" style="margin-top:12px"><div class="card-title"><span>EOL闭环条件</span>' + tag(eol.stock0 && eol.special0 && eol.lbDone && eol.noReverse ? '已满足' : '暂不满足', eol.stock0 && eol.special0 && eol.lbDone && eol.noReverse ? 'green' : 'orange') + '</div>' +
        '<div class="check-summary">' +
          cond(eol.stock0, '成品库存为0', '当前 ' + (ex.fg.current || 0) + ' 台') +
          cond(eol.special0, '专用料数量为0', '当前剩余 ' + (ex.pmc.items || 0) + ' 项') +
          cond(eol.lbDone, 'Last Buy及在途完成', esc(ex.lb.status)) +
          cond(eol.noReverse, '无执行中反EOM', o.reverse ? '反EOM执行中' : '当前无反EOM记录') +
        '</div></div>';
    }
    if (t === 'tasks') {
      var rows = (o.tasks || []).map(function (tk) {
        var op = (tk.status === '待处理' || tk.status === '处理中') ? '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">处理</a>' : '<a data-act="handle-task" data-no="' + o.no + '" data-tid="' + tk.id + '">查看</a>';
        return '<tr><td>' + esc(tk.node) + '</td><td>' + esc(tk.name) + '</td><td>' + esc(tk.role) + '</td><td>' + esc(tk.owner) + '</td>' +
          '<td>' + esc(tk.due) + '</td><td>' + esc(tk.doneAt || '-') + '</td><td>' + tag(tk.status, TASK_TAG[tk.status]) + '</td>' +
          '<td class="left">' + esc(tk.result || '-') + '</td><td>' + op + '</td></tr>';
      }).join('');
      return '<div class="alert">正式 EOM 前串行交接；正式 EOM 后三类清尾并行。核料任务进入现网核料信息详情，不走通用表单。</div>' +
        '<div class="table-wrap"><table><thead><tr><th>节点</th><th>任务</th><th>责任角色</th><th>责任人</th><th>截止时间</th><th>完成时间</th><th>状态</th><th>结果</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    if (t === 'plans') {
      var plans = (o.plans || []).map(function (p) {
        return '<div class="plan-version"><div class="head"><b>' + esc(p.version) + '</b>' + tag(p.status, p.status === '生效中' ? 'green' : (p.status === '待OA' || p.status === '待会签') ? 'orange' : 'gray') +
          (p.status === '待会签' ? ' <button class="btn" data-act="sign-plan" data-no="' + o.no + '" data-ver="' + esc(p.version) + '">会签通过</button>' : '') + '</div>' +
          '<p>' + esc(p.content) + '</p><p>Last Buy：' + num(p.lbQty) + '　成品报废：' + money(p.scrapFg) + '　物料报废：' + money(p.scrapMat) + '</p>' +
          '<p class="muted">原因：' + esc(p.reason) + '　决策人：' + esc(p.decisionBy) + '　' + esc(p.at) + '</p></div>';
      }).join('') || '<div class="empty">暂无方案</div>';
      var oa = o.oa ? '<div class="alert warning">成品报废 ' + money(o.oa.fg) + '，物料报废 ' + money(o.oa.mat) + '，' + o.oa.no + ' ' + o.oa.status + '。审批返回前方案不得正式生效。' +
        (o.oa.status === '审批中' ? ' <button class="btn" data-act="oa-pass" data-no="' + o.no + '">模拟OA通过</button>' : '') + '</div>' : '';
      return '<div class="toolbar"><button class="btn btn-primary" data-act="new-plan" data-no="' + o.no + '">新增方案版本</button>' +
        '<button class="btn" data-act="open-reverse" data-no="' + o.no + '">发起反EOM</button></div>' + oa +
        '<div class="split"><div>' + plans + '</div><div class="card"><div class="card-title">方案决策摘要</div>' +
        '<div class="config-row"><b>当前版本</b><span>' + esc(o.planVersion) + '</span></div>' +
        '<div class="config-row"><b>反EOM</b><span>' + (o.reverse ? ('执行中 / 追加' + o.reverse.qty) : '无') + '</span></div></div></div>';
    }
    if (t === 'logs') {
      var rows = (o.logs || []).map(function (l) {
        return '<tr><td>' + esc(l.time) + '</td><td>' + esc(l.user) + '</td><td>' + esc(l.action) + '</td><td class="left">' + esc(l.content) + '</td></tr>';
      }).join('');
      return '<div class="table-wrap"><table><thead><tr><th>时间</th><th>操作人</th><th>操作</th><th class="left">变更内容</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    return '';
  }
  function execCard(title, block, rows) {
    return '<div class="card"><div class="card-title"><span>' + title + '</span>' + tag(block.status, 'blue') + '</div>' +
      rows.map(function (r) { return '<div class="config-row"><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div>';
  }
  function cond(ok, title, sub) {
    return '<div class="check-card"><span class="check-mark' + (ok ? '' : ' warn') + '">' + (ok ? '✓' : '○') + '</span><div><b>' + title + '</b><p class="muted">' + esc(sub) + '</p></div></div>';
  }

  function closeDrawer() {
    UI.orderNo = '';
    location.hash = 'orders';
    document.getElementById('detailDrawer').classList.remove('show');
    setActivePage('orders');
    renderOrders();
  }

  function openForm(title, body, footer, wide) {
    document.getElementById('formTitle').textContent = title;
    document.getElementById('formBody').innerHTML = body;
    document.getElementById('formFooter').innerHTML = footer;
    document.getElementById('formDialog').className = 'dialog' + (wide === 'xl' ? ' xl' : wide ? ' lg' : '');
    document.getElementById('formMask').classList.add('show');
  }
  function closeMask(id) { document.getElementById(id).classList.remove('show'); }

  function handleTask(no, tid) {
    var o = findOrder(no);
    var tk = (o.tasks || []).find(function (t) { return t.id === tid; });
    if (!tk) return;
    if (tk.kind === 'material') {
      if (!o.materialNo) { createMaterialFor(o.no); return; }
      UI.detailTab = 'material';
      go('order', o.no);
      toast('已打开工单内的核料信息详情，也可点核料单号进入独立页面', 'success');
      return;
    }
    if (tk.kind === 'forecast') return openForecast(o, tk);
    UI.form = { type: 'task', no: no, tid: tid };
    openForm('处理节点任务',
      '<div class="detail-head" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"><div><label>任务</label><b>' + esc(tk.name) + '</b></div><div><label>当前处理人</label><b>' + esc(tk.owner) + '</b></div><div><label>处理要求</label><b>' + esc(tk.notice) + '</b></div></div>' +
      '<div class="alert">' + esc(tk.notice) + '</div>' +
      '<div class="form-grid" style="grid-template-columns:1fr 1fr">' +
        '<div class="form-item"><label class="form-label required">处理状态</label><div class="form-control"><select class="select" id="tkStatus"><option>处理中</option><option>已完成</option><option>已驳回</option><option>已转交</option></select></div></div>' +
        '<div class="form-item"><label class="form-label">本次更新时间</label><div class="form-control"><input type="date" class="input" id="tkDate" value="' + today() + '" /></div></div>' +
        '<div class="form-item full"><label class="form-label required">处理结果</label><div class="form-control"><textarea class="textarea" id="tkResult">' + esc(tk.result || '') + '</textarea></div></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-task">保存</button>'
    );
    document.getElementById('tkStatus').value = tk.status === '待处理' ? '处理中' : tk.status;
  }
  function saveTask() {
    var ctx = UI.form;
    var o = findOrder(ctx.no);
    var tk = o.tasks.find(function (t) { return t.id === ctx.tid; });
    tk.status = document.getElementById('tkStatus').value;
    tk.result = document.getElementById('tkResult').value;
    if (tk.status === '已驳回') {
      if (!(tk.result || '').trim()) { toast('驳回必须填写原因', 'warning'); return; }
      addLog(o, '节点驳回', tk.name + '：' + tk.result + '。工单阶段仍为「' + o.stage + '」；不允许核料中退回启动 EOM');
      persist();
      closeMask('formMask');
      toast('任务已驳回，工单阶段不变', 'warning');
      go('order', o.no);
      return;
    }
    if (tk.status === '已完成') tk.doneAt = nowStr().slice(5, 16);
    addLog(o, '完成任务', tk.name + ' → ' + tk.status + '：' + tk.result);
    persist();
    closeMask('formMask');
    toast('任务已保存', 'success');
    go('order', o.no);
  }
  function openForecast(o, tk) {
    var f = o.forecast || { current: 0, m3: 0, m2: 0, m1: 0, stock: 0, dos: 0, acceptLb: '', missing: false };
    UI.form = { type: 'forecast', no: o.no, tid: tk.id };
    openForm('刷新销售预测',
      (f.missing ? '<div class="alert danger">当前有效预测缺失。提交空值将保持数据异常，不得带入方案决策。</div>' : '<div class="alert">提交后保存预测版本和提交时间，并通知需求计划发起核料。</div>') +
      '<div class="detail-head" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">' +
        '<div><label>当前有效预测</label><b>' + num(f.current) + '</b></div><div><label>近三月销量</label><b>' + [f.m3, f.m2, f.m1].map(num).join(' / ') + '</b></div>' +
        '<div><label>当前库存 / PSI DOS</label><b>' + num(f.stock) + ' / ' + f.dos + '天</b></div></div>' +
      '<div class="form-item"><label class="form-label">可接受Last Buy数量</label><div class="form-control"><input class="input" id="acceptLb" value="' + esc(f.acceptLb) + '" placeholder="如 1100-1300" /></div></div>' +
      '<div class="form-item" style="margin-top:12px"><label class="form-label">预测数量</label><div class="form-control"><input class="input" id="fcVal" type="number" value="' + (f.current || '') + '" /></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-forecast">提交预测</button>'
    );
  }
  function saveForecast() {
    var o = findOrder(UI.form.no);
    var val = Number(document.getElementById('fcVal').value || 0);
    var lb = document.getElementById('acceptLb').value.trim();
    o.forecast = o.forecast || {};
    o.forecast.current = val;
    o.forecast.acceptLb = lb;
    o.forecast.submittedAt = nowStr();
    o.forecast.version = (o.forecast.version || 0) + 1;
    o.forecast.missing = !val;
    var tk = o.tasks.find(function (t) { return t.id === UI.form.tid; });
    if (val) {
      o.exception = o.exception === '数据异常' ? '' : o.exception;
      tk.status = '已完成'; tk.doneAt = nowStr().slice(5, 16); tk.result = '可接受LB ' + lb;
      if (o.stage === '启动 EOM') {
        o.stage = '核料中';
        o.owner = '比杰（需求计划）';
        if (!(o.tasks || []).some(function (t) { return t.kind === 'material'; })) {
          o.tasks.push({ id: 't' + Date.now(), node: '核料', name: '完成核料并确认责任', role: '需求计划', owner: '比杰', due: today(), status: '待处理', kind: 'material', notice: '定版后通知方案确认角色', result: '', doneAt: '' });
        }
        var mat = materialOfOrder(o);
        if (mat && mat.status === 3) { mat.status = 1; mat.clcStatus = '计算成功'; mat.latestReviewTime = nowStr(); }
      }
      addLog(o, '完成任务', '已刷新预测，版本 V' + o.forecast.version);
      toast('预测已提交，已通知需求计划核料', 'success');
    } else {
      o.exception = '数据异常';
      tk.status = '处理中'; tk.result = '预测仍缺失';
      addLog(o, '数据异常', '预测提交为空，不得带入方案决策');
      toast('预测仍缺失，工单保持数据异常', 'warning');
    }
    persist();
    closeMask('formMask');
    go('order', o.no);
  }

  function findDetail(mid, id) {
    var m = findMaterial(mid);
    return m && (m.details || []).find(function (d) { return d.id === id; });
  }
  function toggleLock(mid, id) {
    var m = findMaterial(mid);
    if (m.status === 4) { toast('定版后不可调整锁定', 'warning'); return; }
    var d = findDetail(mid, id);
    applySkuPatch(m, d.sku, { lockFlag: !d.lockFlag });
    persist(); toast(d.lockFlag ? '已锁定建议下单' : '已解锁建议下单', 'success'); renderAll();
  }
  function openChart(mid, id) {
    var m = findMaterial(mid);
    var d = findDetail(mid, id);
    UI.form = { type: 'chart', mid: mid, id: id };
    var bars = '';
    for (var i = 0; i < 8; i++) bars += '<i style="height:' + (30 + i * 8 + (d.suggestOrderNum % 17)) + '%"></i>';
    openForm('建议下单与余料金额关系',
      '<div>建议下单数量：<input class="input" id="sugNum" type="number" value="' + d.suggestOrderNum + '" />　<span class="muted">' + today() + '</span></div>' +
      '<div class="chart-mini" style="margin-top:16px">' + bars + '</div><p class="muted" style="margin-top:8px">横轴：下单数量　纵轴：余料金额比例（原型示意）</p>' +
      (m.status === 4 ? '<div class="alert">定版后只读</div>' : ''),
      m.status === 4
        ? '<button class="btn" data-act="close-mask" data-mask="formMask">关闭</button>'
        : '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn" data-act="save-chart" data-lock="0">确定</button><button class="btn btn-primary" data-act="save-chart" data-lock="1">确定并锁定</button>'
    );
  }
  function saveChart(lock) {
    var d = findDetail(UI.form.mid, UI.form.id);
    d.suggestOrderNum = Number(document.getElementById('sugNum').value || 0);
    if (lock === '1') d.lockFlag = true;
    syncSuggestToOrder(UI.form.mid);
    persist(); closeMask('formMask'); toast('建议下单已更新', 'success'); renderAll();
  }
  function syncSuggestToOrder(mid) {
    var m = findMaterial(mid);
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (!o) return;
    (m.details || []).forEach(function (d) {
      var sku = (o.skus || []).find(function (s) { return s.sku === d.sku; });
      if (sku) sku.lbQty = d.finalOrderNum || d.suggestOrderNum;
    });
  }
  function openFitting(mid, id) {
    var m = findMaterial(mid);
    if (m.status === 4) { toast('定版后不可编辑配件', 'warning'); return; }
    var d = findDetail(mid, id);
    var opts = Array.from(new Set((d.eomFittings || []).concat(['H-AD-X1', 'H-AD-X2'])));
    UI.form = { type: 'fitting', mid: mid, id: id };
    openForm('同步EOM配件',
      '<div class="form-item"><label class="form-label required">配件</label><div class="form-control" id="fitBox">' +
        opts.map(function (x) {
          var on = (d.clcEomFittings || []).indexOf(x) >= 0;
          return '<label class="radio"><input type="checkbox" class="fit-ck" value="' + esc(x) + '"' + (on ? ' checked' : '') + ' />' + esc(x) + '</label>';
        }).join('') + '</div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-fitting">确定</button>'
    );
  }
  function saveFitting() {
    var d = findDetail(UI.form.mid, UI.form.id);
    d.clcEomFittings = Array.prototype.map.call(document.querySelectorAll('.fit-ck:checked'), function (c) { return c.value; });
    persist(); closeMask('formMask'); toast('参与计算配件已更新', 'success'); renderAll();
  }
  function openField(mid, id, field, label) {
    var m = findMaterial(mid);
    var d = findDetail(mid, id);
    var ok = field === 'conclusion' ? canEditConclusion(m, d) : canEditSkuLevel(m, d);
    if (!ok) { toast(m.status === 4 ? '定版后不可编辑' : (field === '结论' || field === 'conclusion' ? '只能编辑我负责的 MSKU 结论' : '只能编辑我负责且尚未确认的 SKU'), 'warning'); return; }
    UI.form = { type: 'field', mid: mid, id: id, field: field, sku: d.sku, msku: d.msku };
    var ctrl;
    if (field === 'conclusion') ctrl = '<select class="select" id="fVal">' + CONCLUSIONS.map(function (x) { return '<option' + (d[field] === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
    else if (field === 'finalScrapAmountReason') ctrl = '<select class="select" id="fVal"><option value="">-</option>' + REASONS.map(function (x) { return '<option' + (d[field] === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
    else if (field === 'deliveryTime') ctrl = '<input class="input" id="fVal" type="number" min="0" step="1" placeholder="天数" value="' + (d[field] === '-' || d[field] == null ? '' : d[field]) + '" />';
    else ctrl = '<input class="input" id="fVal" type="number" value="' + (d[field] === '' || d[field] == null ? '' : d[field]) + '" />';
    var tip = field === 'conclusion'
      ? '结论按 MSKU 一份，只改当前 ' + esc(d.msku || d.sku) + '。'
      : '同一 SKU 多店铺共用这一份数量/金额/原因/交付天数。';
    openForm('编辑' + label + (field === 'conclusion' ? '（MSKU ' + d.msku + '）' : '（SKU ' + d.sku + '）'), '<div class="alert">' + tip + '</div><div class="form-item"><label class="form-label">' + esc(label) + '</label><div class="form-control">' + ctrl + '</div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-field">确定</button>', false);
  }
  function saveField() {
    var m = findMaterial(UI.form.mid);
    var sku = UI.form.sku;
    var v = document.getElementById('fVal').value;
    var patch = {};
    if (UI.form.field === 'finalOrderNum' || UI.form.field === 'finalScrapAmount' || UI.form.field === 'deliveryTime') {
      if (v === '') { toast('请填写数值', 'warning'); return; }
      patch[UI.form.field] = Number(v);
    } else patch[UI.form.field] = v;
    if (UI.form.field === 'conclusion') {
      applyRowPatch(m, UI.form.id, patch);
      persist(); closeMask('formMask'); toast('已按 MSKU ' + (UI.form.msku || '') + ' 保存结论', 'success'); renderAll();
      return;
    }
    applySkuPatch(m, sku, patch);
    syncSuggestToOrder(UI.form.mid);
    persist(); closeMask('formMask'); toast('已按 SKU ' + sku + ' 保存', 'success'); renderAll();
  }
  function reclc(no) {
    var m = findMaterial(no);
    if (m.status === 4) { toast('定版后不可重新核料', 'warning'); return; }
    m.status = 1;
    m.clcStatus = '计算成功';
    m.latestReviewTime = nowStr();
    (m.details || []).forEach(function (d) {
      if (!d.lockFlag && d.suggestOrderNum) d.suggestOrderNum = Math.round(d.suggestOrderNum * 1.02);
    });
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o && o.exception === '数据异常' && (o.sceneKey === 'S4' || m.clcStatus === '计算成功')) {
      o.exception = '';
      addLog(o, '重新核料', '计算已恢复成功');
    }
    persist(); toast('已重新核料', 'success'); renderAll();
  }
  function finalize(no, fromAuto) {
    var m = findMaterial(no);
    if (m.status !== 1) { toast('仅核料中且计算成功可定版', 'warning'); return; }
    if ((m.clcStatus || '').indexOf('失败') >= 0) { toast('计算失败不得定版', 'warning'); return; }
    var p = confirmProgress(m);
    if (!fromAuto && p.total && p.done < p.total) { toast('需全部 SKU 确认后自动定版，当前 ' + p.text, 'warning'); return; }
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o && o.forecast && o.forecast.missing) { toast('预测缺失，不得定版进入方案决策', 'warning'); return; }
    m.status = 4;
    m.finalizeTime = nowStr();
    if (o) {
      o.stage = '待方案决策';
      o.owner = '王天天 / 计划 / PMC / 采购 / 销售';
      if (o.exception === '已驳回') o.exception = '';
      (o.tasks || []).forEach(function (t) { if (t.kind === 'material' && t.status !== '已完成') { t.status = '已完成'; t.doneAt = nowStr().slice(5, 16); t.result = '核料定版'; } });
      if (!(o.tasks || []).some(function (t) { return t.kind === 'plan'; })) {
        o.tasks.push({ id: 'tp' + Date.now(), node: '方案确认', name: '确认清库及Last Buy方案', role: 'GTM/计划/PMC/采购/销售', owner: '王天天', due: today(), status: '待处理', kind: 'plan', notice: '全部确认后进入EOM执行', result: '', doneAt: '' });
      }
      addLog(o, '核料定版', '本单全部 SKU 已确认，关联核料单 ' + m.serialNo);
    }
    persist(); toast('全部 SKU 已确认，核料已定版，工单进入待方案决策', 'success'); renderAll();
  }
  function shareMat(no) {
    UI.form = { type: 'share', no: no };
    openForm('分享核料信息', '<div class="alert">是否确认将当前核料信息分享给其他人</div><input class="input input-wide" id="shareTo" placeholder="输入人员姓名" value="刘洋、张敏" />',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-share">确认分享</button>');
  }

  function createMaterial() {
    var opts = STATE.catalog.map(function (c) { return '<option>' + c.model + '</option>'; }).join('');
    UI.form = { type: 'new-mat' };
    openForm('发起核料', '<div class="form-item"><label class="form-label required">选择Model</label><div class="form-control"><select class="select" id="nmModel">' + opts + '</select></div></div><p class="muted">将按 Model→SKU→MSKU 生成核料草稿，提交后进入核料中。</p>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn" data-act="save-new-mat" data-submit="0">保存草稿</button><button class="btn btn-primary" data-act="save-new-mat" data-submit="1">提交核料</button>');
  }
  function saveNewMat(submit) {
    var model = document.getElementById('nmModel').value;
    var cat = STATE.catalog.find(function (c) { return c.model === model; });
    var serial = nextNo('HL', 'hl');
    var details = (cat.skus || []).map(function (s, i) {
      return {
        id: 'n' + Date.now() + i, model: model, modelStatus: s.status, sku: s.sku, skuStatus: s.status,
        avgDailySales: 5, lastMonthSales: s.sales || 0, suggestOrderNum: 0, lockFlag: false, consumeDay: 0,
        eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [],
        totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-',
        planUser: defaultPlanForSku(s.sku).name, planUserSource: defaultPlanForSku(s.sku).source, skuLocked: false, conclusion: '-', msku: s.msku, mskuShop: s.shop, mskuStatus: s.status,
        totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY',
        overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-'
      };
    });
    STATE.materials.unshift({ serialNo: serial, eomNo: '', initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: submit ? 1 : 3, clcStatus: submit ? '计算成功' : '-', latestReviewTime: submit ? nowStr() : '', finalizeTime: '', confirmFlags: {}, details: details });
    persist(); closeMask('formMask'); toast(submit ? '核料已提交计算' : '核料草稿已保存', 'success'); go('material', serial);
  }
  function createMaterialFor(orderNo) {
    var o = findOrder(orderNo);
    var serial = nextNo('HL', 'hl');
    var details = (o.products || []).map(function (p, i) {
      return {
        id: 'l' + Date.now() + i, model: p.model, modelStatus: p.status, sku: p.sku, skuStatus: p.status,
        avgDailySales: 8, lastMonthSales: 120, suggestOrderNum: 0, lockFlag: false, consumeDay: 30,
        eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [],
        totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-',
        planUser: defaultPlanForSku(p.sku).name, planUserSource: defaultPlanForSku(p.sku).source, skuLocked: false, conclusion: '-', msku: p.msku, mskuShop: 'Amazon US', mskuStatus: p.status,
        totalStock: 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY',
        overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-'
      };
    });
    STATE.materials.unshift({ serialNo: serial, eomNo: o.no, initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: 1, clcStatus: '计算成功', latestReviewTime: nowStr(), finalizeTime: '', confirmFlags: {}, details: details });
    o.materialNo = serial;
    addLog(o, '创建核料单', serial);
    persist(); toast('已创建核料单 ' + serial, 'success'); go('material', serial);
  }

  function matCsvHeader() {
    return ['EOM流水号', '核料流水号', '8位SKU', 'MSKU', '计划负责人', '下单后最快交付时间(天)', '最终下单数量', '最终报废金额', '原因', '结论'];
  }
  function skuCsvRow(m, d) {
    return [m.eomNo || '', m.serialNo, d.sku, d.msku || '', d.planUser || '', d.deliveryTime === '-' || d.deliveryTime == null ? '' : d.deliveryTime, d.finalOrderNum === '-' || d.finalOrderNum == null ? '' : d.finalOrderNum, d.finalScrapAmount === '-' || d.finalScrapAmount == null ? '' : d.finalScrapAmount, !d.finalScrapAmountReason || d.finalScrapAmountReason === '-' ? '' : d.finalScrapAmountReason, !d.conclusion || d.conclusion === '-' ? '' : d.conclusion];
  }
  function openExportMat(no) {
    var m = findMaterial(no);
    if (!m || !m.eomNo) { toast('仅支持按当前工单导出', 'warning'); return; }
    UI.form = { type: 'export-mat', no: no };
    openForm('导出核料结论',
      '<div class="alert">一次只导出当前工单 ' + esc(m.eomNo) + '。默认只出我负责的 MSKU（含部门负责人兜底）。勾选后可导出本单全部，他人行导入时会被跳过。结论按 MSKU；数量/金额/原因按 SKU。</div>' +
      '<label class="radio"><input type="checkbox" id="expAll" /> 导出本单全部明细（他人行只读对照）</label>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-export-mat">导出 CSV</button>');
  }
  function doExportMat() {
    var m = findMaterial(UI.form.no);
    var all = document.getElementById('expAll').checked;
    var rows = (m.details || []).filter(function (d) { return all || isMineSku(d); });
    if (!rows.length) { toast('没有可导出的明细', 'warning'); return; }
    exportCsv('核料结论-' + m.eomNo + '.csv', matCsvHeader(), rows.map(function (d) { return skuCsvRow(m, d); }));
    closeMask('formMask');
  }
  function normConclusion(v) {
    var s = String(v || '').replace(/\s/g, '');
    if (s === 'lastbuy后报废') return 'lastbuy 后报废';
    if (s === '不补单报废') return '不补单报废';
    return '';
  }
  function normReason(v) {
    var s = String(v || '').replace(/\s/g, '');
    var map = {
      'MOQ物料结余': 'MOQ 物料结余',
      '销售需求变化': '销售需求变化',
      '供应链需求外风险备料': '供应链需求外风险备料',
      '物料报废金额小于等于2万': '物料报废金额小于等于 2 万'
    };
    return map[s] || '';
  }
  function parseCsvText(text) {
    var lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var delim = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
    function split(line) {
      if (delim === '\t') return line.split('\t');
      var out = []; var cur = ''; var q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { q = !q; continue; }
        if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    }
    var header = split(lines[0]).map(function (h) { return h.trim(); });
    var idx = function (names) {
      for (var i = 0; i < names.length; i++) {
        var n = names[i];
        for (var j = 0; j < header.length; j++) if (header[j] === n) return j;
      }
      return -1;
    };
    var col = {
      eom: idx(['EOM流水号', 'eomNo']),
      hl: idx(['核料流水号', '核料单号']),
      sku: idx(['8位SKU', 'SKU', 'sku']),
      msku: idx(['MSKU', 'msku']),
      days: idx(['下单后最快交付时间(天)', '下单后最快交付时间', '交付时间']),
      qty: idx(['最终下单数量']),
      amt: idx(['最终报废金额']),
      reason: idx(['原因']),
      conc: idx(['结论'])
    };
    return lines.slice(1).map(function (line, i) {
      var c = split(line).map(function (x) { return String(x == null ? '' : x).trim(); });
      return {
        row: i + 2,
        eom: col.eom >= 0 ? c[col.eom] : '',
        hl: col.hl >= 0 ? c[col.hl] : '',
        sku: col.sku >= 0 ? c[col.sku] : '',
        msku: col.msku >= 0 ? c[col.msku] : '',
        days: col.days >= 0 ? c[col.days] : '',
        qty: col.qty >= 0 ? c[col.qty] : '',
        amt: col.amt >= 0 ? c[col.amt] : '',
        reason: col.reason >= 0 ? c[col.reason] : '',
        conc: col.conc >= 0 ? c[col.conc] : ''
      };
    });
  }
  function openImportMat(no) {
    var m = findMaterial(no);
    var err = canImportMaterial(m);
    if (err) { toast(err, 'warning'); return; }
    UI.form = { type: 'import-mat', no: no };
    var sample = [matCsvHeader().join(',')].concat(myDetailRows(m).map(function (d) { return skuCsvRow(m, d).join(','); })).join('\n');
    openForm('导入核料结论（仅当前工单）',
      '<div class="alert">一次只能导入 ' + esc(m.eomNo) + '。一行一个 MSKU。结论只写该 MSKU；数量/金额/原因按 SKU 覆盖。只覆盖我负责且未确认的行。</div>' +
      '<p class="muted">模板列：EOM流水号,核料流水号,8位SKU,MSKU,计划负责人,下单后最快交付时间(天),最终下单数量,最终报废金额,原因,结论</p>' +
      '<textarea class="textarea" id="impCsv" style="min-height:160px">' + esc(sample) + '</textarea>' +
      '<div style="margin-top:8px"><input type="file" id="impFile" accept=".csv,.txt" /></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="do-import-mat">导入</button>', 'xl');
    setTimeout(function () {
      var f = document.getElementById('impFile');
      if (!f) return;
      f.addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;
        if (/\.xlsx?$/i.test(file.name)) { toast('原型请用 CSV。正式环境再接 Excel。', 'warning'); return; }
        var reader = new FileReader();
        reader.onload = function () { document.getElementById('impCsv').value = reader.result; };
        reader.readAsText(file, 'utf-8');
      });
    }, 0);
  }
  function doImportMat() {
    var m = findMaterial(UI.form.no);
    var err = canImportMaterial(m);
    if (err) { toast(err, 'warning'); return; }
    var rows = parseCsvText(document.getElementById('impCsv').value);
    if (!rows.length) { toast('没有可导入的数据行', 'warning'); return; }
    var seen = {};
    var ok = 0; var skip = []; var fail = [];
    rows.forEach(function (r) {
      if (!r.sku) { fail.push('第' + r.row + '行：缺少 SKU'); return; }
      var skuRows = (m.details || []).filter(function (d) { return d.sku === r.sku; });
      if (!skuRows.length) { fail.push('第' + r.row + '行：SKU ' + r.sku + ' 不属于本工单'); return; }
      var hit;
      if (r.msku) hit = skuRows.filter(function (d) { return d.msku === r.msku; })[0];
      else if (skuRows.length === 1) hit = skuRows[0];
      else { fail.push('第' + r.row + '行：SKU ' + r.sku + ' 有多个 MSKU，请填写 MSKU'); return; }
      if (!hit) { fail.push('第' + r.row + '行：MSKU ' + r.msku + ' 不属于本工单'); return; }
      var key = hit.msku || hit.sku;
      if (seen[key]) { fail.push('第' + r.row + '行：' + key + ' 重复'); return; }
      seen[key] = 1;
      if (r.eom && r.eom !== m.eomNo) { fail.push('第' + r.row + '行：EOM流水号不是当前工单'); return; }
      if (r.hl && r.hl !== m.serialNo) { fail.push('第' + r.row + '行：核料流水号不是当前单'); return; }
      if (!isMineSku(hit)) { skip.push((hit.msku || r.sku) + '（负责人 ' + (hit.planUser || '-') + '）'); return; }
      if (hit.skuLocked) { fail.push('第' + r.row + '行：' + (hit.msku || r.sku) + ' 已确认锁定'); return; }
      var conc = normConclusion(r.conc);
      var reason = normReason(r.reason);
      if (r.conc && !conc) { fail.push('第' + r.row + '行：结论枚举无效'); return; }
      if (r.reason && !reason) { fail.push('第' + r.row + '行：原因枚举无效'); return; }
      if (r.days !== '' && isNaN(Number(r.days))) { fail.push('第' + r.row + '行：交付时间须为天数'); return; }
      var skuPatch = {};
      if (r.days !== '') skuPatch.deliveryTime = Number(r.days);
      if (r.qty !== '') skuPatch.finalOrderNum = Number(r.qty);
      if (r.amt !== '') skuPatch.finalScrapAmount = Number(r.amt);
      if (reason) skuPatch.finalScrapAmountReason = reason;
      if (Object.keys(skuPatch).length) applySkuPatch(m, r.sku, skuPatch);
      if (conc) applyRowPatch(m, hit.id, { conclusion: conc });
      ok += 1;
    });
    syncSuggestToOrder(m.serialNo);
    var o = findOrder(m.eomNo);
    if (o) addLog(o, '导入核料结论', STATE.currentUser.name + ' 成功 ' + ok + ' 行，跳过 ' + skip.length + '，失败 ' + fail.length);
    persist();
    closeMask('formMask');
    var msg = '导入完成：成功 ' + ok + ' 行（未自动确认）';
    if (skip.length) msg += '；跳过他人 ' + skip.join('、');
    if (fail.length) msg += '；失败 ' + fail.slice(0, 4).join('；') + (fail.length > 4 ? '…' : '');
    toast(msg, fail.length ? 'warning' : 'success');
    renderAll();
  }
  function assignPlanUser(mid, msku) {
    var name = prompt('将 ' + msku + ' 的计划负责人从部门负责人改为（模拟主数据维护）', '刘洋');
    if (name == null || !String(name).trim()) return;
    name = String(name).trim();
    if (!STATE.skuPlanOwners) STATE.skuPlanOwners = {};
    STATE.skuPlanOwners[msku] = name;
    var m = findMaterial(mid);
    refreshMaterialPlanUsers(m, { unlockOnRefresh: true });
    var o = m.eomNo ? findOrder(m.eomNo) : null;
    if (o) addLog(o, '刷新计划负责人', msku + ' 由主数据维护为 ' + name + '，不再用部门负责人兜底');
    persist(); toast(msku + ' 已刷新为 ' + name, 'success'); renderAll();
  }
  function jumpToMaterialConfirm(no) {
    var o = findOrder(no);
    var m = materialOfOrder(o);
    if (!m) { toast('尚未关联核料单', 'warning'); return; }
    if (!canShowMaterialConfirm(o)) { toast('当前身份不能确认该工单核料结论', 'warning'); return; }
    UI.highlightConfirm = true;
    go('material', m.serialNo);
    toast('请在核料页勾选 8 位 SKU 后点「确认所选 SKU」。页面可直接改数，导入只用于快录。', 'success');
  }
  function skuConfirm(mid) {
    var m = findMaterial(mid);
    var o = m && m.eomNo ? findOrder(m.eomNo) : null;
    if (!m || !o || !canShowMaterialConfirm(o)) { toast('当前不能确认', 'warning'); return; }
    var root = document.querySelector('#detailDrawer.show') || document.getElementById('page-material') || document;
    var picked = [];
    root.querySelectorAll('.sku-pick:checked').forEach(function (c) {
      if (c.getAttribute('data-mid') === mid) picked.push(c.getAttribute('data-sku'));
    });
    if (!picked.length) { toast('请先勾选要确认的 8 位 SKU', 'warning'); return; }
    var ready = [];
    var empty = [];
    var others = [];
    var locked = [];
    picked.forEach(function (sku) {
      var row = uniqueSkuRows(m.details).filter(function (d) { return d.sku === sku; })[0];
      if (!row) return;
      if (!skuHasMine(m, sku)) { others.push(sku); return; }
      if (row.skuLocked) { locked.push(sku); return; }
      var remind = skuEmptyRemind(m, sku);
      if (remind) empty.push(remind);
      else ready.push(sku);
    });
    if (!ready.length) {
      toast(empty.length ? empty.join('；') : (others.length ? '勾选的 SKU 不是我负责的' : '没有可确认的 SKU'), 'warning');
      return;
    }
    ready.forEach(function (sku) { applySkuPatch(m, sku, { skuLocked: true }); });
    syncConfirmFlags(m);
    var p = confirmProgress(m);
    addLog(o, '确认核料结论', STATE.currentUser.name + ' 确认 ' + ready.join('、') + '，' + p.text);
    persist();
    var extra = empty.length ? '；未确认：' + empty.join('；') : '';
    if (others.length) extra += '；已跳过他人 ' + others.join('、');
    if (p.done >= p.total && p.total > 0) finalize(m.serialNo, true);
    else { toast('已确认 ' + ready.join('、') + '。工单仍为核料中，' + p.text + extra, extra ? 'warning' : 'success'); renderAll(); }
  }
  function switchUser(id) {
    var u = (EomSeed.USERS || []).find(function (x) { return x.id === id; });
    if (!u) return;
    STATE.currentUser = { id: u.id, name: u.name, role: u.role };
    persist(); toast('当前身份：' + u.name + '（' + u.role + '）', 'success'); renderAll();
  }

  function planConfirm(no) {
    var o = findOrder(no);
    if (o.oa && o.oa.status === '审批中') { toast('OA 未返回，方案不得正式生效', 'warning'); return; }
    var mat = materialOfOrder(o);
    if (mat && mat.status !== 4) { toast('核料未定版，不能确认方案', 'warning'); return; }
    o.legacyStatus = 5;
    o.stage = 'EOM执行';
    o.confirmTime = nowStr();
    o.owner = '销售/采购/PMC';
    o.planVersion = o.planVersion && o.planVersion.indexOf('V') === 0 ? o.planVersion.replace('草稿', '').replace('待OA', '') : 'V1';
    (o.skus || []).forEach(function (s) { s.status = 'EOM'; });
    (o.tasks || []).forEach(function (t) { if (t.kind === 'plan') { t.status = '已完成'; t.doneAt = nowStr().slice(5, 16); } });
    ['clear', 'lb', 'pmc'].forEach(function (k, i) {
      var names = { clear: '执行成品清库', lb: '跟踪Last Buy', pmc: '清理专用物料' };
      var roles = { clear: ['销售', '周雨'], lb: ['采购', '张敏'], pmc: ['PMC', 'PMC组长'] };
      if (!(o.tasks || []).some(function (t) { return t.kind === k; })) {
        o.tasks.push({ id: 'x' + Date.now() + i, node: 'EOM执行', name: names[k], role: roles[k][0], owner: roles[k][1], due: o.eol, status: '待处理', kind: k, notice: '完成后通知需求计划复核清尾进度', result: '', doneAt: '' });
      }
    });
    if (!o.execution) {
      o.execution = {
        fg: { status: '处理中', base: (o.skus[0] || {}).stock || 0, current: (o.skus[0] || {}).stock || 0, pct: 0, dos: (o.skus[0] || {}).dos || 0 },
        lb: { status: '未发起', planTime: '-', orderTime: '-', doneTime: '-', qty: '0' },
        pmc: { status: '处理中', items: 1, amount: (o.skus[0] || {}).specialAmt || 0, way: '-' },
        eol: { stock0: false, special0: false, lbDone: false, noReverse: !o.reverse }
      };
    }
    addLog(o, '方案生效', '计划确认，进入EOM执行（现网状态记为完结，2.0 继续清尾）');
    persist(); toast('已确认，进入 EOM 执行', 'success'); go('order', o.no);
  }
  function planReject(no) {
    var reason = prompt('请填写驳回原因', '请按核料建议调整 Last Buy');
    if (reason == null) return;
    var o = findOrder(no);
    o.legacyStatus = 3;
    o.exception = '已驳回';
    o.stage = '核料中';
    o.owner = o.user;
    (o.tasks || []).forEach(function (t) { if (t.kind === 'plan') { t.status = '已驳回'; t.result = reason; } });
    var mat = materialOfOrder(o);
    if (mat) {
      mat.status = 1;
      mat.finalizeTime = '';
      mat.confirmFlags = {};
      uniquePlanOwners(mat).forEach(function (n) { mat.confirmFlags[n] = false; });
      (mat.details || []).forEach(function (d) { d.skuLocked = false; });
    }
    addLog(o, '计划驳回', reason + '；整单核料结论已解锁，可再次填写、导入和确认');
    persist(); toast('已驳回，整单核料已解锁', 'warning'); renderAll();
  }
  function isPrepareEom(status) {
    return status === '准备EOM' || status === '准备 EOM';
  }
  function releasePrepareEom(o) {
    (o.products || []).forEach(function (p) {
      if (isPrepareEom(p.status)) {
        if (!p.originStatus) p.originStatus = '已上市';
        p.status = p.originStatus;
      }
    });
    (o.skus || []).forEach(function (s) {
      if (isPrepareEom(s.status)) {
        if (!s.originStatus) s.originStatus = '已上市';
        s.status = s.originStatus;
      }
    });
    var mat = materialOfOrder(o);
    if (mat) {
      (mat.details || []).forEach(function (d) {
        if (isPrepareEom(d.skuStatus)) {
          if (!d.originStatus) d.originStatus = '已上市';
          d.skuStatus = d.originStatus;
        }
      });
    }
  }
  function withdraw(no) {
    var o = findOrder(no);
    if (o.stage !== '启动 EOM') { toast('仅「启动 EOM」可撤回至草稿', 'warning'); return; }
    if (o.userId !== STATE.currentUser.id) { toast('仅发起人可撤回', 'warning'); return; }
    releasePrepareEom(o);
    o.legacyStatus = 1;
    o.stage = '草稿';
    o.owner = o.user;
    addLog(o, '撤回', '撤回至草稿；SKU 从准备 EOM 释放回原产品状态');
    persist(); toast('已撤回，SKU 占用已释放', 'success'); renderAll();
  }
  function closeOrder(no) {
    var o = findOrder(no);
    if (o.stage !== '草稿' && o.stage !== '启动 EOM') { toast('仅「草稿、启动 EOM」可关闭', 'warning'); return; }
    if (o.userId !== STATE.currentUser.id) { toast('仅发起人可关闭', 'warning'); return; }
    var reason = prompt('关闭必须填写原因（写入日志，重新发起后仍保留）');
    if (reason == null) return;
    reason = String(reason).trim();
    if (!reason) { toast('关闭必须填写原因', 'warning'); return; }
    releasePrepareEom(o);
    o.closeReason = reason;
    o.legacyStatus = 4;
    o.stage = '已关闭';
    o.owner = '-';
    addLog(o, '关闭', reason);
    persist(); toast('已关闭', 'success'); renderAll();
  }
  function reopen(no) {
    var o = findOrder(no);
    if (o.stage !== '已关闭' && o.legacyStatus !== 4) { toast('仅已关闭工单可重新发起', 'warning'); return; }
    o.legacyStatus = 1;
    o.stage = '草稿';
    o.owner = o.user;
    addLog(o, '重新发起', '原单回草稿，流水号 ' + o.no + ' 不变；关闭原因仍保留：' + (o.closeReason || '-'));
    persist(); toast('原单已回草稿，流水号不变', 'success'); go('order', o.no);
  }
  function oaPass(no) {
    var o = findOrder(no);
    o.oa.status = '已通过';
    addLog(o, 'OA回写', o.oa.no + ' 已通过');
    if (o.stage === 'EOM执行' || o.stage === '清尾中') {
      var pending = (o.plans || []).find(function (p) { return p.status === '待OA'; });
      if (pending) pending.status = '待会签';
      o.planVersion = (pending ? pending.version : o.planVersion) + '待会签';
      persist(); toast('OA 已通过，请会签后生效；工单阶段不退回', 'success'); go('order', o.no);
      return;
    }
    persist(); toast('OA 已通过，可正式确认方案', 'success'); planConfirm(no);
  }
  function openNewPlan(no) {
    var o = findOrder(no);
    UI.form = { type: 'plan', no: no };
    openForm('新增清库方案版本',
      '<div class="alert warning">正式 EOM 后改版必须会签并生成新版本，工单阶段不退回待方案决策。BOM 已禁用且需追加 Last Buy 请走反 EOM，不要用改版代替。</div>' +
      (o.reverse ? '<div class="alert danger">当前反 EOM 执行中。追加 Last Buy 不得走方案改版。</div>' : '') +
      '<div class="form-grid" style="grid-template-columns:1fr 1fr">' +
        '<div class="form-item"><label class="form-label required">变更原因</label><div class="form-control"><select class="select" id="pReason"><option>清库进度低于计划</option><option>新品延期</option><option>库存不足</option><option>其他</option></select></div></div>' +
        '<div class="form-item"><label class="form-label">Last Buy数量</label><div class="form-control"><input class="input" id="pLb" type="number" value="0" /></div></div>' +
        '<div class="form-item"><label class="form-label">成品报废金额</label><div class="form-control"><input class="input" id="pFg" type="number" value="0" /></div></div>' +
        '<div class="form-item"><label class="form-label">物料报废金额</label><div class="form-control"><input class="input" id="pMat" type="number" value="0" /></div></div>' +
        '<div class="form-item full"><label class="form-label required">方案内容</label><div class="form-control"><textarea class="textarea" id="pContent">优先消耗海外库存。</textarea></div></div></div>' +
        '<div class="alert">成品报废超过 50 万或物料报废超过 20 万时发起 OA，审批返回前不得生效。</div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn" data-act="save-plan" data-mode="draft">保存草稿</button><button class="btn btn-primary" data-act="save-plan" data-mode="submit">提交确认</button>', true);
  }
  function savePlan(mode) {
    var o = findOrder(UI.form.no);
    var afterFormal = o.stage === 'EOM执行' || o.stage === '清尾中';
    var fg = Number(document.getElementById('pFg').value || 0);
    var mat = Number(document.getElementById('pMat').value || 0);
    var n = (o.plans || []).length + 1;
    var ver = 'V' + n;
    var needOa = fg > 500000 || mat > 200000;
    var rec = { version: ver, status: mode === 'draft' ? '草稿' : (needOa ? '待OA' : (afterFormal ? '待会签' : '生效中')), content: document.getElementById('pContent').value, lbQty: Number(document.getElementById('pLb').value || 0), scrapFg: fg, scrapMat: mat, reason: document.getElementById('pReason').value, decisionBy: STATE.currentUser.name, at: nowStr() };
    if (rec.status === '生效中') (o.plans || (o.plans = [])).forEach(function (p) { if (p.status === '生效中') p.status = '已失效'; });
    (o.plans || (o.plans = [])).unshift(rec);
    o.planVersion = ver + (rec.status === '生效中' ? '' : rec.status);
    if (needOa && mode === 'submit') {
      o.oa = { fg: fg, mat: mat, status: '审批中', no: 'OA' + Date.now().toString().slice(-8) };
      addLog(o, '发起OA', '成品报废' + fg + ' 物料报废' + mat + '；工单阶段仍为 ' + o.stage);
      toast('已发起 OA，审批返回前方案不生效，阶段不退回', 'warning');
    } else if (rec.status === '待会签') {
      addLog(o, '方案改版', ver + ' 待会签；工单阶段仍为 ' + o.stage + '，不退回待方案决策');
      toast('已提交会签，工单阶段不退回', 'success');
    } else {
      addLog(o, '方案版本', ver + ' ' + rec.status);
      toast('方案' + ver + '已保存', 'success');
    }
    persist(); closeMask('formMask'); go('order', o.no);
  }
  function signPlan(no, ver) {
    var o = findOrder(no);
    var p = (o.plans || []).find(function (x) { return x.version === ver; });
    if (!p || p.status !== '待会签') { toast('仅待会签方案可会签通过', 'warning'); return; }
    (o.plans || []).forEach(function (x) { if (x.status === '生效中') x.status = '已失效'; });
    p.status = '生效中';
    o.planVersion = ver;
    addLog(o, '方案会签', ver + ' 生效；工单阶段仍为 ' + o.stage);
    persist(); toast('会签通过，阶段不退回', 'success'); go('order', o.no);
  }
  function openReverse(no) {
    var o = findOrder(no);
    if (o.stage !== 'EOM执行' && o.stage !== '清尾中') { toast('仅正式 EOM 后、BOM 已禁用且需追加 Last Buy 时可发起', 'warning'); return; }
    UI.form = { type: 'reverse', no: no };
    var skus = (o.skus || []).map(function (s) { return '<option>' + s.sku + '</option>'; }).join('');
    openForm('发起反EOM',
      '<div class="alert warning">仅 BOM 已禁用且需要追加 Last Buy 时可发起。不得以撤回、关闭或重新发起普通 EOM 代替。执行中不得 EOL。</div>' +
      '<div class="form-grid" style="grid-template-columns:1fr 1fr">' +
        '<div class="form-item"><label class="form-label required">SKU</label><div class="form-control"><select class="select" id="rvSku">' + skus + '</select></div></div>' +
        '<div class="form-item"><label class="form-label required">当前BOM状态</label><div class="form-control"><select class="select"><option>已禁用</option></select></div></div>' +
        '<div class="form-item"><label class="form-label required">追加LB数量</label><div class="form-control"><input class="input" id="rvQty" type="number" value="300" /></div></div>' +
        '<div class="form-item"><label class="form-label required">预计完成时间</label><div class="form-control"><input class="input" id="rvEta" type="date" value="2026-10-10" /></div></div>' +
        '<div class="form-item full"><label class="form-label required">发起原因</label><div class="form-control"><textarea class="textarea" id="rvReason">新品延期，老品库存不足，需追加 Last Buy。</textarea></div></div></div>',
      '<button class="btn" data-act="close-mask" data-mask="formMask">取消</button><button class="btn btn-primary" data-act="save-reverse">提交</button>');
  }
  function saveReverse() {
    var o = findOrder(UI.form.no);
    o.reverse = { sku: document.getElementById('rvSku').value, bom: '已禁用', qty: Number(document.getElementById('rvQty').value || 0), eta: document.getElementById('rvEta').value, reason: document.getElementById('rvReason').value, status: '执行中' };
    o.exception = '反EOM中';
    if (o.execution && o.execution.eol) o.execution.eol.noReverse = false;
    o.tasks.push({ id: 'rv' + Date.now(), node: '反EOM', name: '追加Last Buy并临时解除BOM禁用', role: '计划', owner: '刘洋', due: o.reverse.eta, status: '处理中', kind: 'reverse', notice: '全部入库后重新禁用BOM', result: '追加' + o.reverse.qty, doneAt: '' });
    addLog(o, '发起反EOM', o.reverse.sku + ' 追加 ' + o.reverse.qty);
    persist(); closeMask('formMask'); toast('反EOM已提交', 'success'); go('order', o.no);
  }

  function fillReasons() {
    var type = (document.querySelector('input[name=eomType]:checked') || {}).value || '主动退市';
    var list = type === '主动退市' ? ACTIVE : PASSIVE;
    document.getElementById('reason').innerHTML = list.map(function (x) { return '<option>' + x + '</option>'; }).join('');
    document.getElementById('triggerNode').innerHTML = type === '主动退市' ? '<option>GR1</option><option>特殊事项实时发起</option>' : '<option>月度评审 week-0</option><option>特殊事项实时发起</option>';
    document.querySelectorAll('.new-only,#newFlagItem').forEach(function (el) { el.style.display = type === '被动退市' ? 'none' : ''; });
  }
  function renderWizardSteps() {
    var names = ['退市类型', '产品范围', '退市计划', '责任人', '提交确认'];
    document.getElementById('createSteps').innerHTML = names.map(function (n, i) {
      var cls = i + 1 === UI.wizardStep ? ' active' : (i + 1 < UI.wizardStep ? ' done' : '');
      return '<div class="step' + cls + '"><span class="step-num">' + (i + 1) + '</span><span>' + n + '</span></div>';
    }).join('');
    document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.toggle('active', Number(p.getAttribute('data-step')) === UI.wizardStep); });
    document.getElementById('prevStep').disabled = UI.wizardStep === 1;
    document.getElementById('nextStep').style.display = UI.wizardStep === 5 ? 'none' : 'inline-block';
    document.getElementById('submitEom').style.display = UI.wizardStep === 5 ? 'inline-block' : 'none';
    document.getElementById('saveDraft').style.display = UI.wizardStep === 5 ? 'none' : 'inline-block';
    if (UI.wizardStep === 5) renderSubmitChecks();
  }
  function loadModelSkus() {
    var model = document.getElementById('modelSearch').value.trim();
    var cat = STATE.catalog.find(function (c) { return c.model.toLowerCase() === model.toLowerCase(); });
    if (!cat) { toast('未找到 Model，可试 H8888 / H6199 / H9009 / H9100', 'warning'); return; }
    document.getElementById('skuSelectBody').innerHTML = cat.skus.map(function (s, i) {
      var block = s.inProgress || s.status === 'EOL';
      return '<tr class="' + (s.inProgress ? 'danger-row' : (s.status === '未上市' && !s.sales ? 'warn-row' : '')) + '">' +
        '<td><input class="sku-check" type="checkbox" data-i="' + i + '" ' + (block ? '' : 'checked') + ' /></td>' +
        '<td>' + esc(cat.scene) + '</td><td>' + esc(cat.cat) + '</td><td>' + esc(cat.model) + '</td><td>' + esc(s.sku) + '</td><td>' + esc(s.msku) + '</td>' +
        '<td>' + esc(s.status) + '</td><td>' + esc(s.onMarketDate) + '</td><td>' + esc(s.country) + '</td>' +
        '<td>' + (s.inProgress ? '是' : '否') + '</td>' +
        '<td><input class="input w-180 exclusion" ' + (block ? '' : 'disabled') + ' placeholder="' + (block ? '不可纳入' : '勾选后无需填写') + '" value="' + (s.inProgress ? '已存在进行中EOM' : (s.status === 'EOL' ? '已EOL' : '')) + '" /></td></tr>';
    }).join('');
    document.getElementById('skuSelectBody').dataset.model = cat.model;
    bindSkuChecks();
    updateSkuCount();
    toast('已带出 ' + cat.model + ' 下 ' + cat.skus.length + ' 个 SKU', 'success');
  }
  function bindSkuChecks() {
    document.querySelectorAll('.sku-check').forEach(function (c) {
      c.onchange = function () {
        var input = this.closest('tr').querySelector('.exclusion');
        input.disabled = this.checked;
        input.placeholder = this.checked ? '勾选后无需填写' : '请输入排除原因';
        updateSkuCount();
      };
    });
  }
  function updateSkuCount() { document.getElementById('selectedSkuCount').textContent = document.querySelectorAll('.sku-check:checked').length; }
  function wizardRows() {
    var model = document.getElementById('skuSelectBody').dataset.model;
    var cat = STATE.catalog.find(function (c) { return c.model === model; });
    if (!cat) return [];
    return Array.prototype.map.call(document.querySelectorAll('#skuSelectBody tr'), function (tr, i) {
      var ck = tr.querySelector('.sku-check');
      return { sku: cat.skus[i], cat: cat, selected: ck.checked, exclude: tr.querySelector('.exclusion').value.trim() };
    });
  }
  function validateWizard() {
    if (UI.wizardStep === 1) {
      var type = document.querySelector('input[name=eomType]:checked').value;
      if (document.getElementById('reason').value === '其他' && !document.getElementById('createRemark').value.trim()) { toast('选择其他必须填写说明', 'warning'); return false; }
      return true;
    }
    if (UI.wizardStep === 2) {
      var rows = wizardRows();
      if (!rows.length) { toast('请先带出 Model 下 SKU', 'warning'); return false; }
      if (!rows.some(function (r) { return r.selected; })) { toast('请至少选择一个准备EOM的SKU', 'warning'); return false; }
      if (rows.some(function (r) { return !r.selected && !r.exclude; })) { toast('未纳入EOM的SKU必须填写排除原因', 'warning'); return false; }
      return true;
    }
    if (UI.wizardStep === 3) {
      if (!document.getElementById('planEol').value) { toast('预计EOL必填', 'warning'); return false; }
      return true;
    }
    return true;
  }
  function renderSubmitChecks() {
    var rows = wizardRows();
    var selected = rows.filter(function (r) { return r.selected; });
    var blocks = [];
    var warns = [];
    selected.forEach(function (r) {
      if (r.sku.inProgress) blocks.push(r.sku.sku + ' 已存在进行中EOM');
      if (r.sku.status === 'EOL') blocks.push(r.sku.sku + ' 已EOL，不允许提交');
      if (r.sku.status === '未上市' && !r.sku.sales) warns.push(r.sku.sku + ' 未上市且无销售，建议主数据治理，不强制完整清库');
    });
    var items = [
      [selected.length > 0, 'SKU范围完整', selected.length ? ('已选择 ' + selected.length + ' 个') : '未选择'],
      [!selected.some(function (r) { return r.sku.inProgress; }), '无重复工单', blocks.filter(function (x) { return x.indexOf('进行中') >= 0; }).join('；') || '未发现进行中的EOM'],
      [!selected.some(function (r) { return r.sku.status === 'EOL'; }), '产品状态可发起', blocks.filter(function (x) { return x.indexOf('EOL') >= 0; }).join('；') || '状态校验通过'],
      [!!document.getElementById('planEol').value, '必填信息完整', '退市计划已填写'],
      [true, '责任人完整', '7类责任人已确认'],
      [warns.length === 0, '主数据完整', warns.join('；') || '未发现关键字段缺失']
    ];
    document.getElementById('submitChecks').innerHTML = '<div class="section-title">提交检查</div><div class="check-summary">' + items.map(function (it) {
      return '<div class="check-card"><span class="check-mark' + (it[0] ? '' : ' bad') + '">' + (it[0] ? '✓' : '!') + '</span><div><b>' + it[1] + '</b><p class="muted">' + esc(it[2]) + '</p></div></div>';
    }).join('') + '</div><div class="section-title">提交后影响</div><div class="alert warning">提交后所选 SKU 产品状态更新为“准备 EOM”，生成销售刷新预测任务。存在阻断项时不允许提交。</div>';
    UI._wizardBlock = blocks.length > 0;
  }
  function wizardSave(submit) {
    var rows = wizardRows();
    var selected = rows.filter(function (r) { return r.selected; });
    if (!selected.length) { toast('请选择SKU', 'warning'); return; }
    if (submit) {
      renderSubmitChecks();
      if (UI._wizardBlock) { toast('存在阻断项，不允许提交', 'warning'); return; }
    }
    var type = document.querySelector('input[name=eomType]:checked').value;
    var no = nextNo('EOM', 'eom');
    var hl = nextNo('HL', 'hl');
    var cat = selected[0].cat;
    var products = selected.map(function (r) {
      return { scene: cat.scene, cat: cat.cat, model: cat.model, sku: r.sku.sku, msku: r.sku.msku, originStatus: r.sku.status, status: submit ? '准备EOM' : r.sku.status, onMarketDate: r.sku.onMarketDate, country: r.sku.country, name: r.sku.name, selected: true };
    });
    var order = {
      sceneKey: 'NEW', sceneLabel: submit ? '新提交工单' : '新草稿',
      no: no, type: type, bu: document.getElementById('businessUnit').value, triggerNode: document.getElementById('triggerNode').value,
      reason: document.getElementById('reason').value, remark: document.getElementById('createRemark').value,
      user: STATE.currentUser.name, userId: STATE.currentUser.id,
      stage: submit ? '启动 EOM' : '草稿', legacyStatus: submit ? 2 : 1,
      owner: submit ? document.getElementById('rSales').value + '（销售）' : STATE.currentUser.name,
      time: nowStr(), confirmTime: '-', eol: document.getElementById('planEol').value, actualEol: '',
      stock: 0, materialClose: 0, planVersion: '-', fileName: (document.getElementById('planFileName').textContent || ''),
      materialNo: hl, planUsers: document.getElementById('rPmcPlan').value, cc: document.getElementById('rCc').value,
      exception: '', model: cat.model, skuCount: selected.length, scope: cat.model + ' / ' + selected.length,
      products: products,
      skus: selected.map(function (r) {
        return { model: cat.model, sku: r.sku.sku, scene: cat.scene, cat: cat.cat, country: r.sku.country, originStatus: r.sku.status, status: submit ? '准备EOM' : r.sku.status, onMarketDate: r.sku.onMarketDate, daysOn: 0, type: type, newFlag: type === '被动退市' ? '否' : (document.querySelector('input[name=newFlag]:checked') || {}).value, newSku: document.getElementById('newSku').value, newCr: document.getElementById('newCr').value, newList: document.getElementById('newList').value, startTime: submit ? nowStr() : '', eol: document.getElementById('planEol').value, eomDays: 0, lbPlan: '-', lbOrder: '-', lbDone: '-', lbQty: 0, lbStatus: '未发起', lbBaseStock: 0, stock: r.sku.sales || 0, stale: 0, staleRate: '0%', specialAmt: 0, commonAmt: 0, specialQty: 0, m3: 0, m2: 0, m1: 0, forecast: 0, eolForecast: 0, dos: 20, clearPct: 0, plan: '-', channels: [], lbDetail: '', stockSplit: '', materialSplit: '' };
      }),
      timeline: [{ title: submit ? '发起' + type : '保存草稿', meta: STATE.currentUser.name + '　' + nowStr(), content: submit ? 'SKU 进入准备 EOM' : '仅发起人可继续编辑', done: true }],
      tasks: submit ? [{ id: 'n' + Date.now(), node: '启动EOM', name: '刷新销售预测', role: '销售', owner: document.getElementById('rSales').value, due: today(), status: '待处理', kind: 'forecast', notice: '完成后通知需求计划发起核料', result: '', doneAt: '' }] : [],
      plans: [], logs: [{ time: nowStr(), user: STATE.currentUser.name, action: submit ? '发起EOM' : '保存草稿', content: selected.length + '个SKU' }],
      execution: null, reverse: null, forecast: { version: 0, current: 0, m3: 0, m2: 0, m1: 0, stock: 0, dos: 20, acceptLb: '', missing: false }, oa: null
    };
    var details = selected.map(function (r, i) {
      var pu = defaultPlanForSku(r.sku.sku);
      return { id: 'c' + Date.now() + i, model: cat.model, modelStatus: r.sku.status, sku: r.sku.sku, originStatus: r.sku.status, skuStatus: submit ? '准备EOM' : r.sku.status, avgDailySales: 0, lastMonthSales: r.sku.sales || 0, suggestOrderNum: 0, lockFlag: false, consumeDay: 0, eomFittings: [], clcEomFittings: [], initMaterialRemainAmount: 0, currency: 'CNY', materialConsume: [], materialInfos: [], totalMaterialMoney: 0, deliveryTime: '', finalOrderNum: '', finalScrapAmount: '', finalScrapAmountReason: '-', planUser: pu.name, planUserSource: pu.source, skuLocked: false, conclusion: '-', msku: r.sku.msku, mskuShop: r.sku.shop, mskuStatus: r.sku.status, totalStock: r.sku.sales || 0, innerStock: 0, overseasStock: 0, buyingOnWay: 0, mskuAvgDailySales: 0, surplus: 0, money: '0 CNY', overseasSalesDate: '-', finishProductSalesDate: '-', prepareMaterialsSalesDate: '-' };
    });
    STATE.materials.unshift({ serialNo: hl, eomNo: no, initiator: STATE.currentUser.id, initiatorName: STATE.currentUser.name, status: 3, clcStatus: '-', latestReviewTime: '', finalizeTime: '', confirmFlags: {}, details: details });
    STATE.orders.unshift(order);
    persist();
    closeMask('createMask');
    toast(submit ? 'EOM已提交，SKU 状态已更新为准备EOM' : '草稿已保存', 'success');
    go('order', no);
  }

  function exportCsv(name, headers, rows) {
    var text = '\ufeff' + [headers].concat(rows).map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; a.click();
    toast('导出文件已生成', 'success');
  }

  function openLogs(no) {
    var o = findOrder(no);
    UI.detailTab = 'logs';
    go('order', o.no);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var no = t.getAttribute('data-no');
    if (act === 'go') go(t.getAttribute('data-page'));
    else if (act === 'reset-seed') resetSeed();
    else if (act === 'scene') {
      if (t.getAttribute('data-action') === 'create') openCreate();
      else if (no) go('order', no);
    }
    else if (act === 'open-order') { UI.detailTab = t.getAttribute('data-tab') || 'overview'; go('order', no); }
    else if (act === 'open-material') { if (no) go('material', no); else toast('无核料单号', 'warning'); }
    else if (act === 'close-drawer') closeDrawer();
    else if (act === 'close-mask') closeMask(t.getAttribute('data-mask'));
    else if (act === 'open-create') { openCreate(); }
    else if (act === 'filter-orders') renderOrders();
    else if (act === 'reset-orders') { ['qNo', 'qMat', 'qModel', 'qType', 'qStage', 'qLegacy'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; }); renderOrders(); }
    else if (act === 'filter-mat') renderMaterials();
    else if (act === 'detail-tab') { UI.detailTab = t.getAttribute('data-tab'); renderOrderDetail(); }
    else if (act === 'handle-task') handleTask(no, t.getAttribute('data-tid'));
    else if (act === 'save-task') saveTask();
    else if (act === 'save-forecast') saveForecast();
    else if (act === 'toggle-lock') toggleLock(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'open-chart') openChart(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'save-chart') saveChart(t.getAttribute('data-lock'));
    else if (act === 'edit-fitting') openFitting(t.getAttribute('data-mid'), t.getAttribute('data-id'));
    else if (act === 'save-fitting') saveFitting();
    else if (act === 'edit-field') openField(t.getAttribute('data-mid'), t.getAttribute('data-id'), t.getAttribute('data-field'), t.getAttribute('data-label'));
    else if (act === 'save-field') saveField();
    else if (act === 'toggle-more') { UI.materialShow[t.getAttribute('data-id')] = !UI.materialShow[t.getAttribute('data-id')]; renderAll(); }
    else if (act === 'reclc') reclc(no);
    else if (act === 'finalize') finalize(no);
    else if (act === 'share-mat') shareMat(no);
    else if (act === 'do-share') { toast('已分享给 ' + document.getElementById('shareTo').value, 'success'); closeMask('formMask'); }
    else if (act === 'create-material') createMaterial();
    else if (act === 'save-new-mat') saveNewMat(t.getAttribute('data-submit') === '1');
    else if (act === 'create-material-for') createMaterialFor(no);
    else if (act === 'plan-confirm') planConfirm(no);
    else if (act === 'material-confirm') jumpToMaterialConfirm(no);
    else if (act === 'sku-confirm') skuConfirm(no);
    else if (act === 'sku-pick-all') {
      var on = t.checked;
      var table = t.closest('table') || document;
      table.querySelectorAll('.sku-pick').forEach(function (c) { c.checked = on; });
    }
    else if (act === 'plan-reject') planReject(no);
    else if (act === 'withdraw') withdraw(no);
    else if (act === 'close-order') closeOrder(no);
    else if (act === 'reopen') reopen(no);
    else if (act === 'oa-pass') oaPass(no);
    else if (act === 'new-plan') openNewPlan(no);
    else if (act === 'save-plan') savePlan(t.getAttribute('data-mode'));
    else if (act === 'sign-plan') signPlan(no, t.getAttribute('data-ver'));
    else if (act === 'open-reverse') openReverse(no);
    else if (act === 'save-reverse') saveReverse();
    else if (act === 'load-model') loadModelSkus();
    else if (act === 'wizard-prev') { UI.wizardStep = Math.max(1, UI.wizardStep - 1); renderWizardSteps(); }
    else if (act === 'wizard-next') { if (!validateWizard()) return; UI.wizardStep = Math.min(5, UI.wizardStep + 1); renderWizardSteps(); }
    else if (act === 'wizard-draft') wizardSave(false);
    else if (act === 'wizard-submit') wizardSave(true);
    else if (act === 'open-logs') openLogs(no);
    else if (act === 'open-mat-log') toast('核料日志：' + no + '（与工单日志分 businessType）', 'success');
    else if (act === 'export-orders') exportCsv('EOM工单.csv', ['流水号', '类型', '阶段', '现网状态', '核料单', '发起人'], STATE.orders.map(function (o) { return [o.no, o.type, o.stage, (LEGACY[o.legacyStatus] || [])[0], o.materialNo, o.user]; }));
    else if (act === 'export-ledger') exportCsv('EOM产品台账.csv', ['EOM', 'SKU', '状态', '库存'], STATE.orders.reduce(function (a, o) { return a.concat((o.skus || []).map(function (s) { return [o.no, s.sku, s.status, s.stock]; })); }, []));
    else if (act === 'export-mat') openExportMat(no);
    else if (act === 'do-export-mat') doExportMat();
    else if (act === 'import-mat') openImportMat(no);
    else if (act === 'do-import-mat') doImportMat();
    else if (act === 'assign-plan-user') assignPlanUser(t.getAttribute('data-mid'), t.getAttribute('data-msku'));
    else if (act === 'toggle-ledger') {
      var row = document.querySelector('[data-ledger="' + t.getAttribute('data-i') + '"]');
      if (row) { var open = row.style.display !== 'none'; row.style.display = open ? 'none' : 'table-row'; t.textContent = open ? '展开' : '收起'; }
    }
    else if (act === 'toast') toast(t.getAttribute('data-msg'), 'success');
    else if (act === 'edit-material') go('material', no);
  });

  document.querySelectorAll('.menu-item').forEach(function (item) {
    item.addEventListener('click', function () { go(item.getAttribute('data-page')); });
  });
  document.getElementById('detailDrawer').addEventListener('click', function (e) { if (e.target.id === 'detailDrawer') closeDrawer(); });
  document.querySelectorAll('.mask').forEach(function (mask) {
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.classList.remove('show'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { document.querySelectorAll('.mask').forEach(function (m) { m.classList.remove('show'); }); if (document.getElementById('detailDrawer').classList.contains('show')) closeDrawer(); }
  });
  document.getElementById('checkAllSku').addEventListener('change', function () {
    document.querySelectorAll('.sku-check').forEach(function (c) { c.checked = document.getElementById('checkAllSku').checked; c.dispatchEvent(new Event('change')); });
  });
  document.querySelectorAll('input[name=eomType]').forEach(function (r) { r.addEventListener('change', fillReasons); });
  document.getElementById('planUpload').addEventListener('click', function () { document.getElementById('planFile').click(); });
  document.getElementById('planFile').addEventListener('change', function () {
    if (this.files[0]) { document.getElementById('planFileName').textContent = this.files[0].name; toast('附件已选择：' + this.files[0].name, 'success'); }
  });

  function openCreate() {
    UI.wizardStep = 1;
    fillReasons();
    document.getElementById('modelSearch').value = 'H8888';
    document.getElementById('createMask').classList.add('show');
    renderWizardSteps();
    loadModelSkus();
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'userSwitch') switchUser(e.target.value);
  });
  window.addEventListener('hashchange', applyHash);
  loadState();
  if (location.hash) applyHash();
  else renderAll();
})();
