/**
 * 可搜索单选下拉（原型）— 对齐《币种-全局业务规范》
 *
 * SearchableSelect.mount(container, {
 *   options: [{ value, label, hint? }],
 *   placeholder: '请选择',
 *   initialValue: '',
 *   zIndex: 400,
 *   maxPanelHeight: 220,
 *   useBodyPortal: true,
 *   onChange: (value) => {}
 * })
 *
 * 返回：{ getValue, setValue, open, close, destroy }
 */
(function (global) {
  var STYLE_ID = "ssel-global-style-v1";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      ".ssel-root{position:relative;display:inline-block;vertical-align:middle;font-size:12px;}" +
      ".ssel-trigger{position:relative;display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:72px;height:32px;padding:0 24px 0 8px;border:1px solid #d9d9d9;border-radius:6px;background:#fff;cursor:pointer;text-align:left;color:#334155;box-sizing:border-box;}" +
      ".ssel-trigger:hover{border-color:#1677ff;}" +
      ".ssel-trigger.ssel-open{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.12);}" +
      ".ssel-trigger-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".ssel-ph{color:#bfbfbf;}" +
      ".ssel-chev{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #64748b;pointer-events:none;}" +
      ".ssel-panel{position:absolute;left:0;top:100%;margin-top:4px;min-width:100%;width:max-content;min-width:120px;background:#fff;border:1px solid #dbe4f0;border-radius:8px;box-shadow:0 10px 26px rgba(15,23,42,.12);z-index:400;display:none;flex-direction:column;box-sizing:border-box;}" +
      ".ssel-panel.ssel-show{display:flex;}" +
      ".ssel-search{padding:6px 8px;border-bottom:1px solid #f0f0f0;}" +
      ".ssel-search input{width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid #d9d9d9;border-radius:6px;font-size:12px;}" +
      ".ssel-list{overflow-y:auto;padding:4px 0;max-height:220px;}" +
      ".ssel-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;cursor:pointer;user-select:none;color:#0f172a;}" +
      ".ssel-row:hover,.ssel-row.ssel-active{background:#f1f5f9;}" +
      ".ssel-row.ssel-hidden{display:none;}" +
      ".ssel-row-label{font-weight:600;}" +
      ".ssel-row-hint{color:#64748b;font-size:11px;}" +
      ".ssel-empty{padding:10px;color:#64748b;font-size:12px;text-align:center;}";
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
    var zIndex = options.zIndex != null ? options.zIndex : 400;
    var maxPanelHeight = options.maxPanelHeight != null ? options.maxPanelHeight : 220;
    var useBodyPortal = options.useBodyPortal !== false;
    var onChange = typeof options.onChange === "function" ? options.onChange : function () {};
    var optionsData = (options.options || []).map(function (o) {
      return { value: String(o.value), label: o.label != null ? String(o.label) : String(o.value), hint: o.hint || "" };
    });

    var selected = options.initialValue != null ? String(options.initialValue) : "";
    var searchQ = "";
    var isOpen = false;
    var floatInterval = null;

    root.classList.add("ssel-root");
    root.innerHTML = "";
    root.style.position = "relative";

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ssel-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    var triggerText = document.createElement("span");
    triggerText.className = "ssel-trigger-text";
    var chev = document.createElement("span");
    chev.className = "ssel-chev";
    trigger.appendChild(triggerText);
    trigger.appendChild(chev);

    var panel = document.createElement("div");
    panel.className = "ssel-panel";
    panel.style.zIndex = String(zIndex);

    var searchWrap = document.createElement("div");
    searchWrap.className = "ssel-search";
    var searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "搜索币种";
    searchInput.setAttribute("autocomplete", "off");
    searchWrap.appendChild(searchInput);

    var list = document.createElement("div");
    list.className = "ssel-list";
    list.style.maxHeight = maxPanelHeight + "px";

    panel.appendChild(searchWrap);
    panel.appendChild(list);

    var panelHost = root;
    if (useBodyPortal) {
      panelHost = document.body;
    }

    function findOption(val) {
      for (var i = 0; i < optionsData.length; i++) {
        if (optionsData[i].value === val) return optionsData[i];
      }
      return null;
    }

    function syncTrigger() {
      var opt = findOption(selected);
      if (opt) {
        triggerText.textContent = opt.label;
        triggerText.classList.remove("ssel-ph");
      } else {
        triggerText.textContent = placeholder;
        triggerText.classList.add("ssel-ph");
      }
    }

    function renderList() {
      list.innerHTML = "";
      var q = searchQ.trim().toLowerCase();
      var visible = 0;
      optionsData.forEach(function (opt) {
        var hay = (opt.label + " " + opt.hint + " " + opt.value).toLowerCase();
        if (q && hay.indexOf(q) === -1) return;
        visible++;
        var row = document.createElement("div");
        row.className = "ssel-row" + (opt.value === selected ? " ssel-active" : "");
        row.setAttribute("role", "option");
        row.dataset.value = opt.value;
        var label = document.createElement("span");
        label.className = "ssel-row-label";
        label.textContent = opt.label;
        row.appendChild(label);
        if (opt.hint) {
          var hint = document.createElement("span");
          hint.className = "ssel-row-hint";
          hint.textContent = opt.hint;
          row.appendChild(hint);
        }
        row.addEventListener("click", function (e) {
          e.stopPropagation();
          selectValue(opt.value);
          closePanel();
        });
        list.appendChild(row);
      });
      if (!visible) {
        var empty = document.createElement("div");
        empty.className = "ssel-empty";
        empty.textContent = "无匹配项";
        list.appendChild(empty);
      }
    }

    function positionPanel() {
      if (!useBodyPortal || !isOpen) return;
      var rect = trigger.getBoundingClientRect();
      panel.style.position = "fixed";
      panel.style.left = rect.left + "px";
      panel.style.top = rect.bottom + 4 + "px";
      panel.style.minWidth = Math.max(rect.width, 120) + "px";
    }

    function openPanel() {
      if (isOpen) return;
      isOpen = true;
      trigger.classList.add("ssel-open");
      trigger.setAttribute("aria-expanded", "true");
      searchQ = "";
      searchInput.value = "";
      renderList();
      if (useBodyPortal) {
        panelHost.appendChild(panel);
        positionPanel();
        floatInterval = setInterval(positionPanel, 200);
      }
      panel.classList.add("ssel-show");
      setTimeout(function () { searchInput.focus(); }, 0);
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      trigger.classList.remove("ssel-open");
      trigger.setAttribute("aria-expanded", "false");
      panel.classList.remove("ssel-show");
      if (useBodyPortal) {
        if (floatInterval) {
          clearInterval(floatInterval);
          floatInterval = null;
        }
        root.appendChild(panel);
        panel.style.position = "";
        panel.style.left = "";
        panel.style.top = "";
        panel.style.minWidth = "";
      }
    }

    function selectValue(val) {
      var next = String(val);
      if (next === selected) return;
      selected = next;
      syncTrigger();
      onChange(selected);
    }

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isOpen) closePanel();
      else openPanel();
    });

    searchInput.addEventListener("input", function () {
      searchQ = searchInput.value;
      renderList();
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    });

    document.addEventListener("click", function () {
      closePanel();
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    root.appendChild(trigger);
    root.appendChild(panel);
    syncTrigger();

    return {
      getValue: function () { return selected; },
      setValue: function (val) {
        selected = String(val);
        syncTrigger();
        renderList();
      },
      open: openPanel,
      close: closePanel,
      destroy: function () {
        closePanel();
        root.innerHTML = "";
        root.classList.remove("ssel-root");
      }
    };
  }

  global.SearchableSelect = { mount: mount };
})(typeof window !== "undefined" ? window : this);
