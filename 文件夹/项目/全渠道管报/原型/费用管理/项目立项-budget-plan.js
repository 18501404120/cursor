/**
 * 项目立项页 · 预算模块（场景品类规划同构，参考《营销费用规划-系统原型》）
 * 挂载：ProjectBudgetPlan.init({ tbodyId, onChange })
 */
(function (global) {
  var STORAGE_KEY = "project_create_budget_v8";

  /** 部门树形下拉实例池 */
  var deptPickerInstances = [];
  var deptPickerReady = false;
  var MARKETING_TYPES = [
    "自主营销-产品营销",
    "自主营销-品牌营销",
    "联合营销-产品营销",
    "联合营销-品牌营销"
  ];
  var BUDGET_TYPES = [
    "海外社媒投放",
    "红人营销（KOL）",
    "媒体公关（PR）",
    "视觉素材制作",
    "地标广告",
    "大型展会",
    "代言与赞助",
    "发布会"
  ];
  var CURRENCY_OPTIONS = ["USD", "CNY", "EUR", "GBP", "JPY", "CAD", "AUD"];
  /** 来自《销售主数据索引_v1》原型子集；fetch 成功后替换为全量 model 列表 */
  var MODEL_OPTIONS = ["H6065", "H6076", "H617E", "H6672", "H6840", "B5040", "H1310", "H70B1", "B601B"];
  var MODEL_INDEX_PATHS = [
    "../../../../规范/基础数据/销售主数据索引_v1.json",
    "../../../规范/基础数据/销售主数据索引_v1.json"
  ];

  var SCENES = [
    { scene: "观影", categories: ["TV灯带", "摄像头取色系列"] },
    { scene: "居家", categories: ["灯带", "吸顶灯"] },
    { scene: "户外", categories: ["户外灯带", "泛光灯"] },
    { scene: "季节", categories: ["瀑布灯", "圣诞树灯"] },
    { scene: "游戏", categories: ["方块灯", "像素灯"] }
  ];

  var REGIONS = [
    { code: "NA", name: "北美区", countries: ["美国", "加拿大", "墨西哥"] },
    { code: "EU", name: "欧洲区", countries: ["德国", "法国", "意大利", "英国", "西班牙"] },
    { code: "APAC", name: "亚太区", countries: ["日本", "澳大利亚", "新加坡"] }
  ];

  var CHANNELS = ["亚马逊", "Shopify", "APP商城", "线下商超", "商超3P", "线下分销"];
  var STORES = {
    亚马逊: ["亚马逊_US", "亚马逊_CA", "亚马逊_DE", "亚马逊_FR"],
    Shopify: ["Shopify_US", "Shopify_EU", "Shopify_UK"],
    APP商城: ["APP_US", "APP_Global"],
    线下商超: ["Walmart_US", "Costco_US", "Target_US"],
    商超3P: ["商超3P_US", "商超3P_EU"],
    线下分销: ["分销_北美", "分销_欧洲", "分销_亚太"]
  };

  var SKU_OPTIONS = [
    { value: "H6065301", label: "H6065301" },
    { value: "H6076113", label: "H6076113" },
    { value: "H617E3D1", label: "H617E3D1" },
    { value: "H6840312", label: "H6840312" },
    { value: "B5040101", label: "B5040101" }
  ];

  var NP_TAGS = ["", "2025新品", "2024新品", "老品"];

  var rowPickers = {};
  var rowMsfs = {};
  var onChangeCb = null;
  var activeTbodyId = "tbodyBudget";
  var cachedDefaults = null;

  function uid() {
    return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** 固定 id 的示例行，避免每次 loadAll 生成新 id 导致删除与 DOM 对不上 */
  function getDefaults() {
    if (!cachedDefaults) {
      cachedDefaults = [
        {
          id: "budget-sample-na-2025",
          revenueDateStart: "2025-01-01",
          revenueDateEnd: "2025-12-31",
          marketingType: "自主营销-产品营销",
          budgetType: "海外社媒投放",
          dept: "亚马逊平台 · Govee",
          models: ["H6065"],
          scene: "观影",
          category: "TV灯带",
          skus: ["H6065301", "H6076113"],
          npTag: "2025新品",
          region: "NA",
          countries: ["美国", "加拿大"],
          channels: ["亚马逊"],
          stores: ["亚马逊_US"],
          amount: 1200000,
          currency: "USD"
        },
        {
          id: "budget-sample-prime-day",
          revenueDateStart: "2025-06-01",
          revenueDateEnd: "2025-07-31",
          marketingType: "联合营销-品牌营销",
          budgetType: "大型展会",
          dept: "品牌中心",
          models: ["H617E"],
          scene: "居家",
          category: "灯带",
          skus: ["H617E3D1"],
          npTag: "",
          region: "EU",
          countries: ["德国", "法国", "意大利"],
          channels: ["亚马逊"],
          stores: ["亚马逊_DE", "亚马逊_FR"],
          amount: 800000,
          currency: "USD"
        }
      ];
    }
    return JSON.parse(JSON.stringify(cachedDefaults));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function selectOptionsHtml(options, value) {
    var v = String(value || "");
    return (
      '<option value="">请选择</option>' +
      options
        .map(function (t) {
          return (
            '<option value="' +
            escapeHtml(t) +
            '"' +
            (t === v ? " selected" : "") +
            ">" +
            escapeHtml(t) +
            "</option>"
          );
        })
        .join("")
    );
  }

  function marketingTypeSelectHtml(value) {
    return (
      '<select class="js-marketing-type" required aria-required="true">' +
      selectOptionsHtml(MARKETING_TYPES, value) +
      "</select>"
    );
  }

  function budgetTypeSelectHtml(value) {
    return (
      '<select class="js-budget-type">' +
      selectOptionsHtml(BUDGET_TYPES, value) +
      "</select>"
    );
  }

  function departmentSelectHtml(value) {
    var v = String(value || "");
    return (
      '<span class="ctl-wrap budget-dept-wrap">' +
      '<select class="js-budget-dept" hidden>' +
      '<option value="">请选择</option>' +
      "</select>" +
      '<div class="fee-tree-select is-compact js-budget-dept-picker" data-value="' + escapeHtml(v) + '">' +
      '<button type="button" class="fee-tree-select-trigger" aria-haspopup="listbox" aria-expanded="false">' +
      escapeHtml(v || "请选择") +
      "</button>" +
      "</div>" +
      '<button type="button" class="ctl-clear" hidden aria-label="清除费用部门">×</button>' +
      "</span>"
    );
  }

  /* ---- 部门树形下拉单选组件（数据来源 FeeDeptMaster，可选任意层级） ---- */
  function getDeptNodes() {
    if (global.FeeDeptMaster && typeof global.FeeDeptMaster.getAll === "function") {
      return global.FeeDeptMaster.getAll();
    }
    return [];
  }

  function buildDeptTree(nodes) {
    // 过滤掉禁选节点（selectable === false），不显示
    var visibleNodes = nodes.filter(function (n) { return n.selectable !== false; });
    var map = {};
    var roots = [];
    visibleNodes.forEach(function (n) {
      map[n.code] = { node: n, children: [], depth: 0, hasChildren: false, parent: null };
    });
    visibleNodes.forEach(function (n) {
      var entry = map[n.code];
      if (n.parentCode && map[n.parentCode]) {
        map[n.parentCode].children.push(entry);
        map[n.parentCode].hasChildren = true;
        entry.parent = map[n.parentCode];
      } else {
        roots.push(entry);
      }
    });
    roots.sort(function (a, b) {
      return (a.node.sortOrder || 0) - (b.node.sortOrder || 0);
    });
    return { roots: roots, map: map };
  }

  function flattenDeptRows(entries, depth, keyword, expandedSet, out) {
    out = out || [];
    entries.forEach(function (entry) {
      entry.depth = depth;
      var name = entry.node.name || "";
      var code = entry.node.code || "";
      var hit = !keyword || name.indexOf(keyword) >= 0 || code.indexOf(keyword) >= 0 ||
        (entry.node.bmName || "").indexOf(keyword) >= 0;
      if (hit) out.push(entry);
      if (entry.children.length) {
        // 搜索时全部展开；非搜索时按 expandedSet 状态
        var shouldExpand = !!keyword || expandedSet.has(entry.node.code);
        if (shouldExpand) {
          flattenDeptRows(entry.children, depth + 1, keyword, expandedSet, out);
        }
      }
    });
    return out;
  }

  function syncDeptPickerTrigger(inst) {
    if (!inst || !inst.trigger) return;
    var value = inst.value || "";
    var nodes = getDeptNodes();
    var node = null;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].name === value || nodes[i].code === value) { node = nodes[i]; break; }
    }
    var label = node ? node.name : (value || "请选择");
    inst.trigger.textContent = label;
    inst.wrap.classList.toggle("has-value", !!value);
    inst.wrap.classList.toggle("has-val", !!value);
    var clearBtn = inst.wrap.parentElement.querySelector(".ctl-clear");
    if (clearBtn) clearBtn.hidden = !value;
    var sel = inst.wrap.parentElement.querySelector(".js-budget-dept");
    if (sel) {
      var opt = Array.from(sel.options).find(function (o) { return o.value === value; });
      if (!opt) {
        opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        sel.appendChild(opt);
      }
      sel.value = value;
    }
  }

  function positionDeptPickerPanel(inst) {
    if (!inst || !inst.open) return;
    var rect = inst.trigger.getBoundingClientRect();
    var panel = inst.panel;
    var width = Math.max(rect.width, 260);
    var maxHeight = Math.min(320, window.innerHeight - 24);
    var top = rect.bottom + 4;
    panel.style.width = width + "px";
    panel.style.maxHeight = maxHeight + "px";
    panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + "px";
    if (top + Math.min(maxHeight, 320) > window.innerHeight && rect.top > 220) {
      top = Math.max(8, rect.top - Math.min(maxHeight, 320) - 4);
    }
    panel.style.top = top + "px";
  }

  function closeDeptPicker(inst) {
    if (!inst || !inst.open) return;
    inst.open = false;
    inst.wrap.classList.remove("is-open");
    inst.panel.classList.remove("show");
    inst.trigger.setAttribute("aria-expanded", "false");
    window.removeEventListener("scroll", inst.reposition, true);
    window.removeEventListener("resize", inst.reposition);
  }

  function closeOtherDeptPickers(inst) {
    deptPickerInstances.forEach(function (item) {
      if (item !== inst) closeDeptPicker(item);
    });
  }

  function renderDeptPickerPanel(inst) {
    var nodes = getDeptNodes();
    var tree = buildDeptTree(nodes);
    var keyword = (inst.keyword || "").trim().toLowerCase();
    if (!inst.expandedSet) inst.expandedSet = new Set();
    // 首次打开时默认展开根节点
    if (!inst._expandedInit) {
      tree.roots.forEach(function (r) { if (r.hasChildren) inst.expandedSet.add(r.node.code); });
      inst._expandedInit = true;
    }
    var rows = flattenDeptRows(tree.roots, 0, keyword, inst.expandedSet);
    var value = inst.value || "";
    var list = rows.length ? rows.map(function (entry) {
      var n = entry.node;
      var isExpanded = inst.expandedSet.has(n.code);
      var toggleHtml = entry.hasChildren
        ? '<span class="dept-tree-toggle" data-toggle="' + escapeHtml(n.code) + '" aria-label="' + (isExpanded ? "收起" : "展开") + '">' + (isExpanded ? "▾" : "▸") + "</span>"
        : '<span class="dept-tree-toggle-placeholder"></span>';
      var cls = "fee-tree-select-option dept-tree-option" +
        (n.name === value || n.code === value ? " is-selected" : "") +
        (entry.hasChildren ? " has-children" : "");
      var indent = 8 + entry.depth * 18;
      var label = escapeHtml(n.name || "");
      var codeHint = (n.bmName && n.bmName !== n.name) ? '<span class="fee-tree-select-code">' + escapeHtml(n.bmName) + "</span>" : "";
      return '<div class="' + cls + '" style="padding-left:' + indent + 'px;">' +
        toggleHtml +
        '<button type="button" class="dept-tree-label-btn" data-name="' + escapeHtml(n.name) + '" data-code="' + escapeHtml(n.code) + '">' +
        '<span class="fee-tree-select-label">' + label + "</span>" + codeHint +
        "</button></div>";
    }).join("") : '<div class="fee-tree-select-empty">无匹配部门</div>';
    inst.panel.innerHTML =
      '<div class="fee-tree-select-search-wrap">' +
      '<input type="search" class="fee-tree-select-search" placeholder="搜索部门/BM/组织" value="' + escapeHtml(inst.keyword || "") + '">' +
      "</div><div class=\"fee-tree-select-list\">" + list + "</div>";
    var search = inst.panel.querySelector(".fee-tree-select-search");
    if (search) {
      search.addEventListener("input", function () {
        inst.keyword = search.value;
        renderDeptPickerPanel(inst);
        positionDeptPickerPanel(inst);
        var next = inst.panel.querySelector(".fee-tree-select-search");
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      });
    }
    // 展开/收拢切换
    inst.panel.querySelectorAll(".dept-tree-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var code = toggle.dataset.toggle;
        if (inst.expandedSet.has(code)) inst.expandedSet.delete(code);
        else inst.expandedSet.add(code);
        renderDeptPickerPanel(inst);
      });
    });
    // 选择部门
    inst.panel.querySelectorAll(".dept-tree-label-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        inst.value = btn.dataset.name || "";
        syncDeptPickerTrigger(inst);
        if (onChangeCb) onChangeCb(loadAll());
        closeDeptPicker(inst);
      });
    });
  }

  function openDeptPicker(inst) {
    if (!inst) return;
    closeOtherDeptPickers(inst);
    inst.open = true;
    inst.keyword = "";
    inst.wrap.classList.add("is-open");
    inst.trigger.setAttribute("aria-expanded", "true");
    renderDeptPickerPanel(inst);
    document.body.appendChild(inst.panel);
    inst.panel.classList.add("show");
    positionDeptPickerPanel(inst);
    window.addEventListener("scroll", inst.reposition, true);
    window.addEventListener("resize", inst.reposition);
    var search = inst.panel.querySelector(".fee-tree-select-search");
    if (search) search.focus();
  }

  function mountDeptPicker(pickerEl) {
    if (!pickerEl) return null;
    if (pickerEl._deptPickerInst) return pickerEl._deptPickerInst;
    var trigger = pickerEl.querySelector(".fee-tree-select-trigger");
    if (!trigger) return null;
    var panel = document.createElement("div");
    panel.className = "fee-tree-select-panel";
    panel.style.zIndex = "1700";
    var inst = {
      wrap: pickerEl,
      trigger: trigger,
      panel: panel,
      value: pickerEl.dataset.value || "",
      keyword: "",
      open: false,
      reposition: function () { positionDeptPickerPanel(inst); }
    };
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inst.open) closeDeptPicker(inst);
      else openDeptPicker(inst);
    });
    pickerEl._deptPickerInst = inst;
    deptPickerInstances.push(inst);
    syncDeptPickerTrigger(inst);
    return inst;
  }

  function wireDeptSelects(tbody) {
    if (!tbody) return;
    tbody.querySelectorAll(".js-budget-dept-picker").forEach(function (pickerEl) {
      var inst = pickerEl._deptPickerInst || mountDeptPicker(pickerEl);
      if (!inst) return;
      var wrap = pickerEl.closest(".ctl-wrap");
      var sel = wrap && wrap.querySelector(".js-budget-dept");
      var btn = wrap && wrap.querySelector(".ctl-clear");
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = "1";
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          inst.value = "";
          syncDeptPickerTrigger(inst);
          if (onChangeCb) onChangeCb(loadAll());
        });
      }
    });
    document.removeEventListener("click", deptPickerDocClose);
    document.addEventListener("click", deptPickerDocClose);
  }

  function deptPickerDocClose(e) {
    deptPickerInstances.forEach(function (inst) {
      if (inst.open && inst.wrap && !inst.wrap.contains(e.target) && inst.panel && !inst.panel.contains(e.target)) {
        closeDeptPicker(inst);
      }
    });
  }

  function modelOptions() {
    return MODEL_OPTIONS.map(function (m) {
      return { value: m, label: m };
    });
  }

  function normalizeModels(row) {
    if (row.models && Array.isArray(row.models)) {
      return row.models.map(String).filter(Boolean);
    }
    if (row.model) {
      return String(row.model)
        .split(/[,，、\s]+/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    return [];
  }

  function currencySelectHtml(value) {
    var v = String(value || "USD");
    return (
      '<select class="js-budget-currency">' +
      CURRENCY_OPTIONS.map(function (c) {
        return (
          '<option value="' +
          escapeHtml(c) +
          '"' +
          (c === v ? " selected" : "") +
          ">" +
          escapeHtml(c) +
          "</option>"
        );
      }).join("") +
      "</select>"
    );
  }

  function inferModelFromSkus(skus) {
    if (!skus || !skus.length) return "";
    var sku = String(skus[0] || "");
    return sku.length >= 5 ? sku.substring(0, 5) : "";
  }

  function fetchModelOptions(done) {
    var i = 0;
    function tryNext() {
      if (i >= MODEL_INDEX_PATHS.length) {
        if (done) done();
        return;
      }
      fetch(MODEL_INDEX_PATHS[i])
        .then(function (r) {
          if (!r.ok) throw new Error("404");
          return r.json();
        })
        .then(function (data) {
          if (data && Array.isArray(data.models) && data.models.length) {
            MODEL_OPTIONS = data.models.slice();
          }
          if (done) done();
        })
        .catch(function () {
          i++;
          tryNext();
        });
    }
    tryNext();
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function lastDayOfMonthYm(ym) {
    var p = String(ym || "").split("-");
    if (p.length < 2) return "";
    var y = +p[0];
    var m = +p[1];
    if (!y || !m) return "";
    return y + "-" + pad2(m) + "-" + pad2(new Date(y, m, 0).getDate());
  }

  function normalizeRow(row) {
    if (!row) return row;
    if (!row.budgetType && row.projectName) {
      row.budgetType = "";
    }
    delete row.projectName;
    if (!row.revenueDateStart && row.monthStart) {
      row.revenueDateStart = String(row.monthStart).length === 7 ? row.monthStart + "-01" : row.monthStart;
    }
    if (!row.revenueDateEnd && row.monthEnd) {
      row.revenueDateEnd =
        String(row.monthEnd).length === 7 ? lastDayOfMonthYm(row.monthEnd) : row.monthEnd;
    }
    delete row.monthStart;
    delete row.monthEnd;
    if (!row.currency) row.currency = "USD";
    row.models = normalizeModels(row);
    delete row.model;
    if (!row.models.length && row.skus && row.skus.length) {
      var inferred = inferModelFromSkus(row.skus);
      if (inferred) row.models = [inferred];
    }
    return row;
  }

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v6");
      }
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v5");
      }
      if (raw != null && raw !== "") {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(function (r) {
            return normalizeRow(r);
          });
        }
      }
    } catch (e) {}
    return getDefaults();
  }

  function saveAll(list, silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
    if (!silent && onChangeCb) onChangeCb(list);
  }

  function destroyAllRowWidgets() {
    Object.keys(rowPickers).forEach(function (id) {
      destroyRowWidgets(id);
    });
    // 清理旧的部门下拉面板，避免 DOM 孤儿
    deptPickerInstances.forEach(function (inst) {
      if (inst.panel && inst.panel.parentNode) inst.panel.parentNode.removeChild(inst.panel);
    });
    deptPickerInstances = [];
  }

  function getSelectedIds(tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return [];
    var ids = [];
    tbody.querySelectorAll("tr[data-id] .js-budget-chk:checked").forEach(function (chk) {
      var tr = chk.closest("tr[data-id]");
      if (tr && tr.dataset.id) ids.push(tr.dataset.id);
    });
    return ids;
  }

  function updateBatchDelState(tbodyId, chkAllId, btnBatchDelId) {
    var ids = getSelectedIds(tbodyId);
    var btn = btnBatchDelId ? document.getElementById(btnBatchDelId) : null;
    if (btn) btn.disabled = ids.length === 0;

    var chkAll = chkAllId ? document.getElementById(chkAllId) : null;
    var tbody = document.getElementById(tbodyId);
    if (!chkAll || !tbody) return;
    var rowChks = tbody.querySelectorAll("tr[data-id] .js-budget-chk");
    if (!rowChks.length) {
      chkAll.checked = false;
      chkAll.indeterminate = false;
      return;
    }
    var checkedCount = 0;
    rowChks.forEach(function (c) {
      if (c.checked) checkedCount++;
    });
    chkAll.checked = checkedCount === rowChks.length;
    chkAll.indeterminate = checkedCount > 0 && checkedCount < rowChks.length;
  }

  function batchDelete(tbodyId, chkAllId, btnBatchDelId) {
    var ids = getSelectedIds(tbodyId);
    if (!ids.length) {
      toast("请先勾选要删除的预算行");
      return;
    }
    if (!confirm("确定删除选中的 " + ids.length + " 行预算？")) return;
    var idSet = {};
    ids.forEach(function (id) {
      idSet[id] = true;
    });
    var list = syncListFromDom(tbodyId).filter(function (x) {
      return !idSet[x.id];
    });
    ids.forEach(function (id) {
      destroyRowWidgets(id);
    });
    saveAll(list);
    render(tbodyId, chkAllId, btnBatchDelId);
    toast("已删除 " + ids.length + " 行");
  }

  /** 以当前表格 DOM 为准同步列表（避免 id 与 localStorage 不一致） */
  function syncListFromDom(tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return loadAll();
    var stored = loadAll();
    var list = [];
    tbody.querySelectorAll("tr[data-id]").forEach(function (tr) {
      var id = tr.dataset.id;
      if (!id) return;
      var base = stored.find(function (x) {
        return x.id === id;
      });
      list.push(readRowFromDom(tr, base || { id: id }));
    });
    return list;
  }

  function destroyRowWidgets(id) {
    if (rowPickers[id]) {
      rowPickers[id].destroy();
      delete rowPickers[id];
    }
    if (rowMsfs[id]) {
      Object.keys(rowMsfs[id]).forEach(function (k) {
        if (rowMsfs[id][k] && rowMsfs[id][k].destroy) rowMsfs[id][k].destroy();
      });
      delete rowMsfs[id];
    }
  }

  function sceneCategoryOptions() {
    var opts = [];
    SCENES.forEach(function (s) {
      s.categories.forEach(function (c) {
        opts.push({ value: s.scene + "|" + c, label: s.scene + " / " + c });
      });
    });
    return opts;
  }

  function regionOptions() {
    return REGIONS.map(function (r) {
      return { value: r.code, label: r.name };
    });
  }

  function countryOptions(regionCode) {
    var r = REGIONS.find(function (x) {
      return x.code === regionCode;
    });
    if (!r) return [];
    return r.countries.map(function (c) {
      return { value: c, label: c };
    });
  }

  function channelOptions() {
    return CHANNELS.map(function (c) {
      return { value: c, label: c };
    });
  }

  function storeOptions(channels) {
    var list = [];
    (channels || []).forEach(function (ch) {
      (STORES[ch] || []).forEach(function (st) {
        list.push({ value: st, label: st });
      });
    });
    if (!list.length) {
      Object.keys(STORES).forEach(function (ch) {
        STORES[ch].forEach(function (st) {
          list.push({ value: st, label: st });
        });
      });
    }
    return list;
  }

  function mountRowWidgets(tr, row) {
    var id = row.id;
    destroyRowWidgets(id);
    rowMsfs[id] = {};

    var drHost = tr.querySelector(".js-budget-dr");
    if (drHost && global.DateRangePicker) {
      rowPickers[id] = global.DateRangePicker.mount(drHost, {
        start: row.revenueDateStart,
        end: row.revenueDateEnd,
        useBodyPortal: true,
        onChange: function () {
          if (onChangeCb) onChangeCb(loadAll());
        }
      });
    }

    var scHost = tr.querySelector(".js-budget-sc");
    if (scHost && global.MultiSelectFilter) {
      rowMsfs[id].sc = global.MultiSelectFilter.mount(scHost, {
        placeholder: "请选择场景品类",
        showSelectAll: false,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.scene && row.category ? [row.scene + "|" + row.category] : [],
        getOptions: function () {
          return sceneCategoryOptions();
        },
        onChange: function () {
          if (onChangeCb) onChangeCb(loadAll());
        }
      });
    }

    var modelHost = tr.querySelector(".js-budget-model");
    if (modelHost && global.MultiSelectFilter) {
      rowMsfs[id].model = global.MultiSelectFilter.mount(modelHost, {
        placeholder: "请选择 model",
        showSelectAll: true,
        clearable: true,
        useBodyPortal: true,
        initialValues: normalizeModels(row),
        getOptions: function () {
          return modelOptions();
        },
        onChange: function () {
          if (onChangeCb) onChangeCb(loadAll());
        }
      });
    }

    var skuHost = tr.querySelector(".js-budget-sku");
    if (skuHost && global.MultiSelectFilter) {
      rowMsfs[id].sku = global.MultiSelectFilter.mount(skuHost, {
        placeholder: "请选择 SKU",
        showSelectAll: true,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.skus || [],
        getOptions: function () {
          return SKU_OPTIONS;
        }
      });
    }

    var regionHost = tr.querySelector(".js-budget-region");
    if (regionHost && global.MultiSelectFilter) {
      rowMsfs[id].region = global.MultiSelectFilter.mount(regionHost, {
        placeholder: "请选择区域",
        showSelectAll: false,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.region ? [row.region] : [],
        getOptions: function () {
          return regionOptions();
        },
        onChange: function (vals) {
          var countryMsf = rowMsfs[id].country;
          if (countryMsf) {
            countryMsf.setValues([]);
            countryMsf.refreshOptions();
          }
        }
      });
    }

    var countryHost = tr.querySelector(".js-budget-country");
    if (countryHost && global.MultiSelectFilter) {
      rowMsfs[id].country = global.MultiSelectFilter.mount(countryHost, {
        placeholder: "请选择国家",
        showSelectAll: true,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.countries || [],
        getOptions: function () {
          var rv = rowMsfs[id].region ? rowMsfs[id].region.getValues() : [];
          var code = rv[0] || row.region || "";
          return countryOptions(code);
        }
      });
    }

    var channelHost = tr.querySelector(".js-budget-channel");
    if (channelHost && global.MultiSelectFilter) {
      rowMsfs[id].channel = global.MultiSelectFilter.mount(channelHost, {
        placeholder: "请选择渠道",
        showSelectAll: true,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.channels || [],
        getOptions: function () {
          return channelOptions();
        },
        onChange: function () {
          var storeMsf = rowMsfs[id].store;
          if (storeMsf) {
            storeMsf.setValues([]);
            storeMsf.refreshOptions();
          }
        }
      });
    }

    var storeHost = tr.querySelector(".js-budget-store");
    if (storeHost && global.MultiSelectFilter) {
      rowMsfs[id].store = global.MultiSelectFilter.mount(storeHost, {
        placeholder: "请选择店铺",
        showSelectAll: true,
        clearable: true,
        useBodyPortal: true,
        initialValues: row.stores || [],
        getOptions: function () {
          var ch = rowMsfs[id].channel ? rowMsfs[id].channel.getValues() : row.channels || [];
          return storeOptions(ch);
        }
      });
    }
  }

  function readRowFromDom(tr, base) {
    var id = tr.dataset.id;
    var row = JSON.parse(JSON.stringify(base || {}));
    row.id = id;

    if (rowPickers[id]) {
      var dr = rowPickers[id].get();
      row.revenueDateStart = dr.start || "";
      row.revenueDateEnd = dr.end || "";
    }

    row.marketingType = String((tr.querySelector(".js-marketing-type") || {}).value || "").trim();
    row.budgetType = String((tr.querySelector(".js-budget-type") || {}).value || "").trim();
    row.dept = "";
    var pickerEl = tr.querySelector(".js-budget-dept-picker");
    if (pickerEl && pickerEl._deptPickerInst) {
      row.dept = String(pickerEl._deptPickerInst.value || "").trim();
    } else if (pickerEl) {
      row.dept = String(pickerEl.dataset.value || "").trim();
    }
    row.amount = parseFloat((tr.querySelector(".js-budget-amt") || {}).value) || 0;
    row.currency = String((tr.querySelector(".js-budget-currency") || {}).value || "USD").trim() || "USD";
    row.npTag = String((tr.querySelector(".js-budget-np") || {}).value || "").trim();

    var msf = rowMsfs[id] || {};
    if (msf.sc) {
      var scv = msf.sc.getValues()[0] || "";
      var parts = scv.split("|");
      row.scene = parts[0] || "";
      row.category = parts[1] || "";
    }
    if (msf.model) row.models = msf.model.getValues();
    if (msf.sku) row.skus = msf.sku.getValues();
    delete row.model;
    if (msf.region) row.region = msf.region.getValues()[0] || "";
    if (msf.country) row.countries = msf.country.getValues();
    if (msf.channel) row.channels = msf.channel.getValues();
    if (msf.store) row.stores = msf.store.getValues();

    return row;
  }

  function validateRow(row, index, silent) {
    silent = !!silent;
    var n = index != null ? "第 " + (index + 1) + " 行" : "预算行";
    if (!row.revenueDateStart || !row.revenueDateEnd) {
      if (!silent) toast(n + "：请完整选择收益日期范围");
      return false;
    }
    if (!row.marketingType) {
      if (!silent) toast(n + "：请选择营销类型");
      return false;
    }
    if (!row.budgetType) {
      if (!silent) toast(n + "：请选择类型");
      return false;
    }
    if (!(row.amount > 0)) {
      if (!silent) toast(n + "：营销费用规划为必填，且须大于 0");
      return false;
    }
    var hasScope = (row.scene && row.category) || (row.skus && row.skus.length) || row.npTag;
    if (!hasScope) {
      if (!silent) toast(n + "：场景品类、SKU、新品标签不可同时为空");
      return false;
    }
    return true;
  }

  function toast(msg) {
    var el = document.getElementById("budgetToast");
    if (!el) {
      alert(msg);
      return;
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2600);
  }

  function render(tbodyId, chkAllId, btnBatchDelId) {
    tbodyId = tbodyId || activeTbodyId;
    activeTbodyId = tbodyId;
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    var list = loadAll();
    destroyAllRowWidgets();
    tbody.innerHTML = "";

    if (!list.length) {
      tbody.innerHTML =
        '<tr><td colspan="16" class="empty">暂无预算行，请点击「新增一行」；立项提交前至少须有一行有效预算。</td></tr>';
      updateBatchDelState(tbodyId, chkAllId, btnBatchDelId);
      return;
    }

    list.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.dataset.id = row.id;
      tr.innerHTML =
        '<td class="chk-col"><span class="chk-cell-inner"><input type="checkbox" class="js-budget-chk" aria-label="选择本行" /></span></td>' +
        '<td><div class="js-budget-dr plan-row-dr-host"></div></td>' +
        "<td>" + marketingTypeSelectHtml(row.marketingType) + "</td>" +
        "<td>" + budgetTypeSelectHtml(row.budgetType) + "</td>" +
        "<td>" + departmentSelectHtml(row.dept) + "</td>" +
        '<td><div class="js-budget-sc msf-plan-row"></div></td>' +
        '<td><div class="js-budget-model msf-plan-row msf-cell-narrow"></div></td>' +
        '<td><div class="js-budget-sku msf-plan-row"></div></td>' +
        '<td><select class="js-budget-np">' +
        NP_TAGS.map(function (t) {
          return (
            '<option value="' +
            escapeHtml(t) +
            '"' +
            (t === (row.npTag || "") ? " selected" : "") +
            ">" +
            (t ? escapeHtml(t) : "请选择") +
            "</option>"
          );
        }).join("") +
        "</select></td>" +
        '<td><div class="js-budget-region msf-plan-row"></div></td>' +
        '<td><div class="js-budget-country msf-plan-row"></div></td>' +
        '<td><div class="js-budget-channel msf-plan-row"></div></td>' +
        '<td><div class="js-budget-store msf-plan-row"></div></td>' +
        '<td><input type="number" class="js-budget-amt num req-field" min="0" step="1" placeholder="必填" value="' +
        escapeHtml(String(row.amount != null ? row.amount : "")) +
        '" /></td>' +
        "<td>" + currencySelectHtml(row.currency || "USD") + "</td>" +
        '<td class="actions">' +
        '<button type="button" class="link js-budget-copy">复制</button>' +
        '<button type="button" class="link js-budget-save">保存</button>' +
        '<button type="button" class="link danger js-budget-del">删除</button>' +
        "</td>";
      tbody.appendChild(tr);
      mountRowWidgets(tr, row);
    });

    bindRowEvents(tbodyId, chkAllId, btnBatchDelId);
    wireDeptSelects(tbody);
    updateBatchDelState(tbodyId, chkAllId, btnBatchDelId);
  }

  function bindRowEvents(tbodyId, chkAllId, btnBatchDelId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.querySelectorAll("tr[data-id] .js-budget-chk").forEach(function (chk) {
      chk.addEventListener("change", function () {
        updateBatchDelState(tbodyId, chkAllId, btnBatchDelId);
      });
    });
    tbody.querySelectorAll("tr[data-id]").forEach(function (tr) {
      var id = tr.dataset.id;
      var saveBtn = tr.querySelector(".js-budget-save");
      var copyBtn = tr.querySelector(".js-budget-copy");
      var delBtn = tr.querySelector(".js-budget-del");
      if (copyBtn) {
        copyBtn.addEventListener("click", function () {
          copyRow(tbodyId, chkAllId, btnBatchDelId, id);
        });
      }
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          var list = loadAll();
          var idx = list.findIndex(function (x) {
            return x.id === id;
          });
          if (idx < 0) return;
          var row = readRowFromDom(tr, list[idx]);
          if (!validateRow(row, idx)) return;
          list[idx] = row;
          saveAll(list);
          toast("已保存该行预算");
        });
      }
      if (delBtn) {
        delBtn.addEventListener("click", function () {
          if (!confirm("确定删除该预算行？")) return;
          var list = syncListFromDom(tbodyId).filter(function (x) {
            return x.id !== id;
          });
          destroyRowWidgets(id);
          saveAll(list);
          render(tbodyId, chkAllId, btnBatchDelId);
          toast("已删除");
        });
      }
    });
  }

  function copyRow(tbodyId, chkAllId, btnBatchDelId, sourceId) {
    tbodyId = tbodyId || activeTbodyId;
    var list = syncListFromDom(tbodyId);
    var source = list.find(function (x) {
      return x.id === sourceId;
    });
    if (!source) return;
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = uid();
    list.push(copy);
    saveAll(list);
    render(tbodyId, chkAllId, btnBatchDelId);
    toast("已复制该行");
  }

  function addRow(tbodyId, chkAllId, btnBatchDelId) {
    tbodyId = tbodyId || activeTbodyId;
    var list = loadAll();
    var base = SCENES[0];
    list.push({
      id: uid(),
      revenueDateStart: "2025-01-01",
      revenueDateEnd: "2025-12-31",
      marketingType: "",
      budgetType: "",
      dept: "",
      models: [],
      scene: base.scene,
      category: base.categories[0],
      skus: [],
      npTag: "",
      region: "NA",
      countries: [],
      channels: [],
      stores: [],
      amount: 0,
      currency: "USD"
    });
    saveAll(list);
    render(tbodyId, chkAllId, btnBatchDelId);
    toast("已新增一行，请填写后保存");
  }

  function validateAll(tbodyId, silent) {
    silent = !!silent;
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return false;
    var trs = tbody.querySelectorAll("tr[data-id]");
    if (!trs.length) {
      if (!silent) toast("预算为必填：请至少新增一行并填写营销费用规划");
      return false;
    }
    var list = loadAll();
    var ok = true;
    trs.forEach(function (tr, i) {
      var id = tr.dataset.id;
      var base = list.find(function (x) {
        return x.id === id;
      });
      var row = readRowFromDom(tr, base);
      if (!validateRow(row, i, silent)) ok = false;
    });
    return ok;
  }

  function persistAllFromDom(tbodyId) {
    var list = syncListFromDom(tbodyId);
    saveAll(list, true);
    return list;
  }

  function getSummaryTotal(tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return 0;
    var sum = 0;
    tbody.querySelectorAll("tr[data-id] .js-budget-amt").forEach(function (inp) {
      sum += parseFloat(inp.value) || 0;
    });
    return sum;
  }

  global.ProjectBudgetPlan = {
    init: function (opts) {
      opts = opts || {};
      onChangeCb = opts.onChange || null;
      var tbodyId = opts.tbodyId || "tbodyBudget";
      var chkAllId = opts.chkAllId || "budgetChkAll";
      var btnBatchDelId = opts.btnBatchDelId || "btnBudgetBatchDel";
      activeTbodyId = tbodyId;

      if (localStorage.getItem(STORAGE_KEY) == null) {
        saveAll(getDefaults(), true);
      }

      render(tbodyId, chkAllId, btnBatchDelId);
      fetchModelOptions(function () {
        render(tbodyId, chkAllId, btnBatchDelId);
      });

      // 初始化费用部门主数据，就绪后重新渲染以挂载树形下拉
      if (global.FeeDeptMaster && typeof global.FeeDeptMaster.init === "function") {
        global.FeeDeptMaster.init().then(function () {
          deptPickerReady = true;
          render(tbodyId, chkAllId, btnBatchDelId);
        }).catch(function () {
          render(tbodyId, chkAllId, btnBatchDelId);
        });
        if (typeof global.FeeDeptMaster.onChange === "function") {
          global.FeeDeptMaster.onChange(function () {
            if (deptPickerReady) render(tbodyId, chkAllId, btnBatchDelId);
          });
        }
      }

      var btnAdd = document.getElementById(opts.btnAddId || "btnBudgetAdd");
      if (btnAdd) {
        btnAdd.addEventListener("click", function (e) {
          e.preventDefault();
          addRow(tbodyId, chkAllId, btnBatchDelId);
        });
      }

      var btnBatchDel = document.getElementById(btnBatchDelId);
      if (btnBatchDel) {
        btnBatchDel.addEventListener("click", function (e) {
          e.preventDefault();
          batchDelete(tbodyId, chkAllId, btnBatchDelId);
        });
      }

      var chkAll = document.getElementById(chkAllId);
      if (chkAll) {
        chkAll.addEventListener("change", function () {
          var checked = chkAll.checked;
          var tbody = document.getElementById(tbodyId);
          if (!tbody) return;
          tbody.querySelectorAll("tr[data-id] .js-budget-chk").forEach(function (c) {
            c.checked = checked;
          });
          chkAll.indeterminate = false;
          updateBatchDelState(tbodyId, chkAllId, btnBatchDelId);
        });
      }

      return {
        render: function () {
          render(tbodyId, chkAllId, btnBatchDelId);
        },
        validate: function (silent) {
          return validateAll(tbodyId, silent);
        },
        persist: function () {
          return persistAllFromDom(tbodyId);
        },
        getTotal: function () {
          return getSummaryTotal(tbodyId);
        },
        batchDelete: function () {
          batchDelete(tbodyId, chkAllId, btnBatchDelId);
        },
        resetSample: function () {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {}
          saveAll(getDefaults(), true);
          render(tbodyId, chkAllId, btnBatchDelId);
        }
      };
    }
  };
})(window);
