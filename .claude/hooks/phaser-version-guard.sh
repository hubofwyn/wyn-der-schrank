#!/usr/bin/env bash
# .claude/hooks/phaser-version-guard.sh
# PostToolUse hook for Edit|Write — checks Phaser evidence discipline
# Emits telemetry events DIRECTLY for violations and warnings
set -euo pipefail

# Read hook input JSON from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "unknown")
if [[ -z "$SESSION_ID" ]]; then SESSION_ID="unknown"; fi

# Only check .ts files in apps/client/
if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ ^apps/client/.*\.ts$ ]]; then
  exit 0
fi

# Telemetry helper — append a compact JSONL event inline
_emit_telemetry() {
  local result="$1" detail="$2"
  local telemetry_dir=".claude/telemetry"
  mkdir -p "$telemetry_dir"
  jq -cn \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg sid "$SESSION_ID" \
    --arg et "PostToolUse" \
    --arg tn "phaser-guard" \
    --arg fp "$FILE_PATH" \
    --arg res "$result" \
    --arg cat "phaser" \
    --arg det "$detail" \
    '{timestamp:$ts,sessionId:$sid,eventType:$et,toolName:$tn,filePath:$fp,result:$res,category:$cat,detail:$det}' \
    >> "$telemetry_dir/events.jsonl"
}

# modules/ should NEVER reference Phaser — hard fail
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  if grep -qE 'import.*from.*["'"'"']phaser|Phaser\.' "$FILE_PATH" 2>/dev/null; then
    echo "ZONE VIOLATION: $FILE_PATH imports Phaser in modules/ zone" >&2
    echo "modules/ must be pure TypeScript — use port interfaces from core/ports/" >&2
    _emit_telemetry "violation" "Phaser import in modules/ zone"
    exit 2
  fi
  exit 0
fi

# For scene/adapter files: check for undocumented Phaser symbols
EVIDENCE_FILE="docs/PHASER_EVIDENCE.md"
if [[ ! -f "$EVIDENCE_FILE" ]]; then
  exit 0
fi

# Extract Phaser symbols from the changed file
SYMBOLS=$(grep -oE 'Phaser\.[A-Za-z._]+' "$FILE_PATH" 2>/dev/null | sort -u || true)

MISSING=()
for sym in $SYMBOLS; do
  SHORT=$(echo "$sym" | sed 's/Phaser\.//')
  if ! grep -q "$SHORT" "$EVIDENCE_FILE" 2>/dev/null; then
    MISSING+=("$sym")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARNING: Undocumented Phaser symbols in $FILE_PATH:" >&2
  printf "  - %s\n" "${MISSING[@]}" >&2
  echo "" >&2
  echo "Action required: verify each symbol exists in Phaser 4.0.0-rc.6 docs" >&2
  echo "Then add to docs/PHASER_EVIDENCE.md" >&2
  _emit_telemetry "warning" "Undocumented Phaser symbols: ${MISSING[*]}"
  # WARNING only, not a hard block
  exit 0
fi
