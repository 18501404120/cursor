#!/usr/bin/env bash
# 在 macOS 桌面创建「会议记录.app」，双击即可启动（无需打开终端）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="会议记录"
DESKTOP="${DESKTOP:-$HOME/Desktop}"
APP_PATH="$DESKTOP/${APP_NAME}.app"
ELECTRON_BIN="$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
LOG_FILE="$HOME/Library/Logs/会议记录.log"

if [ ! -x "$ELECTRON_BIN" ]; then
  echo "❌ 未找到 Electron，请先在项目目录执行: npm install"
  exit 1
fi

if [ ! -d "$ROOT/scripts/.venv" ]; then
  echo "⚠️  转写环境未安装，启动后无法转写。建议先执行: npm run setup:python"
fi

echo "==> 生成应用图标"
PYTHON_BIN="python3"
if [ -x "$ROOT/scripts/.venv/bin/python3" ]; then
  PYTHON_BIN="$ROOT/scripts/.venv/bin/python3"
fi
"$PYTHON_BIN" "$ROOT/scripts/generate-icon.py"

ICNS_SRC="$ROOT/assets/AppIcon.icns"
PNG_SRC="$ROOT/assets/app-icon.png"

echo "==> 创建桌面启动器: $APP_PATH"
rm -rf "$APP_PATH"
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

cat > "$APP_PATH/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundleExecutable</key>
  <string>launch</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.local.meeting-recorder</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>会议记录需要访问麦克风以录制线下会议。</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

# 注意：必须使用 Electron 原生二进制，不能调用 node_modules/.bin/electron（Finder 下无 node/nvm 会静默失败）
cat > "$APP_PATH/Contents/MacOS/launch" <<LAUNCH
#!/bin/bash
TOOL_ROOT="$ROOT"
ELECTRON_BIN="$ELECTRON_BIN"
LOG_FILE="$LOG_FILE"

{
  echo ""
  echo "========== \$(date '+%Y-%m-%d %H:%M:%S') 启动 =========="
  cd "\$TOOL_ROOT" || exit 1
  export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
  if [ "\$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
    exec arch -arm64 "\$ELECTRON_BIN" .
  else
    exec "\$ELECTRON_BIN" .
  fi
} >> "\$LOG_FILE" 2>&1
LAUNCH

chmod +x "$APP_PATH/Contents/MacOS/launch"

if [ -f "$ICNS_SRC" ]; then
  cp "$ICNS_SRC" "$APP_PATH/Contents/Resources/AppIcon.icns"
elif [ -f "$PNG_SRC" ]; then
  cp "$PNG_SRC" "$APP_PATH/Contents/Resources/app-icon.png"
fi

xattr -cr "$APP_PATH" 2>/dev/null || true

echo ""
echo "✅ 已安装桌面启动器："
echo "   $APP_PATH"
echo ""
echo "   双击桌面「${APP_NAME}」即可打开悬浮窗。"
echo "   若仍无法打开，请查看日志："
echo "   $LOG_FILE"
echo ""
echo "   首次启动若提示无法打开，请：右键 → 打开 → 确认。"
echo "   关闭悬浮窗右上角 × 会隐藏到菜单栏；完全退出请点菜单栏图标 → 退出。"
