#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "@cursor/sdk";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const erpRoot = resolve(scriptDir, "../..");
const reportDir = resolve(erpRoot, "本地/reports/daily-kb-sync");
const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+$/, "")
  .replace("T", "-");
const summaryFile = resolve(reportDir, `${timestamp}-agent-summary.md`);
const defaultImpactPlanFile = resolve(reportDir, "latest-impact-plan.json");
const syncMode = process.env.ERP_DAILY_KB_SYNC_MODE || "daily-incremental";

function parseSystems() {
  const raw =
    process.env.ERP_DAILY_KB_SYSTEMS ||
    "分销系统,销售系统,自营系统,商超系统,GTM系统";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readImpactPlan() {
  if (syncMode === "monthly-full") return null;
  const planFile = process.env.ERP_DAILY_KB_IMPACT_PLAN_JSON || defaultImpactPlanFile;
  if (!existsSync(planFile)) return null;
  const raw = await readFile(planFile, "utf8");
  return JSON.parse(raw);
}

function compactSystemPlan(systemPlan) {
  if (!systemPlan) return "";
  return JSON.stringify(
    {
      systemName: systemPlan.systemName,
      candidateDocs: systemPlan.candidateDocs,
      overflowCount: systemPlan.overflowCount,
      repos: systemPlan.repos?.map((repo) => ({
        repoKind: repo.repoKind,
        repoRoot: repo.repoRoot,
        fromCommit: repo.fromCommit,
        toCommit: repo.toCommit,
        paths: repo.paths,
        missingBaseline: repo.missingBaseline,
        files: repo.files?.map((file) => ({
          status: file.status,
          path: file.path,
          added: file.added,
          deleted: file.deleted,
          diffSnippet: file.diffSnippet,
        })),
      })),
    },
    null,
    2,
  );
}

function buildPrompt(systemName, systemPlan) {
  const baselineFromReport = process.env.ERP_DAILY_KB_BASELINE_FROM_REPORT || "";
  const baselineToReport = process.env.ERP_DAILY_KB_BASELINE_TO_REPORT || "";
  const forcedBaselineInstruction =
    baselineFromReport && baselineToReport
      ? `
本次为补同步任务，必须优先使用以下代码基线区间识别最新拉取变更，不要被 \`run-progress.md\` 中刚写入的当前基线覆盖：
- 旧基线报告：\`${baselineFromReport}\`
- 最新基线报告：\`${baselineToReport}\`

请读取两份基线报告中的各仓库 commit，并对当前系统相关路径执行旧 commit 到新 commit 的 diff。只处理这段区间内的代码变更。`
      : "";

  const impactInstruction = systemPlan
    ? `
本次已经由本地脚本完成低成本 diff 预分析。你只能基于下面这份“影响清单”处理，不要全仓库搜索，不要读取未列出的代码文件；如清单不足以判断，写入 \`sync-pending.md\`。

影响清单 JSON：
\`\`\`json
${compactSystemPlan(systemPlan)}
\`\`\`

执行范围要求：
1. 优先读取并更新 \`candidateDocs\` 列出的知识库文档。
2. 只允许按清单中的 \`files[].diffSnippet\` 理解代码变化；不要主动扩大 diff。
3. \`overflowCount > 0\` 或 \`missingBaseline=true\` 的部分只记录到 \`sync-pending.md\`，不要补全全量知识库。
4. 如果清单内没有候选知识库文档，只写同步日志和待确认项，不要大范围探索。`
    : "";
  const monthlyInstruction =
    syncMode === "monthly-full"
      ? `
本次是“月度全量校验同步”，目标是减少长期偏差，但不要粗暴整篇重写。

月度执行规则：
1. 读取 \`${erpRoot}/ERP_product/${systemName}/知识库/system-config.md\`，按其中配置的前端/后端业务路径做完整范围校验。
2. 对照该系统现有知识库，识别“代码已有但知识库缺失/过期/明显不一致”的页面、模块、数据实体和业务规则。
3. 只更新确有偏差的小节或文档；未发现偏差的文档保持原样，不做格式化、不做重写。
4. 新页面只有在菜单/路由/页面文件能够明确归属时才新建页面详情；不确定的只写入 \`sync-pending.md\`。
5. 后端路径过宽或跨系统变更，不要臆造归属，写入 \`sync-pending.md\`。
6. 完成后更新 \`run-progress.md\` 的同步状态，并追加 \`sync-changelog.md\`，说明本次月度全量校验更新/跳过/待确认数量。`
      : "";

  return `
你是本机无人值守的 ERP 知识库日更 Agent。当前工作区根目录是：
\`${erpRoot}\`

本次只处理一个系统：\`${systemName}\`。

${forcedBaselineInstruction}
${impactInstruction}
${monthlyInstruction}

执行前必须读取并遵守：
1. \`${erpRoot}/.cursor/skills/master-scheduler/SKILL.md\`
2. \`${erpRoot}/本地/prompt-lib/master-scheduler.md\`
3. 如进入增量同步，继续读取 \`${erpRoot}/.cursor/skills/step7-incremental-sync/SKILL.md\`

无人值守执行规则：
1. 不要向用户反问，不要等待“继续/跳过/终止”。
2. 本任务只做“代码同步维护”，不要执行阶段0到阶段6的全量重建，不要因为知识库未完整就启动全量构建。
3. 基于当前已拉取的前后端代码，只分析自上次同步基线以来的最新代码变更，并把变更影响补充到已有知识库文档；如果已提供影响清单，则以影响清单为唯一代码变更输入。
4. 增量同步时，兼容 \`run-progress.md\` 中已有的同步字段命名：\`web_synced_commit/backend_synced_commit\` 或 \`frontend_baseline_commit/backend_baseline_commit\`。
5. 如果该系统缺少有效同步基线，不要做全量回溯；先用最近一次代码基线报告和当前 HEAD 辅助判断最新变更，无法可靠判断的内容只记录到 \`sync-pending.md\`。
6. 对能明确映射的代码变更，自动更新对应知识库文档；对无法明确映射或风险较高的变更，不要臆造，追加记录到该系统知识库根目录下的 \`sync-pending.md\`，并在最终摘要里说明。
7. 只允许改动 \`${erpRoot}/ERP_product/${systemName}\` 下的知识库、需求索引或同步日志文件；不要修改前端和后端代码仓库。
8. 写入内容必须是产品经理可读的业务语言，不要输出大段代码实现细节。
9. 每个系统执行结束后，更新进度/同步状态和同步日志；如果没有可更新内容，也要记录本次检查结果。

请直接开始处理 \`${systemName}\`，完成后输出简短执行摘要、更新文件清单、遗留待确认项。
`.trim();
}

async function runSystem(systemName, systemPlan) {
  const model = process.env.ERP_DAILY_KB_MODEL || "composer-2.5";
  const prompt = buildPrompt(systemName, systemPlan);

  try {
    const result = await Agent.prompt(prompt, {
      apiKey: process.env.CURSOR_API_KEY,
      model: { id: model },
      local: { cwd: erpRoot },
    });

    if (result.status !== "finished") {
      return {
        ok: false,
        summary: `执行失败，状态：${result.status}\n\n${result.result || ""}`,
      };
    }
    return { ok: true, summary: String(result.result || "") };
  } catch (error) {
    return {
      ok: false,
      summary: `启动失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function main() {
  if (!process.env.CURSOR_API_KEY) {
    throw new Error("Missing CURSOR_API_KEY");
  }

  await mkdir(reportDir, { recursive: true });
  const impactPlan = await readImpactPlan();
  const systems = syncMode === "monthly-full"
    ? parseSystems()
    : impactPlan
    ? impactPlan.systems
        .filter((item) => item.hasChanges && !item.skipped)
        .map((item) => item.systemName)
    : parseSystems();
  if (systems.length === 0) {
    const lines = [
      "# ERP 知识库日更执行摘要",
      "",
      `- 执行时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
      "- 结果：本次影响清单为空，未启动 Agent。",
    ];
    await writeFile(summaryFile, lines.join("\n"), "utf8");
    console.log("No impacted systems. Agent sync skipped.");
    console.log(`Summary written: ${summaryFile}`);
    return;
  }

  const lines = [
    "# ERP 知识库日更执行摘要",
    "",
    `- 执行时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `- 工作区：\`${erpRoot}\``,
    `- 同步模式：${syncMode === "monthly-full" ? "月度全量校验同步" : "日常低 token 增量同步"}`,
    `- 系统范围：${systems.join(", ")}`,
    impactPlan ? `- 影响清单：\`${process.env.ERP_DAILY_KB_IMPACT_PLAN_JSON || defaultImpactPlanFile}\`` : "",
    "",
  ].filter(Boolean);
  const failures = [];

  for (const systemName of systems) {
    console.log(`==> Cursor Agent sync: ${systemName}`);
    const systemPlan = impactPlan?.systems?.find((item) => item.systemName === systemName);
    const { ok, summary } = await runSystem(systemName, systemPlan);
    lines.push(`## ${systemName}：${ok ? "完成" : "失败"}`, "", summary.trim(), "");
    if (!ok) failures.push(systemName);
  }

  await writeFile(summaryFile, lines.join("\n"), "utf8");
  console.log(`Summary written: ${summaryFile}`);

  if (failures.length > 0) {
    throw new Error(`Failed systems: ${failures.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
