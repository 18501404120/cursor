(function () {
  "use strict";

  const ROOT_ATTR = "data-pa-root";
  const STORAGE_PREFIX = "prototypeAnnotation:";
  const OBSERVER_STORE_KEY = "__prototypeAnnotationObserver";
  const RENDER_TIMER_KEY = "__prototypeAnnotationRenderTimer";
  const PORTAL_REPOSITION_KEY = "__prototypeAnnotationPortalReposition";
  const PORTAL_ENTRIES = [];
  let outsideCloseBound = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function storageKey(config) {
    return `${STORAGE_PREFIX}${config.pageId || "page"}:${config.version || "draft"}`;
  }

  function loadState(config) {
    try {
      const raw = localStorage.getItem(storageKey(config));
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveState(config, state) {
    localStorage.setItem(storageKey(config), JSON.stringify(state));
  }

  function text(value) {
    return value == null ? "" : String(value);
  }

  function removeOld() {
    const oldObserver = window[OBSERVER_STORE_KEY];
    if (oldObserver && oldObserver.disconnect) oldObserver.disconnect();
    window[OBSERVER_STORE_KEY] = null;
    if (window[RENDER_TIMER_KEY]) {
      clearTimeout(window[RENDER_TIMER_KEY]);
      window[RENDER_TIMER_KEY] = null;
    }
    document.querySelectorAll(`[${ROOT_ATTR}]`).forEach((node) => node.remove());
    PORTAL_ENTRIES.length = 0;
  }

  function resolve(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (_error) {
      return null;
    }
  }

  function placePopover(popover, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 28);
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + width > window.innerWidth - 14) left = window.innerWidth - width - 14;
    if (top + 180 > window.innerHeight) top = Math.max(14, rect.top - 190);
    popover.style.left = `${Math.max(14, left)}px`;
    popover.style.top = `${Math.max(14, top)}px`;
  }

  function closePopovers() {
    document.querySelectorAll(".pa-popover").forEach((node) => node.remove());
  }

  function bindOutsideClose() {
    if (outsideCloseBound) return;
    outsideCloseBound = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest(".pa-popover")) return;
      if (event.target.closest(".pa-dot")) return;
      if (event.target.closest(".pa-tip-icon")) return;
      closePopovers();
    });
  }

  function button(label, className) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `pa-action ${className || ""}`.trim();
    node.textContent = label;
    return node;
  }

  function parseBody(raw) {
    const lines = text(raw)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const numbered = [];
    const extra = [];
    lines.forEach((line) => {
      if (/^\d+[.、)]\s*/.test(line)) {
        numbered.push(line.replace(/^\d+[.、)]\s*/, ""));
      } else {
        extra.push(line);
      }
    });
    return { numbered, extra };
  }

  function fillBody(container, raw) {
    const parsed = parseBody(raw);
    if (parsed.numbered.length) {
      const list = document.createElement("ol");
      list.className = "pa-pop-list";
      parsed.numbered.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      container.appendChild(list);
    }
    if (parsed.extra.length) {
      const extra = document.createElement("div");
      extra.className = "pa-pop-extra";
      parsed.extra.forEach((item) => {
        const p = document.createElement("p");
        p.textContent = item;
        extra.appendChild(p);
      });
      container.appendChild(extra);
    }
    if (!parsed.numbered.length && !parsed.extra.length) {
      const empty = document.createElement("div");
      empty.className = "pa-pop-extra";
      container.appendChild(empty);
    }
  }

  function editablePopover(config, state, key, title, body, anchor, badgeLabel) {
    closePopovers();
    const popover = document.createElement("div");
    popover.className = "pa-root pa-popover";
    popover.setAttribute(ROOT_ATTR, "popover");
    document.body.appendChild(popover);
    placePopover(popover, anchor);
    popover.addEventListener("click", (event) => event.stopPropagation());

    function appendHead(titleText) {
      const head = document.createElement("div");
      head.className = "pa-pop-head";
      const titleEl = document.createElement("div");
      titleEl.className = "pa-pop-title";
      titleEl.textContent = titleText;
      head.appendChild(titleEl);
      if (badgeLabel) {
        const badge = document.createElement("span");
        badge.className = "pa-pop-badge";
        badge.textContent = badgeLabel;
        head.appendChild(badge);
      }
      popover.appendChild(head);
    }

    function renderView(content) {
      popover.innerHTML = "";
      appendHead(title);
      const bodyEl = document.createElement("div");
      bodyEl.className = "pa-pop-body";
      fillBody(bodyEl, content);
      const actions = document.createElement("div");
      actions.className = "pa-actions";
      const edit = button("编辑");
      const remove = button("删除");
      const close = button("关闭", "pa-action-primary");
      actions.append(edit, remove, close);
      popover.append(bodyEl, actions);

      edit.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderEdit(content);
      });
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderDeleteConfirm(content);
      });
      close.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePopovers();
      });
    }

    function renderEdit(content) {
      popover.innerHTML = "";
      appendHead(`编辑说明：${title}`);
      const editor = document.createElement("textarea");
      editor.className = "pa-editor";
      editor.value = content;
      const actions = document.createElement("div");
      actions.className = "pa-actions";
      const cancel = button("取消");
      const save = button("保存", "pa-action-primary");
      actions.append(cancel, save);
      popover.append(editor, actions);

      cancel.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderView((state.edits && state.edits[key]) || body);
      });
      save.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.edits = state.edits || {};
        state.edits[key] = editor.value;
        saveState(config, state);
        renderView(state.edits[key]);
      });
    }

    function renderDeleteConfirm(content) {
      popover.innerHTML = "";
      appendHead(`删除说明：${title}`);
      const bodyEl = document.createElement("div");
      bodyEl.className = "pa-pop-body";
      fillBody(bodyEl, "1. 删除后，当前版本下该标注将不再显示。\n2. 如需恢复，请重新生成本页标注。");
      const actions = document.createElement("div");
      actions.className = "pa-actions";
      const cancel = button("取消");
      const confirmRemove = button("确认删除", "pa-action-primary");
      actions.append(cancel, confirmRemove);
      popover.append(bodyEl, actions);

      cancel.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderView(content);
      });
      confirmRemove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.hidden = state.hidden || {};
        state.hidden[key] = true;
        saveState(config, state);
        if (anchor && anchor.remove) anchor.remove();
        closePopovers();
      });
    }

    renderView(body);
  }

  function isVisibleTarget(target) {
    if (!target) return false;
    if (target.closest("[hidden]")) return false;
    if (target.closest('[aria-hidden="true"]')) return false;
    const rects = target.getClientRects();
    return rects.length > 0;
  }

  function bindPortalReposition() {
    if (window[PORTAL_REPOSITION_KEY]) return;
    window[PORTAL_REPOSITION_KEY] = true;
    const tick = () => {
      PORTAL_ENTRIES.forEach((entry) => {
        if (entry.icon && entry.icon.isConnected && entry.target && entry.target.isConnected) {
          entry.update();
        }
      });
    };
    window.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
  }

  /** 标注/字段 i：固定叠在目标 getBoundingClientRect 右上角，不插入文档流 */
  function positionPortalIcon(icon, target) {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      icon.style.visibility = "hidden";
      return;
    }
    icon.style.visibility = "visible";
    const w = icon.offsetWidth || 16;
    const h = icon.offsetHeight || 16;
    icon.style.left = `${Math.round(rect.right - w * 0.55)}px`;
    icon.style.top = `${Math.round(rect.top - h * 0.35)}px`;
  }

  function attachNearTarget(icon, target) {
    if (!isVisibleTarget(target)) return false;
    icon.classList.add("pa-icon-portal");
    document.body.appendChild(icon);
    const update = () => positionPortalIcon(icon, target);
    update();
    PORTAL_ENTRIES.push({ icon, target, update });
    bindPortalReposition();
    return true;
  }

  function addAnnotation(config, state, item, index) {
    const target = resolve(item.selector);
    if (!target) return;
    const key = `annotation:${item.id || index}`;
    if (state.hidden && state.hidden[key]) return;
    if (document.querySelector(`[data-pa-item-key="${key}"]`)) return;
    const saved = state.edits && state.edits[key];
    const dot = document.createElement("span");
    dot.className = "pa-root pa-dot";
    dot.setAttribute(ROOT_ATTR, "annotation");
    dot.setAttribute("data-pa-item-key", key);
    dot.textContent = String(index + 1);
    dot.title = item.title || "说明";
    if (!attachNearTarget(dot, target)) return;
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      editablePopover(config, state, key, item.title || "说明", saved || item.body || "", dot, dot.textContent);
    });
  }

  function addFieldTip(config, state, item, index) {
    const target = resolve(item.selector);
    if (!target) return;
    const key = `fieldTip:${item.id || index}`;
    if (state.hidden && state.hidden[key]) return;
    if (document.querySelector(`[data-pa-item-key="${key}"]`)) return;
    const saved = state.edits && state.edits[key];
    const icon = document.createElement("span");
    icon.className = "pa-root pa-tip-icon";
    icon.setAttribute(ROOT_ATTR, "field-tip");
    icon.setAttribute("data-pa-item-key", key);
    icon.textContent = "i";
    icon.title = item.title || "字段释义";
    if (!attachNearTarget(icon, target)) return;
    icon.addEventListener("click", (event) => {
      event.stopPropagation();
      editablePopover(config, state, key, item.title || "字段释义", saved || item.body || "", icon, icon.textContent);
    });
  }

  function section(title, content) {
    const wrap = document.createElement("div");
    const heading = document.createElement("div");
    heading.className = "pa-section-title";
    heading.textContent = title;
    const body = document.createElement("div");
    body.className = "pa-section-text";
    body.textContent = Array.isArray(content) ? content.join("\n") : text(content);
    wrap.append(heading, body);
    return wrap;
  }

  function statusFlow(flow) {
    const wrap = document.createElement("div");
    const nodes = (flow && flow.nodes) || [];
    const transitions = (flow && flow.transitions) || [];
    if (!nodes.length) return wrap;

    const visual = document.createElement("div");
    visual.className = "pa-flow";
    nodes.forEach((node, index) => {
      if (index > 0) {
        const arrow = document.createElement("span");
        arrow.className = "pa-flow-arrow";
        arrow.textContent = "→";
        visual.appendChild(arrow);
      }
      const pill = document.createElement("span");
      pill.className = "pa-flow-node";
      pill.textContent = node.label || node.id;
      visual.appendChild(pill);
    });
    wrap.appendChild(visual);

    transitions.forEach((transition) => {
      const detail = document.createElement("div");
      detail.className = "pa-flow-detail";
      detail.textContent = `${transition.from || ""} → ${transition.to || ""}：${transition.trigger || ""}${transition.allowed ? "；允许：" + transition.allowed : ""}${transition.forbidden ? "；限制：" + transition.forbidden : ""}`;
      wrap.appendChild(detail);
    });
    return wrap;
  }

  function panel(title, guide, flow, editableKey, config, state) {
    const node = document.createElement("section");
    node.className = "pa-panel";
    const heading = document.createElement("h3");
    heading.textContent = title;
    node.appendChild(heading);

    Object.entries(guide || {}).forEach(([key, value]) => {
      node.appendChild(section(key, value));
    });
    if (flow && flow.nodes && flow.nodes.length) {
      const flowTitle = document.createElement("div");
      flowTitle.className = "pa-section-title";
      flowTitle.textContent = "状态流转";
      node.appendChild(flowTitle);
      node.appendChild(statusFlow(flow));
    }

    const actions = document.createElement("div");
    actions.className = "pa-actions";
    const edit = button("编辑说明");
    const remove = button("删除自定义");
    if (!(state.guides && state.guides[editableKey])) remove.disabled = true;
    actions.append(edit, remove);
    node.appendChild(actions);

    edit.addEventListener("click", () => {
      const current = state.guides && state.guides[editableKey]
        ? state.guides[editableKey]
        : JSON.stringify(guide || {}, null, 2);
      node.innerHTML = "";
      const editor = document.createElement("textarea");
      editor.className = "pa-editor";
      editor.style.minHeight = "360px";
      editor.value = current;
      const save = button("保存", "pa-action-primary");
      const cancel = button("取消");
      const editorActions = document.createElement("div");
      editorActions.className = "pa-actions";
      editorActions.append(cancel, save);
      node.append(editor, editorActions);
      cancel.addEventListener("click", () => openModal(config, state));
      save.addEventListener("click", () => {
        state.guides = state.guides || {};
        state.guides[editableKey] = editor.value;
        saveState(config, state);
        openModal(config, state);
      });
    });

    remove.addEventListener("click", () => {
      if (!(state.guides && state.guides[editableKey])) return;
      const confirmed = window.confirm("删除后将恢复默认页面说明，确认删除吗？");
      if (!confirmed) return;
      delete state.guides[editableKey];
      if (!Object.keys(state.guides).length) delete state.guides;
      saveState(config, state);
      openModal(config, state);
    });

    return node;
  }

  function makeDraggable(modal, handle) {
    let active = false;
    let offsetX = 0;
    let offsetY = 0;
    handle.addEventListener("mousedown", (event) => {
      active = true;
      const rect = modal.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      event.preventDefault();
    });
    document.addEventListener("mousemove", (event) => {
      if (!active) return;
      modal.style.left = `${Math.max(8, event.clientX - offsetX)}px`;
      modal.style.top = `${Math.max(8, event.clientY - offsetY)}px`;
      modal.style.right = "auto";
    });
    document.addEventListener("mouseup", () => {
      active = false;
    });
  }

  function openModal(config, state) {
    document.querySelectorAll(".pa-modal").forEach((node) => node.remove());
    const modal = document.createElement("div");
    modal.className = "pa-root pa-modal";
    modal.setAttribute(ROOT_ATTR, "modal");

    const head = document.createElement("div");
    head.className = "pa-modal-head";
    const title = document.createElement("div");
    title.className = "pa-modal-title";
    title.textContent = config.pageTitle ? `页面说明：${config.pageTitle}` : "页面说明";
    const close = button("关闭");
    head.append(title, close);

    const body = document.createElement("div");
    body.className = "pa-modal-body";
    const savedDev = state.guides && state.guides.dev;
    const savedUser = state.guides && state.guides.user;
    const devGuide = savedDev ? {"自定义说明": savedDev} : ((config.pageGuide && config.pageGuide.dev) || {});
    const userGuide = savedUser ? {"自定义说明": savedUser} : ((config.pageGuide && config.pageGuide.user) || {});
    body.append(
      panel("开发测试专用", devGuide, config.statusFlow, "dev", config, state),
      panel("终端用户手册", userGuide, null, "user", config, state)
    );

    modal.append(head, body);
    document.body.appendChild(modal);
    close.addEventListener("click", () => modal.remove());
    makeDraggable(modal, head);
  }

  function renderAll(config, state) {
    (config.annotations || []).forEach((item, index) => addAnnotation(config, state, item, index));
    (config.fieldTips || []).forEach((item, index) => addFieldTip(config, state, item, index));
  }

  function scheduleRender(config, state) {
    if (window[RENDER_TIMER_KEY]) clearTimeout(window[RENDER_TIMER_KEY]);
    window[RENDER_TIMER_KEY] = setTimeout(() => {
      renderAll(config, state);
      PORTAL_ENTRIES.forEach((entry) => {
        if (entry.icon && entry.icon.isConnected && entry.target && entry.target.isConnected) {
          entry.update();
        }
      });
    }, 80);
  }

  function bindDynamicObserver(config, state) {
    const observer = new MutationObserver(() => scheduleRender(config, state));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class", "aria-hidden"]
    });
    window[OBSERVER_STORE_KEY] = observer;
  }

  function mount(input) {
    const config = clone(input);
    removeOld();
    const state = loadState(config);
    const root = document.createElement("div");
    root.className = "pa-root";
    root.setAttribute(ROOT_ATTR, "root");
    const pageButton = document.createElement("button");
    pageButton.type = "button";
    pageButton.className = "pa-page-button";
    pageButton.textContent = "查看页面说明";
    pageButton.addEventListener("click", () => openModal(config, state));
    root.appendChild(pageButton);
    document.body.appendChild(root);

    renderAll(config, state);
    bindOutsideClose();
    bindDynamicObserver(config, state);
  }

  function mountFromScript() {
    const script = document.getElementById("prototype-annotation-config");
    if (!script) return;
    try {
      mount(JSON.parse(script.textContent));
    } catch (error) {
      console.error("Prototype annotation config is invalid.", error);
    }
  }

  window.PrototypeAnnotation = { mount, mountFromScript };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFromScript);
  } else {
    mountFromScript();
  }
})();
