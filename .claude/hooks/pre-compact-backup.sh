#!/usr/bin/env bash
# .claude/hooks/pre-compact-backup.sh
# PreCompact hook — back up transcript before context compaction
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null || echo "unknown")
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null || echo "")

BACKUP_DIR=".claude/telemetry/compaction-backups"
mkdir -p "$BACKUP_DIR"

if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
  cp "$TRANSCRIPT" "$BACKUP_DIR/${SESSION_ID:0:8}-${TIMESTAMP}.jsonl"

  # Keep last 5 backups, remove older ones
  ls -t "$BACKUP_DIR"/*.jsonl 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
fi
