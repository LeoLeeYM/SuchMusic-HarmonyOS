#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${SUCHMUSIC_BUILD_DIR:-$HOME/.cache/suchmusic-harmonyos/SuchMusic}"
cd "$PROJECT"
devecocli log --bundle-name com.suchmusic.app "$@"
