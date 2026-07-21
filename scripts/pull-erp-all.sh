#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PRODUCT_DIR="${ERP_ROOT}/ERP_product"
BACKEND_DIR="${ERP_ROOT}/ERP_backend"
FRONTEND_PULL="${SCRIPT_DIR}/pull-govee-frontend.sh"
BASELINE_SCRIPT="${SCRIPT_DIR}/record-code-baseline.sh"

pull_product() {
  echo
  echo "==> ERP_product"

  if [[ ! -d "${PRODUCT_DIR}/.git" ]]; then
    echo "Skip ERP_product: not a Git repository."
    return
  fi

  if [[ -n "$(git -C "${PRODUCT_DIR}" status --porcelain)" ]]; then
    echo "Skip pull: ERP_product has local changes. Please commit or stash first."
    git -C "${PRODUCT_DIR}" status --short --branch
    return
  fi

  local branch
  branch="$(git -C "${PRODUCT_DIR}" branch --show-current)"
  git -C "${PRODUCT_DIR}" fetch origin "${branch}"
  git -C "${PRODUCT_DIR}" pull --ff-only origin "${branch}"
}

pull_backend() {
  echo
  echo "==> ERP_backend"

  if [[ ! -d "${BACKEND_DIR}/.git" ]]; then
    echo "Skip ERP_backend: not a Git repository."
    return
  fi

  git -C "${BACKEND_DIR}" fetch origin release
  git -C "${BACKEND_DIR}" checkout release
  git -C "${BACKEND_DIR}" pull --ff-only origin release
}

pull_frontend() {
  echo
  echo "==> ERP_frontend"

  if [[ ! -x "${FRONTEND_PULL}" ]]; then
    echo "Frontend pull script not executable: ${FRONTEND_PULL}" >&2
    exit 1
  fi

  "${FRONTEND_PULL}"
}

record_baseline() {
  echo
  echo "==> Record code baseline"

  if [[ ! -x "${BASELINE_SCRIPT}" ]]; then
    echo "Baseline script not executable: ${BASELINE_SCRIPT}" >&2
    exit 1
  fi

  "${BASELINE_SCRIPT}"
}

pull_product
pull_backend
pull_frontend
record_baseline

echo
echo "ERP repositories are synced."
