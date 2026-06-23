(function () {
  "use strict";

  const ROOT_ATTR = "data-pe-root";
  const STORAGE_PREFIX = "prototypeEdit:";
  const OBSERVER_KEY = "__prototypeEditObserver";
  const HOOKED_KEY = "__prototypeEditHookedFns";
  const CATALOG_URL_SUFFIX = "/component-catalog.json";

  let config = null;
  let catalog = { components: [] };
  let state = emptyState();
  let editMode = false;
  let pickHighlight = null;
  let panelEl = null;
  let toastTimer = null;
  let pickHandlers = null;
  let selectedEl = null;

  function emptyState() {
    return {
      text: {},
      hidden: [],
      mock: {},
      addedFilters: [],
      addedColumns: [],
      addedButtons: [],
      addedFormFields: []
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
    return `${STORAGE_PREFIX}${config.pageId || "page"}`;
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function saveLocalState() {
    localStorage.setItem(storageKey(), JSON.stringify(state));
  }

  function mergeEdits(base, overlay) {
    const out = emptyState();
    out.text = Object.assign({}, base.text || {}, overlay.text || {});
    const hidden = new Set([].concat(base.hidden || [], overlay.hidden || []));
    out.hidden = Array.from(hidden);
    out.mock = Object.assign({}, base.mock || {}, overlay.mock || {});
    out.addedFilters = (overlay.addedFilters || base.addedFilters || []).slice();
    out.addedColumns = (overlay.addedColumns || base.addedColumns || []).slice();
    out.addedButtons = (overlay.addedButtons || base.addedButtons || []).slice();
    out.addedFormFields = (overlay.addedFormFields || base.addedFormFields || []).slice();
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
    }, 2400);
  }

  function ensureKey(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.getAttribute("data-pe-key")) return el.getAttribute("data-pe-key");
    const tag = el.tagName.toLowerCase();
    const id = el.id ? "id-" + el.id : "";
    const txt = (el.textContent || "").trim().slice(0, 24).replace(/\s+/g, "-");
    const key = "pe:" + (id || tag + (txt ? "-" + txt : "") + "-" + uid("k"));
    el.setAttribute("data-pe-key", key);
    return key;
  }

  function resolveByKey(key) {
    return document.querySelector('[data-pe-key="' + key + '"]');
  }

  function isPeUi(el) {
    return el && el.closest && el.closest("[" + ROOT_ATTR + "]");
  }

  function pickTarget(el) {
    if (!el || isPeUi(el)) return null;
    const candidates = [
      ".f-item",
      ".field",
      "button",
      "th",
      "td",
      "h1",
      "h2",
      "h3",
      "label",
      ".jd-card-title",
      ".btn-primary",
      ".btn",
      "select",
      "input",
      "textarea",
      "table",
      "section"
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      const hit = el.closest(candidates[i]);
      if (hit && !isPeUi(hit)) return hit;
    }
    return el;
  }

  function getTextTarget(el) {
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      const lbl = el.closest(".f-item, .field");
      if (lbl) {
        const lab = lbl.querySelector("label");
        if (lab) return lab;
      }
    }
    if (tag === "TH") {
      const inner = el.querySelector(".th-inner, span, div");
      return inner || el;
    }
    if (tag === "BUTTON") return el;
    if (el.querySelector && el.querySelector("label") && el.classList.contains("f-item")) {
      return el.querySelector("label");
    }
    return el;
  }

  function applyTextOverrides() {
    Object.keys(state.text || {}).forEach(function (key) {
      const el = resolveByKey(key);
      const val = state.text[key];
      if (!el || val == null) return;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = val;
      } else if (el.tagName === "BUTTON") {
        el.textContent = val;
      } else {
        el.textContent = val;
      }
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
    const hooks = (config && config.renderHooks) || [];
    hooks.forEach(function (name) {
      if (typeof window[name] === "function") {
        try {
          window[name]();
        } catch (_e) {
          /* ignore */
        }
      }
    });
  }

  function buildFilterNode(def) {
    const wrap = document.createElement("div");
    wrap.className = "f-item pe-added-filter";
    wrap.setAttribute("data-pe-key", def.id);
    wrap.setAttribute("data-pe-added", "true");

    if (def.template === "filter-select") {
      wrap.innerHTML =
        '<label></label><select class="ctl"><option>全部</option></select>';
      wrap.querySelector("label").textContent = def.label || "新筛选项";
      const sel = wrap.querySelector("select");
      (def.options || ["全部"]).forEach(function (opt, idx) {
        if (idx === 0) {
          sel.options[0].textContent = opt;
        } else {
          const o = document.createElement("option");
          o.textContent = opt;
          sel.appendChild(o);
        }
      });
    } else if (def.template === "filter-text") {
      wrap.innerHTML = '<label></label><input type="text" />';
      wrap.querySelector("label").textContent = def.label || "关键词";
      wrap.querySelector("input").placeholder = def.inputPlaceholder || "请输入";
    } else if (def.template === "filter-month-placeholder") {
      wrap.innerHTML = '<label></label><div class="pe-month-ph">YYYY-MM - YYYY-MM</div>';
      wrap.querySelector("label").textContent = def.label || "月份范围";
    }
    return wrap;
  }

  function applyAddedFilters() {
    (state.addedFilters || []).forEach(function (def) {
      if (resolveByKey(def.id)) return;
      const mount =
        (def.mountSelector && document.querySelector(def.mountSelector)) ||
        document.querySelector(".filter-grid") ||
        document.querySelector(".filter-panel");
      if (!mount) return;
      mount.appendChild(buildFilterNode(def));
    });
  }

  function applyAddedColumns() {
    (state.addedColumns || []).forEach(function (col) {
      const table = document.querySelector(col.tableSelector);
      if (!table) return;
      const theadRow = table.querySelector("thead tr");
      if (!theadRow) return;
      let th = table.querySelector('th[data-pe-key="' + col.id + '"]');
      if (!th) {
        th = document.createElement("th");
        th.setAttribute("data-pe-key", col.id);
        th.setAttribute("data-pe-added", "true");
        th.textContent = col.header || "新列";
        theadRow.appendChild(th);
      } else {
        th.textContent = col.header || th.textContent;
      }
      const field = col.mockField || "newCol";
      const fallback = col.defaultValue != null ? col.defaultValue : "—";
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        let td = tr.querySelector('td[data-pe-key="' + col.id + '"]');
        if (!td) {
          td = document.createElement("td");
          td.setAttribute("data-pe-key", col.id);
          td.setAttribute("data-pe-added", "true");
          tr.appendChild(td);
        }
        if (td.textContent === "" || td.getAttribute("data-pe-auto") === "1") {
          td.textContent = fallback;
          td.setAttribute("data-pe-auto", "1");
        }
        td.setAttribute("data-pe-field", field);
      });
    });
  }

  function applyAll() {
    applyAddedFilters();
    applyAddedColumns();
    applyMockOverrides();
    applyTextOverrides();
    applyHidden();
  }

  function hookRenderFunctions() {
    if (window[HOOKED_KEY]) return;
    window[HOOKED_KEY] = true;
    const names = (config && config.renderHooks) || [];
    ["renderTable", "renderRows", "renderList", "refreshTable"].forEach(function (n) {
      if (names.indexOf(n) === -1) names.push(n);
    });
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
    const targets = document.querySelectorAll("table tbody");
    if (!targets.length) return;
    const obs = new MutationObserver(function () {
      clearTimeout(observeTables._t);
      observeTables._t = setTimeout(applyAll, 300);
    });
    targets.forEach(function (tb) {
      obs.observe(tb, { childList: true, subtree: true });
    });
    window[OBSERVER_KEY] = obs;
  }

  function exportSidecar() {
    const payload = {
      pageId: config.pageId,
      sidecarVersion: (config.sidecarVersion || 0) + 1,
      updatedAt: new Date().toISOString(),
      pageTitle: config.pageTitle || document.title,
      edits: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (config.pageId || "page") + ".prototype-edit.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("已导出 sidecar JSON，请放入 HTML 同目录并提交 Git");
  }

  function closePanel() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
    selectedEl = null;
  }

  function openPanel(anchor, html) {
    closePanel();
    panelEl = document.createElement("div");
    panelEl.className = "pe-panel pe-root";
    panelEl.setAttribute(ROOT_ATTR, "1");
    panelEl.innerHTML = html;
    document.body.appendChild(panelEl);
    const rect = anchor.getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.top;
    if (left + 320 > window.innerWidth) left = Math.max(8, rect.left - 328);
    if (top + 400 > window.innerHeight) top = Math.max(60, window.innerHeight - 420);
    panelEl.style.left = left + "px";
    panelEl.style.top = top + "px";
    panelEl.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  function panelActions(buttons) {
    const wrap = document.createElement("div");
    wrap.className = "pe-actions";
    buttons.forEach(function (b) {
      wrap.appendChild(b);
    });
    return wrap.outerHTML;
  }

  function mkBtn(label, cls, fn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (cls) btn.className = cls;
    btn.addEventListener("click", fn);
    return btn;
  }

  function showElementPanel(el) {
    selectedEl = el;
    const key = ensureKey(el);
    const textTarget = getTextTarget(el);
    const textKey = ensureKey(textTarget);
    const isHidden = (state.hidden || []).indexOf(key) !== -1;
    const tag = el.tagName.toLowerCase();

    let html =
      "<h4>编辑元素</h4>" +
      '<div class="pe-meta">' +
      key +
      "<br>" +
      tag +
      "</div>";

    if (textTarget) {
      const curText =
        textTarget.tagName === "INPUT"
          ? textTarget.value
          : (state.text[textKey] != null ? state.text[textKey] : textTarget.textContent);
      html +=
        '<label>文案</label><input type="text" id="pe-text-inp" value="' +
        String(curText || "").replace(/"/g, "&quot;") +
        '" />';
    }

    html += panelActions([
      mkBtn("保存文案", "pe-primary", function () {
        const inp = document.getElementById("pe-text-inp");
        if (inp && textTarget) {
          state.text[textKey] = inp.value;
          if (textTarget.tagName === "INPUT") textTarget.value = inp.value;
          else textTarget.textContent = inp.value;
          saveLocalState();
          toast("已保存文案");
        }
        closePanel();
      }),
      mkBtn(isHidden ? "取消隐藏" : "隐藏", isHidden ? "" : "pe-danger", function () {
        const idx = (state.hidden || []).indexOf(key);
        if (idx === -1) {
          state.hidden.push(key);
          el.classList.add("pe-hidden-by-edit");
          toast("已隐藏（刷新仍生效）");
        } else {
          state.hidden.splice(idx, 1);
          el.classList.remove("pe-hidden-by-edit");
          toast("已恢复显示");
        }
        saveLocalState();
        closePanel();
      }),
      mkBtn("关闭", "", closePanel)
    ]);

    openPanel(el, html);
  }

  function showMockPanel() {
    const registry = (config && config.mockRegistry) || autoDetectMockRegistry();
    if (!registry.length) {
      toast("未检测到 mock 数据路径，可在 config.mockRegistry 中配置");
      return;
    }
    let html = "<h4>Mock 数据</h4>";
    registry.forEach(function (item, idx) {
      const path = item.path || item;
      const label = item.label || path;
      const cur = state.mock[path];
      const val =
        cur != null
          ? cur
          : JSON.stringify(getPathValue(path), null, 2);
      html +=
        '<label>' +
        label +
        " (" +
        path +
        ')</label><textarea id="pe-mock-' +
        idx +
        '">' +
        String(val || "[]").replace(/</g, "&lt;") +
        "</textarea>";
    });
    html += panelActions([
      mkBtn("应用并重绘", "pe-primary", function () {
        registry.forEach(function (item, idx) {
          const path = item.path || item;
          const ta = document.getElementById("pe-mock-" + idx);
          if (ta) state.mock[path] = ta.value;
        });
        saveLocalState();
        applyMockOverrides();
        applyAll();
        toast("Mock 已应用");
        closePanel();
      }),
      mkBtn("关闭", "", closePanel)
    ]);
    openPanel(document.querySelector(".pe-toolbar") || document.body, html);
  }

  function autoDetectMockRegistry() {
    const paths = [];
    ["MOCK_ROWS", "mockRows", "ROWS", "tableData", "listData", "DATA"].forEach(function (name) {
      if (window[name] != null) paths.push({ path: "window." + name, label: name });
    });
    return paths;
  }

  function showAddComponentPanel() {
    const items = (catalog.components || []).filter(function (c) {
      return c.tier === "page-edit";
    });
    let opts = items
      .map(function (c, i) {
        return '<option value="' + i + '">' + c.label + "</option>";
      })
      .join("");
    let html =
      "<h4>添加组件</h4>" +
      '<label>类型</label><select id="pe-add-type">' +
      opts +
      "</select>" +
      '<label>标签/列名</label><input type="text" id="pe-add-label" value="新筛选项" />' +
      '<label>选项（下拉，逗号分隔）</label><input type="text" id="pe-add-options" value="全部,选项A,选项B" />';
    html += panelActions([
      mkBtn("插入", "pe-primary", function () {
        const idx = parseInt(document.getElementById("pe-add-type").value, 10);
        const comp = items[idx];
        if (!comp) return;
        const label = document.getElementById("pe-add-label").value.trim();
        const id = uid("pe-add");

        if (comp.category === "filter") {
          const def = {
            id: id,
            template: comp.id,
            label: label,
            options: (document.getElementById("pe-add-options").value || "全部")
              .split(",")
              .map(function (s) {
                return s.trim();
              }),
            mountSelector: comp.mountSelectors && comp.mountSelectors[0]
          };
          state.addedFilters.push(def);
          applyAddedFilters();
        } else if (comp.category === "column") {
          const tableSel =
            (comp.mountSelectors || []).map(function (s) {
              return document.querySelector(s);
            }).filter(Boolean)[0] || document.querySelector("table");
          if (!tableSel) {
            toast("未找到表格，请点选表格后再试");
            return;
          }
          const tableSelector = comp.mountSelectors.find(function (s) {
            return document.querySelector(s) === tableSel;
          }) || "table";
          state.addedColumns.push({
            id: id,
            tableSelector: tableSelector,
            header: label,
            mockField: "newCol",
            defaultValue: "—"
          });
          applyAddedColumns();
        } else {
          toast("该组件类型请后续版本支持，或让 Agent 改源 HTML");
          return;
        }
        saveLocalState();
        toast("已添加");
        closePanel();
      }),
      mkBtn("关闭", "", closePanel)
    ]);
    openPanel(document.querySelector(".pe-toolbar") || document.body, html);
  }

  function enterEditMode() {
    editMode = true;
    document.body.classList.add("pe-edit-mode");
    document.getElementById("pe-btn-edit").classList.add("pe-active");
    document.getElementById("pe-btn-edit").textContent = "点选元素…";

    pickHandlers = {
      move: function (e) {
        const t = pickTarget(e.target);
        if (pickHighlight && pickHighlight !== t) pickHighlight.classList.remove("pe-pick-highlight");
        if (t) {
          pickHighlight = t;
          t.classList.add("pe-pick-highlight");
        }
      },
      click: function (e) {
        if (isPeUi(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        const t = pickTarget(e.target);
        if (t) showElementPanel(t);
      }
    };
    document.addEventListener("mousemove", pickHandlers.move, true);
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
      '<button type="button" id="pe-btn-mock">Mock</button>' +
      '<button type="button" id="pe-btn-add">添加组件</button>' +
      '<button type="button" id="pe-btn-export" class="pe-primary">导出修改</button>';

    document.body.appendChild(bar);

    document.getElementById("pe-btn-edit").addEventListener("click", function () {
      if (editMode) exitEditMode();
      else enterEditMode();
    });
    document.getElementById("pe-btn-mock").addEventListener("click", showMockPanel);
    document.getElementById("pe-btn-add").addEventListener("click", showAddComponentPanel);
    document.getElementById("pe-btn-export").addEventListener("click", exportSidecar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && editMode) exitEditMode();
    });
  }

  function loadCatalog() {
    const script = document.querySelector('script[src*="prototype-edit-runtime"]');
    if (!script || !script.src) return Promise.resolve();
    const base = script.src.replace(/prototype-edit-runtime\.js.*$/, "");
    return fetch(base + "component-catalog.json")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data) catalog = data;
      })
      .catch(function () {
        /* file:// or missing catalog */
      });
  }

  function scanAndAssignKeys() {
    document.querySelectorAll(".f-item, .field, button, th, h1, .jd-card-title").forEach(function (el) {
      if (!isPeUi(el) && !el.getAttribute("data-pe-key")) ensureKey(el);
    });
  }

  function mount() {
    config = readConfig();
    if (!config) return;

    const canonical = (config.canonicalEdits || config.edits || emptyState());
    const local = loadLocalState();
    state = mergeEdits(canonical, local);

    removeOld();
    buildToolbar();
    scanAndAssignKeys();

    loadCatalog().then(function () {
      hookRenderFunctions();
      observeTables();
      applyAll();
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
    exportSidecar: exportSidecar
  };

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
