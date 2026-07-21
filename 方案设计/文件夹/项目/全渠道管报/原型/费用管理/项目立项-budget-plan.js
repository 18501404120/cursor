/**
 * 项目立项页 · 预算模块（场景品类规划同构，参考《营销费用规划-系统原型》）
 * 挂载：ProjectBudgetPlan.init({ tbodyId, onChange })
 */
(function (global) {
  var STORAGE_KEY = "project_create_budget_v12";
  /** 旧版 BP 部门名，已废弃，加载时清空 */
  var LEGACY_BP_DEPT_NAMES = { "智能照明": true, "智能家电": true };

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
  var ALLOC_MODE_OPTIONS = ["分摊", "不分摊"];
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
    { scene: "游戏", categories: ["方块灯", "像素灯"] },
    { scene: "环境电器", categories: ["塔扇", "台扇", "空净", "暖风机", "加湿器", "除湿机"] },
    { scene: "厨房电器", categories: ["空气炸锅", "电烤箱", "料理机"] },
    { scene: "清洁电器", categories: ["扫地机", "洗地机", "吸尘器"] },
    { scene: "传感器及控制", categories: ["传感器", "控制器", "网关"] },
    { scene: "管家", categories: ["传感器", "摄像头", "灯条", "插头"] },
    { scene: "投影", categories: ["便携投影", "激光投影"] }
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

  /** 新品标签：对齐 MSKU基础信息页 getYearRange() 逻辑（当前年±3年，降序） */
  function getNpTagOptions() {
    var year = new Date().getFullYear();
    var range = 3;
    var list = [];
    for (var i = range; i >= -range; i--) {
      var y = year + i;
      list.push({ value: String(y), label: y + "年新品" });
    }
    return list;
  }
  var NP_TAG_OPTIONS = getNpTagOptions();

  var rowPickers = {};
  var rowMsfs = {};
  var onChangeCb = null;
  var activeTbodyId = "tbodyBudget";
  var cachedDefaults = null;

  function getRowAllocMode(row) {
    if (!row) return "";
    var m = String(row.allocMode || "").trim();
    return m === "分摊" || m === "不分摊" ? m : "";
  }

  function getAllocModeFromTr(tr) {
    if (!tr) return "";
    var sel = tr.querySelector(".js-budget-alloc-mode");
    if (!sel) return "";
    var m = String(sel.value || "").trim();
    return m === "分摊" || m === "不分摊" ? m : "";
  }

  function allocModeSelectHtml(value) {
    var v = String(value || "").trim();
    var isAlloc = v === "分摊";
    var isNoAlloc = v === "不分摊";
    // 「请选择」仅作空值占位展示，不出现在下拉选项中；真实选项仅「分摊」「不分摊」
    return (
      '<select class="js-budget-alloc-mode" aria-required="true" aria-label="分摊模式">' +
      '<option value="" disabled hidden' + (!isAlloc && !isNoAlloc ? " selected" : "") + ">请选择</option>" +
      '<option value="分摊"' + (isAlloc ? " selected" : "") + ">分摊</option>" +
      '<option value="不分摊"' + (isNoAlloc ? " selected" : "") + ">不分摊</option>" +
      "</select>"
    );
  }

  function enforceSingleMsf(msf, mode) {
    if (!msf || mode !== "不分摊") return;
    var vals = msf.getValues ? msf.getValues() : [];
    if (vals.length > 1) msf.setValues([vals[vals.length - 1]]);
  }

  function enforceSingleSc(sc, mode) {
    if (!sc || mode !== "不分摊") return;
    var vals = sc.getValues ? sc.getValues() : [];
    if (vals.length > 1) sc.setValues([vals[vals.length - 1]]);
  }

  function enforceRowAllocModeRules(id) {
    var tbody = document.getElementById(activeTbodyId);
    if (!tbody) return;
    var tr = tbody.querySelector('tr[data-id="' + id + '"]');
    if (!tr) return;
    var mode = getAllocModeFromTr(tr);
    var msf = rowMsfs[id];
    if (!msf || mode !== "不分摊") return;
    ["model", "sku", "region", "country", "channel", "store"].forEach(function (key) {
      if (msf[key]) enforceSingleMsf(msf[key], mode);
    });
    if (msf.sc) enforceSingleSc(msf.sc, mode);
  }

  function applyAllocModeToRowMsfs() {
    Object.keys(rowMsfs).forEach(function (id) {
      enforceRowAllocModeRules(id);
    });
  }

  function makeMsfOnChange(id, key, extraFn) {
    return function () {
      var tbody = document.getElementById(activeTbodyId);
      var tr = tbody && tbody.querySelector('tr[data-id="' + id + '"]');
      var mode = getAllocModeFromTr(tr);
      if (mode === "不分摊" && rowMsfs[id] && rowMsfs[id][key]) {
        enforceSingleMsf(rowMsfs[id][key], mode);
      }
      if (extraFn) extraFn();
      if (onChangeCb) onChangeCb(loadAll());
    };
  }

  function makeScOnChange(id) {
    return function () {
      var tbody = document.getElementById(activeTbodyId);
      var tr = tbody && tbody.querySelector('tr[data-id="' + id + '"]');
      var mode = getAllocModeFromTr(tr);
      if (mode === "不分摊" && rowMsfs[id] && rowMsfs[id].sc) {
        enforceSingleSc(rowMsfs[id].sc, mode);
      }
      if (onChangeCb) onChangeCb(loadAll());
    };
  }

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
          allocMode: "",
          deptCode: "D102_AMZ",
          dept: "亚马逊平台 · Govee",
          models: ["H6065"],
          scene: "观影",
          category: "TV灯带",
          sceneCategories: [{ scene: "观影", category: "TV灯带" }],
          skus: ["H6065301", "H6076113"],
          npTag: "2025",
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
          allocMode: "",
          deptCode: "D102_BRAND",
          dept: "品牌中心",
          models: ["H617E"],
          scene: "居家",
          category: "灯带",
          sceneCategories: [{ scene: "居家", category: "灯带" }],
          skus: ["H617E3D1"],
          npTag: "",
          region: "EU",
          countries: ["德国", "法国", "意大利"],
          channels: ["亚马逊"],
          stores: ["亚马逊_DE", "亚马逊_FR"],
          amount: 800000,
          currency: "USD"
        },
        {
          id: "budget-sample-env-apac",
          revenueDateStart: "2025-03-01",
          revenueDateEnd: "2025-12-31",
          marketingType: "自主营销-产品营销",
          budgetType: "红人营销（KOL）",
          allocMode: "",
          deptCode: "D109_GL",
          dept: "Goveelife",
          models: ["H7170"],
          scene: "环境电器",
          category: "加湿器",
          sceneCategories: [
            { scene: "环境电器", category: "加湿器" },
            { scene: "环境电器", category: "除湿机" }
          ],
          skus: ["H7170301", "H7170302"],
          npTag: "2026",
          region: "APAC",
          countries: ["日本", "澳大利亚"],
          channels: ["亚马逊", "Shopify"],
          stores: ["亚马逊_JP", "Shopify_US"],
          amount: 600000,
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

  function departmentSelectHtml(row) {
    row = row || {};
    var code = String(row.deptCode || "").trim();
    var label = getDeptDisplayText(row) || "请选择";
    var v = code;
    return (
      '<span class="ctl-wrap budget-dept-wrap' + (code ? " has-val" : "") + '">' +
      '<select class="js-budget-dept" hidden>' +
      '<option value="">请选择</option>' +
      (code ? '<option value="' + escapeHtml(code) + '" selected>' + escapeHtml(label) + "</option>" : "") +
      "</select>" +
      '<div class="fee-tree-select is-compact js-budget-dept-picker" data-value="' + escapeHtml(v) + '">' +
      '<button type="button" class="fee-tree-select-trigger" aria-haspopup="listbox" aria-expanded="false">' +
      escapeHtml(label) +
      "</button>" +
      "</div>" +
      '<button type="button" class="ctl-clear"' + (code ? "" : " hidden") + ' aria-label="清除费用部门">×</button>' +
      "</span>"
    );
  }

  /* ---- 部门树形下拉单选组件（数据来源 FeeDeptMaster，可选任意层级） ---- */
  function getDeptNodes() {
    if (global.FeeDeptMaster) {
      if (typeof global.FeeDeptMaster.getSelectable === "function") {
        return global.FeeDeptMaster.getSelectable();
      }
      if (typeof global.FeeDeptMaster.getAll === "function") {
        return global.FeeDeptMaster.getAll().filter(function (n) {
          return n.selectable !== false;
        });
      }
    }
    return [];
  }

  function formatDeptFullLabel(node) {
    if (!node) return "";
    var org = String(node.orgCode || "").trim();
    var orgName = String(node.orgName || "").trim();
    var name = String(node.name || "").trim();
    var orgPart = org ? (orgName ? org + "·" + orgName : org) : "";
    // 与费用导入页一致：组织·组织名 / 管报部门（如 102·Govee / APP商城）
    if (node.nodeType === "org") return orgPart || name;
    if (!name || name === orgPart) return orgPart || name;
    var compactOrg = orgPart.replace(/\s+/g, "");
    var compactName = name.replace(/\s+/g, "");
    if (compactOrg && compactName && (compactName === compactOrg || compactName.indexOf(compactOrg) >= 0)) {
      return orgPart;
    }
    return orgPart && name ? orgPart + " / " + name : name || orgPart;
  }

  function findDeptNodeByCode(code) {
    var c = String(code || "").trim();
    if (!c) return null;
    var nodes = getDeptNodes();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].code === c) return nodes[i];
    }
    return null;
  }

  function findDeptNodeByValue(value) {
    var v = String(value || "").trim();
    if (!v) return null;
    var nodes = getDeptNodes();
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.code === v || n.name === v || formatDeptFullLabel(n) === v) return n;
      if (n.bmCode === v || n.bmName === v) return n;
    }
    return null;
  }

  function getDeptDisplayText(row) {
    row = row || {};
    var code = String(row.deptCode || "").trim();
    if (code) {
      var byCode = findDeptNodeByCode(code);
      if (byCode) return formatDeptFullLabel(byCode);
    }
    var legacy = String(row.dept || "").trim();
    if (!legacy) return "";
    var byValue = findDeptNodeByValue(legacy);
    return byValue ? formatDeptFullLabel(byValue) : legacy;
  }

  function normalizeDeptFields(row) {
    if (!row) return row;
    var code = String(row.deptCode || "").trim();
    var name = String(row.dept || "").trim();
    if (!code && name) {
      if (LEGACY_BP_DEPT_NAMES[name]) {
        row.dept = "";
        row.deptCode = "";
        return row;
      }
      var node = findDeptNodeByValue(name);
      if (node) {
        row.deptCode = node.code;
        row.dept = formatDeptFullLabel(node);
      }
      return row;
    }
    if (code) {
      var matched = findDeptNodeByCode(code);
      if (matched) row.dept = formatDeptFullLabel(matched);
      else {
        row.deptCode = "";
        row.dept = "";
      }
    }
    return row;
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
      var kw = keyword ? String(keyword).toLowerCase() : "";
      var hit = !kw ||
        name.toLowerCase().indexOf(kw) >= 0 ||
        code.toLowerCase().indexOf(kw) >= 0 ||
        String(entry.node.bmName || "").toLowerCase().indexOf(kw) >= 0 ||
        String(entry.node.bmCode || "").toLowerCase().indexOf(kw) >= 0 ||
        String(entry.node.orgCode || "").toLowerCase().indexOf(kw) >= 0 ||
        String(entry.node.orgName || "").toLowerCase().indexOf(kw) >= 0;
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
    var code = inst.value || "";
    var node = findDeptNodeByCode(code);
    var label = node ? formatDeptFullLabel(node) : code || "请选择";
    inst.trigger.textContent = label;
    inst.trigger.title = label === "请选择" ? "" : label;
    inst.wrap.dataset.value = code;
    inst.wrap.classList.toggle("has-value", !!code);
    inst.wrap.classList.toggle("has-val", !!code);
    var wrap = inst.wrap.closest(".ctl-wrap");
    if (wrap) wrap.classList.toggle("has-val", !!code);
    var clearBtn = wrap && wrap.querySelector(".ctl-clear");
    if (clearBtn) clearBtn.hidden = !code;
    var sel = wrap && wrap.querySelector(".js-budget-dept");
    if (sel) {
      sel.innerHTML = '<option value="">请选择</option>';
      if (code) {
        var opt = document.createElement("option");
        opt.value = code;
        opt.textContent = label;
        opt.selected = true;
        sel.appendChild(opt);
      }
      sel.value = code;
    }
  }

  function positionDeptPickerPanel(inst) {
    if (!inst || !inst.open) return;
    var rect = inst.trigger.getBoundingClientRect();
    var panel = inst.panel;
    var width = Math.max(rect.width, 320);
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
        (n.code === value ? " is-selected" : "") +
        (entry.hasChildren ? " has-children" : "");
      var indent = 8 + entry.depth * 18;
      var fullLabel = formatDeptFullLabel(n);
      var label = escapeHtml(n.name || "");
      var orgHint = (n.orgCode && n.nodeType !== "org")
        ? '<span class="fee-tree-select-code">' + escapeHtml(String(n.orgCode) + (n.orgName ? "·" + n.orgName : "")) + "</span>"
        : "";
      var bmHint = (n.bmName && n.bmName !== n.name)
        ? '<span class="fee-tree-select-code">' + escapeHtml(n.bmName) + "</span>"
        : "";
      return '<div class="' + cls + '" style="padding-left:' + indent + 'px;" title="' + escapeHtml(fullLabel) + '">' +
        toggleHtml +
        '<button type="button" class="dept-tree-label-btn" data-name="' + escapeHtml(n.name) + '" data-code="' + escapeHtml(n.code) + '">' +
        '<span class="fee-tree-select-label">' + label + "</span>" + orgHint + bmHint +
        "</button></div>";
    }).join("") : '<motion></motion><div class="fee-tree-select-empty">' + (getDeptNodes().length ? "无匹配部门" : "费用部门主数据未加载，请确认 fee-dept-master.js 可访问") + "</div>".replace(/<\/?motion>/g, "");
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
        inst.value = btn.dataset.code || "";
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
    // 场景品类：迁移旧的单选字段到多选数组
    if (!row.sceneCategories || !row.sceneCategories.length) {
      if (row.scene && row.category) {
        row.sceneCategories = [{ scene: row.scene, category: row.category }];
      } else {
        row.sceneCategories = [];
      }
    }
    // 新品标签：迁移旧的 "2025新品" 格式为纯年份 "2025"
    if (row.npTag && /年新品$/.test(String(row.npTag))) {
      row.npTag = String(row.npTag).replace(/年新品$/, "");
    }
    if (row.allocMode !== "分摊" && row.allocMode !== "不分摊") {
      row.allocMode = "";
    }
    return normalizeDeptFields(row);
  }

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v11");
      }
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v10");
      }
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v9");
      }
      if (raw == null || raw === "") {
        raw = localStorage.getItem("project_create_budget_v8");
      }
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

  /** 场景品类级联树（对齐 SKU信息页 el-cascader 数据结构：{value,label,children}） */
  function sceneCategoryTreeOptions() {
    return SCENES.map(function (s) {
      return {
        value: s.scene,
        label: s.scene,
        children: s.categories.map(function (c) {
          return { value: c, label: c };
        })
      };
    });
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
    if (scHost && global.SceneCategoryCascader) {
      var initScPaths = [];
      if (row.sceneCategories && row.sceneCategories.length) {
        initScPaths = row.sceneCategories.map(function (it) {
          return [it.scene, it.category];
        });
      } else if (row.scene && row.category) {
        initScPaths = [[row.scene, row.category]];
      }
      rowMsfs[id].sc = global.SceneCategoryCascader.mount(scHost, {
        placeholder: "请选择场景品类",
        useBodyPortal: true,
        options: sceneCategoryTreeOptions(),
        initialValues: initScPaths,
        onChange: makeScOnChange(id)
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
        onChange: makeMsfOnChange(id, "model")
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
        },
        onChange: makeMsfOnChange(id, "sku")
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
        onChange: makeMsfOnChange(id, "region", function () {
          var countryMsf = rowMsfs[id].country;
          if (countryMsf) {
            countryMsf.setValues([]);
            countryMsf.refreshOptions();
          }
        })
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
        },
        onChange: makeMsfOnChange(id, "country")
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
        onChange: makeMsfOnChange(id, "channel", function () {
          var storeMsf = rowMsfs[id].store;
          if (storeMsf) {
            storeMsf.setValues([]);
            storeMsf.refreshOptions();
          }
        })
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
        },
        onChange: makeMsfOnChange(id, "store")
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
    row.allocMode = String((tr.querySelector(".js-budget-alloc-mode") || {}).value || "").trim();
    row.deptCode = "";
    row.dept = "";
    var pickerEl = tr.querySelector(".js-budget-dept-picker");
    if (pickerEl && pickerEl._deptPickerInst) {
      row.deptCode = String(pickerEl._deptPickerInst.value || "").trim();
    } else if (pickerEl) {
      row.deptCode = String(pickerEl.dataset.value || "").trim();
    }
    var deptNode = findDeptNodeByCode(row.deptCode);
    row.dept = deptNode ? formatDeptFullLabel(deptNode) : "";
    row.amount = parseFloat((tr.querySelector(".js-budget-amt") || {}).value) || 0;
    row.currency = String((tr.querySelector(".js-budget-currency") || {}).value || "USD").trim() || "USD";
    row.npTag = String((tr.querySelector(".js-budget-np") || {}).value || "").trim();

    var msf = rowMsfs[id] || {};
    if (msf.sc) {
      var scPaths = msf.sc.getValues() || [];
      row.sceneCategories = scPaths.map(function (p) {
        return { scene: p[0] || "", category: p[1] || "" };
      });
      // 兼容旧字段：取首个作为 scene/category
      if (row.sceneCategories.length) {
        row.scene = row.sceneCategories[0].scene;
        row.category = row.sceneCategories[0].category;
      } else {
        row.scene = "";
        row.category = "";
      }
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
    if (!getRowAllocMode(row)) {
      if (!silent) toast(n + "：请选择分摊模式");
      return false;
    }
    var rowAllocMode = getRowAllocMode(row);
    if (rowAllocMode === "不分摊" && !row.deptCode) {
      if (!silent) toast(n + "：不分摊模式下费用部门为必填项");
      return false;
    }
    if (!(row.amount > 0)) {
      if (!silent) toast(n + "：营销费用规划为必填，且须大于 0");
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
        '<tr><td colspan="17" class="empty">暂无预算行，请点击「新增一行」；立项提交前至少须有一行有效预算。</td></tr>';
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
        "<td>" + allocModeSelectHtml(row.allocMode) + "</td>" +
        "<td>" + departmentSelectHtml(row) + "</td>" +
        '<td><div class="js-budget-sc msf-plan-row"></div></td>' +
        '<td><div class="js-budget-model msf-plan-row msf-cell-narrow"></div></td>' +
        '<td><div class="js-budget-sku msf-plan-row"></div></td>' +
        '<td><select class="js-budget-np">' +
        '<option value="">' + "请选择" + "</option>" +
        NP_TAG_OPTIONS.map(function (t) {
          return (
            '<option value="' +
            escapeHtml(t.value) +
            '"' +
            (t.value === String(row.npTag || "") ? " selected" : "") +
            ">" +
            escapeHtml(t.label) +
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
    applyAllocModeToRowMsfs();
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
      var allocSel = tr.querySelector(".js-budget-alloc-mode");
      if (allocSel) {
        allocSel.addEventListener("change", function () {
          enforceRowAllocModeRules(id);
          if (onChangeCb) onChangeCb(loadAll());
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
      allocMode: "",
      deptCode: "",
      dept: "",
      models: [],
      scene: base.scene,
      category: base.categories[0],
      sceneCategories: [{ scene: base.scene, category: base.categories[0] }],
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
