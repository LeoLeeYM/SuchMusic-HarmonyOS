#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/harmonyos/SuchMusic"
"$ROOT/scripts/stop.sh"
"$ROOT/scripts/start.sh" "$@"
