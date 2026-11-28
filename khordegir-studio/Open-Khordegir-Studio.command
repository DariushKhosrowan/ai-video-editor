#!/usr/bin/env bash
# macOS double-click launcher for Khordegir Studio
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$DIR/open-studio.sh"
