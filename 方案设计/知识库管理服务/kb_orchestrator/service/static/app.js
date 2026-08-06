(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    healthBadge: $("healthBadge"),
    continueHint: $("continueHint"),
    systemList: $("systemList"),
    systemName: $("systemName"),
    systemPickerHint: $("systemPickerHint"),
    btnToggleAllSystems: $("btnToggleAllSystems"),
    newSystemName: $("newSystemName"),
    btnCreateSystem: $("btnCreateSystem"),
    btnCreateAndInit: $("btnCreateAndInit"),
    fileTree: $("fileTree"),
    btnRefreshTree: $("btnRefreshTree"),
    mode: $("mode"),
    model: $("model"),
    maxTurnsPerSession: $("maxTurnsPerSession"),
    maxTotalTurns: $("maxTotalTurns"),
    maxStagnantTurns: $("maxStagnantTurns"),
    maxTotalTokens: $("maxTotalTokens"),
    dryRun: $("dryRun"),
    jobForm: $("jobForm"),
    btnStart: $("btnStart"),
    btnStop: $("btnStop"),
    btnSaveSettings: $("btnSaveSettings"),
    btnRefreshSystems: $("btnRefreshSystems"),
    btnRefreshProgress: $("btnRefreshProgress"),
    btnShowProgress: $("btnShowProgress"),
    btnClearLog: $("btnClearLog"),
    autoScroll: $("autoScroll"),
    jobStatus: $("jobStatus"),
    jobId: $("jobId"),
    jobTurns: $("jobTurns"),
    jobTokens: $("jobTokens"),
    jobResult: $("jobResult"),
    logView: $("logView"),
    progressSummary: $("progressSummary"),
    progressText: $("progressText"),
    previewTitle: $("previewTitle"),
    tabBtnKb: $("tabBtnKb"),
    tabBtnGit: $("tabBtnGit"),
    tabKb: $("tabKb"),
    tabGit: $("tabGit"),
    gitTableBody: $("gitTableBody"),
    gitBusyBadge: $("gitBusyBadge"),
    btnRefreshGit: $("btnRefreshGit"),
    gitLogView: $("gitLogView"),
  };

  let selectedSystem = "";
  let systemsCache = [];
  let favoriteSystems = ["销售系统", "GTM系统"];
  let showAllSystems = false;
  let lastSeq = 0;
  let es = null;
  let streamBuffer = "";
  let lastJob = null;
  let activeFilePath = "";
  let collapsedDirs = new Set();
  let gitSystemsCache = [];
  let gitRowResults = {};
  let gitBusy = false;
  let activeTab = "kb";

  function formatApiError(detail) {
    if (!detail) return "请求失败";
    if (typeof detail === "string") return detail;
    if (typeof detail === "object") {
      const parts = [detail.message, detail.details].filter(Boolean);
      if (parts.length) return parts.join("\n");
      return JSON.stringify(detail);
    }
    return String(detail);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(formatApiError(data.detail || data.message || res.statusText));
    }
    return data;
  }

  function setSettingsForm(s) {
    els.model.value = s.model || "composer-2.5";
    els.maxTurnsPerSession.value = s.max_turns_per_session ?? 8;
    els.maxTotalTurns.value = s.max_total_turns ?? 30;
    els.maxStagnantTurns.value = s.max_stagnant_turns ?? 3;
    els.maxTotalTokens.value = s.max_total_tokens ?? 500000;
    if (s.default_mode) els.mode.value = s.default_mode;
    if (s.default_system) selectedSystem = s.default_system;
    if (Array.isArray(s.favorite_systems) && s.favorite_systems.length) {
      favoriteSystems = s.favorite_systems.map((x) => String(x).trim()).filter(Boolean);
    }
  }

  function fillSystemSelect() {
    const allNames = systemsCache.map((i) => i.name);
    const allSet = new Set(allNames);
    let names;
    if (showAllSystems) {
      names = allNames.slice();
    } else {
      // 负责系统优先；已选但不在负责列表里的也保留，避免收起后丢选项
      const seen = new Set();
      names = [];
      for (const name of favoriteSystems) {
        if (!seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      }
      if (selectedSystem && !seen.has(selectedSystem)) {
        names.push(selectedSystem);
      }
    }

    const prev = selectedSystem || els.systemName.value;
    els.systemName.innerHTML = "";
    if (!names.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = showAllSystems ? "暂无系统" : "暂无负责系统，请点展开";
      els.systemName.appendChild(opt);
    } else {
      for (const name of names) {
        const opt = document.createElement("option");
        opt.value = name;
        const exists = allSet.has(name);
        opt.textContent = exists ? name : `${name}（未建目录）`;
        els.systemName.appendChild(opt);
      }
    }

    if (prev && names.includes(prev)) {
      els.systemName.value = prev;
      selectedSystem = prev;
    } else if (names.length && names[0]) {
      els.systemName.value = names[0];
      selectedSystem = names[0];
    } else {
      selectedSystem = "";
    }

    els.btnToggleAllSystems.textContent = showAllSystems ? "收起" : "展开";
    els.btnToggleAllSystems.title = showAllSystems
      ? "收起，仅显示负责系统"
      : "展开显示 ERP_product 下全部系统";
    if (els.systemPickerHint) {
      els.systemPickerHint.textContent = showAllSystems
        ? `已展开全部 ${allNames.length} 个系统`
        : `默认显示负责系统（${favoriteSystems.join("、") || "未配置"}）`;
    }
  }

  function readFormConfig() {
    return {
      system_name: els.systemName.value.trim(),
      mode: els.mode.value,
      model: els.model.value.trim(),
      max_turns_per_session: Number(els.maxTurnsPerSession.value),
      max_total_turns: Number(els.maxTotalTurns.value),
      max_stagnant_turns: Number(els.maxStagnantTurns.value),
      max_total_tokens: Number(els.maxTotalTokens.value),
      dry_run: els.dryRun.checked,
    };
  }

  function tagClass(status) {
    if (!status) return "tag";
    if (status === "已完成") return "tag done";
    if (status === "未建库" || status === "未初始化") return "tag empty";
    return "tag busy";
  }

  function canContinue(job) {
    if (!job) return false;
    return ["failed", "stopped", "wait_user", "interrupted"].includes(job.status)
      || (job.exit_code === 4 || job.exit_code === 3 || job.exit_code === 130);
  }

  function prepareContinueMode(job) {
    if (!canContinue(job)) return;
    // sync 中断后继续用 sync；构建中断用 resume
    if (job.mode === "sync") {
      els.mode.value = "sync";
    } else {
      els.mode.value = "resume";
    }
    els.btnStart.textContent = "继续任务";
    els.continueHint.textContent =
      "上次因熔断/上限/暂停结束：已切到续跑模式，直接点「继续任务」即可";
    els.continueHint.className = "badge hint ok";
  }

  function renderSystems(items) {
    systemsCache = items;
    els.systemList.innerHTML = "";
    fillSystemSelect();

    // 左侧列表：默认只显示负责系统；展开后与下拉一致显示全部
    const visibleNames = showAllSystems
      ? items.map((i) => i.name)
      : favoriteSystems;
    const visibleSet = new Set(visibleNames);
    const listItems = showAllSystems
      ? items
      : [
          ...favoriteSystems
            .map((name) => items.find((i) => i.name === name) || { name, status: "未建库", looks_complete: false })
            .filter((i, idx, arr) => arr.findIndex((x) => x.name === i.name) === idx),
          // 当前选中但不在负责列表时也挂上，便于对照
          ...(selectedSystem && !visibleSet.has(selectedSystem)
            ? [items.find((i) => i.name === selectedSystem)].filter(Boolean)
            : []),
        ];

    if (!listItems.length) {
      els.systemList.innerHTML =
        `<div class="system-item"><span class="name">暂无系统</span><span class="tag empty">可上方新建或点展开</span></div>`;
      return;
    }

    for (const item of listItems) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "system-item" + (item.name === selectedSystem ? " active" : "");
      const status = item.status || (item.looks_complete ? "已完成" : "进行中");
      btn.innerHTML = `
        <span class="name">${item.name}</span>
        <span class="${tagClass(status)}" title="${status}">${status}</span>
      `;
      btn.addEventListener("click", () => {
        selectedSystem = item.name;
        if (!showAllSystems && !favoriteSystems.includes(item.name)) {
          // 选了非负责系统时自动展开，避免下拉里选不到
          showAllSystems = true;
        }
        fillSystemSelect();
        els.systemName.value = item.name;
        if (status === "未建库" || status === "未初始化") {
          els.mode.value = "init";
          els.btnStart.textContent = "启动任务";
        }
        renderSystems(items);
        loadProgress(item.name);
        loadTree(item.name);
      });
      els.systemList.appendChild(btn);
    }
  }

  function renderTreeNodes(nodes, depth = 0) {
    const wrap = document.createElement("div");
    if (depth > 0) wrap.className = "tree-children";
    for (const node of nodes || []) {
      if (node.type === "dir") {
        const key = node.path;
        const open = !collapsedDirs.has(key);
        const row = document.createElement("button");
        row.type = "button";
        row.className = "tree-dir";
        row.innerHTML = `<span class="caret">${open ? "▾" : "▸"}</span>📁 ${node.name}`;
        row.addEventListener("click", () => {
          if (collapsedDirs.has(key)) collapsedDirs.delete(key);
          else collapsedDirs.add(key);
          loadTree(selectedSystem);
        });
        wrap.appendChild(row);
        if (open && node.children?.length) {
          wrap.appendChild(renderTreeNodes(node.children, depth + 1));
        } else if (open && (!node.children || !node.children.length)) {
          const empty = document.createElement("div");
          empty.className = "tree-muted";
          empty.style.marginLeft = "14px";
          empty.textContent = "(空目录)";
          wrap.appendChild(empty);
        }
      } else {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "tree-file" + (activeFilePath === node.path ? " active" : "");
        row.textContent = `📄 ${node.name}`;
        row.title = node.path;
        row.addEventListener("click", () => openFile(selectedSystem, node.path));
        wrap.appendChild(row);
      }
    }
    return wrap;
  }

  async function loadTree(name) {
    if (!name) {
      els.fileTree.innerHTML = `<div class="tree-muted">选择系统后显示目录</div>`;
      return;
    }
    els.fileTree.innerHTML = `<div class="tree-muted">加载中…</div>`;
    try {
      const data = await api(`/api/systems/${encodeURIComponent(name)}/tree`);
      els.fileTree.innerHTML = "";
      if (!data.tree?.length) {
        els.fileTree.innerHTML = `<div class="tree-muted">目录为空（可用 init 初始化知识库）</div>`;
        return;
      }
      els.fileTree.appendChild(renderTreeNodes(data.tree));
      if (data.truncated) {
        const tip = document.createElement("div");
        tip.className = "tree-muted";
        tip.textContent = "条目较多，已截断显示";
        els.fileTree.appendChild(tip);
      }
    } catch (err) {
      els.fileTree.innerHTML = `<div class="tree-muted">${err.message || err}</div>`;
    }
  }

  async function openFile(system, relPath) {
    activeFilePath = relPath;
    try {
      const data = await api(
        `/api/systems/${encodeURIComponent(system)}/file?path=${encodeURIComponent(relPath)}`
      );
      els.previewTitle.textContent = relPath;
      els.progressSummary.textContent = `${system} · ${relPath}` + (data.truncated ? "（已截断）" : "");
      els.progressText.textContent = data.content || "(空文件)";
      // 刷新树高亮
      loadTree(system);
    } catch (err) {
      alert(err.message || err);
    }
  }

  async function loadSystems() {
    const data = await api("/api/systems");
    renderSystems(data.items || []);
    if (selectedSystem) {
      await loadProgress(selectedSystem);
      await loadTree(selectedSystem);
    }
  }

  async function loadProgress(name) {
    activeFilePath = "";
    const data = await api(`/api/systems/${encodeURIComponent(name)}`);
    const status = data.status || "—";
    els.previewTitle.textContent = "进度 / 结果";
    els.progressSummary.textContent = `${name} · ${status}`;
    els.progressText.textContent =
      data.progress_text || "(尚无 run-progress.md，可用 init 初始化)";
  }

  async function createSystem(startInit) {
    const name = (els.newSystemName.value || "").trim();
    if (!name) {
      alert("请输入新系统名，例如：财务系统");
      return;
    }
    try {
      const data = await api("/api/systems", {
        method: "POST",
        body: JSON.stringify({ name, start_init: !!startInit }),
      });
      selectedSystem = data.system.name;
      els.systemName.value = selectedSystem;
      els.mode.value = "init";
      els.btnStart.textContent = "启动任务";
      els.newSystemName.value = "";
      appendLog({ kind: "info", text: data.system.message });
      await loadSystems();
      if (data.job) {
        updateJobUI(data.job);
        appendLog({ kind: "info", text: `已启动初始化任务 ${data.job.id}` });
      }
    } catch (err) {
      alert(err.message || err);
    }
  }

  function updateJobUI(job) {
    lastJob = job;
    const status = job?.status || "idle";
    els.jobStatus.textContent = status;
    els.jobStatus.className = "status-pill " + status;
    els.jobId.textContent = job?.id || "—";
    els.jobTurns.textContent = String(job?.run_turns ?? 0);
    els.jobTokens.textContent = String(job?.cumulative_tokens ?? 0);
    els.jobResult.textContent = job?.result_summary || job?.error || "—";
    const running = status === "queued" || status === "running";
    els.btnStart.disabled = running;
    els.btnStop.disabled = !running;
    els.btnCreateAndInit.disabled = running;
    if (!running && canContinue(job)) {
      prepareContinueMode(job);
    } else if (!running) {
      els.btnStart.textContent = "启动任务";
    }
  }

  function appendLog(event) {
    if (event.kind === "stream") {
      streamBuffer += event.text;
      let node = els.logView.querySelector(".stream-live");
      if (!node) {
        node = document.createElement("span");
        node.className = "stream stream-live";
        els.logView.appendChild(node);
      }
      node.textContent = streamBuffer;
    } else {
      const live = els.logView.querySelector(".stream-live");
      if (live) live.classList.remove("stream-live");
      streamBuffer = "";
      const line = document.createElement("div");
      line.className = event.kind || "info";
      line.textContent = event.text;
      els.logView.appendChild(line);
    }
    if (els.autoScroll.checked) {
      els.logView.scrollTop = els.logView.scrollHeight;
    }
  }

  function connectStream() {
    if (es) es.close();
    es = new EventSource(`/api/jobs/stream?after=${lastSeq}`);
    es.addEventListener("log", (e) => {
      const event = JSON.parse(e.data);
      lastSeq = Math.max(lastSeq, event.seq || 0);
      appendLog(event);
    });
    es.addEventListener("job", (e) => {
      const data = JSON.parse(e.data);
      updateJobUI(data.job);
      if (data.job && ["finished", "failed", "stopped", "wait_user"].includes(data.job.status)) {
        if (selectedSystem) {
          loadProgress(selectedSystem).catch(() => {});
          loadTree(selectedSystem).catch(() => {});
        }
        loadSystems().catch(() => {});
      }
    });
  }

  async function refreshHealth() {
    try {
      const h = await api("/api/health");
      if (h.api_key_configured) {
        els.healthBadge.textContent = "API Key 已配置";
        els.healthBadge.className = "badge ok";
      } else {
        els.healthBadge.textContent = "缺少 CURSOR_API_KEY";
        els.healthBadge.className = "badge bad";
      }
    } catch {
      els.healthBadge.textContent = "服务不可用";
      els.healthBadge.className = "badge bad";
    }
  }

  els.jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      // 若刚熔断过且用户没改模式，确保用续跑
      if (canContinue(lastJob) && els.mode.value === "init" && lastJob.mode !== "init") {
        els.mode.value = lastJob.mode === "sync" ? "sync" : "resume";
      }
      const body = readFormConfig();
      if (!body.system_name) {
        alert("请填写目标系统");
        return;
      }
      if (!systemsCache.some((i) => i.name === body.system_name)) {
        await api("/api/systems", {
          method: "POST",
          body: JSON.stringify({ name: body.system_name, start_init: false }),
        });
      }
      selectedSystem = body.system_name;
      const data = await api("/api/jobs/start", {
        method: "POST",
        body: JSON.stringify(body),
      });
      updateJobUI(data.job);
      els.btnStart.textContent = "启动任务";
      appendLog({ kind: "info", text: `已启动任务 ${data.job.id}（mode=${body.mode}）` });
      await loadSystems();
    } catch (err) {
      appendLog({ kind: "error", text: String(err.message || err) });
      alert(err.message || err);
    }
  });

  els.btnStop.addEventListener("click", async () => {
    try {
      const data = await api("/api/jobs/stop", { method: "POST", body: "{}" });
      updateJobUI(data.job);
    } catch (err) {
      alert(err.message || err);
    }
  });

  els.btnSaveSettings.addEventListener("click", async () => {
    const body = readFormConfig();
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          model: body.model,
          max_turns_per_session: body.max_turns_per_session,
          max_total_turns: body.max_total_turns,
          max_stagnant_turns: body.max_stagnant_turns,
          max_total_tokens: body.max_total_tokens,
          default_system: body.system_name,
          default_mode: body.mode,
        }),
      });
      appendLog({ kind: "info", text: "默认参数已保存" });
    } catch (err) {
      alert(err.message || err);
    }
  });

  els.btnCreateSystem.addEventListener("click", () => createSystem(false));
  els.btnCreateAndInit.addEventListener("click", () => createSystem(true));
  els.btnRefreshSystems.addEventListener("click", () => loadSystems().catch(alert));
  els.btnRefreshTree.addEventListener("click", () => loadTree(selectedSystem).catch(alert));
  els.btnRefreshProgress.addEventListener("click", () => {
    if (activeFilePath) openFile(selectedSystem, activeFilePath).catch(alert);
    else if (selectedSystem) loadProgress(selectedSystem).catch(alert);
  });
  els.btnShowProgress.addEventListener("click", () => {
    if (selectedSystem) loadProgress(selectedSystem).catch(alert);
  });
  els.btnClearLog.addEventListener("click", () => {
    els.logView.innerHTML = "";
    streamBuffer = "";
  });
  els.btnToggleAllSystems.addEventListener("click", () => {
    showAllSystems = !showAllSystems;
    renderSystems(systemsCache);
  });
  els.systemName.addEventListener("change", () => {
    selectedSystem = els.systemName.value.trim();
    renderSystems(systemsCache);
    if (selectedSystem) {
      loadProgress(selectedSystem).catch(() => {});
      loadTree(selectedSystem).catch(() => {});
    }
  });

  function switchTab(tab) {
    activeTab = tab;
    const isKb = tab === "kb";
    els.tabBtnKb.classList.toggle("active", isKb);
    els.tabBtnGit.classList.toggle("active", !isKb);
    els.tabBtnKb.setAttribute("aria-selected", String(isKb));
    els.tabBtnGit.setAttribute("aria-selected", String(!isKb));
    els.tabKb.classList.toggle("active", isKb);
    els.tabKb.hidden = !isKb;
    els.tabGit.classList.toggle("active", !isKb);
    els.tabGit.hidden = isKb;
    if (!isKb) {
      loadGitSystems().catch((err) => appendGitLog(String(err.message || err), "error"));
    }
  }

  function updateGitBusyBadge(op = {}) {
    const busy = Boolean(op.busy || gitBusy);
    if (busy) {
      els.gitBusyBadge.textContent = `进行中 · ${op.busy_action || "git"} · ${op.busy_system || ""}`;
      els.gitBusyBadge.className = "badge";
    } else {
      els.gitBusyBadge.textContent = "空闲";
      els.gitBusyBadge.className = "badge ok";
    }
  }

  function appendGitLog(text, kind = "info") {
    const prefix = kind === "error" ? "[错误] " : kind === "ok" ? "[完成] " : "";
    els.gitLogView.textContent += `${prefix}${text}\n`;
    els.gitLogView.scrollTop = els.gitLogView.scrollHeight;
  }

  function branchLabel(item) {
    return item.target_branch || item.current_branch || "—";
  }

  function renderGitTable(items, operation = {}) {
    gitBusy = Boolean(operation.busy);
    updateGitBusyBadge(operation);
    if (!items.length) {
      els.gitTableBody.innerHTML = `<tr><td colspan="6" class="git-empty">暂无系统</td></tr>`;
      return;
    }
    els.gitTableBody.innerHTML = items
      .map((item) => {
        const result = gitRowResults[item.key] || {};
        const resultClass = result.ok === true ? "ok" : result.ok === false ? "bad" : result.ok === null ? "warn" : "";
        const resultHtml = result.text
          ? `<div class="git-result ${resultClass}">${result.text}</div>`
          : `<span class="git-result">—</span>`;
        const pushBtn = item.can_push
          ? `<button class="btn primary git-push" data-key="${escapeHtml(item.key)}" type="button" ${
              gitBusy ? "disabled" : ""
            }>推送 Git</button>
            <button class="btn ghost git-merge" data-key="${escapeHtml(item.key)}" type="button" ${
              gitBusy ? "disabled" : ""
            }>请求合并main分支</button>`
          : "";
        return `<tr data-key="${escapeHtml(item.key)}">
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td class="mono">${escapeHtml(item.repo)}</td>
          <td class="mono">${escapeHtml(branchLabel(item))}</td>
          <td>${escapeHtml(item.status_label || "—")}</td>
          <td class="actions">
            <button class="btn ghost git-pull" data-key="${escapeHtml(item.key)}" type="button" ${
              gitBusy ? "disabled" : ""
            }>拉取最新</button>
            ${pushBtn}
          </td>
          <td>${resultHtml}</td>
        </tr>`;
      })
      .join("");
  }

  async function loadGitSystems() {
    const data = await api("/api/git/systems");
    gitSystemsCache = data.items || [];
    renderGitTable(gitSystemsCache, data.operation || {});
  }

  function setGitRowResult(key, ok, text) {
    gitRowResults[key] = { ok, text };
    renderGitTable(gitSystemsCache, { busy: gitBusy });
  }

  async function runGitAction(action, key) {
    if (gitBusy) return;
    gitBusy = true;
    updateGitBusyBadge({ busy: true, busy_action: action, busy_system: key });
    renderGitTable(gitSystemsCache, { busy: true, busy_action: action, busy_system: key });
    const actionLabels = {
      pull: "拉取最新",
      push: "推送 Git",
      "merge-request": "请求合并main分支",
    };
    const label = actionLabels[action] || action;
    appendGitLog(`${key} · ${label} 开始…`);
    try {
      const data = await api(`/api/git/${encodeURIComponent(key)}/${action}`, {
        method: "POST",
        body: "{}",
      });
      let text = data.message || "完成";
      if (data.preview_base_url) {
        text += ` · <a href="${escapeHtml(data.preview_base_url)}" target="_blank" rel="noopener">预览入口</a>`;
      }
      if (data.pr_url) {
        text += ` · <a href="${escapeHtml(data.pr_url)}" target="_blank" rel="noopener">PR</a>`;
      }
      if (Array.isArray(data.logs) && data.logs.length) {
        data.logs.forEach((line) => appendGitLog(`${key}: ${line}`));
      }
      const skipped = Boolean(data.skipped);
      setGitRowResult(key, skipped ? null : true, text);
      appendGitLog(
        `${key} · ${label} ${skipped ? "已跳过" : "成功"}`,
        skipped ? "error" : "ok",
      );
      await loadGitSystems();
    } catch (err) {
      const msg = String(err.message || err);
      setGitRowResult(key, false, msg.replace(/\n/g, "<br>"));
      appendGitLog(`${key} · ${label} 失败: ${msg}`, "error");
      await loadGitSystems().catch(() => {});
    } finally {
      gitBusy = false;
      updateGitBusyBadge();
      renderGitTable(gitSystemsCache, { busy: false });
    }
  }

  els.tabBtnKb.addEventListener("click", () => switchTab("kb"));
  els.tabBtnGit.addEventListener("click", () => switchTab("git"));
  els.btnRefreshGit.addEventListener("click", () => {
    loadGitSystems().catch((err) => appendGitLog(String(err.message || err), "error"));
  });
  els.gitTableBody.addEventListener("click", (e) => {
    const pullBtn = e.target.closest(".git-pull");
    const pushBtn = e.target.closest(".git-push");
    const mergeBtn = e.target.closest(".git-merge");
    if (pullBtn) {
      runGitAction("pull", pullBtn.dataset.key).catch(() => {});
      return;
    }
    if (pushBtn) {
      runGitAction("push", pushBtn.dataset.key).catch(() => {});
      return;
    }
    if (mergeBtn) {
      runGitAction("merge-request", mergeBtn.dataset.key).catch(() => {});
    }
  });

  async function boot() {
    await refreshHealth();
    const settings = await api("/api/settings");
    setSettingsForm(settings);
    await loadSystems();
    const current = await api("/api/jobs/current");
    updateJobUI(current.job);
    connectStream();
  }

  boot().catch((err) => {
    els.healthBadge.textContent = "启动失败";
    els.healthBadge.className = "badge bad";
    appendLog({ kind: "error", text: String(err.message || err) });
  });
})();
