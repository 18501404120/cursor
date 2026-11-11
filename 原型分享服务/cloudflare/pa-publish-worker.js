/**
 * Cloudflare Worker：GitHub Pages 标注同步桥接。
 * - POST：把 persistedState 写回个人 Git 仓库（Contents API）
 * - GET：直接从 Git 读最新 config（不经过 Pages CDN），供在线预览「保存后刷新即可见」
 *
 * 部署后配置到页面 editPolicy.githubPublish.endpoint / token。
 */

const CONFIG_SCRIPT_RE =
  /(<script\s+id="prototype-annotation-config"\s+type="application\/json"\s*>\s*)(\{[\s\S]*?\})(\s*<\/script>)/i;

const DEFAULT_OWNER = "18501404120";
const DEFAULT_REPO = "cursor";
const DEFAULT_BRANCH = "main";
const DESIGN_PREFIX = "方案设计/";

function corsHeaders(origin) {
  const allow = new Set([
    "https://18501404120.github.io",
    "http://127.0.0.1:8787",
    "http://localhost:8787"
  ]);
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Pa-Publish-Token",
    Vary: "Origin"
  };
  if (origin && allow.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  });
}

function normalizeRepoPath(repoPath) {
  let rel = decodeURIComponent(String(repoPath || "")).trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (rel.startsWith("cursor/")) rel = rel.slice("cursor/".length);
  if (!rel.startsWith(DESIGN_PREFIX)) {
    if (rel.startsWith("文件夹/")) rel = DESIGN_PREFIX + rel;
    else rel = DESIGN_PREFIX + rel;
  }
  if (!rel.startsWith(DESIGN_PREFIX + "文件夹/")) {
    throw new Error("仅允许发布 方案设计/文件夹/ 下的原型页面");
  }
  return rel;
}

function applyConfigToHtml(html, config) {
  const match = html.match(CONFIG_SCRIPT_RE);
  if (!match) throw new Error("HTML 中未找到 prototype-annotation-config");
  const payload = JSON.stringify(config, null, 2);
  return html.slice(0, match.index + match[1].length) + payload + html.slice(match.index + match[1].length + match[2].length);
}

function extractConfigFromHtml(html) {
  const match = html.match(CONFIG_SCRIPT_RE);
  if (!match) throw new Error("HTML 中未找到 prototype-annotation-config");
  return JSON.parse(match[2]);
}

function previewUrl(repoPath) {
  let rel = repoPath;
  if (rel.startsWith(DESIGN_PREFIX)) rel = rel.slice(DESIGN_PREFIX.length);
  return `https://18501404120.github.io/cursor/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

function decodeGithubContent(content) {
  const binary = atob(String(content || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeGithubContent(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function githubRequest(env, path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "pa-publish-worker",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {})
    }
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { message: text };
  }
  if (!res.ok) {
    throw new Error(data.message || `GitHub API ${res.status}`);
  }
  return data;
}

async function readRepoHtml(env, repoPath) {
  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const apiPath = `/repos/${owner}/${repo}/contents/${repoPath.split("/").map(encodeURIComponent).join("/")}`;
  const current = await githubRequest(env, `${apiPath}?ref=${encodeURIComponent(branch)}`);
  const html = decodeGithubContent(current.content);
  return { current, html, owner, repo, branch, apiPath };
}

async function handleGet(request, env, origin) {
  if (!env.GITHUB_TOKEN) {
    return json({ ok: false, error: "服务端未配置 GITHUB_TOKEN" }, 500, origin);
  }
  const url = new URL(request.url);
  const repoPath = normalizeRepoPath(url.searchParams.get("path") || url.searchParams.get("repoPath") || "");
  const { html } = await readRepoHtml(env, repoPath);
  const config = extractConfigFromHtml(html);
  return json(
    {
      ok: true,
      repoPath,
      previewUrl: previewUrl(repoPath),
      persistedState: config.persistedState || null,
      persistedAt: (config.persistedState && config.persistedState.persistedAt) || null,
      pageId: config.pageId || null,
      version: config.version || null
    },
    200,
    origin
  );
}

async function handlePost(request, env, origin) {
  const token = request.headers.get("X-Pa-Publish-Token") || "";
  if (!env.PUBLISH_TOKEN || token !== env.PUBLISH_TOKEN) {
    return json({ ok: false, error: "发布令牌无效" }, 401, origin);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ ok: false, error: "服务端未配置 GITHUB_TOKEN" }, 500, origin);
  }

  const body = await request.json();
  const repoPath = normalizeRepoPath(body.repoPath);
  const config = body.config;
  if (!config || typeof config !== "object") {
    throw new Error("缺少 config");
  }

  const { current, html, apiPath, branch } = await readRepoHtml(env, repoPath);
  const nextHtml = applyConfigToHtml(html, config);
  if (nextHtml === html) {
    return json({ ok: true, changed: false, repoPath, previewUrl: previewUrl(repoPath) }, 200, origin);
  }

  const pageTitle = config.pageTitle || repoPath.split("/").pop();
  await githubRequest(env, apiPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `chore(管报): 发布原型标注 ${pageTitle}`,
      content: encodeGithubContent(nextHtml),
      sha: current.sha,
      branch
    })
  });

  return json(
    {
      ok: true,
      changed: true,
      repoPath,
      previewUrl: previewUrl(repoPath),
      live: true
    },
    200,
    origin
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    try {
      if (request.method === "GET") {
        return await handleGet(request, env, origin);
      }
      if (request.method === "POST") {
        return await handlePost(request, env, origin);
      }
      return json({ ok: false, error: "method not allowed" }, 405, origin);
    } catch (error) {
      return json({ ok: false, error: error.message || String(error) }, 400, origin);
    }
  }
};
