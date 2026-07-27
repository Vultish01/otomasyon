#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOWNLOADS_DIR="$ROOT_DIR/public/downloads"
PACKAGE_DIR="$DOWNLOADS_DIR/windows-worker-package"
ZIP_PATH="$DOWNLOADS_DIR/otologin-windows-worker.zip"

rm -rf "$PACKAGE_DIR" "$ZIP_PATH"
mkdir -p "$PACKAGE_DIR"

cp "$ROOT_DIR/requirements-worker.txt" "$PACKAGE_DIR/"
cp -R "$ROOT_DIR/worker" "$PACKAGE_DIR/"
cp "$ROOT_DIR/installer/windows/"* "$PACKAGE_DIR/"

cp "$ROOT_DIR/installer/windows/install-otologin-worker.bat" "$DOWNLOADS_DIR/"
cp "$ROOT_DIR/installer/windows/install-otologin-worker.ps1" "$DOWNLOADS_DIR/"
cp "$ROOT_DIR/installer/windows/worker-config.template.json" "$DOWNLOADS_DIR/"
cp "$ROOT_DIR/installer/windows/README.txt" "$DOWNLOADS_DIR/windows-worker-readme.txt"

(
  cd "$DOWNLOADS_DIR"
  zip -qr "$(basename "$ZIP_PATH")" "$(basename "$PACKAGE_DIR")"
)

echo "Windows worker paketi hazirlandi: $ZIP_PATH"
