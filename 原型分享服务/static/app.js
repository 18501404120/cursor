const state = {
  info: null,
  selectedPath: "",
  filter: "",
  /** path -> { item, childrenLoaded, children, expanded, el } */
  nodes: new Map(),
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制链接");
    return;
  } catch (_) {}
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  toast("已复制链接");
}

const READONLY_QUERY = "paView=1";

function withReadOnly(url) {
  return url.includes("?") ? `${url}&${READONLY_QUERY}` : `${url}?${READONLY_QUERY}`;
}

function originBase() {
  if (state.info?.lan_url) return state.info.lan_url.replace(/\/$/, "");
  return window.location.origin;
}

function shareFolderUrl(path) {
  return withReadOnly(`${originBase()}/share?path=${encodeURIComponent(path)}`);
}

function fileUrl(path) {
  return withReadOnly(`${originBase()}/files/${path.split("/").map(encodeURIComponent).join("/")}`);
}

function localFileHref(path) {
  return `/files/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function depthOf(path) {
  if (!path) return 0;
  return path.split("/").filter(Boolean).length;
}

function iconFor(item) {
  if (item.type === "dir") return item.is_demand ? "▣" : "▤";
  const ext = (item.ext || "").toLowerCase();
  if (ext === ".html" || ext === ".htm") return "◍";
  if (ext === ".md") return "◌";
  return "·";
}

function matchesFilter(item) {
  const q = state.filter.trim().toLowerCase();
  if (!q) return true;
  return item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q);
}

function setSelected(path) {
  state.selectedPath = path || "";
  document.querySelectorAll(".tree-item.selected").forEach((el) => el.classList.remove("selected"));
  const node = state.nodes.get(path || "");
  if (node?.row) node.row.classList.add("selected");
}

async function fetchBrowse(path) {
  const res = await fetch(`/api/browse?path=${encodeURIComponent(path || "")}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "加载失败");
  return data;
}

function createTreeRow(item, depth) {
  const row = document.createElement("div");
  row.className = "tree-item";
  row.dataset.path = item.path;
  row.setAttribute("role", "treeitem");

  const indent = document.createElement("span");
  indent.className = "indent";
  indent.style.width = `${depth * 12}px`;

  const twistie = document.createElement("span");
  twistie.className = item.type === "dir" ? "twistie" : "twistie placeholder";
  twistie.textContent = item.type === "dir" ? "▶" : "";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = iconFor(item);

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = item.name;
  label.title = item.path || item.name;

  const actions = document.createElement("div");
  actions.className = "tree-actions";

  const isHtml = item.type === "file" && (item.ext === ".html" || item.ext === ".htm");

  if (isHtml) {
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "mini-btn";
    openBtn.textContent = "打开";
    openBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(localFileHref(item.path), "_blank", "noopener");
    };
    actions.appendChild(openBtn);

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "mini-btn primary";
    shareBtn.textContent = "分享";
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      copyText(fileUrl(item.path));
    };
    actions.appendChild(shareBtn);
  } else if (item.type === "dir" && item.is_demand) {
    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "mini-btn primary";
    shareBtn.textContent = "分享";
    shareBtn.title = "复制局域网分享链接";
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      copyText(shareFolderUrl(item.path));
    };
    actions.appendChild(shareBtn);
  }

  row.append(indent, twistie, icon, label, actions);

  row.addEventListener("click", async (e) => {
    if (e.target.closest(".tree-actions") || e.target.closest(".twistie")) return;
    setSelected(item.path);
    if (item.type === "dir") {
      await selectDirectory(item.path);
      const node = state.nodes.get(item.path);
      if (node && !node.expanded) await toggleExpand(item.path);
    } else {
      await selectDirectory(item.path.split("/").slice(0, -1).join("/"));
    }
  });

  if (item.type === "dir") {
    twistie.onclick = async (e) => {
      e.stopPropagation();
      await toggleExpand(item.path);
    };
  }

  return row;
}

function ensureNode(item) {
  if (state.nodes.has(item.path)) return state.nodes.get(item.path);
  const node = {
    item,
    childrenLoaded: false,
    children: [],
    expanded: false,
    row: null,
    childrenEl: null,
  };
  state.nodes.set(item.path, node);
  return node;
}

async function renderChildren(parentPath, container, depth) {
  const data = await fetchBrowse(parentPath);
  container.innerHTML = "";

  const items = (data.items || []).filter((it) => {
    // 筛选时：目录若子孙可能匹配则仍显示，这里做简单名称过滤；展开后由子级再滤
    if (!state.filter.trim()) return true;
    if (it.type === "dir") return true;
    return matchesFilter(it);
  });

  items.forEach((item) => {
    if (state.filter.trim() && item.type === "file" && !matchesFilter(item)) return;

    const node = ensureNode(item);
    node.item = item;
    const row = createTreeRow(item, depth);
    node.row = row;

    const wrap = document.createElement("div");
    wrap.appendChild(row);

    if (item.type === "dir") {
      const childrenEl = document.createElement("div");
      childrenEl.className = "tree-children";
      childrenEl.setAttribute("role", "group");
      node.childrenEl = childrenEl;
      if (node.expanded) {
        childrenEl.classList.add("open");
        const twistie = row.querySelector(".twistie");
        if (twistie) twistie.textContent = "▼";
      }
      wrap.appendChild(childrenEl);
    }

    // 筛选时隐藏完全不匹配的叶子目录名
    if (state.filter.trim() && item.type === "dir" && !matchesFilter(item)) {
      // 仍渲染，允许展开后找子项；名称不匹配时降低存在感
      row.style.opacity = "0.55";
    }

    container.appendChild(wrap);
  });

  return items;
}

async function toggleExpand(path) {
  const node = state.nodes.get(path);
  if (!node || node.item.type !== "dir") return;

  if (!node.childrenEl) return;

  if (node.expanded) {
    node.expanded = false;
    node.childrenEl.classList.remove("open");
    const twistie = node.row?.querySelector(".twistie");
    if (twistie) twistie.textContent = "▶";
    return;
  }

  if (!node.childrenLoaded) {
    await renderChildren(path, node.childrenEl, depthOf(path) + 1);
    node.childrenLoaded = true;
  }
  node.expanded = true;
  node.childrenEl.classList.add("open");
  const twistie = node.row?.querySelector(".twistie");
  if (twistie) twistie.textContent = "▼";
}

async function selectDirectory(path) {
  setSelected(path);
  if (!path) {
    $("detail").hidden = true;
    $("mainEmpty").hidden = false;
    return;
  }

  $("mainEmpty").hidden = true;
  $("detail").hidden = false;
  $("detailPath").textContent = path;
  $("detailTitle").textContent = path.split("/").pop();

  $("detailShareBtn").onclick = () => copyText(shareFolderUrl(path));

  const res = await fetch(`/api/folder?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  if (!res.ok) {
    $("detailFiles").innerHTML = `<p class="empty">${data.error || "无法打开"}</p>`;
    $("detailPreviewBtn").hidden = true;
    return;
  }

  const preview = $("detailPreviewBtn");
  if (data.primary_path) {
    preview.hidden = false;
    preview.href = localFileHref(data.primary_path);
  } else {
    preview.hidden = true;
  }

  const box = $("detailFiles");
  box.innerHTML = "";
  const files = data.files || [];
  if (!files.length) {
    box.innerHTML = `<p class="empty">此目录下没有可分享文件（可继续在左侧展开子目录）</p>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "file-rows";
  files.forEach((f) => {
    const row = document.createElement("div");
    row.className = "file-row";
    const main = document.createElement("div");
    main.innerHTML = `<div class="file-name">${escapeHtml(f.name)}</div><div class="file-meta">${escapeHtml(f.ext || "")}</div>`;
    const actions = document.createElement("div");
    actions.className = "file-actions";

    const openBtn = document.createElement("a");
    openBtn.className = "btn";
    openBtn.href = localFileHref(f.path);
    openBtn.target = "_blank";
    openBtn.rel = "noopener";
    openBtn.textContent = "打开";

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn primary";
    shareBtn.textContent = "分享";
    shareBtn.onclick = () => copyText(fileUrl(f.path));

    actions.append(openBtn, shareBtn);
    row.append(main, actions);
    list.appendChild(row);
  });
  box.appendChild(list);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadRoot() {
  state.nodes.clear();
  const tree = $("tree");
  tree.innerHTML = "";
  await renderChildren("", tree, 0);
}

async function loadInfo() {
  const res = await fetch("/api/info");
  state.info = await res.json();
  $("lanUrl").textContent = state.info.lan_url;
}

$("refreshBtn").onclick = () => loadRoot().then(() => toast("已刷新"));
$("copyLanBtn").onclick = () => copyText(state.info?.lan_url || window.location.origin);

let filterTimer = null;
$("filterInput").addEventListener("input", (e) => {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(async () => {
    state.filter = e.target.value || "";
    // 有筛选时重新渲染根，并自动展开第一层系统目录以便查找
    await loadRoot();
    if (state.filter.trim()) {
      const roots = [...state.nodes.values()].filter((n) => n.item.type === "dir" && depthOf(n.item.path) === 1);
      for (const n of roots) {
        if (matchesFilter(n.item) || state.filter) {
          await toggleExpand(n.item.path);
        }
      }
    }
  }, 200);
});

loadInfo()
  .then(() => loadRoot())
  .catch((err) => {
    console.error(err);
    toast("服务连接失败");
  });
