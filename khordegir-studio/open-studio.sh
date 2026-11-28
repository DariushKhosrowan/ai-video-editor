#!/usr/bin/env bash
# ==============================================================================
# Khordegir Studio — 1-Click Easy Launcher (Linux / macOS)
# اجرای یک‌کلیکی خرده‌گیر استودیو (سرور را بالا می‌آورد و مرورگر را خودکار باز می‌کند)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STUDIO_URL="http://127.0.0.1:3000/editor/"

open_browser() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$url" >/dev/null 2>&1 || true
  fi
}

echo "========================================================"
echo "  Khordegir Studio | خرده‌گیر استودیو"
echo "  Opening: $STUDIO_URL"
echo "========================================================"

# If server is already running on 127.0.0.1:3000, just open the browser immediately!
if command -v curl >/dev/null 2>&1 && curl -fsS "http://127.0.0.1:3000/editor/" >/dev/null 2>&1; then
  echo "✓ Studio server is already running on port 3000."
  open_browser "$STUDIO_URL"
  exit 0
fi

# Prefer Node web server if root package.json exists; otherwise fall back to Python editor
if [ -f "$ROOT_DIR/server.js" ] && command -v node >/dev/null 2>&1; then
  cd "$ROOT_DIR"
  if [ ! -d "$ROOT_DIR/node_modules" ] && command -v npm >/dev/null 2>&1; then
    echo "Installing dependencies (first run only)..."
    npm install --no-audit --prefer-offline || npm install
  fi
  (
    for _ in $(seq 1 30); do
      if command -v curl >/dev/null 2>&1 && curl -fsS "http://127.0.0.1:3000/editor/" >/dev/null 2>&1; then
        open_browser "$STUDIO_URL"
        break
      fi
      sleep 0.4
    done
  ) &
  echo "Starting Khordegir Studio on http://127.0.0.1:3000 ..."
  echo "Press Ctrl+C to stop."
  exec node server.js
elif command -v python3 >/dev/null 2>&1; then
  cd "$SCRIPT_DIR"
  echo "Starting Python Editor on http://127.0.0.1:3000 ..."
  exec python3 -m khordegir editor --port 3000
else
  echo "ERROR: Please install Node.js 20+ (https://nodejs.org/) or Python 3.10+."
  exit 1
fi
