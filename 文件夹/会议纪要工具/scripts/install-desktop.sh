#!/usr/bin/env bash
# 在 macOS 桌面创建「会议记录.app」，双击即可启动（无需打开终端）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="会议记录"
DESKTOP="${DESKTOP:-$HOME/Desktop}"
APP_PATH="$DESKTOP/${APP_NAME}.app"
ELECTRON="$ROOT/node_modules/.bin/electron"

if [ ! -x "$ELECTRON" ]; then
  echo "❌ 未找到 Electron，请先在项目目录执行: npm install"
  exit 1
fi

if [ ! -d "$ROOT/scripts/.venv" ]; then
  echo "⚠️  转写环境未安装，启动后无法转写。建议先执行: npm run setup:python"
fi

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

cat > "$APP_PATH/Contents/MacOS/launch" <<LAUNCH
#!/usr/bin/env bash
set -euo pipefail
TOOL_ROOT="$ROOT"
cd "\$TOOL_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:\$PATH"
exec "\$TOOL_ROOT/node_modules/.bin/electron" .
LAUNCH

chmod +x "$APP_PATH/Contents/MacOS/launch"

echo ""
echo "✅ 已安装桌面启动器："
echo "   $APP_PATH"
echo ""
echo "   双击桌面「${APP_NAME}」即可打开悬浮窗。"
echo "   首次启动若提示无法打开，请：右键 → 打开 → 确认。"
echo ""
echo "   关闭悬浮窗右上角 × 会隐藏到菜单栏；完全退出请点菜单栏图标 → 退出。"
