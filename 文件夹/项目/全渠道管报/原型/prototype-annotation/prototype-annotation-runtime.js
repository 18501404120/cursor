(function () {
  "use strict";

  const ROOT_ATTR = "data-pa-root";
  const STORAGE_PREFIX = "prototypeAnnotation:";
  const OBSERVER_STORE_KEY = "__prototypeAnnotationObserver";
  const RENDER_TIMER_KEY = "__prototypeAnnotationRenderTimer";
  const PORTAL_REPOSITION_KEY = "__prototypeAnnotationPortalReposition";
  const SCROLL_PARENT_BOUND_KEY = "__prototypeAnnotationScrollParents";
  const PORTAL_ENTRIES = [];
  const boundScrollParents = new WeakSet();
  let activeMount = null;
  /** 对外 Pages 只读；作者 IP / 网段 / 本机浏览器信任 / 本地可编；见 Skill §Git Pages 编辑权限 */
  const PA_POLICY_DEFAULT = {
    viewOnlyHostnames: ["18501404120.github.io"],
    allowIps: ["113.110.230.127", "113.110.229.118", "220.232.134.241", "113.110.228.174", "113.87.83.49", "113.110.230.92"],
    allowIpPrefixes: ["113.110.230.", "113.110.228.", "113.110.229.", "113.87.83."],
    allowTrustedBrowser: true,
    editToken: "",
    allowLocalhost: true,
    allowOtherHosts: true
  };
  const TRUSTED_BROWSER_KEY = "prototypeAnnotation:trustedAuthorBrowser";
  let outsideCloseBound = false;
  let pickModeActive = false;
  let pickHighlightEl = null;
  let pickHandlers = null;
  let paCanEdit = true;

  function mergeEditPolicy(config) {
    const fromConfig = (config && config.editPolicy) || {};
    return {
      viewOnlyHostnames:
        fromConfig.viewOnlyHostnames != null
          ? fromConfig.viewOnlyHostnames
          : PA_POLICY_DEFAULT.viewOnlyHostnames,
      allowIps: fromConfig.allowIps != null ? fromConfig.allowIps : PA_POLICY_DEFAULT.allowIps,
      allowIpPrefixes:
        fromConfig.allowIpPrefixes != null
          ? fromConfig.allowIpPrefixes
          : PA_POLICY_DEFAULT.allowIpPrefixes,
      allowTrustedBrowser:
        fromConfig.allowTrustedBrowser != null
          ? fromConfig.allowTrustedBrowser
          : PA_POLICY_DEFAULT.allowTrustedBrowser,
      editToken: fromConfig.editToken != null ? fromConfig.editToken : PA_POLICY_DEFAULT.editToken,
      allowLocalhost:
        fromConfig.allowLocalhost != null ? fromConfig.allowLocalhost : PA_POLICY_DEFAULT.allowLocalhost,
      allowOtherHosts:
        fromConfig.allowOtherHosts != null ? fromConfig.allowOtherHosts : PA_POLICY_DEFAULT.allowOtherHosts
    };
  }

  function editTokenFromUrl() {
    try {
      return new URLSearchParams(location.search).get("paEdit") || "";
    } catch (_error) {
      return "";
    }
  }

  async function fetchPublicIp() {
    const sources = [
      async () => {
        const res = await fetch("https://api64.ipify.org?format=json", { cache: "no-store" });
        if (!res.ok) throw new Error("ipify64");
        const data = await res.json();
        return data && data.ip ? String(data.ip) : "";
      },
      async () => {
        const res = await fetch("https://ipinfo.io/json", { cache: "no-store" });
        if (!res.ok) throw new Error("ipinfo");
        const data = await res.json();
        return data && data.ip ? String(data.ip) : "";
      },
      async () => {
        const res = await fetch("https://ifconfig.me/ip", { cache: "no-store" });
        if (!res.ok) throw new Error("ifconfig");
        const text = (await res.text()).trim();
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(text) ? text : "";
      },
      async () => {
        const res = await fetch("https://icanhazip.com", { cache: "no-store" });
        if (!res.ok) throw new Error("icanhazip");
        const text = (await res.text()).trim();
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(text) ? text : "";
      }
    ];
    let lastError = null;
    for (let i = 0; i < sources.length; i += 1) {
      try {
        const ip = await sources[i]();
        if (ip) return ip;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("no-ip-source");
  }

  function ipMatchesPolicy(ip, policy) {
    if (!ip) return false;
    if ((policy.allowIps || []).includes(ip)) return true;
    return (policy.allowIpPrefixes || []).some((prefix) => prefix && ip.startsWith(prefix));
  }

  function isTrustedBrowser() {
    try {
      return localStorage.getItem(TRUSTED_BROWSER_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function markTrustedBrowser() {
    try {
      localStorage.setItem(TRUSTED_BROWSER_KEY, "1");
    } catch (_error) {
      /* ignore */
    }
  }

  async function resolveCanEdit(config) {
    const policy = mergeEditPolicy(config);
    const host = location.hostname || "";
    const trustBrowser = policy.allowTrustedBrowser !== false;

    if (policy.allowLocalhost && (host === "localhost" || host === "127.0.0.1")) {
      if (trustBrowser) markTrustedBrowser();
      return true;
    }
    if (policy.editToken && editTokenFromUrl() === policy.editToken) {
      return true;
    }
    const isViewOnlyHost = (policy.viewOnlyHostnames || []).some(
      (name) => name && (host === name || host.endsWith("." + name))
    );
    if (!isViewOnlyHost) {
      return policy.allowOtherHosts !== false;
    }
    if (trustBrowser && isTrustedBrowser()) {
      return true;
    }
    const hasIpRule =
      (policy.allowIps && policy.allowIps.length) ||
      (policy.allowIpPrefixes && policy.allowIpPrefixes.length);
    if (!hasIpRule && !policy.editToken) {
      return false;
    }
    try {
      const ip = await fetchPublicIp();
      if (ipMatchesPolicy(ip, policy)) {
        if (trustBrowser) markTrustedBrowser();
        return true;
      }
      return false;
    } catch (_error) {
      return trustBrowser && isTrustedBrowser();
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function storageKey(config) {
    return `${STORAGE_PREFIX}${config.pageId || "page"}`;
  }

  function legacyStorageKey(config) {
    return `${STORAGE_PREFIX}${config.pageId || "page"}:${config.version || "draft"}`;
  }

  function emptyUserAdded() {
    return { annotations: [], fieldTips: [] };
  }

  function normalizePersistedState(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      edits: clone(src.edits || {}),
      hidden: clone(src.hidden || {}),
      guides: clone(src.guides || {}),
      assets: clone(src.assets || {}),
      userAdded: clone(src.userAdded || emptyUserAdded())
    };
  }

  function mergeUserAdded(a, b) {
    const left = a || emptyUserAdded();
    const right = b || emptyUserAdded();
    const out = emptyUserAdded();
    const seenAnno = new Set();
    const seenTip = new Set();
    (left.annotations || []).concat(right.annotations || []).forEach((item) => {
      if (!item || !item.id || seenAnno.has(item.id)) return;
      seenAnno.add(item.id);
      out.annotations.push(clone(item));
    });
    (left.fieldTips || []).concat(right.fieldTips || []).forEach((item) => {
      if (!item || !item.id || seenTip.has(item.id)) return;
      seenTip.add(item.id);
      out.fieldTips.push(clone(item));
    });
    return out;
  }

  function mergeStateLayers(persisted, local) {
    const p = normalizePersistedState(persisted);
    const l = normalizePersistedState(local);
    return {
      edits: Object.assign({}, p.edits, l.edits),
      hidden: Object.assign({}, p.hidden, l.hidden),
      guides: Object.assign({}, p.guides, l.guides),
      assets: Object.assign({}, p.assets, l.assets),
      userAdded: mergeUserAdded(p.userAdded, l.userAdded)
    };
  }

  function stateToPersisted(state) {
    const normalized = normalizePersistedState(state);
    return Object.assign({}, normalized, {
      persistedAt: new Date().toISOString()
    });
  }

  function syncPersistedStateToConfig(config, state) {
    const script = document.getElementById("prototype-annotation-config");
    if (!script) return;
    try {
      const cfg = JSON.parse(script.textContent);
      cfg.persistedState = stateToPersisted(state);
      script.textContent = JSON.stringify(cfg, null, 2);
    } catch (error) {
      console.warn("[prototype-annotation] persistedState sync failed:", error);
    }
  }

  function loadState(config) {
    try {
      const key = storageKey(config);
      let raw = localStorage.getItem(key);
      if (!raw) {
        raw = localStorage.getItem(legacyStorageKey(config));
      }
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function saveState(config, state) {
    localStorage.setItem(storageKey(config), JSON.stringify(state));
    syncPersistedStateToConfig(config, state);
  }

  function hydrateState(config) {
    const persisted = normalizePersistedState(config.persistedState);
    const local = loadState(config);
    const merged = mergeStateLayers(persisted, local);
    if (!merged.userAdded) merged.userAdded = emptyUserAdded();
    if (!merged.assets) merged.assets = {};
    saveState(config, merged);
    return merged;
  }

  function text(value) {
    return value == null ? "" : String(value);
  }

  function removeOld() {
    exitPickMode();
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
      if (pickModeActive) return;
      if (event.target.closest(".pa-popover")) return;
      if (event.target.closest(".pa-dot")) return;
      if (event.target.closest(".pa-tip-icon")) return;
      closePopovers();
    });
  }

  function isPaInternal(node) {
    if (!node || node.nodeType !== 1) return true;
    if (node.closest(`[${ROOT_ATTR}]`)) return true;
    if (node.closest(".pa-toolbar")) return true;
    const tag = (node.tagName || "").toUpperCase();
    return tag === "HTML" || tag === "BODY" || tag === "SCRIPT" || tag === "STYLE";
  }

  function generateUserId() {
    return "user-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function escapeAttr(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function normalizePickTarget(el) {
    if (!el || el.nodeType !== 1) return null;
    if (isPaInternal(el)) return null;

    const th = el.closest("th");
    if (th && !isPaInternal(th)) return th;

    const td = el.closest("td");
    if (td && !isPaInternal(td)) return td;

    const label = el.closest("label");
    if (label && !isPaInternal(label)) return label;

    const interactive = el.closest(
      "button, select, textarea, input, a.btn, .btn, .sc-cat-trigger, .mrp-trigger, .ctl-host, [role='button']"
    );
    if (interactive && !interactive.closest(".pa-toolbar")) return interactive;

    const filterItem = el.closest(".f, .f-item, .filter-field");
    if (filterItem) {
      const withId = filterItem.querySelector("[id]");
      if (withId && withId.id) return withId;
      const ctl = filterItem.querySelector("select, .sc-cat-wrap, .sku-group, button");
      if (ctl) return ctl;
    }

    return el;
  }

  function generateSelector(el) {
    if (!el || el.nodeType !== 1) return null;
    el = normalizePickTarget(el);
    if (!el) return null;

    if (el.id && !/^\d/.test(el.id)) {
      try {
        return `#${CSS.escape(el.id)}`;
      } catch (_e) {
        return `#${el.id.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1")}`;
      }
    }
    const selfKey = el.getAttribute("data-pa-key");
    if (selfKey) return `[data-pa-key="${escapeAttr(selfKey)}"]`;

    const tag = (el.tagName || "").toUpperCase();
    if (tag === "TH" || tag === "TD") {
      const table = el.closest("table");
      const row = el.parentElement;
      if (table && table.id && row) {
        const idx = Array.from(row.children).indexOf(el) + 1;
        if (idx > 0) {
          const section = el.closest("thead") ? "thead" : "tbody";
          try {
            return `#${CSS.escape(table.id)} ${section} tr > ${tag.toLowerCase()}:nth-child(${idx})`;
          } catch (_e) {
            return `#${table.id} ${section} tr > ${tag.toLowerCase()}:nth-child(${idx})`;
          }
        }
      }
    }

    let node = el.parentElement;
    for (let depth = 0; depth < 6 && node; depth += 1) {
      const nt = (node.tagName || "").toUpperCase();
      if (nt === "TABLE" || nt === "THEAD" || nt === "TBODY" || nt === "TR") {
        node = node.parentElement;
        continue;
      }
      if (node.id && !/^\d/.test(node.id)) {
        try {
          return `#${CSS.escape(node.id)}`;
        } catch (_e) {
          return `#${node.id}`;
        }
      }
      const key = node.getAttribute("data-pa-key");
      if (key) return `[data-pa-key="${escapeAttr(key)}"]`;
      node = node.parentElement;
    }

    let autoKey = "pa-pick-" + Date.now().toString(36);
    if (tag === "TH" || tag === "TD") {
      const label = el.textContent.trim().replace(/\s+/g, " ").slice(0, 24);
      if (label) {
        autoKey = "pa-col-" + label.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, "");
      }
    }
    el.setAttribute("data-pa-key", autoKey);
    return `[data-pa-key="${escapeAttr(autoKey)}"]`;
  }

  function resolveAnnotationTarget(item) {
    const target = resolve(item.selector);
    if (!target) return null;
    const tag = (target.tagName || "").toUpperCase();
    if (tag === "TH" || tag === "TD") return target;
    if (target.classList && target.classList.contains("th-inner")) {
      return target.closest("th") || target;
    }
    return target;
  }

  function pickTargetFromEvent(event) {
    const raw = document.elementFromPoint(event.clientX, event.clientY);
    return normalizePickTarget(raw);
  }

  function highlightPickTarget(el) {
    clearPickHighlight();
    if (!el) return;
    pickHighlightEl = el;
    el.classList.add("pa-pick-highlight");
  }

  function clearPickHighlight() {
    if (pickHighlightEl) {
      pickHighlightEl.classList.remove("pa-pick-highlight");
      pickHighlightEl = null;
    }
  }

  function exitPickMode() {
    pickModeActive = false;
    document.body.classList.remove("pa-pick-mode");
    clearPickHighlight();
    if (pickHandlers) {
      document.removeEventListener("mousemove", pickHandlers.move, true);
      document.removeEventListener("click", pickHandlers.click, true);
      document.removeEventListener("keydown", pickHandlers.key, true);
      pickHandlers = null;
    }
    document.querySelectorAll(".pa-add-button").forEach((btn) => {
      btn.classList.remove("is-active");
      btn.textContent = "新增标注";
    });
  }

  function openAddFormPopover(config, state, target, selector, onDone) {
    closePopovers();
    const popover = document.createElement("div");
    popover.className = "pa-root pa-popover pa-add-form";
    popover.setAttribute(ROOT_ATTR, "popover");
    document.body.appendChild(popover);
    placePopover(popover, target);
    popover.addEventListener("click", (event) => event.stopPropagation());

    const head = document.createElement("div");
    head.className = "pa-pop-head";
    const titleEl = document.createElement("div");
    titleEl.className = "pa-pop-title";
    titleEl.textContent = "新增标注";
    head.appendChild(titleEl);
    popover.appendChild(head);

    const typeLabel = document.createElement("div");
    typeLabel.className = "pa-field-label";
    typeLabel.textContent = "类型";
    const typeRow = document.createElement("div");
    typeRow.className = "pa-type-row";
    const radioAnno = document.createElement("label");
    const inputAnno = document.createElement("input");
    inputAnno.type = "radio";
    inputAnno.name = "pa-add-type";
    inputAnno.value = "annotation";
    inputAnno.checked = true;
    radioAnno.append(inputAnno, document.createTextNode("红点（开发/测试）"));
    const radioTip = document.createElement("label");
    const inputTip = document.createElement("input");
    inputTip.type = "radio";
    inputTip.name = "pa-add-type";
    inputTip.value = "fieldTip";
    radioTip.append(inputTip, document.createTextNode("蓝 i（用户字段）"));
    typeRow.append(radioAnno, radioTip);
    popover.append(typeLabel, typeRow);

    const titleFieldLabel = document.createElement("label");
    titleFieldLabel.className = "pa-field-label";
    titleFieldLabel.textContent = "标题";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "pa-title-input";
    titleInput.placeholder = "例如：日期范围筛选逻辑";
    popover.append(titleFieldLabel, titleInput);

    const bodyLabel = document.createElement("label");
    bodyLabel.className = "pa-field-label";
    bodyLabel.textContent = "说明正文";
    const editor = document.createElement("textarea");
    editor.className = "pa-editor";
    editor.placeholder = "1. 第一条说明\n2. 第二条说明";
    const imageEditor = createImageEditor(state, []);
    imageEditor.bindExtraPaste(editor);
    popover.append(bodyLabel, editor, imageEditor.element);

    const hint = document.createElement("div");
    hint.className = "pa-selector-hint";
    hint.textContent = "绑定元素：" + selector;
    popover.appendChild(hint);

    const actions = document.createElement("div");
    actions.className = "pa-actions";
    const cancel = button("取消");
    const save = button("保存", "pa-action-primary");
    actions.append(cancel, save);
    popover.appendChild(actions);

    cancel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePopovers();
      if (onDone) onDone(false);
    });
    save.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const title = titleInput.value.trim();
      const body = editor.value.trim();
      const images = imageEditor.getImageIds();
      if (!title) {
        window.alert("请填写标题。");
        return;
      }
      if (!body && !images.length) {
        window.alert("请填写说明正文，或粘贴至少一张配图。");
        return;
      }
      const kind = inputTip.checked ? "fieldTip" : "annotation";
      const id = generateUserId();
      state.userAdded = state.userAdded || { annotations: [], fieldTips: [] };
      const item = { id: id, selector: selector, title: title, body: body };
      if (images.length) item.images = images;
      if (kind === "fieldTip") {
        const tag = (target.tagName || "").toUpperCase();
        if (tag === "TH") item.inlineAnchor = undefined;
        else if (tag === "LABEL") item.inlineAnchor = undefined;
        state.userAdded.fieldTips.push(item);
      } else {
        state.userAdded.annotations.push(item);
      }
      saveState(config, state);
      closePopovers();
      scheduleRender(config, state);
      if (onDone) onDone(true);
    });
  }

  function enterPickMode(config, state) {
    if (!paCanEdit) return;
    if (pickModeActive) {
      exitPickMode();
      return;
    }
    closePopovers();
    pickModeActive = true;
    document.body.classList.add("pa-pick-mode");
    document.querySelectorAll(".pa-add-button").forEach((btn) => {
      btn.classList.add("is-active");
      btn.textContent = "取消新增";
    });

    const move = (event) => {
      if (!pickModeActive) return;
      highlightPickTarget(pickTargetFromEvent(event));
    };

    const click = (event) => {
      if (!pickModeActive) return;
      if (event.target.closest(".pa-toolbar") || event.target.closest(".pa-popover")) return;
      const el = pickTargetFromEvent(event);
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      const selector = generateSelector(el);
      if (!selector) return;
      exitPickMode();
      openAddFormPopover(config, state, el, selector, (saved) => {
        if (!saved) enterPickMode(config, state);
      });
    };

    const key = (event) => {
      if (event.key === "Escape") exitPickMode();
    };

    pickHandlers = { move: move, click: click, key: key };
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
  }

  function button(label, className) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `pa-action ${className || ""}`.trim();
    node.textContent = label;
    return node;
  }

  const PA_MAX_IMAGE_BYTES = 900 * 1024;
  const PA_MAX_IMAGE_WIDTH = 1400;

  function parseBody(raw) {
    const lines = text(raw)
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const lead = [];
    const numbered = [];
    const trailing = [];
    let seenNumbered = false;
    lines.forEach((line) => {
      if (/^\d+[.、)]\s*/.test(line)) {
        seenNumbered = true;
        numbered.push(line.replace(/^\d+[.、)]\s*/, ""));
      } else if (!seenNumbered) {
        // 编号列表之前的非编号行（如「新增预算行逻辑：」）作为正文小标题，须置顶
        lead.push(line);
      } else {
        trailing.push(line);
      }
    });
    return { lead: lead, numbered: numbered, trailing: trailing, extra: trailing };
  }

  function normalizeContent(raw, defaultBody) {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return {
        body: text(raw.body !== undefined ? raw.body : defaultBody),
        images: Array.isArray(raw.images) ? raw.images.filter(Boolean).slice() : []
      };
    }
    const body = raw !== undefined && raw !== null ? text(raw) : text(defaultBody);
    return { body: body, images: [] };
  }

  function resolveItemContent(state, key, item) {
    const edited = state.edits && state.edits[key];
    if (edited !== undefined) {
      return normalizeContent(edited, item.body || "");
    }
    if (item.images && item.images.length) {
      return normalizeContent({ body: item.body || "", images: item.images }, item.body || "");
    }
    return normalizeContent(item.body || "", item.body || "");
  }

  function ensureAssets(state) {
    if (!state.assets) state.assets = {};
    return state.assets;
  }

  function generateAssetId() {
    return "pa-img-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function approxDataUrlBytes(dataUrl) {
    const idx = String(dataUrl).indexOf(",");
    if (idx < 0) return 0;
    return Math.ceil((dataUrl.length - idx - 1) * 0.75);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function compressImageDataUrl(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h || w <= maxWidth) {
          resolve(dataUrl);
          return;
        }
        const scale = maxWidth / w;
        w = maxWidth;
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const out = canvas.toDataURL("image/jpeg", quality || 0.86);
          resolve(out.length < dataUrl.length ? out : dataUrl);
        } catch (_error) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function registerImageAsset(state, dataUrl) {
    if (!dataUrl || !String(dataUrl).startsWith("data:image/")) return null;
    let prepared = await compressImageDataUrl(dataUrl, PA_MAX_IMAGE_WIDTH, 0.86);
    if (approxDataUrlBytes(prepared) > PA_MAX_IMAGE_BYTES) {
      prepared = await compressImageDataUrl(prepared, 960, 0.72);
    }
    if (approxDataUrlBytes(prepared) > PA_MAX_IMAGE_BYTES) {
      window.alert("图片过大，请裁剪或压缩后再粘贴（建议单张小于 900KB）。");
      return null;
    }
    const assets = ensureAssets(state);
    const id = generateAssetId();
    assets[id] = prepared;
    return id;
  }

  function readImageFileFromClipboard(event) {
    const items = event.clipboardData && event.clipboardData.items;
    if (!items) return null;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type && item.type.indexOf("image") !== -1) {
        return item.getAsFile();
      }
    }
    return null;
  }

  function renderContentImages(container, imageIds, state) {
    const assets = (state && state.assets) || {};
    const ids = (imageIds || []).filter((id) => assets[id]);
    if (!ids.length) return;
    const wrap = document.createElement("div");
    wrap.className = "pa-pop-images";
    ids.forEach((id) => {
      const img = document.createElement("img");
      img.className = "pa-pop-image";
      img.src = assets[id];
      img.alt = "标注配图";
      img.loading = "lazy";
      img.addEventListener("click", (event) => {
        event.stopPropagation();
        openImagePreview(assets[id]);
      });
      wrap.appendChild(img);
    });
    container.appendChild(wrap);
  }

  function openImagePreview(src) {
    const overlay = document.createElement("div");
    overlay.className = "pa-root pa-image-preview";
    overlay.setAttribute(ROOT_ATTR, "preview");
    const img = document.createElement("img");
    img.src = src;
    img.alt = "标注配图预览";
    overlay.appendChild(img);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function fillBody(container, raw) {
    fillContent(container, normalizeContent(raw, raw));
  }

  function fillContent(container, content, state) {
    const parsed = parseBody(content.body);
    const leadLines = parsed.lead || [];
    const trailingLines = parsed.trailing || parsed.extra || [];
    // 渲染顺序：逻辑小标题 → 编号规则 → 补充说明 → 配图（小标题绝不可落到列表下方）
    if (leadLines.length) {
      const lead = document.createElement("div");
      lead.className = "pa-pop-lead";
      leadLines.forEach((item) => {
        const p = document.createElement("p");
        p.textContent = item;
        lead.appendChild(p);
      });
      container.appendChild(lead);
    }
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
    if (trailingLines.length) {
      const extra = document.createElement("div");
      extra.className = "pa-pop-extra";
      trailingLines.forEach((item) => {
        const p = document.createElement("p");
        p.textContent = item;
        extra.appendChild(p);
      });
      container.appendChild(extra);
    }
    if (state) renderContentImages(container, content.images, state);
    if (
      !leadLines.length &&
      !parsed.numbered.length &&
      !trailingLines.length &&
      !(content.images && content.images.length)
    ) {
      const empty = document.createElement("div");
      empty.className = "pa-pop-extra";
      container.appendChild(empty);
    }
  }

  function createImageEditor(state, initialIds) {
    let imageIds = (initialIds || []).slice();
    const wrap = document.createElement("div");
    wrap.className = "pa-image-editor";

    const label = document.createElement("div");
    label.className = "pa-field-label";
    label.textContent = "配图（可选）";

    const zone = document.createElement("div");
    zone.className = "pa-image-paste-zone";
    zone.tabIndex = 0;

    const hint = document.createElement("div");
    hint.className = "pa-image-paste-hint";
    hint.textContent = "在此粘贴（Ctrl/Cmd+V）、拖拽图片，或点击选择文件";

    const thumbs = document.createElement("div");
    thumbs.className = "pa-image-thumbs";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.className = "pa-image-file-input";

    function renderThumbs() {
      thumbs.innerHTML = "";
      const assets = ensureAssets(state);
      imageIds.forEach((id) => {
        if (!assets[id]) return;
        const item = document.createElement("div");
        item.className = "pa-image-thumb";
        const img = document.createElement("img");
        img.src = assets[id];
        img.alt = "配图缩略图";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "pa-image-remove";
        remove.textContent = "×";
        remove.title = "移除配图";
        remove.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          imageIds = imageIds.filter((x) => x !== id);
          renderThumbs();
        });
        item.append(img, remove);
        thumbs.appendChild(item);
      });
      zone.classList.toggle("has-images", imageIds.length > 0);
    }

    async function ingestFile(file) {
      if (!file || !String(file.type || "").startsWith("image/")) return;
      try {
        const dataUrl = await blobToDataUrl(file);
        const id = await registerImageAsset(state, dataUrl);
        if (id) {
          imageIds.push(id);
          renderThumbs();
        }
      } catch (_error) {
        window.alert("读取图片失败，请重试。");
      }
    }

    zone.addEventListener("click", (event) => {
      if (event.target.closest(".pa-image-remove")) return;
      fileInput.click();
    });
    fileInput.addEventListener("change", async () => {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      fileInput.value = "";
      for (let i = 0; i < files.length; i += 1) {
        await ingestFile(files[i]);
      }
    });

    async function onPaste(event) {
      const file = readImageFileFromClipboard(event);
      if (!file) return;
      event.preventDefault();
      event.stopPropagation();
      await ingestFile(file);
    }

    zone.addEventListener("paste", onPaste);
    wrap.addEventListener("paste", onPaste);
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-dragover"));
    zone.addEventListener("drop", async (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragover");
      const files = event.dataTransfer && event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
      for (let i = 0; i < files.length; i += 1) {
        await ingestFile(files[i]);
      }
    });

    zone.append(hint, thumbs);
    wrap.append(label, zone, fileInput);
    renderThumbs();

    return {
      element: wrap,
      bindExtraPaste: (node) => node.addEventListener("paste", onPaste),
      getImageIds: () => imageIds.slice()
    };
  }

  function editablePopover(config, state, key, title, body, anchor, badgeLabel, meta, item) {
    closePopovers();
    const popover = document.createElement("div");
    popover.className = "pa-root pa-popover";
    popover.setAttribute(ROOT_ATTR, "popover");
    document.body.appendChild(popover);
    placePopover(popover, anchor);
    popover.addEventListener("click", (event) => event.stopPropagation());

    function currentContent() {
      return resolveItemContent(state, key, { body: body, images: (item && item.images) || [] });
    }

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
      popover.classList.toggle("has-images", !!(content.images && content.images.length));
      appendHead(title);
      const bodyEl = document.createElement("div");
      bodyEl.className = "pa-pop-body";
      fillContent(bodyEl, content, state);
      const actions = document.createElement("div");
      actions.className = "pa-actions";
      const close = button("关闭", "pa-action-primary");
      if (paCanEdit) {
        const edit = button("编辑");
        const remove = button("删除");
        actions.append(edit, remove, close);
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
      } else {
        actions.append(close);
      }
      popover.append(bodyEl, actions);
      close.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePopovers();
      });
    }

    function renderEdit(content) {
      popover.innerHTML = "";
      popover.classList.remove("has-images");
      appendHead(`编辑说明：${title}`);
      const normalized = normalizeContent(content, body);
      const editor = document.createElement("textarea");
      editor.className = "pa-editor";
      editor.value = normalized.body;
      const imageEditor = createImageEditor(state, normalized.images);
      imageEditor.bindExtraPaste(editor);
      const actions = document.createElement("div");
      actions.className = "pa-actions";
      const cancel = button("取消");
      const save = button("保存", "pa-action-primary");
      actions.append(cancel, save);
      popover.append(editor, imageEditor.element, actions);

      cancel.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderView(currentContent());
      });
      save.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextBody = editor.value.trim();
        const nextImages = imageEditor.getImageIds();
        if (!nextBody && !nextImages.length) {
          window.alert("请填写说明正文，或保留至少一张配图。");
          return;
        }
        state.edits = state.edits || {};
        state.edits[key] = { body: nextBody, images: nextImages };
        saveState(config, state);
        renderView(normalizeContent(state.edits[key], body));
      });
    }

    function renderDeleteConfirm(content) {
      popover.innerHTML = "";
      appendHead(`删除说明：${title}`);
      const bodyEl = document.createElement("div");
      bodyEl.className = "pa-pop-body";
      fillBody(bodyEl, "1. 删除后，当前页面下该标注将不再显示。\n2. 刷新页面后仍会保持删除状态（已写入页面配置）。");
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
        if (meta && meta.isUser && meta.listKey && meta.itemId) {
          state.userAdded = state.userAdded || { annotations: [], fieldTips: [] };
          const list = state.userAdded[meta.listKey] || [];
          state.userAdded[meta.listKey] = list.filter((x) => x.id !== meta.itemId);
          if (!state.userAdded.annotations.length && !state.userAdded.fieldTips.length) {
            delete state.userAdded;
          }
        } else {
          state.hidden = state.hidden || {};
          state.hidden[key] = true;
        }
        saveState(config, state);
        if (anchor && anchor.remove) anchor.remove();
        closePopovers();
        scheduleRender(config, state);
      });
    }

    renderView(currentContent());
  }

  function isVisibleTarget(target) {
    if (!target) return false;
    if (target.closest("[hidden]")) return false;
    const closedOverlay = target.closest(
      ".modal-mask:not(.open), .drawer-mask:not(.open), [aria-modal='true'][aria-hidden='true']"
    );
    if (closedOverlay) return false;
    const rects = target.getClientRects();
    return rects.length > 0;
  }

  function removeAnnotationPortalByKey(key) {
    const existing = document.querySelector(`[data-pa-item-key="${key}"]`);
    if (!existing) return;
    const idx = PORTAL_ENTRIES.findIndex((entry) => entry.icon === existing);
    if (idx >= 0) PORTAL_ENTRIES.splice(idx, 1);
    existing.remove();
  }

  function clearAnnotationPortalsOnly() {
    document.querySelectorAll(".pa-dot.pa-icon-portal").forEach((node) => node.remove());
    PORTAL_ENTRIES.length = 0;
  }

  function isPaOwnedNode(node) {
    if (!node) return false;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !el.closest) return false;
    return !!(el.closest(`[${ROOT_ATTR}]`) || el.closest(".pa-root") || el.closest(".pa-icon-portal"));
  }

  function mutationAffectsPageContent(mutations) {
    for (let i = 0; i < mutations.length; i += 1) {
      const m = mutations[i];
      if (m.type === "attributes") {
        if (!isPaOwnedNode(m.target)) return true;
        continue;
      }
      const lists = [m.addedNodes, m.removedNodes];
      for (let li = 0; li < lists.length; li += 1) {
        const nodes = lists[li];
        for (let ni = 0; ni < nodes.length; ni += 1) {
          if (!isPaOwnedNode(nodes[ni])) return true;
        }
      }
    }
    return false;
  }

  function withObserverPaused(fn) {
    const observer = window[OBSERVER_STORE_KEY];
    if (observer && observer.disconnect) observer.disconnect();
    try {
      fn();
    } finally {
      if (observer && activeMount && observer.observe) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["hidden", "style", "class", "aria-hidden"]
        });
      }
    }
  }

  function renderAnnotations(config, state) {
    const keepKeys = new Set();
    const baseAnno = config.annotations || [];
    const userAnno = (state.userAdded && state.userAdded.annotations) || [];
    baseAnno.forEach((item, index) => {
      const key = `annotation:${item.id || index}`;
      if (state.hidden && state.hidden[key]) {
        removeAnnotationPortalByKey(key);
        return;
      }
      keepKeys.add(key);
      addAnnotation(config, state, item, index, false);
    });
    userAnno.forEach((item, index) => {
      const key = `userAnnotation:${item.id}`;
      if (state.hidden && state.hidden[key]) {
        removeAnnotationPortalByKey(key);
        return;
      }
      keepKeys.add(key);
      addAnnotation(config, state, item, baseAnno.length + index, true);
    });
    document.querySelectorAll(".pa-dot.pa-icon-portal[data-pa-item-key]").forEach((node) => {
      const key = node.getAttribute("data-pa-item-key");
      if (key && !keepKeys.has(key)) removeAnnotationPortalByKey(key);
    });
  }

  function renderFieldTips(config, state) {
    const baseTips = config.fieldTips || [];
    const userTips = (state.userAdded && state.userAdded.fieldTips) || [];
    baseTips.forEach((item, index) => addFieldTip(config, state, item, index, false));
    userTips.forEach((item, index) => addFieldTip(config, state, item, index, true));
  }

  function resyncAnnotationsNow() {
    if (!activeMount) return;
    const { config, state } = activeMount;
    withObserverPaused(() => {
      renderAnnotations(config, state);
      renderFieldTips(config, state);
      repositionAllPortalIcons();
    });
  }

  function queueAnnotationResync() {
    if (!activeMount) return;
    if (window[RENDER_TIMER_KEY]) clearTimeout(window[RENDER_TIMER_KEY]);
    window[RENDER_TIMER_KEY] = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resyncAnnotationsNow();
        });
      });
    }, 60);
  }

  function getScrollableParents(el) {
    const parents = [];
    let node = el && el.parentElement;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
      if (/(auto|scroll|overlay)/.test(overflow)) parents.push(node);
      node = node.parentElement;
    }
    return parents;
  }

  function repositionAllPortalIcons() {
    PORTAL_ENTRIES.forEach((entry) => {
      if (entry.icon && entry.icon.isConnected && entry.target && entry.target.isConnected) {
        if (isVisibleTarget(entry.target)) entry.update();
        else entry.icon.style.visibility = "hidden";
      }
    });
    const buckets = new Map();
    PORTAL_ENTRIES.forEach((entry) => {
      if (!entry.icon || !entry.icon.isConnected || entry.icon.style.visibility === "hidden") return;
      const rect = entry.icon.getBoundingClientRect();
      const key = `${Math.round(rect.left / 10)}:${Math.round(rect.top / 10)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(entry);
    });
    PORTAL_ENTRIES.forEach((entry) => {
      if (entry.icon) entry.icon.style.transform = "";
    });
    buckets.forEach((entries) => {
      if (entries.length < 2) return;
      entries.forEach((entry, index) => {
        entry.icon.style.transform = `translate(${index * 14}px, ${index * 12}px)`;
      });
    });
  }

  function bindScrollableParents(el) {
    if (!el) return;
    if (!window[SCROLL_PARENT_BOUND_KEY]) window[SCROLL_PARENT_BOUND_KEY] = boundScrollParents;
    getScrollableParents(el).forEach((parent) => {
      if (boundScrollParents.has(parent)) return;
      boundScrollParents.add(parent);
      parent.addEventListener("scroll", repositionAllPortalIcons, { passive: true });
    });
  }

  function bindPortalReposition() {
    if (window[PORTAL_REPOSITION_KEY]) return;
    window[PORTAL_REPOSITION_KEY] = true;
    window.addEventListener("scroll", repositionAllPortalIcons, true);
    window.addEventListener("resize", repositionAllPortalIcons);
  }

  /** 开发/测试编号点：固定叠在目标 getBoundingClientRect 右上角，不插入文档流 */
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

  function attachAnnotationPortal(icon, target) {
    if (!isVisibleTarget(target)) return false;
    icon.classList.add("pa-icon-portal");
    document.body.appendChild(icon);
    const update = () => positionPortalIcon(icon, target);
    update();
    PORTAL_ENTRIES.push({ icon, target, update });
    bindPortalReposition();
    bindScrollableParents(target);
    repositionAllPortalIcons();
    return true;
  }

  function tableHasStickyColumns(table) {
    return !!(
      table &&
      table.querySelector("th.actions, td.actions, th.chk-col, td.chk-col, .actions, .chk-col")
    );
  }

  function shouldPortalFieldTip(target) {
    const tag = (target && target.tagName) || "";
    if (tag.toUpperCase() !== "TH") return false;
    const table = target.closest("table");
    if (!table) return false;
    if (tableHasStickyColumns(table)) return true;
    return getScrollableParents(target).length > 0;
  }

  function positionPortalFieldTip(icon, target) {
    const wrap = target.querySelector(".pa-tip-label-wrap");
    const anchor = wrap || target;
    const rect = anchor.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      icon.style.visibility = "hidden";
      return;
    }
    icon.style.visibility = "visible";
    const h = icon.offsetHeight || 16;
    icon.style.left = `${Math.round(rect.right + 2)}px`;
    icon.style.top = `${Math.round(rect.top + Math.max(0, (rect.height - h) / 2))}px`;
  }

  function attachFieldTipPortal(icon, target) {
    if (!isVisibleTarget(target)) return false;
    icon.classList.add("pa-tip-icon-portal");
    document.body.appendChild(icon);
    const update = () => positionPortalFieldTip(icon, target);
    update();
    PORTAL_ENTRIES.push({ icon, target, update });
    bindPortalReposition();
    bindScrollableParents(target);
    repositionAllPortalIcons();
    return true;
  }

  function resolveFieldTipTarget(item) {
    const target = resolve(item.selector);
    if (!target) return null;
    const mode = item.inlineAnchor || "";
    if (mode === "filterLabel") {
      const row = target.closest(".f");
      const lab = row && row.querySelector("label");
      return lab || target;
    }
    return target;
  }

  /** 用户字段 i：紧跟说明文字之后，参与行内排版（表头写在 th 内，不挤列宽） */
  function attachFieldTipInline(icon, target, item) {
    if (!isVisibleTarget(target)) return false;
    const inlineAnchor = (item && item.inlineAnchor) || "";
    if (inlineAnchor === "afterElement") {
      icon.classList.add("pa-tip-inline");
      target.insertAdjacentElement("afterend", icon);
      return true;
    }
    const tag = (target.tagName || "").toUpperCase();

    if (tag === "TH") {
      const wrap = document.createElement("span");
      wrap.className = "pa-tip-label-wrap";
      const labelText = target.textContent.trim();
      target.textContent = "";
      if (labelText) wrap.appendChild(document.createTextNode(labelText));
      target.appendChild(wrap);
      if (shouldPortalFieldTip(target)) return attachFieldTipPortal(icon, target);
      icon.classList.add("pa-tip-inline");
      wrap.appendChild(icon);
      return true;
    }

    icon.classList.add("pa-tip-inline");

    if (target.classList && target.classList.contains("th-inner")) {
      target.appendChild(icon);
      return true;
    }

    if (tag === "LABEL") {
      target.insertAdjacentElement("afterend", icon);
      return true;
    }

    if (target.classList && target.classList.contains("lab")) {
      const first = target.firstElementChild;
      if (first && first.tagName === "SPAN" && target.children.length > 1) {
        first.insertAdjacentElement("afterend", icon);
        return true;
      }
      target.appendChild(icon);
      return true;
    }

    const canAppend = !["INPUT", "SELECT", "TEXTAREA"].includes(tag);
    if (canAppend && target.children.length === 0 && target.textContent.trim()) {
      const wrap = document.createElement("span");
      wrap.className = "pa-tip-label-wrap";
      wrap.textContent = target.textContent.trim();
      target.textContent = "";
      wrap.appendChild(icon);
      target.appendChild(wrap);
      return true;
    }

    if (canAppend) {
      target.appendChild(icon);
      return true;
    }

    target.insertAdjacentElement("afterend", icon);
    return true;
  }

  function addAnnotation(config, state, item, index, isUser) {
    const target = resolveAnnotationTarget(item);
    if (!target) return;
    const key = isUser ? `userAnnotation:${item.id}` : `annotation:${item.id || index}`;
    if (state.hidden && state.hidden[key]) return;
    const existing = document.querySelector(`[data-pa-item-key="${key}"]`);
    if (existing) {
      const entry = PORTAL_ENTRIES.find((row) => row.icon === existing);
      if (entry && entry.target === target && isVisibleTarget(target)) {
        existing.textContent = String(index + 1);
        existing.title = item.title || "说明";
        entry.update();
        return;
      }
      // 目标节点被替换（如表体重绘）时，改绑到新 target，避免整表清空重建导致点击失效
      if (entry && existing.isConnected && isVisibleTarget(target)) {
        entry.target = target;
        existing.textContent = String(index + 1);
        existing.title = item.title || "说明";
        entry.update();
        return;
      }
      removeAnnotationPortalByKey(key);
    }
    if (!isVisibleTarget(target)) return;
    const dot = document.createElement("span");
    dot.className = "pa-root pa-dot";
    dot.setAttribute(ROOT_ATTR, "annotation");
    dot.setAttribute("data-pa-item-key", key);
    dot.textContent = String(index + 1);
    dot.title = item.title || "说明";
    if (!attachAnnotationPortal(dot, target)) return;
    const meta = isUser ? { isUser: true, listKey: "annotations", itemId: item.id } : null;
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      editablePopover(
        config,
        state,
        key,
        item.title || "说明",
        item.body || "",
        dot,
        dot.textContent,
        meta,
        item
      );
    });
  }

  function addFieldTip(config, state, item, index, isUser) {
    const target = resolveFieldTipTarget(item);
    if (!target) return;
    const key = isUser ? `userFieldTip:${item.id}` : `fieldTip:${item.id || index}`;
    if (state.hidden && state.hidden[key]) return;
    if (document.querySelector(`[data-pa-item-key="${key}"]`)) return;
    const icon = document.createElement("span");
    icon.className = "pa-root pa-tip-icon";
    icon.setAttribute(ROOT_ATTR, "field-tip");
    icon.setAttribute("data-pa-item-key", key);
    icon.textContent = "i";
    icon.title = item.title || "字段释义";
    if (!attachFieldTipInline(icon, target, item)) return;
    const meta = isUser ? { isUser: true, listKey: "fieldTips", itemId: item.id } : null;
    icon.addEventListener("click", (event) => {
      event.stopPropagation();
      editablePopover(
        config,
        state,
        key,
        item.title || "字段释义",
        item.body || "",
        icon,
        icon.textContent,
        meta,
        item
      );
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

    const savedCustom = state.guides && state.guides[editableKey];
    if (savedCustom) {
      const pre = document.createElement("pre");
      pre.className = "pa-guide-pre";
      pre.textContent = savedCustom;
      node.appendChild(pre);
    } else {
      Object.entries(guide || {}).forEach(([key, value]) => {
        node.appendChild(section(key, value));
      });
    }
    if (flow && flow.nodes && flow.nodes.length) {
      const flowTitle = document.createElement("div");
      flowTitle.className = "pa-section-title";
      flowTitle.textContent = "状态流转";
      node.appendChild(flowTitle);
      node.appendChild(statusFlow(flow));
    }

    const actions = document.createElement("div");
    actions.className = "pa-actions";
    if (paCanEdit) {
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
    }

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
    body.append(
      panel("开发测试专用", (config.pageGuide && config.pageGuide.dev) || {}, config.statusFlow, "dev", config, state),
      panel("终端用户手册", (config.pageGuide && config.pageGuide.user) || {}, null, "user", config, state)
    );

    modal.append(head, body);
    document.body.appendChild(modal);
    close.addEventListener("click", () => modal.remove());
    makeDraggable(modal, head);
  }

  function renderAll(config, state) {
    renderAnnotations(config, state);
    renderFieldTips(config, state);
  }

  function scheduleRender(config, state) {
    activeMount = { config, state };
    queueAnnotationResync();
  }

  function bindDynamicObserver(config, state) {
    const observer = new MutationObserver((mutations) => {
      if (!mutationAffectsPageContent(mutations)) return;
      scheduleRender(config, state);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style", "class", "aria-hidden"]
    });
    window[OBSERVER_STORE_KEY] = observer;
    document.addEventListener("pa:layout-change", () => scheduleRender(config, state));
  }

  async function mount(input) {
    const config = clone(input);
    removeOld();
    exitPickMode();
    paCanEdit = await resolveCanEdit(config);
    const state = hydrateState(config);
    activeMount = { config, state };
    const root = document.createElement("div");
    root.className = "pa-root pa-toolbar" + (paCanEdit ? "" : " pa-toolbar-readonly");
    root.setAttribute(ROOT_ATTR, "root");
    const pageButton = document.createElement("button");
    pageButton.type = "button";
    pageButton.className = "pa-page-button";
    pageButton.textContent = "查看页面说明";
    pageButton.addEventListener("click", () => openModal(config, state));
    if (paCanEdit) {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "pa-add-button";
      addButton.textContent = "新增标注";
      addButton.addEventListener("click", (event) => {
        event.stopPropagation();
        enterPickMode(config, state);
      });
      root.append(pageButton, addButton);
    } else {
      root.append(pageButton);
    }
    document.body.appendChild(root);

    renderAll(config, state);
    bindOutsideClose();
    bindDynamicObserver(config, state);
  }

  async function mountFromScript() {
    const script = document.getElementById("prototype-annotation-config");
    if (!script) return;
    try {
      await mount(JSON.parse(script.textContent));
    } catch (error) {
      console.error("Prototype annotation config is invalid.", error);
    }
  }

  window.PrototypeAnnotation = {
    mount,
    mountFromScript,
    resolveCanEdit,
    resync: resyncAnnotationsNow
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFromScript);
  } else {
    mountFromScript();
  }
})();
