#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${ERP_ROOT}/本地/config/daily-kb-sync.env"
EXAMPLE_CONFIG="${ERP_ROOT}/本地/config/daily-kb-sync.env.example"
LOG_DIR="${ERP_ROOT}/本地/reports/daily-kb-sync"
LOCK_DIR="${ERP_ROOT}/本地/reports/daily-kb-sync.lock"
STATE_DIR="${ERP_ROOT}/本地/state"
MONTHLY_STATE_FILE="${STATE_DIR}/monthly-kb-sync.json"
NODE_WORK_DIR="${ERP_ROOT}/本地"
IMPACT_PLAN_RUNNER="${SCRIPT_DIR}/daily-kb-impact-plan.mjs"
NODE_RUNNER="${SCRIPT_DIR}/daily-kb-sync.mjs"
PULL_SCRIPT="${SCRIPT_DIR}/pull-erp-all.sh"
PUSH_SCRIPT="${SCRIPT_DIR}/push-kb-to-branches.sh"

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/$(date '+%Y%m%d-%H%M%S')-daily-kb-sync.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "==> ERP daily KB sync started at $(date '+%Y-%m-%d %H:%M:%S')"
echo "Log: ${LOG_FILE}"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Missing config: ${CONFIG_FILE}"
  echo "Create it from: ${EXAMPLE_CONFIG}"
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
set +a

WINDOW_START="${ERP_DAILY_KB_WINDOW_START:-1230}"
WINDOW_END="${ERP_DAILY_KB_WINDOW_END:-1245}"
NODE_VERSION="${ERP_DAILY_KB_NODE_VERSION:-22}"
MONTHLY_FULL_SYNC_ENABLED="${ERP_MONTHLY_FULL_SYNC_ENABLED:-true}"
MONTHLY_FULL_SYNC_DAY="${ERP_MONTHLY_FULL_SYNC_DAY:-11}"
NOW_HHMM="$(date '+%H%M')"

if (( 10#${NOW_HHMM} < 10#${WINDOW_START} || 10#${NOW_HHMM} > 10#${WINDOW_END} )); then
  echo "Skip: current time ${NOW_HHMM} is outside ${WINDOW_START}-${WINDOW_END}."
  exit 0
fi

if [[ -z "${CURSOR_API_KEY:-}" ]]; then
  echo "Missing CURSOR_API_KEY in ${CONFIG_FILE}."
  exit 2
fi

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Skip: another daily KB sync is already running."
  exit 0
fi
trap 'rmdir "${LOCK_DIR}" 2>/dev/null || true' EXIT

if [[ ! -x "${PULL_SCRIPT}" ]]; then
  echo "Pull script is not executable: ${PULL_SCRIPT}"
  exit 2
fi

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
else
  echo "nvm is required to run Cursor SDK with Node 22+." >&2
  exit 2
fi

echo "==> Prepare Node ${NODE_VERSION}"
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"

mkdir -p "${NODE_WORK_DIR}"
if [[ ! -f "${NODE_WORK_DIR}/package.json" ]]; then
  npm --prefix "${NODE_WORK_DIR}" init -y >/dev/null
fi

echo "==> Install or update Cursor SDK"
if [[ ! -d "${NODE_WORK_DIR}/node_modules/@cursor/sdk" ]]; then
  npm --prefix "${NODE_WORK_DIR}" install @cursor/sdk
else
  echo "Cursor SDK is already installed."
fi

echo "==> Pull ERP repositories"
"${PULL_SCRIPT}"

CURRENT_MONTH="$(date '+%Y-%m')"
CURRENT_DAY="$(date '+%d')"
LAST_MONTHLY_SUCCESS="$(
  node -e "const fs=require('fs'); const f=process.argv[1]; if (!fs.existsSync(f)) { process.exit(0); } try { const s=JSON.parse(fs.readFileSync(f,'utf8')); process.stdout.write(s.lastSuccessfulMonth || ''); } catch (_) {}" "${MONTHLY_STATE_FILE}"
)"

if [[ "${MONTHLY_FULL_SYNC_ENABLED}" == "true" && 10#${CURRENT_DAY} -ge 10#${MONTHLY_FULL_SYNC_DAY} && "${LAST_MONTHLY_SUCCESS}" != "${CURRENT_MONTH}" ]]; then
  echo "==> Monthly full validation sync is due for ${CURRENT_MONTH}"
  export ERP_DAILY_KB_SYNC_MODE="monthly-full"
  node "${NODE_RUNNER}"
  mkdir -p "${STATE_DIR}"
  node -e "const fs=require('fs'); const f=process.argv[1]; const month=process.argv[2]; fs.writeFileSync(f, JSON.stringify({ lastSuccessfulMonth: month, lastSuccessAt: new Date().toISOString() }, null, 2));" "${MONTHLY_STATE_FILE}" "${CURRENT_MONTH}"
  echo "Monthly full validation sync marked successful for ${CURRENT_MONTH}."

  # Push KB changes to system branches and create PRs
  if [[ "${ERP_KB_PUSH_ENABLED:-true}" == "true" && -x "${PUSH_SCRIPT}" ]]; then
    echo "==> Push KB changes to system branches"
    "${PUSH_SCRIPT}" || echo "Push to branches had errors, continuing."
  fi

  echo "==> ERP daily KB sync finished at $(date '+%Y-%m-%d %H:%M:%S')"
  exit 0
fi

echo "==> Build low-token impact plan"
node "${IMPACT_PLAN_RUNNER}"
IMPACT_PLAN_JSON="${LOG_DIR}/latest-impact-plan.json"
HAS_WORK="$(node -e "const p=require(process.argv[1]); console.log(p.hasWork ? 'yes' : 'no')" "${IMPACT_PLAN_JSON}")"
if [[ "${HAS_WORK}" != "yes" ]]; then
  echo "No impacted systems. Skip Cursor Agent to save tokens."
  echo "Impact plan: ${LOG_DIR}/latest-impact-plan.md"
  exit 0
fi

echo "==> Run unattended knowledge-base sync"
export ERP_DAILY_KB_IMPACT_PLAN_JSON="${IMPACT_PLAN_JSON}"
node "${NODE_RUNNER}"

# Push KB changes to system branches and create PRs
if [[ "${ERP_KB_PUSH_ENABLED:-true}" == "true" && -x "${PUSH_SCRIPT}" ]]; then
  echo "==> Push KB changes to system branches"
  "${PUSH_SCRIPT}" || echo "Push to branches had errors, continuing."
fi

echo "==> ERP daily KB sync finished at $(date '+%Y-%m-%d %H:%M:%S')"
