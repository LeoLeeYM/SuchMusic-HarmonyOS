#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/.local-backups"
mkdir -p "$DEST"
chmod 700 "$DEST"
ARCHIVE="$DEST/source-$(date +%Y%m%d-%H%M%S).tar.gz"
tar --exclude='./.local-backups' --exclude='./node_modules' --exclude='./.git' --exclude='./dist-mobile' --exclude='./out' --exclude='./android/.gradle' --exclude='./android/build' --exclude='./android/app/build' --exclude='./android/app/src/main/assets/public' --exclude='*/oh_modules' --exclude='*/.hvigor' --exclude='*/build' -czf "$ARCHIVE" -C "$ROOT" .
chmod 600 "$ARCHIVE"
echo "$ARCHIVE"
