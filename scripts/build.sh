#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${SUCHMUSIC_BUILD_DIR:-$HOME/.cache/suchmusic-harmonyos/SuchMusic}"
mkdir -p "$PROJECT"
rsync -a --exclude build --exclude oh_modules --exclude .hvigor --exclude /build-profile.json5 "$ROOT/harmonyos/SuchMusic/" "$PROJECT/"
if [ ! -f "$PROJECT/build-profile.json5" ]; then cp "$PROJECT/build-profile.template.json5" "$PROJECT/build-profile.json5"; fi
cd "$ROOT"
if [ "${1:-}" != "--native-only" ]; then npm run mobile:build -- --mode harmonyos; fi
mkdir -p "$PROJECT/entry/src/main/resources/rawfile/web"
rsync -a --delete dist-mobile/ "$PROJECT/entry/src/main/resources/rawfile/web/"
cd "$PROJECT"
devecocli build --modules entry --build-mode debug
