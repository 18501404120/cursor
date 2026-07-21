#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERP_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOURCE_PLIST="${ERP_ROOT}/本地/launchd/com.ckw.erp.daily-kb-sync.plist"
TARGET_DIR="${HOME}/Library/LaunchAgents"
TARGET_PLIST="${TARGET_DIR}/com.ckw.erp.daily-kb-sync.plist"
CONFIG_FILE="${ERP_ROOT}/本地/config/daily-kb-sync.env"
EXAMPLE_CONFIG="${ERP_ROOT}/本地/config/daily-kb-sync.env.example"

if [[ ! -f "${SOURCE_PLIST}" ]]; then
  echo "Missing launchd plist: ${SOURCE_PLIST}" >&2
  exit 2
fi

if [[ ! -f "${CONFIG_FILE}" ]]; then
  cp "${EXAMPLE_CONFIG}" "${CONFIG_FILE}"
  echo "Created config: ${CONFIG_FILE}"
  echo "Fill CURSOR_API_KEY before the first scheduled run."
fi

chmod +x "${ERP_ROOT}/本地/scripts/daily-kb-sync.sh"
chmod +x "${ERP_ROOT}/本地/scripts/daily-kb-sync.py"
chmod +x "${ERP_ROOT}/本地/scripts/daily-kb-sync.mjs"
chmod +x "${ERP_ROOT}/本地/scripts/daily-kb-impact-plan.mjs"

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_PLIST}" "${TARGET_PLIST}"

launchctl bootout "gui/$(id -u)" "${TARGET_PLIST}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "${TARGET_PLIST}"
launchctl enable "gui/$(id -u)/com.ckw.erp.daily-kb-sync"

echo "Installed launchd job:"
echo "  ${TARGET_PLIST}"
echo "Schedule:"
echo "  every day at 12:30 local time"
