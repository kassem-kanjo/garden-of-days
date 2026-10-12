#!/bin/zsh
# Builds "Garden of Days.app", installs it to ~/Applications, and puts a shortcut on the Desktop.
set -euo pipefail
ROOT="${0:A:h}"
APP_NAME="Garden of Days"
BUILD="$ROOT/build"
APP="$BUILD/$APP_NAME.app"
INSTALL_DIR="$HOME/Applications"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

echo "• compiling"
swiftc -O -o "$APP/Contents/MacOS/GardenOfDays" "$ROOT/mac/main.swift" -framework Cocoa -framework WebKit

echo "• icon"
ICON_TMP="$BUILD/icon"
rm -rf "$ICON_TMP"; mkdir -p "$ICON_TMP/AppIcon.iconset"
swift "$ROOT/mac/make-icon.swift" "$ROOT/mac/icon-source.png" "$ICON_TMP/icon-1024.png" >/dev/null
for s in 16 32 128 256 512; do
  sips -z $s $s "$ICON_TMP/icon-1024.png" --out "$ICON_TMP/AppIcon.iconset/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2))
  sips -z $d $d "$ICON_TMP/icon-1024.png" --out "$ICON_TMP/AppIcon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICON_TMP/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"

echo "• resources"
rsync -a --delete --exclude ".DS_Store" "$ROOT/web/" "$APP/Contents/Resources/web/"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>com.kassemkanjo.gardenofdays</string>
  <key>CFBundleExecutable</key><string>GardenOfDays</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.lifestyle</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>A garden for your days.</string>
</dict>
</plist>
PLIST

echo "• signing (ad-hoc)"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1

echo "• installing"
mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/$APP_NAME.app"
cp -R "$APP" "$INSTALL_DIR/"
touch "$INSTALL_DIR/$APP_NAME.app"
ln -sfn "$INSTALL_DIR/$APP_NAME.app" "$HOME/Desktop/$APP_NAME"

echo "✓ $INSTALL_DIR/$APP_NAME.app  (shortcut on Desktop)"
