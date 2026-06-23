(function () {
  "use strict";

  const ROOT_ATTR = "data-pe-root";
  const STORAGE_PREFIX = "prototypeEdit:";
  const OBSERVER_KEY = "__prototypeEditObserver";
  const HOOKED_KEY = "__prototypeEditHookedFns";

  /** 内嵌组件目录，避免 file:// 下 fetch 失败 */
  const DEFAULT_CATALOG = {
    version: "2026-06-23",
    components: [
      {
        id: "filter-select",
        tier: "page-edit",
        label: "下拉筛选",
        category: "filter",
        mountSelectors: [".filter-grid", ".filter-panel", "section.filters"]
      },
      {
        id: "filter-text",
        tier: "page-edit",
        label: "文本筛选",
        category: "filter",
        mountSelectors: [".filter-grid", ".filter-panel"]
      },
      {
        id: "filter-month-placeholder",
        tier: "page-edit",
        label: "月份范围（占位）",
        category: "filter",
        mountSelectors: [".filter-grid"]
      },
      {
        id: "table-column-text",
        tier: "page-edit",
        label: "表格文本列",
        category: "column",
        mountSelectors: ["table", ".data-table", "#mainTable", "section.content table"]
      }
    ]
  };

  let config = null;
  let catalog = DEFAULT_CATALOG;
  let state = emptyState();
  let editMode = false;
  let pickHighlight = null;
  let panelEl = null;
  let toastTimer = null;
let lastTableSelector = "";

  function emptyState() {
    return {
      text: {},
      hidden: [],
      mock: {},
      addedFilters: [],
      addedColumns: [],
      addedButtons: [],
      addedFormFields: [],
      columnOrder: {}
    };
  }

  function readConfig() {
    const node = document.getElementById("prototype-edit-config");
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (_e) {
      return null;
    }
  }

  function storageKey() {
    return STORAGE_PREFIX + (config.pageId || "page");
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function syncConfigToDom() {
    const node = document.getElementById("prototype-edit-config");
    if (!node || !config) return;
    config.canonicalEdits = cloneState(state);
    node.textContent = JSON.stringify(
      {
        pageId: config.pageId,
        runtimeVersion: config.runtimeVersion,
        pageTitle: config.pageTitle,
        mockRegistry: config.mockRegistry || [],
        renderHooks: config.renderHooks || [],
        tableTargets: config.tableTargets || [],
        canonicalEdits: config.canonicalEdits
      },
      null,
      2
    );
  }

  function persist() {
    saveLocalState();
    syncConfigToDom();
  }

  function saveLocalState() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch (_e) {
      toast("本地存储已满，请保存 HTML 文件");
    }
  }

  function mergeEdits(base, overlay) {
    const out = emptyState();
    out.text = Object.assign({}, base.text || {}, overlay.text || {});
    const hidden = new Set([].concat(base.hidden || [], overlay.hidden || []));
    out.hidden = Array.from(hidden);
    out.mock = Object.assign({}, base.mock || {}, overlay.mock || {});
    out.addedFilters = (overlay.addedFilters && overlay.addedFilters.length
      ? overlay.addedFilters
      : base.addedFilters || []
    ).slice();
    out.addedColumns = (overlay.addedColumns && overlay.addedColumns.length
      ? overlay.addedColumns
      : base.addedColumns || []
    ).slice();
    out.addedButtons = (overlay.addedButtons || base.addedButtons || []).slice();
    out.addedFormFields = (overlay.addedFormFields || base.addedFormFields || []).slice();
    out.columnOrder = Object.assign({}, base.columnOrder || {}, overlay.columnOrder || {});
    return out;
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function toast(msg) {
    let node = document.querySelector(".pe-toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "pe-toast pe-root";
      node.setAttribute(ROOT_ATTR, "1");
      document.body.appendChild(node);
    }
    node.textContent = msg;
    node.classList.add("pe-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove("pe-show");
    }, 2600);
  }

  function ensureKey(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.getAttribute("data-pe-key")) return el.getAttribute("data-pe-key");
    const tag = el.tagName.toLowerCase();
    if (tag === "th") {
      const txt = (el.textContent || "").trim().slice(0, 40).replace(/\s+/g, "");
      if (txt) {
        let key = "pe:col-" + txt;
        let n = 2;
        while (document.querySelector('[data-pe-key="' + key + '"]')) {
          key = "pe:col-" + txt + "-" + n;
          n += 1;
        }
        el.setAttribute("data-pe-key", key);
        return key;
      }
    }
    const id = el.id ? "id-" + el.id : "";
    const txt = (el.textContent || "").trim().slice(0, 20).replace(/\s+/g, "-");
    const key = "pe:" + (id || tag + (txt ? "-" + txt : "") + "-" + uid("k"));
    el.setAttribute("data-pe-key", key);
    return key;
  }

  function resolveByKey(key) {
    if (!key) return null;
    return document.querySelector('[data-pe-key="' + key.replace(/"/g, "") + '"]');
  }

  function asElement(el) {
    if (!el) return null;
    if (el.nodeType === 1) return el;
    if (el.nodeType === 3) return el.parentElement;
    return null;
  }

  function isPeChrome(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      ".pe-toolbar, .pe-panel, .pe-toast, .pa-toolbar, .pa-popover, .pa-modal, .pa-add-form"
    );
  }

  function isPeUi(el) {
    return isPeChrome(el);
  }

  function getColumnHeaderText(th) {
    if (!th) return "";
    const saved = state.text && state.text[ensureKey(th)];
    if (saved != null) return saved;
    const wrap = th.querySelector(".pa-tip-label-wrap");
    if (wrap) {
      let text = "";
      wrap.childNodes.forEach(function (n) {
        if (n.nodeType === 3) text += n.textContent;
      });
      return text.trim() || wrap.textContent.replace(/\s*i\s*$/i, "").trim();
    }
    return (th.textContent || "").trim();
  }

  function setColumnHeaderText(th, value) {
    if (!th) return;
    const wrap = th.querySelector(".pa-tip-label-wrap");
    if (wrap) {
      const icon = wrap.querySelector(".pa-tip-icon");
      wrap.textContent = "";
      if (value) wrap.appendChild(document.createTextNode(value));
      if (icon) wrap.appendChild(icon);
      return;
    }
    th.textContent = value;
  }

  function pickTarget(raw) {
    let el = asElement(raw);
    if (!el || isPeChrome(el)) return null;

    /* 表头区域只认 th，避免选中整表 */
    if (el.closest && el.closest("thead")) {
      const thInHead = el.closest("th");
      if (thInHead && !isPeChrome(thInHead)) return thInHead;
      return null;
    }

    /* 列表列：优先 th / td（含点在蓝 i、列名文字上） */
    if (el.closest(".pa-tip-icon, .pa-dot")) {
      el = asElement(el.closest("th") || el.closest("td") || el.closest(".f") || el);
    }
    const th = el && el.closest && el.closest("th");
    if (th && !isPeChrome(th)) return th;
    const td = el && el.closest && el.closest("td");
    if (td && !td.hasAttribute("colspan") && !isPeChrome(td)) return td;

    const selectors = [
      ".f-item",
      ".f.f-with-pin",
      ".f.f-filter-search",
      ".f.f-model",
      ".f.f-project-name",
      ".f.f-month-range",
      ".f",
      ".field",
      ".panel-head",
      ".panel-head-tools",
      "button",
      "h1",
      "h2",
      "h3",
      ".title",
      ".breadcrumb",
      "label",
      ".btn-search",
      ".btn",
      "table"
    ];
    for (let i = 0; i < selectors.length; i += 1) {
      const hit = el.closest(selectors[i]);
      if (hit && !isPeChrome(hit)) return hit;
    }
    return el.parentElement && !isPeChrome(el) ? el : null;
  }

  function getTextTarget(el) {
    if (!el) return null;
    const tag = el.tagName;
    if (tag === "TH") return el;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      const lbl = el.closest(".f-item, .f, .field");
      if (lbl) {
        const lab = lbl.querySelector("label");
        if (lab) return lab;
      }
    }
    if (tag === "BUTTON") return el;
    const lblInF = el.closest(".f, .f-item");
    if (lblInF) {
      const lab = lblInF.querySelector("label");
      if (lab) return lab;
    }
    if (el.querySelector && el.querySelector("label") && !el.querySelector("table")) {
      return el.querySelector("label");
    }
    return el;
  }

  function applyTextOverrides() {
    Object.keys(state.text || {}).forEach(function (key) {
      const el = resolveByKey(key);
      const val = state.text[key];
      if (!el || val == null) return;
      if (el.tagName === "TH") setColumnHeaderText(el, val);
      else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.value = val;
      else if (el.tagName === "BUTTON") el.textContent = val;
      else el.textContent = val;
      el.classList.add("pe-text-editable");
    });
  }

  function applyHidden() {
    (state.hidden || []).forEach(function (key) {
      const el = resolveByKey(key);
      if (el) el.classList.add("pe-hidden-by-edit");
    });
  }

  function setPathValue(path, jsonText) {
    try {
      const val = JSON.parse(jsonText);
      const parts = path.replace(/^window\./, "").split(".");
      let obj = window;
      for (let i = 0; i < parts.length - 1; i += 1) {
        obj = obj[parts[i]];
        if (obj == null) return false;
      }
      obj[parts[parts.length - 1]] = val;
      return true;
    } catch (_e) {
      return false;
    }
  }

  function getPathValue(path) {
    try {
      const parts = path.replace(/^window\./, "").split(".");
      let obj = window;
      for (let i = 0; i < parts.length; i += 1) {
        obj = obj[parts[i]];
        if (obj == null) return undefined;
      }
      return obj;
    } catch (_e) {
      return undefined;
    }
  }

  function applyMockOverrides() {
    Object.keys(state.mock || {}).forEach(function (path) {
      setPathValue(path, state.mock[path]);
    });
    (config.renderHooks || []).forEach(function (name) {
      if (typeof window[name] === "function") {
        try {
          window[name]();
        } catch (_e) {
          /* ignore */
        }
      }
    });
  }

  function findFilterMount(def) {
    if (def.mountSelector) {
      const el = document.querySelector(def.mountSelector);
      if (el) return el;
    }
    const selectors = [".filter-grid", ".filter-panel", "section.filters", ".filters"];
    for (let i = 0; i < selectors.length; i += 1) {
      const el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function buildFilterNode(def) {
    const wrap = document.createElement("div");
    wrap.className = "f pe-added-filter";
    wrap.setAttribute("data-pe-key", def.id);
    wrap.setAttribute("data-pe-added", "true");

    if (def.template === "filter-select") {
      wrap.innerHTML = "<label></label><select></select>";
      wrap.querySelector("label").textContent = def.label || "新筛选项";
      const sel = wrap.querySelector("select");
      (def.options || ["全部", "选项A"]).forEach(function (opt) {
        const o = document.createElement("option");
        o.textContent = opt;
        sel.appendChild(o);
      });
    } else if (def.template === "filter-text") {
      wrap.innerHTML = '<label></label><input type="text" />';
      wrap.querySelector("label").textContent = def.label || "关键词";
      wrap.querySelector("input").placeholder = def.inputPlaceholder || "请输入";
    } else {
      wrap.innerHTML = '<label></label><div class="pe-month-ph">YYYY-MM - YYYY-MM</div>';
      wrap.querySelector("label").textContent = def.label || "月份范围";
    }
    return wrap;
  }

  function applyAddedFilters() {
    (state.addedFilters || []).forEach(function (def) {
      if (resolveByKey(def.id)) return;
      const mount = findFilterMount(def);
      if (!mount) return;
      const node = buildFilterNode(def);
      const searchBtn = mount.querySelector(".f-filter-search, .btn-search, #btnQuery");
      if (searchBtn && searchBtn.closest(".f, .f-item")) {
        mount.insertBefore(node, searchBtn.closest(".f, .f-item"));
      } else {
        mount.appendChild(node);
      }
    });
  }

  function getTableTargets() {
    let list = (config && config.tableTargets) || [];
    if (!list.length) {
      list = [
        { selector: "#tblActsPlans", label: "规划行列表" },
        { selector: "#actsTableWrap table", label: "规划行列表" },
        { selector: "#tblUsagePlanMirror", label: "底部分摊表" }
      ];
    }
    const seen = new Set();
    const out = [];
    list.forEach(function (t) {
      if (!t || !t.selector || seen.has(t.selector)) return;
      if (!document.querySelector(t.selector)) return;
      seen.add(t.selector);
      out.push(t);
    });
    return out;
  }

  function findTableSelector(table) {
    if (!table) return "table";
    if (table.id) return "#" + table.id;
    const host = table.closest("[id]");
    if (host && host.id) return "#" + host.id + " table";
    if (table.classList.contains("data-table")) return "table.data-table";
    return "table";
  }

  function getTableThKeys(table) {
    const row = table && table.querySelector("thead tr");
    if (!row) return [];
    return Array.from(row.querySelectorAll("th")).map(function (th) {
      return ensureKey(th);
    });
  }

  function normalizeColumnOrder(tableSelector, table) {
    if (!table) return [];
    if (!state.columnOrder) state.columnOrder = {};
    const domKeys = getTableThKeys(table);
    if (!domKeys.length) return [];
    let order = (state.columnOrder[tableSelector] || []).slice();
    order = order.filter(function (k) {
      return domKeys.indexOf(k) !== -1;
    });
    domKeys.forEach(function (k) {
      if (order.indexOf(k) === -1) order.push(k);
    });
    state.columnOrder[tableSelector] = order;
    return order;
  }

  function applyColumnOrderForTable(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    const theadRow = table.querySelector("thead tr");
    if (!theadRow) return;

    const order = normalizeColumnOrder(tableSelector, table);
    if (!order.length) return;

    const thEls = Array.from(theadRow.querySelectorAll("th"));
    const oldKeys = thEls.map(function (th) {
      return ensureKey(th);
    });
    const thMap = {};
    thEls.forEach(function (th) {
      thMap[ensureKey(th)] = th;
    });

    order.forEach(function (k) {
      if (thMap[k]) theadRow.appendChild(thMap[k]);
    });

    const perm = order.map(function (k) {
      return oldKeys.indexOf(k);
    });
    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach(function (tr) {
      if (tr.querySelector("td[colspan]")) return;
      const tds = Array.from(tr.children).filter(function (c) {
        return c.tagName === "TD";
      });
      if (tds.length !== oldKeys.length) return;
      perm.forEach(function (oldIdx) {
        tr.appendChild(tds[oldIdx]);
      });
    });

    syncTableColspans(table);
  }

  function applyColumnOrder() {
    if (!state.columnOrder) return;
    Object.keys(state.columnOrder).forEach(function (sel) {
      applyColumnOrderForTable(sel);
    });
  }

  function moveColumn(tableSelector, colKey, direction) {
    const table = document.querySelector(tableSelector);
    if (!table) {
      toast("未找到表格");
      return;
    }
    normalizeColumnOrder(tableSelector, table);
    const order = state.columnOrder[tableSelector];
    const idx = order.indexOf(colKey);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) {
      toast(newIdx < 0 ? "已在最左" : "已在最右");
      return;
    }
    const next = order.slice();
    const tmp = next[idx];
    next[idx] = next[newIdx];
    next[newIdx] = tmp;
    state.columnOrder[tableSelector] = next;
    persist();
    applyColumnOrderForTable(tableSelector);
    toast("列顺序已更新");
  }

  function getTableColumnCount(table) {
    if (!table) return 0;
    return table.querySelectorAll("thead tr:first-child th").length;
  }

  function syncTableColspans(table) {
    if (!table) return;
    const n = getTableColumnCount(table);
    if (n < 1) return;
    table.querySelectorAll("tbody td[colspan]").forEach(function (td) {
      const span = parseInt(td.getAttribute("colspan") || td.colSpan, 10);
      if (span !== n) {
        td.colSpan = n;
        td.setAttribute("colspan", String(n));
      }
    });
  }

  function styleAddedCell(cell, isHeader) {
    cell.classList.add("pe-added-col");
    cell.setAttribute("data-pe-added", "true");
    if (!isHeader && (cell.textContent === "—" || cell.textContent === "-")) {
      cell.classList.add("pe-added-col-empty");
    }
  }

  function registerColumnInOrder(tableSelector, colKey) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    if (!state.columnOrder) state.columnOrder = {};
    normalizeColumnOrder(tableSelector, table);
    const order = state.columnOrder[tableSelector];
    if (order.indexOf(colKey) === -1) order.push(colKey);
  }

  function applyAddedColumns() {
    const touched = new Set();
    (state.addedColumns || []).forEach(function (col) {
      const table = document.querySelector(col.tableSelector || "table");
      if (!table) return;
      const tableSelector = col.tableSelector || findTableSelector(table);
      col.tableSelector = tableSelector;
      touched.add(tableSelector);

      const theadRow = table.querySelector("thead tr");
      if (!theadRow) return;

      let th = table.querySelector('th[data-pe-key="' + col.id + '"]');
      if (!th) {
        th = document.createElement("th");
        th.setAttribute("data-pe-key", col.id);
        theadRow.appendChild(th);
      }
      th.textContent = col.header || "新列";
      styleAddedCell(th, true);
      registerColumnInOrder(tableSelector, col.id);

      const fallback = col.defaultValue != null ? col.defaultValue : "—";
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        if (tr.querySelector("td[colspan]")) return;
        let td = tr.querySelector('td[data-pe-key="' + col.id + '"]');
        if (!td) {
          td = document.createElement("td");
          td.setAttribute("data-pe-key", col.id);
          tr.appendChild(td);
        }
        if (!td.textContent.trim() || td.getAttribute("data-pe-auto") === "1") {
          td.textContent = fallback;
          td.setAttribute("data-pe-auto", "1");
        }
        styleAddedCell(td, false);
      });
    });

    touched.forEach(function (sel) {
      const table = document.querySelector(sel);
      syncTableColspans(table);
    });
  }

  function applyAll() {
    applyAddedFilters();
    applyAddedColumns();
    applyMockOverrides();
    applyTextOverrides();
    applyColumnOrder();
    applyHidden();
  }

  function hookRenderFunctions() {
    if (window[HOOKED_KEY]) return;
    window[HOOKED_KEY] = true;
    const names = (config.renderHooks || []).slice();
    ["renderTable", "renderRows", "renderList", "refreshTable", "renderKpis", "renderSplit"].forEach(
      function (n) {
        if (names.indexOf(n) === -1) names.push(n);
      }
    );
    names.forEach(function (name) {
      const fn = window[name];
      if (typeof fn !== "function" || fn.__peWrapped) return;
      const wrapped = function () {
        const ret = fn.apply(this, arguments);
        setTimeout(applyAll, 0);
        return ret;
      };
      wrapped.__peWrapped = true;
      window[name] = wrapped;
    });
  }

  function observeTables() {
    if (window[OBSERVER_KEY]) return;
    const obs = new MutationObserver(function () {
      clearTimeout(observeTables._t);
      observeTables._t = setTimeout(applyAll, 200);
    });
    document.querySelectorAll("table tbody").forEach(function (tb) {
      obs.observe(tb, { childList: true, subtree: true });
    });
    window[OBSERVER_KEY] = obs;
  }

  function closePanel() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
  }

  function positionPanel(anchor) {
    const rect = (anchor || document.body).getBoundingClientRect();
    let left = rect.right + 8;
    let top = Math.max(12, rect.top);
    if (left + 340 > window.innerWidth) left = Math.max(8, rect.left - 348);
    if (top + 420 > window.innerHeight) top = Math.max(12, window.innerHeight - 430);
    panelEl.style.left = left + "px";
    panelEl.style.top = top + "px";
  }

  function mkBtn(label, cls, fn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (cls) btn.className = cls;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    });
    return btn;
  }

  function appendActions(parent, buttons) {
    const wrap = document.createElement("div");
    wrap.className = "pe-actions";
    buttons.forEach(function (b) {
      wrap.appendChild(b);
    });
    parent.appendChild(wrap);
  }

  function openPanelBuilder(anchor, builder) {
    closePanel();
    panelEl = document.createElement("div");
    panelEl.className = "pe-panel pe-root";
    panelEl.setAttribute(ROOT_ATTR, "1");
    panelEl.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    builder(panelEl);
    document.body.appendChild(panelEl);
    positionPanel(anchor);
  }

  function applyTextChange(textTarget, textKey, value) {
    state.text[textKey] = value;
    if (textTarget.tagName === "TH") setColumnHeaderText(textTarget, value);
    else if (textTarget.tagName === "INPUT" || textTarget.tagName === "TEXTAREA") textTarget.value = value;
    else textTarget.textContent = value;
    persist();
    toast("已生效");
  }

  function toggleHidden(el, key) {
    const idx = (state.hidden || []).indexOf(key);
    if (idx === -1) {
      state.hidden.push(key);
      el.classList.add("pe-hidden-by-edit");
      toast("已隐藏");
    } else {
      state.hidden.splice(idx, 1);
      el.classList.remove("pe-hidden-by-edit");
      toast("已恢复显示");
    }
    persist();
  }

  function showElementPanel(el) {
    const thEl = el.tagName === "TH" ? el : el.closest && el.closest("th");
    const editEl = thEl || el;
    const key = ensureKey(editEl);
    const textTarget = getTextTarget(editEl);
    const textKey = textTarget ? ensureKey(textTarget) : key;
    const isHidden = (state.hidden || []).indexOf(key) !== -1;
    const tag = editEl.tagName.toLowerCase();
    const curText =
      textTarget && textTarget.tagName === "TH"
        ? getColumnHeaderText(textTarget)
        : textTarget && textTarget.tagName === "INPUT"
          ? textTarget.value
          : textTarget
            ? state.text[textKey] != null
              ? state.text[textKey]
              : textTarget.textContent
            : "";

    let tableSelector = "";
    let colKey = "";
    if (thEl) {
      const table = thEl.closest("table");
      if (table) {
        tableSelector = findTableSelector(table);
        colKey = ensureKey(thEl);
        lastTableSelector = tableSelector;
      }
    }

    openPanelBuilder(editEl, function (panel) {
      const h4 = document.createElement("h4");
      h4.textContent = thEl ? "编辑列表列" : "编辑元素";
      panel.appendChild(h4);
      const meta = document.createElement("div");
      meta.className = "pe-meta";
      meta.textContent = tag + " · " + (thEl ? colKey : key);
      panel.appendChild(meta);

      let inp = null;
      if (textTarget) {
        const lab = document.createElement("label");
        lab.textContent = "文案";
        panel.appendChild(lab);
        inp = document.createElement("input");
        inp.type = "text";
        inp.id = "pe-text-inp";
        inp.value = curText || "";
        panel.appendChild(inp);
      }

      const actions = [
        mkBtn("保存", "pe-primary", function () {
          if (inp && textTarget) applyTextChange(textTarget, textKey, inp.value.trim());
          closePanel();
        })
      ];

      if (thEl && tableSelector) {
        actions.push(
          mkBtn("← 左移", "", function () {
            moveColumn(tableSelector, colKey, -1);
          }),
          mkBtn("右移 →", "", function () {
            moveColumn(tableSelector, colKey, 1);
          })
        );
      }

      actions.push(
        mkBtn(isHidden ? "恢复显示" : "隐藏", isHidden ? "" : "pe-danger", function () {
          toggleHidden(editEl, key);
          closePanel();
        }),
        mkBtn("关闭", "", closePanel)
      );

      appendActions(panel, actions);
    });
  }

  function showMockPanel() {
    const registry = (config.mockRegistry || []).length ? config.mockRegistry : autoDetectMockRegistry();
    if (!registry.length) {
      toast("未配置 mock 路径");
      return;
    }

    openPanelBuilder(document.querySelector(".pe-toolbar"), function (panel) {
      const h4 = document.createElement("h4");
      h4.textContent = "Mock 数据";
      panel.appendChild(h4);
      const areas = [];
      registry.forEach(function (item, idx) {
        const path = item.path || item;
        const label = item.label || path;
        const lab = document.createElement("label");
        lab.textContent = label;
        panel.appendChild(lab);
        const ta = document.createElement("textarea");
        ta.id = "pe-mock-" + idx;
        const cur = state.mock[path];
        ta.value = cur != null ? cur : JSON.stringify(getPathValue(path), null, 2) || "[]";
        panel.appendChild(ta);
        areas.push({ path: path, ta: ta });
      });
      appendActions(panel, [
        mkBtn("应用", "pe-primary", function () {
          areas.forEach(function (a) {
            state.mock[a.path] = a.ta.value;
          });
          persist();
          applyMockOverrides();
          applyAll();
          toast("Mock 已应用");
          closePanel();
        }),
        mkBtn("关闭", "", closePanel)
      ]);
    });
  }

  function autoDetectMockRegistry() {
    const paths = [];
    [
      "MOCK_MSKU_UNIVERSE",
      "MOCK_ROWS",
      "mockRows",
      "ROWS",
      "tableData",
      "SALES_BASE_RECORDS",
      "PROTOTYPE_SKUS"
    ].forEach(function (name) {
      if (window[name] != null) paths.push({ path: "window." + name, label: name });
    });
    return paths;
  }

  function getCatalogItems() {
    const fromConfig = config.componentCatalog && config.componentCatalog.components;
    const list = (fromConfig || catalog.components || DEFAULT_CATALOG.components).filter(function (c) {
      return c.tier === "page-edit";
    });
    return list;
  }

  function showAddComponentPanel() {
    const items = getCatalogItems();
    if (!items.length) {
      toast("无可用组件");
      return;
    }
    const tableTargets = getTableTargets();

    openPanelBuilder(document.querySelector(".pe-toolbar"), function (panel) {
      const h4 = document.createElement("h4");
      h4.textContent = "添加组件";
      panel.appendChild(h4);

      const typeLab = document.createElement("label");
      typeLab.textContent = "类型";
      panel.appendChild(typeLab);
      const typeSel = document.createElement("select");
      typeSel.id = "pe-add-type";
      items.forEach(function (c, i) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = c.label;
        opt.setAttribute("data-category", c.category || "");
        typeSel.appendChild(opt);
      });
      panel.appendChild(typeSel);

      const tableLab = document.createElement("label");
      tableLab.id = "pe-add-table-lab";
      tableLab.textContent = "目标表格";
      panel.appendChild(tableLab);
      const tableSel = document.createElement("select");
      tableSel.id = "pe-add-table";
      tableTargets.forEach(function (t) {
        const opt = document.createElement("option");
        opt.value = t.selector;
        opt.textContent = t.label;
        tableSel.appendChild(opt);
      });
      if (lastTableSelector && tableTargets.some(function (t) { return t.selector === lastTableSelector; })) {
        tableSel.value = lastTableSelector;
      }
      panel.appendChild(tableSel);

      const labelLab = document.createElement("label");
      labelLab.textContent = "标签/列名";
      panel.appendChild(labelLab);
      const labelInp = document.createElement("input");
      labelInp.type = "text";
      labelInp.id = "pe-add-label";
      labelInp.value = "新筛选项";
      panel.appendChild(labelInp);

      const optLab = document.createElement("label");
      optLab.id = "pe-add-opt-lab";
      optLab.textContent = "选项（下拉，逗号分隔）";
      panel.appendChild(optLab);
      const optInp = document.createElement("input");
      optInp.type = "text";
      optInp.id = "pe-add-options";
      optInp.value = "全部,选项A,选项B";
      panel.appendChild(optInp);

      function syncAddFormVisibility() {
        const idx = parseInt(typeSel.value, 10);
        const comp = items[idx];
        const isColumn = comp && comp.category === "column";
        const isFilter = comp && comp.category === "filter";
        tableLab.style.display = isColumn ? "" : "none";
        tableSel.style.display = isColumn ? "" : "none";
        optLab.style.display = isFilter && comp.id === "filter-select" ? "" : "none";
        optInp.style.display = isFilter && comp.id === "filter-select" ? "" : "none";
        labelLab.textContent = isColumn ? "列名" : "标签/列名";
        if (isColumn) labelInp.value = labelInp.value === "新筛选项" ? "新列" : labelInp.value;
      }
      typeSel.addEventListener("change", syncAddFormVisibility);
      syncAddFormVisibility();

      appendActions(panel, [
        mkBtn("插入", "pe-primary", function () {
          const idx = parseInt(typeSel.value, 10);
          const comp = items[idx];
          if (!comp) {
            toast("请选择类型");
            return;
          }
          const label = labelInp.value.trim() || "新项";
          const id = uid("pe-add");

          if (comp.category === "filter") {
            state.addedFilters.push({
              id: id,
              template: comp.id,
              label: label,
              options: (optInp.value || "全部")
                .split(",")
                .map(function (s) {
                  return s.trim();
                })
                .filter(Boolean),
              mountSelector: (comp.mountSelectors && comp.mountSelectors[0]) || ".filter-grid"
            });
            applyAddedFilters();
          } else if (comp.category === "column") {
            const tableSelector = tableSel.value;
            const table = document.querySelector(tableSelector);
            if (!table) {
              toast("未找到所选表格");
              return;
            }
            state.addedColumns.push({
              id: id,
              tableSelector: tableSelector,
              header: label,
              defaultValue: "—"
            });
            lastTableSelector = tableSelector;
            applyAddedColumns();
            applyColumnOrderForTable(tableSelector);
            toast("已添加到「" + (tableSel.options[tableSel.selectedIndex].text || "表格") + "」");
          } else {
            toast("暂不支持该类型");
            return;
          }
          persist();
          if (comp.category !== "column") toast("已插入并生效");
          closePanel();
        }),
        mkBtn("关闭", "", closePanel)
      ]);
    });
  }

  function saveToPage() {
    persist();
    toast("已保存：刷新仍生效；请 Cmd+S 保存 HTML 以同步到 Git");
  }

  function enterEditMode() {
    editMode = true;
    document.body.classList.add("pe-edit-mode");
    const btn = document.getElementById("pe-btn-edit");
    btn.classList.add("pe-active");
    btn.textContent = "点选元素…";

    pickHandlers = {
      move: function (e) {
        const t = pickTarget(e.target);
        if (pickHighlight && pickHighlight !== t) pickHighlight.classList.remove("pe-pick-highlight");
        if (t) {
          pickHighlight = t;
          t.classList.add("pe-pick-highlight");
        }
      },
      down: function (e) {
        if (isPeChrome(e.target)) return;
        if (e.button !== 0) return;
        const t = pickTarget(e.target);
        if (!t) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        showElementPanel(t);
      },
      click: function (e) {
        if (isPeChrome(e.target)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    };
    document.addEventListener("mousemove", pickHandlers.move, true);
    document.addEventListener("pointerdown", pickHandlers.down, true);
    document.addEventListener("click", pickHandlers.click, true);
  }

  function exitEditMode() {
    editMode = false;
    document.body.classList.remove("pe-edit-mode");
    const btn = document.getElementById("pe-btn-edit");
    if (btn) {
      btn.classList.remove("pe-active");
      btn.textContent = "编辑模式";
    }
    if (pickHighlight) pickHighlight.classList.remove("pe-pick-highlight");
    if (pickHandlers) {
      document.removeEventListener("mousemove", pickHandlers.move, true);
      document.removeEventListener("pointerdown", pickHandlers.down, true);
      document.removeEventListener("click", pickHandlers.click, true);
      pickHandlers = null;
    }
    closePanel();
  }

  function buildToolbar() {
    const bar = document.createElement("div");
    bar.className = "pe-toolbar pe-root";
    bar.setAttribute(ROOT_ATTR, "1");
    bar.innerHTML =
      '<button type="button" id="pe-btn-edit">编辑模式</button>' +
      '<button type="button" id="pe-btn-add">添加组件</button>' +
      '<button type="button" id="pe-btn-mock">Mock</button>' +
      '<button type="button" id="pe-btn-save" class="pe-primary">保存</button>';
    document.body.appendChild(bar);

    document.getElementById("pe-btn-edit").addEventListener("click", function (e) {
      e.stopPropagation();
      if (editMode) exitEditMode();
      else enterEditMode();
    });
    document.getElementById("pe-btn-add").addEventListener("click", function (e) {
      e.stopPropagation();
      showAddComponentPanel();
    });
    document.getElementById("pe-btn-mock").addEventListener("click", function (e) {
      e.stopPropagation();
      showMockPanel();
    });
    document.getElementById("pe-btn-save").addEventListener("click", function (e) {
      e.stopPropagation();
      saveToPage();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (editMode) exitEditMode();
        else closePanel();
      }
    });
  }

  function loadCatalog() {
    if (config.componentCatalog) {
      catalog = config.componentCatalog;
      return Promise.resolve();
    }
    const script = document.querySelector('script[src*="prototype-edit-runtime"]');
    if (!script || !script.src || script.src.indexOf("file:") === 0) {
      catalog = DEFAULT_CATALOG;
      return Promise.resolve();
    }
    const base = script.src.replace(/prototype-edit-runtime\.js.*$/, "");
    return fetch(base + "component-catalog.json")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data && data.components) catalog = data;
      })
      .catch(function () {
        catalog = DEFAULT_CATALOG;
      });
  }

  function scanAndAssignKeys() {
    document
      .querySelectorAll("thead th, .f, .f-item, .field, button, h1, .title, .panel-head, label")
      .forEach(function (el) {
        if (!isPeChrome(el) && !el.getAttribute("data-pe-key")) ensureKey(el);
      });
  }

  function mount() {
    config = readConfig();
    if (!config) return;

    const canonical = config.canonicalEdits || config.edits || emptyState();
    const local = loadLocalState();
    state = mergeEdits(canonical, local);

    removeOld();
    buildToolbar();
    hookRenderFunctions();

    loadCatalog().then(function () {
      scanAndAssignKeys();
      observeTables();
      applyAll();
      syncConfigToDom();
    });
  }

  function removeOld() {
    exitEditMode();
    document.querySelectorAll("[" + ROOT_ATTR + "]").forEach(function (n) {
      n.remove();
    });
    if (window[OBSERVER_KEY]) {
      window[OBSERVER_KEY].disconnect();
      window[OBSERVER_KEY] = null;
    }
  }

  window.PrototypeEdit = {
    mount: mount,
    applyAll: applyAll,
    getState: function () {
      return cloneState(state);
    },
    persist: persist
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
