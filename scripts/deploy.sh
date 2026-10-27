#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${SUCHMUSIC_BUILD_DIR:-$HOME/.cache/suchmusic-harmonyos/SuchMusic}"
"$ROOT/scripts/build.sh"
cd "$PROJECT"
devecocli signature generate
devecocli build --modules entry --build-mode debug
devecocli run --skip-build "$@"
