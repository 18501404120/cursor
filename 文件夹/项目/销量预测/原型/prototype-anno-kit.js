/**
 * initProtoAnnos(items)
 * item: { containerSelector?, anchorSelector?, attach?, title, html }
 * attach: 省略=挂入 container 或 anchor 解析出的容器 | 'afterend'=紧跟 anchor 后
 */
(function (w) {
  function escapeHtml(s) {
    if (s == null || s === "") return "";
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function ensureModal() {
    if (document.getElementById("proto-anno-modal")) return;
    var m = document.createElement("div");
    m.id = "proto-anno-modal";
    m.className = "proto-anno-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML =
      '<div class="proto-anno-backdrop" data-close="1"></div>' +
      '<div class="proto-anno-panel">' +
      '<div class="proto-anno-hd"><span id="proto-anno-title"></span>' +
      '<button type="button" class="proto-anno-close" aria-label="关闭">×</button></div>' +
      '<div class="proto-anno-bd" id="proto-anno-body"></div></div>';
    document.body.appendChild(m);
    function close() {
      m.classList.remove("show");
      document.body.style.overflow = "";
    }
    m.querySelector(".proto-anno-backdrop").addEventListener("click", close);
    m.querySelector(".proto-anno-close").addEventListener("click", close);
    m.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function open(title, html) {
    ensureModal();
    document.getElementById("proto-anno-title").textContent = title || "说明";
    document.getElementById("proto-anno-body").innerHTML = html || "";
    document.getElementById("proto-anno-modal").classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function makeBtn(title, html) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "proto-red-dot";
    btn.setAttribute("aria-label", "查看说明：" + (title || ""));
    btn.title = "点击查看详细说明";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(title, html);
    });
    return btn;
  }

  function cornerBox(box) {
    if (!box) return false;
    var tag = box.tagName;
    var cls = box.classList;
    /* th 内红点随表头流式排在单元格末尾，避免飘到右上角与列名脱节 */
    if (cls && cls.contains("kpi")) return true;
    if (tag === "SECTION") return true;
    if (
      cls &&
      (cls.contains("hero") ||
        cls.contains("diagram-box") ||
        cls.contains("mod-card") ||
        cls.contains("pillar") ||
        cls.contains("table-scroll-wrap") ||
        cls.contains("stack") ||
        cls.contains("value-pillars") ||
        cls.contains("grid-3") ||
        cls.contains("modules") ||
        cls.contains("roadmap"))
    )
      return true;
    if (cls && cls.contains("topnav-inner")) return true;
    if (tag === "NAV") return true;
    if (tag === "FOOTER") return true;
    return false;
  }

  function placeOn(box, btn) {
    var tag = box.tagName;
    if (tag === "BUTTON") {
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      btn.classList.add("proto-red-dot--on-btn");
      if (box.querySelector && box.querySelector(":scope > .proto-red-dot")) return;
      box.appendChild(btn);
      return;
    }
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      btn.classList.add("proto-red-dot--inline");
      if (box.nextElementSibling && box.nextElementSibling.classList.contains("proto-red-dot")) return;
      box.insertAdjacentElement("afterend", btn);
      return;
    }
    if (cornerBox(box)) {
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      btn.style.position = "absolute";
      btn.style.right = "4px";
      btn.style.top = "4px";
      btn.style.marginLeft = "0";
    }
    if (box.querySelector && box.querySelector(":scope > .proto-red-dot")) return;
    box.appendChild(btn);
  }

  function resolveBox(anchor) {
    return (
      anchor.closest(".f") ||
      anchor.closest("label") ||
      anchor.closest("th") ||
      anchor.closest(".kpi") ||
      anchor.closest(".tb-toolbar") ||
      anchor.closest(".chart-toolbar") ||
      anchor.closest(".radio-row") ||
      anchor.closest(".header-title") ||
      anchor.closest(".topnav-inner") ||
      anchor.closest(".panel") ||
      anchor.closest("section") ||
      anchor.closest(".hero") ||
      anchor.closest("nav") ||
      anchor.closest(".diagram-box") ||
      anchor.closest(".mod-card") ||
      anchor.closest(".pillar") ||
      anchor.closest(".table-scroll-wrap") ||
      anchor.closest(".chart-panel") ||
      anchor
    );
  }

  function initProtoAnnos(items) {
    ensureModal();
    (items || []).forEach(function (item) {
      var btn = makeBtn(item.title, item.html);
      if (item.anchorSelector) {
        var a = document.querySelector(item.anchorSelector);
        if (!a) return;
        if (item.attach === "afterend") {
          if (a.nextElementSibling && a.nextElementSibling.classList.contains("proto-red-dot")) return;
          btn.classList.add("proto-red-dot--inline");
          a.insertAdjacentElement("afterend", btn);
          return;
        }
        var tag = a.tagName;
        if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") {
          btn.classList.add("proto-red-dot--inline");
          if (a.nextElementSibling && a.nextElementSibling.classList.contains("proto-red-dot")) return;
          a.insertAdjacentElement("afterend", btn);
          return;
        }
        if (tag === "BUTTON") {
          placeOn(a, btn);
          return;
        }
        var box = resolveBox(a);
        if (!box) return;
        placeOn(box, btn);
        return;
      }
      var box = document.querySelector(item.containerSelector);
      if (!box) return;
      placeOn(box, btn);
    });
  }

  /**
   * 表头等 .field-tip（? / ⓘ）点击打开与红点相同的说明弹层；支持 title 或 data-tip-html。
   */
  function fieldTipTitle(el) {
    var t = el.getAttribute("data-tip-title");
    if (t) return t;
    var wrap = el.closest(".th-with-tip");
    if (wrap) {
      for (var c = wrap.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3 && c.textContent.trim()) return c.textContent.trim();
        if (c.nodeType === 1 && c !== el && !c.classList.contains("field-tip")) {
          var tx = c.textContent.trim();
          if (tx) return tx.replace(/\s+/g, " ");
        }
      }
    }
    var th = el.closest("th");
    if (th) return (th.textContent || "").replace(/\?/g, "").replace(/\s+/g, " ").trim().slice(0, 40) || "字段说明";
    return "说明";
  }

  function fieldTipBody(el) {
    var html = el.getAttribute("data-tip-html");
    if (html) return html;
    var plain = el.getAttribute("title");
    if (plain && plain.trim()) {
      return "<p style=\"margin:0;line-height:1.65;white-space:pre-wrap\">" + escapeHtml(plain.trim()) + "</p>";
    }
    return "<p style=\"margin:0\">暂无说明。</p>";
  }

  function initProtoFieldTips(root) {
    ensureModal();
    root = root || document;
    var tips = root.querySelectorAll(".field-tip");
    for (var i = 0; i < tips.length; i++) {
      (function (el) {
        if (el.getAttribute("data-field-tip-bound") === "1") return;
        el.setAttribute("data-field-tip-bound", "1");
        el.setAttribute("role", "button");
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", (fieldTipTitle(el) || "说明") + "，点击查看详情");
        function onActivate(e) {
          if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          open(fieldTipTitle(el), fieldTipBody(el));
        }
        el.addEventListener("click", onActivate);
        el.addEventListener("keydown", onActivate);
      })(tips[i]);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initProtoFieldTips(document);
  });

  w.initProtoAnnos = initProtoAnnos;
  w.initProtoFieldTips = initProtoFieldTips;
})(window);
