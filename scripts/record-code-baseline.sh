#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${ERP_ROOT}/本地/reports/code-baseline"
FRONTEND_LIST="${SCRIPT_DIR}/govee-frontend-repos.txt"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
LATEST_FILE="${REPORT_DIR}/latest-code-baseline.md"
SNAPSHOT_FILE="${REPORT_DIR}/${TIMESTAMP}-code-baseline.md"

mkdir -p "${REPORT_DIR}"

repo_line() {
  local name="$1"
  local path="$2"

  if [[ -d "${path}/.git" ]]; then
    local branch
    local commit
    local remote
    branch="$(git -C "${path}" branch --show-current || true)"
    commit="$(git -C "${path}" rev-parse HEAD || true)"
    remote="$(git -C "${path}" remote get-url origin 2>/dev/null || true)"
    printf '| `%s` | `%s` | `%s` | `%s` | `%s` |\n' "${name}" "${path}" "${branch}" "${commit}" "${remote}"
  else
    printf '| `%s` | `%s` | 未拉取 | - | - |\n' "${name}" "${path}"
  fi
}

write_report() {
  local file="$1"

  {
    printf '# ERP 代码基线\n\n'
    printf '%s\n' "- 记录时间：$(date '+%Y-%m-%d %H:%M:%S')"
    printf '%s%s%s\n\n' '- ERP 根目录：`' "${ERP_ROOT}" '`'
    printf '## 仓库清单\n\n'
    printf '| 仓库 | 路径 | 分支 | Commit | Origin |\n'
    printf '| --- | --- | --- | --- | --- |\n'

    repo_line 'ERP_product' "${ERP_ROOT}/ERP_product"
    repo_line 'ERP_backend' "${ERP_ROOT}/ERP_backend"

    if [[ -f "${FRONTEND_LIST}" ]]; then
      while IFS= read -r repo || [[ -n "${repo}" ]]; do
        repo="${repo%%#*}"
        repo="$(echo "${repo}" | xargs)"
        [[ -z "${repo}" ]] && continue
        repo_line "ERP_frontend/${repo}" "${ERP_ROOT}/ERP_frontend/${repo}"
      done < "${FRONTEND_LIST}"
    fi
  } > "${file}"
}

write_report "${SNAPSHOT_FILE}"
cp "${SNAPSHOT_FILE}" "${LATEST_FILE}"

echo "Baseline written:"
echo "  ${SNAPSHOT_FILE}"
echo "  ${LATEST_FILE}"
