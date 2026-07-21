#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const erpRoot = resolve(scriptDir, "../..");
const reportDir = resolve(erpRoot, "本地/reports/daily-kb-sync");
const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+$/, "")
  .replace("T", "-");

const maxFilesPerSystem = Number(process.env.ERP_DAILY_KB_MAX_FILES_PER_SYSTEM || 25);
const maxDiffLinesPerFile = Number(process.env.ERP_DAILY_KB_MAX_DIFF_LINES_PER_FILE || 80);

const defaultSystems = "分销系统,销售系统,自营系统,商超系统,GTM系统";
const systems = (process.env.ERP_DAILY_KB_SYSTEMS || defaultSystems)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const outputJson = resolve(reportDir, `${timestamp}-impact-plan.json`);
const outputMd = resolve(reportDir, `${timestamp}-impact-plan.md`);
const latestJson = resolve(reportDir, "latest-impact-plan.json");
const latestMd = resolve(reportDir, "latest-impact-plan.md");

function runGit(repo, args) {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      cwd: erpRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024,
    }).trim();
  } catch (error) {
    return "";
  }
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function yamlValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"));
  return match ? match[1].trim() : "";
}

function commitValue(text, keys) {
  for (const key of keys) {
    const value = yamlValue(text, key);
    if (value && !/待记录|待确认|无|^-$/.test(value)) return value;
  }
  return "";
}

function splitPaths(value) {
  return value
    .split(",")
    .map((item) => item.replace(/\[.*?\]/g, "").trim())
    .filter(Boolean);
}

function absPath(pathValue) {
  if (!pathValue) return "";
  if (pathValue.startsWith("/")) return pathValue;
  return resolve(erpRoot, pathValue.replace(/^\.\//, ""));
}

function repoRelative(repoRoot, bizPath) {
  const absRepo = absPath(repoRoot);
  const absBiz = absPath(bizPath);
  if (!absRepo || !absBiz) return "";
  const rel = relative(absRepo, absBiz);
  if (!rel || rel.startsWith("..")) {
    return bizPath.replace(/^\.\//, "");
  }
  return rel;
}

function parseNameStatus(output) {
  if (!output) return [];
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return {
        status: parts[0],
        path: parts[parts.length - 1],
      };
    });
}

function parseNumstat(output) {
  const stats = new Map();
  if (!output) return stats;
  for (const line of output.split("\n")) {
    const [addedRaw, deletedRaw, filePath] = line.split(/\t+/);
    if (!filePath) continue;
    const added = Number(addedRaw) || 0;
    const deleted = Number(deletedRaw) || 0;
    stats.set(filePath, { added, deleted });
  }
  return stats;
}

function limitedDiff(repo, fromCommit, toCommit, filePath) {
  const diff = runGit(repo, [
    "diff",
    "--no-ext-diff",
    "--unified=8",
    `${fromCommit}..${toCommit}`,
    "--",
    filePath,
  ]);
  if (!diff) return "";
  const lines = diff
    .split("\n")
    .filter((line) => !line.startsWith("index ") && !line.startsWith("+++ ") && !line.startsWith("--- "));
  return lines.slice(0, maxDiffLinesPerFile).join("\n");
}

function listKbDocs(systemName) {
  const kbRoot = resolve(erpRoot, "ERP_product", systemName, "知识库");
  if (!existsSync(kbRoot)) return [];
  const output = execFileSync("python3", [
    "-c",
    "import pathlib,sys; root=pathlib.Path(sys.argv[1]); print('\\n'.join(str(p) for p in root.rglob('*.md')))",
    kbRoot,
  ], { encoding: "utf8" }).trim();
  return output ? output.split("\n").map((item) => relative(erpRoot, item)) : [];
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((item) => item.length >= 2);
}

function candidateDocs(systemName, files) {
  const docs = listKbDocs(systemName);
  const tokens = new Set();
  for (const file of files) {
    for (const part of file.path.split("/")) {
      for (const token of tokenize(part)) tokens.add(token);
    }
  }
  const scored = docs
    .map((doc) => {
      const docLower = doc.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (docLower.includes(token)) score += 1;
      }
      if (doc.includes("业务规则") || doc.includes("数据实体") || doc.includes("模块概要")) score += 0.2;
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.doc);
  return scored;
}

function buildRepoPlan(systemConfig, runProgress, repoKind) {
  const isWeb = repoKind === "web";
  const rootKey = isWeb ? "web_root" : "backend_root";
  const pathKeys = isWeb
    ? ["web_biz_path", "web_biz_path_supplement", "web_shangchao_path"]
    : ["backend_biz_path", "backend_biz_path_supplement"];
  const baselineKeys = isWeb
    ? ["web_synced_commit", "frontend_baseline_commit"]
    : ["backend_synced_commit", "backend_baseline_commit"];

  const repoRootRaw = yamlValue(systemConfig, rootKey);
  const repoRoot = absPath(repoRootRaw);
  if (!repoRoot || !existsSync(resolve(repoRoot, ".git"))) return null;

  const fromCommit = commitValue(runProgress, baselineKeys);
  const toCommit = runGit(repoRoot, ["rev-parse", "HEAD"]);
  if (!fromCommit || !toCommit) {
    return {
      repoKind,
      repoRoot,
      fromCommit,
      toCommit,
      missingBaseline: true,
      paths: [],
      files: [],
    };
  }

  const paths = pathKeys
    .flatMap((key) => splitPaths(yamlValue(systemConfig, key)))
    .map((item) => repoRelative(repoRootRaw, item))
    .filter(Boolean);
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return null;

  const nameStatus = parseNameStatus(
    runGit(repoRoot, ["diff", "--name-status", `${fromCommit}..${toCommit}`, "--", ...uniquePaths]),
  );
  const numstat = parseNumstat(
    runGit(repoRoot, ["diff", "--numstat", `${fromCommit}..${toCommit}`, "--", ...uniquePaths]),
  );
  const files = nameStatus.map((item) => {
    const stat = numstat.get(item.path) || { added: 0, deleted: 0 };
    return {
      ...item,
      added: stat.added,
      deleted: stat.deleted,
      diffSnippet: limitedDiff(repoRoot, fromCommit, toCommit, item.path),
    };
  });

  return {
    repoKind,
    repoRoot,
    fromCommit,
    toCommit,
    missingBaseline: false,
    paths: uniquePaths,
    files,
  };
}

function buildSystemPlan(systemName) {
  const kbRoot = resolve(erpRoot, "ERP_product", systemName, "知识库");
  const systemConfig = readText(resolve(kbRoot, "system-config.md"));
  const runProgress = readText(resolve(kbRoot, "run-progress.md"));
  if (!systemConfig || !runProgress) {
    return {
      systemName,
      hasChanges: false,
      skipped: true,
      reason: "缺少 system-config.md 或 run-progress.md",
      repos: [],
      candidateDocs: [],
    };
  }

  const repos = [buildRepoPlan(systemConfig, runProgress, "web"), buildRepoPlan(systemConfig, runProgress, "backend")]
    .filter(Boolean);
  const files = repos.flatMap((repo) => repo.files.map((file) => ({ ...file, repoKind: repo.repoKind })));
  const limitedFiles = files.slice(0, maxFilesPerSystem);
  const overflowCount = Math.max(0, files.length - limitedFiles.length);

  return {
    systemName,
    hasChanges: files.length > 0 || repos.some((repo) => repo.missingBaseline),
    skipped: false,
    reason: "",
    candidateDocs: candidateDocs(systemName, limitedFiles),
    overflowCount,
    repos: repos.map((repo) => ({
      ...repo,
      files: repo.files.slice(0, maxFilesPerSystem),
      repoRoot: relative(erpRoot, repo.repoRoot),
    })),
  };
}

function toMarkdown(plan) {
  const lines = [
    "# ERP 知识库低 Token 影响清单",
    "",
    `- 生成时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `- 工作区：\`${erpRoot}\``,
    `- 有变更系统数：${plan.systems.filter((item) => item.hasChanges).length}`,
    "",
  ];
  for (const system of plan.systems) {
    lines.push(`## ${system.systemName}`, "");
    if (system.skipped) {
      lines.push(`- 跳过原因：${system.reason}`, "");
      continue;
    }
    if (!system.hasChanges) {
      lines.push("- 本次业务路径无代码变更，不启动 Agent。", "");
      continue;
    }
    lines.push(`- 候选知识库文档：${system.candidateDocs.length ? system.candidateDocs.map((doc) => `\`${doc}\``).join("、") : "未命中，交由 Agent 写入待确认"}`);
    if (system.overflowCount) lines.push(`- 超出文件数：${system.overflowCount}，将写入待确认，不塞入 Agent prompt。`);
    for (const repo of system.repos) {
      lines.push("", `### ${repo.repoKind}`, "");
      lines.push(`- 仓库：\`${repo.repoRoot}\``);
      lines.push(`- 基线：\`${repo.fromCommit || "缺失"}\` → \`${repo.toCommit || "缺失"}\``);
      lines.push(`- 扫描路径：${repo.paths.map((item) => `\`${item}\``).join("、") || "无"}`);
      if (repo.missingBaseline) {
        lines.push("- 缺少有效同步基线，本次不做全量 diff。");
        continue;
      }
      if (!repo.files.length) {
        lines.push("- 无变更文件。");
        continue;
      }
      for (const file of repo.files) {
        lines.push(`- ${file.status} \`${file.path}\`（+${file.added}/-${file.deleted}）`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

mkdirSync(reportDir, { recursive: true });
const plan = {
  generatedAt: new Date().toISOString(),
  erpRoot,
  maxFilesPerSystem,
  maxDiffLinesPerFile,
  systems: systems.map(buildSystemPlan),
};
plan.hasWork = plan.systems.some((item) => item.hasChanges);

writeFileSync(outputJson, JSON.stringify(plan, null, 2), "utf8");
writeFileSync(outputMd, toMarkdown(plan), "utf8");
writeFileSync(latestJson, JSON.stringify(plan, null, 2), "utf8");
writeFileSync(latestMd, toMarkdown(plan), "utf8");

console.log(`Impact plan written: ${outputMd}`);
console.log(`Impact plan JSON: ${outputJson}`);
console.log(`has_work=${plan.hasWork ? "yes" : "no"}`);
