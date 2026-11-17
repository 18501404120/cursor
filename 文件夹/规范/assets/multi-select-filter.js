/**
 * 多选下拉筛选（原型）— 对齐《多选下拉筛选-全局UI规范》
 * - 默认不请求/不渲染选项；首次点击展开时再执行 getOptions
 * - 面板内：搜索 +（可选）首行「全部」+ 多选勾选
 * - summaryMode:"tags"：已选标签显示在触发器输入框内；超出 maxTagCount 时以 +N 收起
 *
 * MultiSelectFilter.mount(container, {
 *   placeholder: '请选择',
 *   showSelectAll: true,
 *   zIndex: 400,
 *   maxPanelHeight: 260,
 *   getOptions: () => [{ value, label }] | Promise<...>,
 *   initialValues: [],
 *   clearable: true,
 *   onChange: (values: string[]) => {},
 *   useBodyPortal: true,
 *   summaryMode: 'inline' | 'tags',
 *   maxTagCount: 1,   // tags 模式：输入框内最多展示的标签数，超出显示 +N
 *   tagMaxLen: 28
 * })
 * useBodyPortal：默认 true，展开时面板挂 document.body + fixed，避免被 overflow 裁切或后续板块盖住。
 * 返回：{ getValues, setValues, clear, destroy, refreshOptions, open, close }
 */
(function (global) {
  var STYLE_ID = "msf-global-style-v2";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var legacy = document.getElementById("msf-global-style-v1");
    if (legacy) legacy.remove();
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      ".msf-root{position:relative;display:inline-block;vertical-align:middle;min-width:200px;max-width:100%;font-size:13px;}" +
      ".msf-trigger-wrap{position:relative;display:flex;width:100%;align-items:center;}" +
      ".msf-trigger{position:relative;display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;min-height:32px;height:32px;padding:2px 28px 2px 6px;border:1px solid #d9d9d9;border-radius:6px;background:#fff;cursor:pointer;text-align:left;color:#0f172a;box-sizing:border-box;font:inherit;overflow:hidden;}" +
      ".msf-trigger-wrap.has-val .msf-trigger{padding-right:48px;}" +
      ".msf-trigger:hover{border-color:#1677ff;}" +
      ".msf-trigger.msf-open{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.12);}" +
      ".msf-trigger .msf-trigger-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".msf-trigger .msf-ph{color:#bfbfbf;}" +
      ".msf-trigger-tags{display:flex;align-items:center;flex:1;min-width:0;gap:4px;overflow:hidden;flex-wrap:nowrap;}" +
      ".msf-clear{position:absolute;right:22px;top:50%;transform:translateY(-50%);width:18px;height:18px;border:none;background:transparent;color:rgba(0,0,0,.25);cursor:pointer;font-size:14px;line-height:1;padding:0;display:none;z-index:1;}" +
      ".msf-clear:hover{color:rgba(0,0,0,.45);}" +
      ".msf-trigger-wrap.has-val .msf-clear{display:block;}" +
      ".msf-chev{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #64748b;pointer-events:none;}" +
      ".msf-panel{position:absolute;left:0;top:100%;margin-top:4px;min-width:100%;width:max-content;max-width:min(420px,92vw);background:#fff;border:1px solid #dbe4f0;border-radius:8px;box-shadow:0 10px 26px rgba(15,23,42,.12);z-index:400;display:none;flex-direction:column;box-sizing:border-box;pointer-events:auto;}" +
      ".msf-panel.msf-show{display:flex;pointer-events:auto !important;}" +
      ".msf-search{padding:8px;border-bottom:1px solid #f0f0f0;}" +
      ".msf-search input{width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px;}" +
      ".msf-list{overflow-y:auto;padding:4px 0;max-height:260px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}" +
      ".msf-row{display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;user-select:none;color:#0f172a;}" +
      ".msf-row:hover{background:#f1f5f9;}" +
      ".msf-row.msf-master{font-weight:600;color:#0f2f63;}" +
      ".msf-row.msf-hidden{display:none;}" +
      ".msf-row input{flex-shrink:0;}" +
      ".msf-empty{padding:12px;color:#64748b;font-size:12px;text-align:center;}" +
      ".msf-loading{padding:12px;color:#64748b;font-size:12px;text-align:center;}" +
      ".msf-root.msf-tags-mode{align-self:stretch;width:100%;}" +
      ".msf-tag{display:inline-flex;align-items:center;gap:2px;max-width:100%;min-width:0;padding:0 6px;height:22px;border-radius:4px;background:#f0f5ff;border:1px solid #d6e4ff;color:#1e3a8a;font-size:12px;line-height:20px;box-sizing:border-box;flex-shrink:1;}" +
      ".msf-tag-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px;}" +
      ".msf-tag-more{flex-shrink:0;background:#f1f5f9;border-color:#e2e8f0;color:#475569;font-weight:600;cursor:default;}" +
      ".msf-tag-rm{flex-shrink:0;border:none;background:transparent;color:#64748b;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;}" +
      ".msf-tag-rm:hover{color:#b91c1c;}";
    document.head.appendChild(st);
  }

  function resolveEl(container) {
    if (!container) return null;
    if (typeof container === "string") return document.getElementById(container) || document.querySelector(container);
    return container;
  }

  function mount(container, options) {
    injectStyle();
    var root = resolveEl(container);
    if (!root) return null;
    options = options || {};
    var placeholder = options.placeholder || "请选择";
    var showSelectAll = options.showSelectAll !== false;
    var zIndex = options.zIndex != null ? options.zIndex : 400;
    var maxPanelHeight = options.maxPanelHeight != null ? options.maxPanelHeight : 260;
    var getOptions = options.getOptions || function () { return []; };
    var onChange = typeof options.onChange === "function" ? options.onChange : function () {};
    var clearable = options.clearable !== false;
    var useBodyPortal = options.useBodyPortal !== false;
    var summaryMode = options.summaryMode === "tags" ? "tags" : "inline";
    var tagMaxLen = options.tagMaxLen != null ? options.tagMaxLen : 28;
    // tags 模式：输入框内最多展示的标签数；超出显示 +N（窄列默认 1）
    var maxTagCount = options.maxTagCount != null ? Math.max(0, Number(options.maxTagCount) || 0) : 1;

    var loaded = false;
    var loading = false;
    var optionsData = [];
    var selected = new Set((options.initialValues || []).map(String));
    var searchQ = "";
    var open = false;
    var floatInterval = null;

    root.classList.add("msf-root");
    if (summaryMode === "tags") root.classList.add("msf-tags-mode");
    root.innerHTML = "";
    root.style.position = "relative";

    var triggerWrap = document.createElement("div");
    triggerWrap.className = "msf-trigger-wrap";

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "msf-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    var clearBtn = null;
    if (clearable) {
      clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "msf-clear";
      clearBtn.setAttribute("aria-label", "清除已选");
      clearBtn.textContent = "×";
      clearBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!selected.size) return;
        selected.clear();
        if (loaded) renderList();
        updateTriggerLabel();
        onChange([]);
      });
    }

    var chev = document.createElement("span");
    chev.className = "msf-chev";
    var textSpan = document.createElement("span");
    textSpan.className = "msf-trigger-text msf-ph";
    textSpan.textContent = placeholder;
    trigger.appendChild(textSpan);
    triggerWrap.appendChild(trigger);
    if (clearBtn) triggerWrap.appendChild(clearBtn);
    triggerWrap.appendChild(chev);

    var panel = document.createElement("div");
    panel.className = "msf-panel";
    panel.style.zIndex = String(zIndex);
    panel.setAttribute("role", "listbox");

    var searchWrap = document.createElement("div");
    searchWrap.className = "msf-search";
    var searchInp = document.createElement("input");
    searchInp.type = "search";
    searchInp.placeholder = "搜索";
    searchInp.setAttribute("aria-label", "搜索选项");
    searchWrap.appendChild(searchInp);

    var list = document.createElement("div");
    list.className = "msf-list";
    list.style.maxHeight = maxPanelHeight + "px";

    panel.appendChild(searchWrap);
    panel.appendChild(list);

    function stopPanelEventBubble(e) {
      e.stopPropagation();
    }
    panel.addEventListener("mousedown", stopPanelEventBubble);
    panel.addEventListener("wheel", stopPanelEventBubble, { passive: true });
    list.addEventListener("wheel", stopPanelEventBubble, { passive: true });
    root.appendChild(triggerWrap);
    root.appendChild(panel);

    function labelByValue(v) {
      var row = optionsData.find(function (o) { return String(o.value) === String(v); });
      return row ? row.label : v;
    }

    function truncateTagLabel(lbl) {
      var s = String(lbl || "");
      if (s.length <= tagMaxLen) return s;
      return s.slice(0, tagMaxLen - 1) + "…";
    }

    function makeTag(v, removable) {
      var full = labelByValue(v);
      var tag = document.createElement("span");
      tag.className = "msf-tag";
      tag.title = full;
      var txt = document.createElement("span");
      txt.className = "msf-tag-text";
      txt.textContent = truncateTagLabel(full);
      tag.appendChild(txt);
      if (removable) {
        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "msf-tag-rm";
        rm.setAttribute("aria-label", "移除 " + full);
        rm.textContent = "×";
        rm.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          selected.delete(String(v));
          syncMasterCheckbox(list.querySelector(".msf-master input"));
          if (loaded) renderList();
          updateTriggerLabel();
          onChange(api.getValues());
        });
        tag.appendChild(rm);
      }
      return tag;
    }

    function renderInlineTags() {
      var arr = Array.from(selected);
      var wrap = document.createElement("span");
      wrap.className = "msf-trigger-tags";
      var showCount = maxTagCount <= 0 ? 0 : Math.min(maxTagCount, arr.length);
      var i;
      for (i = 0; i < showCount; i++) {
        wrap.appendChild(makeTag(arr[i], true));
      }
      var rest = arr.length - showCount;
      if (rest > 0) {
        var more = document.createElement("span");
        more.className = "msf-tag msf-tag-more";
        more.title = arr.slice(showCount).map(labelByValue).join("、");
        more.textContent = "+" + rest;
        wrap.appendChild(more);
      }
      return wrap;
    }

    function repositionPanelIfOpen() {
      if (open && useBodyPortal && panel.parentNode === document.body) {
        positionFloatedPanel();
      }
    }

    function updateTriggerLabel() {
      triggerWrap.classList.toggle("has-val", selected.size > 0);
      trigger.innerHTML = "";
      if (!selected.size) {
        textSpan = document.createElement("span");
        textSpan.className = "msf-trigger-text msf-ph";
        textSpan.textContent = placeholder;
        trigger.appendChild(textSpan);
        repositionPanelIfOpen();
        return;
      }
      if (summaryMode === "tags") {
        trigger.appendChild(renderInlineTags());
        repositionPanelIfOpen();
        return;
      }
      textSpan = document.createElement("span");
      textSpan.className = "msf-trigger-text";
      var arr = Array.from(selected);
      if (arr.length <= 2) {
        textSpan.textContent = arr.map(labelByValue).join("、");
      } else {
        textSpan.textContent = "已选 " + arr.length + " 项";
      }
      trigger.appendChild(textSpan);
      repositionPanelIfOpen();
    }

    function rowVisible(label) {
      var q = searchQ.trim().toLowerCase();
      if (!q) return true;
      return String(label).toLowerCase().indexOf(q) >= 0 || String(label).toLowerCase().replace(/\s/g, "").indexOf(q) >= 0;
    }

    function filteredDataRows() {
      return optionsData.filter(function (o) {
        return rowVisible(o.label) || rowVisible(o.value);
      });
    }

    function syncMasterCheckbox(masterInput) {
      if (!masterInput || !showSelectAll) return;
      var vis = filteredDataRows();
      if (!vis.length) {
        masterInput.checked = false;
        masterInput.indeterminate = false;
        return;
      }
      var n = 0;
      vis.forEach(function (o) {
        if (selected.has(String(o.value))) n++;
      });
      masterInput.checked = n === vis.length && vis.length > 0;
      masterInput.indeterminate = n > 0 && n < vis.length;
    }

    function renderList() {
      list.innerHTML = "";
      if (loading) {
        var ld = document.createElement("div");
        ld.className = "msf-loading";
        ld.textContent = "加载中…";
        list.appendChild(ld);
        return;
      }
      if (!optionsData.length) {
        var em = document.createElement("div");
        em.className = "msf-empty";
        em.textContent = "暂无选项";
        list.appendChild(em);
        return;
      }

      var masterInput = null;
      if (showSelectAll) {
        var mrow = document.createElement("label");
        mrow.className = "msf-row msf-master";
        masterInput = document.createElement("input");
        masterInput.type = "checkbox";
        var mtxt = document.createElement("span");
        mtxt.textContent = "全部";
        mrow.appendChild(masterInput);
        mrow.appendChild(mtxt);
        list.appendChild(mrow);
        masterInput.addEventListener("change", function () {
          var on = masterInput.checked;
          var vis = filteredDataRows();
          vis.forEach(function (o) {
            var k = String(o.value);
            if (on) selected.add(k);
            else selected.delete(k);
          });
          renderList();
          updateTriggerLabel();
          onChange(api.getValues());
        });
      }

      optionsData.forEach(function (o) {
        var vis = rowVisible(o.label) || rowVisible(o.value);
        var lab = document.createElement("label");
        lab.className = "msf-row" + (vis ? "" : " msf-hidden");
        var inp = document.createElement("input");
        inp.type = "checkbox";
        inp.value = String(o.value);
        inp.checked = selected.has(String(o.value));
        var sp = document.createElement("span");
        sp.textContent = o.label != null ? o.label : o.value;
        lab.appendChild(inp);
        lab.appendChild(sp);
        inp.addEventListener("change", function () {
          if (inp.checked) selected.add(inp.value);
          else selected.delete(inp.value);
          syncMasterCheckbox(masterInput);
          updateTriggerLabel();
          onChange(api.getValues());
        });
        list.appendChild(lab);
      });

      syncMasterCheckbox(masterInput);
    }

    function applySearchFilter() {
      searchQ = searchInp.value || "";
      list.querySelectorAll(".msf-row").forEach(function (row) {
        if (row.classList.contains("msf-master")) return;
        var sp = row.querySelector("span");
        var lab = sp ? sp.textContent : "";
        var inp = row.querySelector("input");
        var val = inp ? inp.value : "";
        var vis = rowVisible(lab) || rowVisible(val);
        row.classList.toggle("msf-hidden", !vis);
      });
      var masterInput = list.querySelector(".msf-master input");
      syncMasterCheckbox(masterInput);
    }

    function loadOptionsIfNeeded(cb) {
      if (loaded) {
        if (cb) cb();
        return;
      }
      loading = true;
      renderList();
      try {
        var ret = getOptions();
        if (ret && typeof ret.then === "function") {
          ret.then(function (rows) {
            optionsData = Array.isArray(rows) ? rows : [];
            loaded = true;
            loading = false;
            renderList();
            if (cb) cb();
          }).catch(function () {
            optionsData = [];
            loaded = true;
            loading = false;
            renderList();
            if (cb) cb();
          });
        } else {
          optionsData = Array.isArray(ret) ? ret : [];
          loaded = true;
          loading = false;
          renderList();
          if (cb) cb();
        }
      } catch (e) {
        optionsData = [];
        loaded = true;
        loading = false;
        renderList();
        if (cb) cb();
      }
    }

    function stopFloatSync() {
      if (floatInterval) {
        clearInterval(floatInterval);
        floatInterval = null;
      }
      window.removeEventListener("resize", positionFloatedPanel);
      window.removeEventListener("scroll", positionFloatedPanel, true);
    }

    function restorePanelToRoot() {
      if (panel.parentNode === document.body) {
        root.appendChild(panel);
      }
      panel.style.position = "";
      panel.style.left = "";
      panel.style.top = "";
      panel.style.minWidth = "";
      panel.style.width = "";
      panel.style.maxWidth = "";
      panel.style.zIndex = "";
    }

    function positionFloatedPanel() {
      if (!open || !useBodyPortal || panel.parentNode !== document.body) return;
      var r = trigger.getBoundingClientRect();
      var maxW = Math.min(420, window.innerWidth - 16);
      var wid = Math.max(Math.min(maxW, Math.max(r.width, 200)), r.width);
      panel.style.position = "fixed";
      panel.style.minWidth = wid + "px";
      panel.style.width = "max-content";
      panel.style.maxWidth = maxW + "px";
      panel.style.zIndex = String(zIndex);
      var pw = panel.getBoundingClientRect().width || wid;
      var left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
      panel.style.left = left + "px";
      var top = r.bottom + 4;
      var ph = panel.offsetHeight || 200;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 4);
      panel.style.top = top + "px";
    }

    function startFloatWatch() {
      if (!useBodyPortal) return;
      positionFloatedPanel();
      requestAnimationFrame(function () {
        requestAnimationFrame(positionFloatedPanel);
      });
      window.addEventListener("resize", positionFloatedPanel);
      window.addEventListener("scroll", positionFloatedPanel, true);
      floatInterval = setInterval(positionFloatedPanel, 200);
    }

    function setOpen(v) {
      if (!v) {
        stopFloatSync();
        open = false;
        trigger.classList.remove("msf-open");
        trigger.setAttribute("aria-expanded", "false");
        panel.classList.remove("msf-show");
        panel.style.removeProperty("pointer-events");
        restorePanelToRoot();
        return;
      }
      open = true;
      trigger.classList.add("msf-open");
      trigger.setAttribute("aria-expanded", "true");
      panel.classList.add("msf-show");
      panel.style.removeProperty("pointer-events");
      if (useBodyPortal) {
        document.body.appendChild(panel);
      }
      loadOptionsIfNeeded(function () {
        searchInp.value = "";
        searchQ = "";
        applySearchFilter();
        setTimeout(function () {
          searchInp.focus();
        }, 0);
        startFloatWatch();
      });
    }

    function onDocClick(e) {
      if (!open) return;
      if (root.contains(e.target)) return;
      if (useBodyPortal && panel.contains(e.target)) return;
      setOpen(false);
    }

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!open);
    });

    searchInp.addEventListener("input", function () {
      searchQ = searchInp.value || "";
      applySearchFilter();
    });

    searchInp.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.addEventListener("click", onDocClick);

    updateTriggerLabel();
    if (selected.size > 0) {
      loadOptionsIfNeeded(function () {
        updateTriggerLabel();
      });
    }

    var api = {
      getValues: function () {
        return Array.from(selected);
      },
      setValues: function (vals) {
        selected = new Set((vals || []).map(String));
        loadOptionsIfNeeded(function () {
          if (loaded) renderList();
          updateTriggerLabel();
        });
      },
      clear: function () {
        selected.clear();
        if (loaded) renderList();
        updateTriggerLabel();
        onChange([]);
      },
      refreshOptions: function () {
        loaded = false;
        optionsData = [];
        if (open) {
          loadOptionsIfNeeded(function () {
            applySearchFilter();
            if (useBodyPortal) positionFloatedPanel();
          });
        }
      },
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      destroy: function () {
        stopFloatSync();
        open = false;
        document.removeEventListener("click", onDocClick);
        restorePanelToRoot();
        root.innerHTML = "";
        root.classList.remove("msf-root");
        root.classList.remove("msf-tags-mode");
      }
    };

    return api;
  }

  global.MultiSelectFilter = { mount: mount };
})(typeof window !== "undefined" ? window : this);
