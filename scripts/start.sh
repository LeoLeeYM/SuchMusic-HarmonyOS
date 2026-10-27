#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${SUCHMUSIC_BUILD_DIR:-$HOME/.cache/suchmusic-harmonyos/SuchMusic}"
if [ "${1:-}" = "--foreground" ]; then
  exec "$ROOT/scripts/device.sh" shell aa start -b com.suchmusic.app -a EntryAbility
fi
cd "$PROJECT"
devecocli run --skip-build "$@"
