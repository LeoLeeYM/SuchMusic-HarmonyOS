#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/harmonyos/SuchMusic"
exec "$ROOT/scripts/deploy.sh" "$@"
