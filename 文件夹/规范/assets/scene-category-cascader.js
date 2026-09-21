/**
 * 场景品类级联选择（原型）— 对齐 SKU信息页 el-cascader 多选效果（图二）
 * 两级菜单：场景（父）→ 品类（子），每级均有复选框，支持多选、hover 展开。
 *
 * SceneCategoryCascader.mount(container, {
 *   placeholder: '请选择场景品类',
 *   zIndex: 1700,
 *   options: [
 *     { value: '观影', label: '观影', children: [{value:'TV灯带', label:'TV灯带'}, ...] }
 *   ],
 *   initialValues: [['观影','TV灯带']],
 *   onChange: (paths) => {}   // paths: [['观影','TV灯带'], ['居家','灯带']]
 * })
 * 返回：{ getValues, setValues, clear, destroy, refreshOptions, open, close }
 */
(function (global) {
  var STYLE_ID = "scc-global-style-v1";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = [
      ".scc-root{position:relative;display:inline-block;vertical-align:middle;width:100%;font-size:13px;}",
      ".scc-trigger-wrap{position:relative;display:flex;width:100%;align-items:center;}",
      ".scc-trigger{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:28px;height:28px;padding:2px 24px 2px 8px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;cursor:pointer;text-align:left;color:#0f172a;box-sizing:border-box;font:inherit;}",
      ".scc-trigger:hover{border-color:#1677ff;}",
      ".scc-trigger.scc-open{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.12);}",
      ".scc-trigger .scc-trigger-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;}",
      ".scc-trigger .scc-ph{color:#bfbfbf;}",
      ".scc-clear{position:absolute;right:20px;top:50%;transform:translateY(-50%);width:16px;height:16px;border:none;background:transparent;color:rgba(0,0,0,.25);cursor:pointer;font-size:14px;line-height:1;padding:0;display:none;z-index:1;}",
      ".scc-clear:hover{color:rgba(0,0,0,.45);}",
      ".scc-trigger-wrap.has-val .scc-clear{display:block;}",
      ".scc-chev{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #64748b;pointer-events:none;}",
      ".scc-panel{position:absolute;left:0;top:100%;margin-top:4px;background:#fff;border:1px solid #dbe4f0;border-radius:8px;box-shadow:0 10px 26px rgba(15,23,42,.12);z-index:1700;display:none;box-sizing:border-box;pointer-events:auto;}",
      ".scc-panel.scc-show{display:flex;}",
      ".scc-cols{display:flex;min-width:280px;}",
      ".scc-col{min-width:140px;max-width:220px;max-height:260px;overflow-y:auto;padding:4px 0;border-right:1px solid #f0f0f0;}",
      ".scc-col:last-child{border-right:none;}",
      ".scc-row{display:flex;align-items:center;gap:6px;padding:6px 12px;cursor:pointer;user-select:none;color:#0f172a;font-size:13px;}",
      ".scc-row:hover{background:#f1f5ff;}",
      ".scc-row.scc-active{background:#e6f0ff;color:#1677ff;font-weight:600;}",
      ".scc-row input{flex-shrink:0;margin:0;}",
      ".scc-row .scc-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".scc-row .scc-arrow{flex-shrink:0;color:#94a3b8;font-size:10px;line-height:1;}",
      ".scc-row.scc-active .scc-arrow{color:#1677ff;}",
      ".scc-empty{padding:16px;color:#64748b;font-size:12px;text-align:center;min-width:160px;}"
    ].join("");
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
    var zIndex = options.zIndex != null ? options.zIndex : 1700;
    var optsData = options.options || [];
    var onChange = typeof options.onChange === "function" ? options.onChange : function () {};
    var useBodyPortal = options.useBodyPortal !== false;

    // selected: Set of "parent|child" path strings
    var selected = new Set();
    (options.initialValues || []).forEach(function (p) {
      if (Array.isArray(p) && p.length >= 2) selected.add(p[0] + "|" + p[1]);
    });
    var open = false;
    var activeParent = null;
    var floatInterval = null;

    root.classList.add("scc-root");
    root.innerHTML = "";
    root.style.position = "relative";

    var triggerWrap = document.createElement("div");
    triggerWrap.className = "scc-trigger-wrap";
    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "scc-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "scc-clear";
    clearBtn.setAttribute("aria-label", "清除已选");
    clearBtn.textContent = "×";
    var chev = document.createElement("span");
    chev.className = "scc-chev";
    var textSpan = document.createElement("span");
    textSpan.className = "scc-trigger-text scc-ph";
    textSpan.textContent = placeholder;
    trigger.appendChild(textSpan);
    triggerWrap.appendChild(trigger);
    triggerWrap.appendChild(clearBtn);
    triggerWrap.appendChild(chev);
    root.appendChild(triggerWrap);

    var panel = document.createElement("div");
    panel.className = "scc-panel";
    panel.style.zIndex = String(zIndex);
    panel.setAttribute("role", "listbox");
    root.appendChild(panel);

    function pathToArr(s) { return String(s).split("|"); }
    function parentKey(p) { return String(p.value); }
    function findParent(pVal) {
      return optsData.find(function (p) { return String(p.value) === String(pVal); }) || null;
    }
    function childExists(pVal, cVal) {
      var p = findParent(pVal);
      if (!p || !p.children) return false;
      return p.children.some(function (c) { return String(c.value) === String(cVal); });
    }
    function parentLabel(pVal) {
      var p = findParent(pVal);
      return p ? p.label : pVal;
    }
    function childLabel(pVal, cVal) {
      var p = findParent(pVal);
      if (!p || !p.children) return cVal;
      var c = p.children.find(function (x) { return String(x.value) === String(cVal); });
      return c ? c.label : cVal;
    }

    function selectedPaths() {
      return Array.from(selected).map(pathToArr);
    }

    function parentSelectedChildren(pVal) {
      var out = [];
      selected.forEach(function (s) {
        var arr = pathToArr(s);
        if (arr[0] === String(pVal)) out.push(arr[1]);
      });
      return out;
    }

    function setParentCheckState(pVal, inp) {
      var p = findParent(pVal);
      if (!p || !p.children) return;
      var total = p.children.length;
      var sel = parentSelectedChildren(pVal).length;
      inp.checked = sel === total && total > 0;
      inp.indeterminate = sel > 0 && sel < total;
    }

    function updateTriggerLabel() {
      triggerWrap.classList.toggle("has-val", selected.size > 0);
      if (!selected.size) {
        textSpan.textContent = placeholder;
        textSpan.classList.add("scc-ph");
        return;
      }
      textSpan.classList.remove("scc-ph");
      var arr = selectedPaths();
      if (arr.length <= 2) {
        textSpan.textContent = arr.map(function (a) { return a[0] + " / " + a[1]; }).join("、");
      } else {
        textSpan.textContent = "已选 " + arr.length + " 项";
      }
    }

    function renderPanel() {
      if (!optsData.length) {
        panel.innerHTML = '<div class="scc-empty">暂无选项</div>';
        return;
      }
      if (!activeParent || !findParent(activeParent)) activeParent = parentKey(optsData[0]);
      panel.innerHTML = "";
      var cols = document.createElement("div");
      cols.className = "scc-cols";

      var colLeft = document.createElement("div");
      colLeft.className = "scc-col";
      var colRight = document.createElement("div");
      colRight.className = "scc-col";

      function renderRightColumn() {
        colRight.innerHTML = "";
        var ap = findParent(activeParent);
        if (ap && ap.children && ap.children.length) {
          ap.children.forEach(function (c) {
            var pk = activeParent;
            var key = pk + "|" + c.value;
            var row = document.createElement("div");
            row.className = "scc-row";
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = selected.has(key);
            var lab = document.createElement("span");
            lab.className = "scc-label";
            lab.textContent = c.label;
            row.appendChild(cb);
            row.appendChild(lab);
            cb.addEventListener("click", function (e) { e.stopPropagation(); });
            cb.addEventListener("change", function () {
              if (cb.checked) selected.add(key);
              else selected.delete(key);
              syncLeftCheckboxes();
              updateTriggerLabel();
              onChange(selectedPaths());
            });
            colRight.appendChild(row);
          });
        } else {
          colRight.innerHTML = '<div class="scc-empty">暂无品类</div>';
        }
      }

      function syncLeftCheckboxes() {
        colLeft.querySelectorAll(".scc-row").forEach(function (r) {
          var inp = r.querySelector("input[type=checkbox]");
          if (inp && r.dataset.pk) setParentCheckState(r.dataset.pk, inp);
        });
      }

      function setActiveParent(pk) {
        activeParent = pk;
        colLeft.querySelectorAll(".scc-row").forEach(function (r) {
          r.classList.toggle("scc-active", r.dataset.pk === pk);
        });
        renderRightColumn();
      }

      optsData.forEach(function (p) {
        var pk = parentKey(p);
        var row = document.createElement("div");
        row.className = "scc-row" + (pk === activeParent ? " scc-active" : "");
        row.dataset.pk = pk;
        var cb = document.createElement("input");
        cb.type = "checkbox";
        setParentCheckState(pk, cb);
        var lab = document.createElement("span");
        lab.className = "scc-label";
        lab.textContent = p.label;
        var arrow = document.createElement("span");
        arrow.className = "scc-arrow";
        arrow.textContent = "›";
        row.appendChild(cb);
        row.appendChild(lab);
        row.appendChild(arrow);

        cb.addEventListener("click", function (e) { e.stopPropagation(); });
        cb.addEventListener("change", function () {
          var p2 = findParent(pk);
          if (!p2 || !p2.children) return;
          if (cb.checked) {
            p2.children.forEach(function (c) { selected.add(pk + "|" + c.value); });
          } else {
            selected.forEach(function (s) {
              if (pathToArr(s)[0] === pk) selected.delete(s);
            });
          }
          renderRightColumn();
          syncLeftCheckboxes();
          updateTriggerLabel();
          onChange(selectedPaths());
        });
        row.addEventListener("mouseenter", function () {
          if (activeParent !== pk) setActiveParent(pk);
        });
        colLeft.appendChild(row);
      });

      renderRightColumn();

      cols.appendChild(colLeft);
      cols.appendChild(colRight);
      panel.appendChild(cols);
    }

    function positionFloatedPanel() {
      if (!open || !useBodyPortal || panel.parentNode !== document.body) return;
      var r = trigger.getBoundingClientRect();
      var wid = Math.max(r.width, 280);
      panel.style.position = "fixed";
      panel.style.minWidth = wid + "px";
      panel.style.zIndex = String(zIndex);
      panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - wid - 8)) + "px";
      var top = r.bottom + 4;
      var ph = panel.offsetHeight || 200;
      if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 4);
      panel.style.top = top + "px";
    }

    function stopFloatSync() {
      if (floatInterval) { clearInterval(floatInterval); floatInterval = null; }
      window.removeEventListener("resize", positionFloatedPanel);
      window.removeEventListener("scroll", positionFloatedPanel, true);
    }

    function restorePanelToRoot() {
      if (panel.parentNode === document.body) root.appendChild(panel);
      panel.style.position = "";
      panel.style.left = "";
      panel.style.top = "";
      panel.style.minWidth = "";
      panel.style.zIndex = "";
    }

    function setOpen(v) {
      if (!v) {
        stopFloatSync();
        open = false;
        trigger.classList.remove("scc-open");
        trigger.setAttribute("aria-expanded", "false");
        panel.classList.remove("scc-show");
        restorePanelToRoot();
        return;
      }
      open = true;
      trigger.classList.add("scc-open");
      trigger.setAttribute("aria-expanded", "true");
      panel.classList.add("scc-show");
      if (useBodyPortal) document.body.appendChild(panel);
      renderPanel();
      positionFloatedPanel();
      window.addEventListener("resize", positionFloatedPanel);
      window.addEventListener("scroll", positionFloatedPanel, true);
      floatInterval = setInterval(positionFloatedPanel, 200);
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
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!selected.size) return;
      selected.clear();
      renderPanel();
      updateTriggerLabel();
      onChange([]);
    });
    document.addEventListener("click", onDocClick);

    updateTriggerLabel();

    var api = {
      getValues: function () { return selectedPaths(); },
      setValues: function (paths) {
        selected = new Set();
        (paths || []).forEach(function (p) {
          if (Array.isArray(p) && p.length >= 2 && childExists(p[0], p[1])) selected.add(p[0] + "|" + p[1]);
        });
        if (open) renderPanel();
        updateTriggerLabel();
      },
      clear: function () {
        selected.clear();
        if (open) renderPanel();
        updateTriggerLabel();
        onChange([]);
      },
      refreshOptions: function (newOpts) {
        if (newOpts) optsData = newOpts;
        var valid = new Set();
        optsData.forEach(function (p) {
          (p.children || []).forEach(function (c) {
            var k = p.value + "|" + c.value;
            if (selected.has(k)) valid.add(k);
          });
        });
        selected = valid;
        if (open) renderPanel();
        updateTriggerLabel();
      },
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      destroy: function () {
        stopFloatSync();
        open = false;
        document.removeEventListener("click", onDocClick);
        restorePanelToRoot();
        root.innerHTML = "";
        root.classList.remove("scc-root");
      }
    };
    return api;
  }

  global.SceneCategoryCascader = { mount: mount };
})(typeof window !== "undefined" ? window : this);
