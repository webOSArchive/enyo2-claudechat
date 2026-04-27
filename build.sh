#!/bin/bash
# Build script for Claude Chat for webOS
# Usage: ./build.sh webos [install] | clean

mydir=$(cd "$(dirname "$0")" && pwd)
appdir="$mydir/enyo-app"
deploydir="$appdir/deploy"
bindir="$mydir/bin"

# ── Helpers ────────────────────────────────────────────────────────────────

die() { echo "ERROR: $1"; exit 1; }

# ── Clean ──────────────────────────────────────────────────────────────────

if [ "$1" = "clean" ]; then
    echo "Cleaning build artifacts..."
    rm -rf "$deploydir" "$appdir/build" "$bindir"/*.ipk
    echo "Done."
    exit 0
fi

# ── Usage guard ────────────────────────────────────────────────────────────

if [ "$1" != "webos" ] && [ "$1" != "luneos" ]; then
    echo "Usage:"
    echo "  $0 webos           Build the webOS .ipk"
    echo "  $0 webos install   Build and install to a connected device"
    echo "  $0 clean           Remove all build artifacts"
    exit 1
fi

# ── Pre-flight checks ──────────────────────────────────────────────────────

command -v node        >/dev/null 2>&1 || die "node not found in PATH"
command -v palm-package >/dev/null 2>&1 || die "palm-package not found — is the webOS SDK in your PATH?"

[ -f "$appdir/icon.png" ] || die "icon.png not found in $appdir — add one before building"

# ── Build ──────────────────────────────────────────────────────────────────

echo "Building Claude Chat for webOS..."

# Swap in the webOS Cordova shim (restores the www stub on exit)
cp -f "$mydir/cordova-webos.js" "$appdir/cordova.js"
trap 'cp -f "$mydir/cordova-www.js" "$appdir/cordova.js"' EXIT

# Clean previous deploy output
rm -rf "$deploydir" "$appdir/build"
mkdir -p "$bindir"

# Run Enyo minifier → produces $deploydir/build/{enyo,app}.{js,css}
echo "Minifying..."
(cd "$appdir" && node enyo/tools/deploy.js -s . -o "$deploydir") \
    || echo "  (minifier warnings are non-fatal, continuing)"

[ -d "$deploydir/build" ] || die "Minifier produced no output — check node/enyo setup"

# Copy files the minifier doesn't handle
cp -f "$appdir/appinfo.json" "$deploydir/"
cp -f "$appdir/icon.png"     "$deploydir/"
cp -f "$appdir/cordova.js"   "$deploydir/"

# index.html is copied by the minifier via deploy.json assets;
# verify it landed (it should load build/ bundles, not the source tree)
[ -f "$deploydir/index.html" ] \
    || { cp -f "$appdir/index.html" "$deploydir/"; echo "  (copied index.html manually)"; }

# ── Package ────────────────────────────────────────────────────────────────

echo "Packaging..."
palm-package "$deploydir" -o "$bindir" || die "palm-package failed"

ipk=$(ls "$bindir"/*.ipk 2>/dev/null | head -1)
[ -n "$ipk" ] || die "palm-package succeeded but no .ipk found in $bindir"

echo ""
echo "Package ready: $ipk"
echo "Size: $(du -sh "$ipk" | cut -f1)"

# ── Optional install ───────────────────────────────────────────────────────

if [ "$2" = "install" ]; then
    command -v palm-install >/dev/null 2>&1 || die "palm-install not found"
    echo ""
    echo "Installing to device (make sure it's connected over USB or WiFi)..."
    palm-install "$ipk" || die "palm-install failed"
    echo "Launching..."
    palm-launch org.webosarchive.claudechat
fi

echo ""
echo "To install manually:"
echo "  palm-install \"$ipk\""
echo "  palm-launch org.webosarchive.claudechat"
