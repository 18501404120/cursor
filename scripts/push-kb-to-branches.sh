#!/usr/bin/env bash
set -euo pipefail

# push-kb-to-branches.sh
# 在知识库同步完成后，把各系统的知识库变更分别提交到对应分支并创建 PR。
# 纯 bash + git + curl(GitHub API)，不调用 AI，不消耗 token。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ERP_PRODUCT_DIR="${ERP_ROOT}/ERP_product"
BACKUP_DIR="$(mktemp -d)"
ORIGINAL_BRANCH=""
STASH_CREATED=false

# 系统 -> 分支映射
# 格式: "系统目录名:分支名"
SYSTEM_BRANCH_MAP=(
  "分销系统:feature-chengkaiwu-fenxiao"
  "销售系统:feature-chengkaiwu-xiaoshou"
  "GTM系统:feature-chengkaiwu-gtm"
  "自营系统:feature-chengkaiwu-ziying"
  "产品系统:feature-chengkaiwu-chanpin"
  "商超系统:feature-chengkaiwu-shangchao"
)

cleanup() {
  if [[ -n "${ORIGINAL_BRANCH}" ]]; then
    cd "${ERP_PRODUCT_DIR}" 2>/dev/null || true
    git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
    if [[ "${STASH_CREATED}" == "true" ]]; then
      git stash pop 2>/dev/null || echo "WARN: stash pop failed in cleanup, stash kept"
    fi
  fi
  rm -rf "${BACKUP_DIR}"
}
trap cleanup EXIT

echo "==> Push KB changes to system branches"

# GITHUB_TOKEN 可选：有有效 token 时自动建 PR；否则只推送并输出手动 PR 链接
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN empty: will push commits and print manual PR links."
fi

# 检查是否在 ERP_product 仓库
cd "${ERP_PRODUCT_DIR}"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo: ${ERP_PRODUCT_DIR}"
  exit 1
fi

ORIGINAL_BRANCH="$(git branch --show-current)"
echo "Original branch: ${ORIGINAL_BRANCH}"

# 获取远程仓库的 owner/repo（从 origin remote URL 解析）
REMOTE_URL="$(git remote get-url origin)"
# 支持 git@<host>:owner/repo.git（含自定义 SSH host 别名）和 https://github.com/owner/repo.git
if [[ "${REMOTE_URL}" =~ git@[^:]+:([^/]+)/(.+)\.git ]]; then
  GITHUB_OWNER="${BASH_REMATCH[1]}"
  GITHUB_REPO="${BASH_REMATCH[2]}"
elif [[ "${REMOTE_URL}" =~ https://[^/]+/([^/]+)/(.+)\.git ]]; then
  GITHUB_OWNER="${BASH_REMATCH[1]}"
  GITHUB_REPO="${BASH_REMATCH[2]}"
else
  echo "Cannot parse GitHub owner/repo from: ${REMOTE_URL}"
  exit 1
fi
echo "GitHub repo: ${GITHUB_OWNER}/${GITHUB_REPO}"

# 备份所有有变更的系统目录
echo "==> Backup changed system directories"
HAS_ANY_BACKUP=false
for mapping in "${SYSTEM_BRANCH_MAP[@]}"; do
  system_dir="${mapping%%:*}"
  system_path="${ERP_PRODUCT_DIR}/${system_dir}"
  if [[ -d "${system_path}" ]]; then
    # 检查该系统目录是否有 git 变更（modified 或 untracked）
    changes="$(git status --short -- "${system_dir}/" 2>/dev/null || true)"
    if [[ -n "${changes}" ]]; then
      echo "  Backup: ${system_dir}"
      cp -r "${system_path}" "${BACKUP_DIR}/${system_dir}"
      HAS_ANY_BACKUP=true
    fi
  fi
done

if [[ "${HAS_ANY_BACKUP}" != "true" ]]; then
  echo "No system directories have changes. Skip pushing."
  exit 0
fi

# Stash 所有变更（包括 untracked）
echo "==> Stash all working changes"
git stash push --include-untracked -m "wip-before-kb-branch-push-$(date '+%Y%m%d%H%M%S')" >/dev/null
STASH_CREATED=true

# 逐个系统处理
for mapping in "${SYSTEM_BRANCH_MAP[@]}"; do
  system_dir="${mapping%%:*}"
  target_branch="${mapping##*:}"
  backup_path="${BACKUP_DIR}/${system_dir}"

  # 没有备份说明该系统没有变更，跳过
  if [[ ! -d "${backup_path}" ]]; then
    echo "--> ${system_dir}: no changes, skip"
    continue
  fi

  echo "--> Processing ${system_dir} -> ${target_branch}"

  # 确保从原分支出发，避免跨目标分支 checkout 冲突
  current_branch="$(git branch --show-current 2>/dev/null || echo "")"
  if [[ "${current_branch}" != "${target_branch}" ]]; then
    # 先切回原分支（如果当前在其它目标分支上）
    if [[ "${current_branch}" != "${ORIGINAL_BRANCH}" ]]; then
      git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
    fi
    # 再切到目标分支
    if ! git checkout "${target_branch}" 2>&1; then
      echo "  Cannot checkout ${target_branch}, skip"
      continue
    fi
  fi

  # 拉取远程最新代码（避免推送冲突）
  if ! git pull origin "${target_branch}" 2>&1; then
    echo "  Pull failed for ${target_branch}, skip"
    git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
    continue
  fi

  # 推送前合并 main，提前解决 PR 冲突（不用管道判断退出码，避免误判）
  set +e
  git merge --no-edit origin/main >/tmp/erp-kb-merge-${target_branch}.log 2>&1
  merge_rc=$?
  set -e
  if [[ ${merge_rc} -ne 0 ]]; then
    echo "  Merge origin/main has conflicts, resolving..."
    conflict_files="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
    while IFS= read -r f; do
      [[ -z "${f}" ]] && continue
      case "${f}" in
        "${system_dir}"/*)
          # 系统目录冲突：稍后用同步备份覆盖，先占位
          git checkout --ours -- "${f}" 2>/dev/null || true
          git add -- "${f}" 2>/dev/null || true
          ;;
        *)
          # 共享文件（README/CODEOWNERS 等）：取 main
          git checkout --theirs -- "${f}" 2>/dev/null || true
          git add -- "${f}" 2>/dev/null || true
          ;;
      esac
    done <<< "${conflict_files}"

    if git diff --name-only --diff-filter=U | grep -q .; then
      echo "  Unresolved conflicts remain, abort merge and skip"
      git diff --name-only --diff-filter=U || true
      git merge --abort 2>/dev/null || true
      continue
    fi
    git commit --no-edit -m "merge origin/main into ${target_branch}: resolve conflicts before KB push" >/dev/null
    echo "  Merge conflicts resolved"
  else
    echo "  Merge origin/main: clean or already up to date"
  fi

  # 删除目标分支上的该系统目录，用备份覆盖
  rm -rf "${ERP_PRODUCT_DIR}/${system_dir}"
  cp -r "${backup_path}" "${ERP_PRODUCT_DIR}/${system_dir}"

  # 检查是否有实际变更
  changes="$(git status --short -- "${system_dir}/")"
  if [[ -z "${changes}" ]]; then
    echo "  No actual system diff after overlay"
    # 仍可能需要推送 merge commit
    if git push origin "${target_branch}" 2>&1; then
      echo "  Pushed ${target_branch} (merge-only or already up to date)"
      echo "  >>> 手动创建 PR: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...${target_branch}"
    else
      echo "  Push failed for ${target_branch}"
    fi
    continue
  fi

  echo "  Changes: $(echo "${changes}" | wc -l | tr -d ' ') files"

  # 提交
  git add -- "${system_dir}/"
  COMMIT_MSG="docs(${system_dir}): 知识库自动同步 $(date '+%Y-%m-%d')

由定时任务自动提交，基于最新前后端代码增量同步知识库。"
  git commit -m "${COMMIT_MSG}" >/dev/null

  # 推送
  if ! git push origin "${target_branch}" 2>&1; then
    echo "  Push failed for ${target_branch}, skip PR"
    continue
  fi
  echo "  Pushed to ${target_branch}"

  # 检查是否已有 open PR（如果有 token 则用 API 检查，否则直接输出链接）
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    existing_pr="$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?head=${GITHUB_OWNER}:${target_branch}&base=main&state=open" \
      2>/dev/null || echo "[]")"
    pr_count="$(echo "${existing_pr}" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(Array.isArray(d)?d.length:0)" 2>/dev/null || echo "0")"
    if [[ "${pr_count}" != "0" ]]; then
      echo "  PR already exists for ${target_branch} -> main, skip creating"
      continue
    fi
  fi

  # 尝试用 API 创建 PR，如果失败则输出手动创建链接
  PR_CREATED=false
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    PR_TITLE="${system_dir}知识库自动同步 $(date '+%Y-%m-%d')"
    PR_BODY="## Summary
由定时任务自动提交的知识库增量同步。

## 变更范围
仅限 \`${system_dir}/\` 目录的知识库文档更新。

## Test plan
- [ ] 确认知识库文档格式正确
- [ ] 确认 sync-pending.md 中的待确认项
- [ ] 确认未影响其它系统目录"

    PR_PAYLOAD="${BACKUP_DIR}/pr-payload.json"
    node -e '
      const fs = require("fs");
      const payload = {
        title: process.argv[1],
        head: process.argv[2],
        base: "main",
        body: process.argv[3]
      };
      fs.writeFileSync(process.argv[4], JSON.stringify(payload));
    ' "${PR_TITLE}" "${target_branch}" "${PR_BODY}" "${PR_PAYLOAD}"

    pr_response="$(curl -s -X POST \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls" \
      --data "@${PR_PAYLOAD}" \
      2>/dev/null || echo "")"

    if [[ -n "${pr_response}" ]]; then
      pr_url="$(echo "${pr_response}" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); process.stdout.write(d.html_url||'')" 2>/dev/null || echo "")"
      if [[ -n "${pr_url}" ]]; then
        echo "  PR created: ${pr_url}"
        PR_CREATED=true
      fi
    fi
  fi

  if [[ "${PR_CREATED}" != "true" ]]; then
    # API 创建失败，输出手动创建链接
    echo "  >>> 手动创建 PR: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...${target_branch}"
  fi
done

# 切回原分支并恢复 stash
echo "==> Restore original branch"
git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
if [[ "${STASH_CREATED}" == "true" ]]; then
  git stash pop 2>/dev/null || echo "WARN: stash pop failed, stash kept"
  STASH_CREATED=false
fi

echo "==> Push KB to branches finished at $(date '+%Y-%m-%d %H:%M:%S')"
