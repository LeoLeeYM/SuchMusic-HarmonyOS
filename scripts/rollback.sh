#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/harmonyos/SuchMusic"
# Extract a source snapshot to a separate directory; never overwrite active work.
ARCHIVE="${1:?Usage: rollback.sh archive.tar.gz new-output-directory}"
DEST="${2:?Provide an empty new output directory}"
if [ -e "$DEST" ]; then echo "Output already exists" >&2; exit 1; fi
mkdir -p "$DEST"
tar -xzf "$ARCHIVE" -C "$DEST"
echo "Snapshot restored for review: $DEST"
