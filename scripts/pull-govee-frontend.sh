#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${ERP_ROOT}/ERP_frontend"
REPO_LIST="${SCRIPT_DIR}/govee-frontend-repos.txt"
DEFAULT_BRANCH="master"

mkdir -p "${FRONTEND_DIR}"

if [[ ! -f "${REPO_LIST}" ]]; then
  echo "Repo list not found: ${REPO_LIST}" >&2
  exit 1
fi

failures=0

while IFS= read -r repo || [[ -n "${repo}" ]]; do
  repo="${repo%%#*}"
  repo="$(echo "${repo}" | xargs)"

  if [[ -z "${repo}" ]]; then
    continue
  fi

  remote="git@github-govee:govee-frontend/${repo}.git"
  target="${FRONTEND_DIR}/${repo}"

  echo
  echo "==> ${repo}"

  if [[ -d "${target}/.git" ]]; then
    git -C "${target}" remote set-url origin "${remote}" || failures=$((failures + 1))
    git -C "${target}" fetch origin "${DEFAULT_BRANCH}" || failures=$((failures + 1))
    git -C "${target}" checkout "${DEFAULT_BRANCH}" || failures=$((failures + 1))
    git -C "${target}" pull --ff-only origin "${DEFAULT_BRANCH}" || failures=$((failures + 1))
  elif [[ -e "${target}" ]]; then
    echo "Skip ${target}: path exists but is not a Git repository." >&2
    failures=$((failures + 1))
  else
    git clone -b "${DEFAULT_BRANCH}" "${remote}" "${target}" || failures=$((failures + 1))
  fi
done < "${REPO_LIST}"

if [[ "${failures}" -gt 0 ]]; then
  echo
  echo "Completed with ${failures} failure(s)." >&2
  exit 1
fi

echo
echo "All frontend repositories are up to date."
