#!/bin/bash
set -euo pipefail
HDC="${DEVECO_HDC:-/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc}"
if [ -n "${DEVICE_SERIAL:-}" ]; then exec "$HDC" -t "$DEVICE_SERIAL" "$@"; fi
exec "$HDC" "$@"
