#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/harmonyos/SuchMusic"
HDC="${DEVECO_HDC:-/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc}"
if [ -n "${DEVICE_SERIAL:-}" ]; then
  "$HDC" -t "$DEVICE_SERIAL" shell aa force-stop com.suchmusic.app
else
  "$HDC" shell aa force-stop com.suchmusic.app
fi
