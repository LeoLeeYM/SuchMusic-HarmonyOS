#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PID="$("$ROOT/scripts/device.sh" shell pidof com.suchmusic.app | tr -d '\r\n')"
[ -n "$APP_PID" ] || { echo 'SuchMusic is not running' >&2; exit 1; }
OLD_SOCKET="$("$ROOT/scripts/device.sh" fport ls | awk '$2 == "tcp:9229" {print $3}')"
if [ -n "$OLD_SOCKET" ]; then "$ROOT/scripts/device.sh" fport rm tcp:9229 "$OLD_SOCKET" >/dev/null; fi
"$ROOT/scripts/device.sh" fport tcp:9229 "localabstract:webview_devtools_remote_$APP_PID"
