#!/usr/bin/env bash
# .claude/hooks/zone-lint-on-edit.sh
# PostToolUse hook for Edit|Write — lint modules/ zone + Phaser check
# Emits telemetry events DIRECTLY (no env var passing to chained hooks)
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "unknown")
if [[ -z "$SESSION_ID" ]]; then SESSION_ID="unknown"; fi

if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.ts$ ]]; then
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
    --arg tn "zone-lint" \
    --arg fp "$FILE_PATH" \
    --arg res "$result" \
    --arg cat "zone" \
    --arg det "$detail" \
    '{timestamp:$ts,sessionId:$sid,eventType:$et,toolName:$tn,filePath:$fp,result:$res,category:$cat,detail:$det}' \
    >> "$telemetry_dir/events.jsonl"
}

# Zone check for modules/
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  # Fast ESLint on just this file
  if command -v bunx &>/dev/null; then
    ESLINT_RESULT=$(bunx eslint "$FILE_PATH" --max-warnings 0 2>&1) || {
      echo "ZONE VIOLATION in $FILE_PATH:" >&2
      echo "$ESLINT_RESULT" >&2
      _emit_telemetry "violation" "ESLint zone violation in modules/"
      exit 2
    }
  fi

  # Double-check: grep for forbidden imports (belt + suspenders)
  if grep -qE 'from\s+["'"'"']phaser|import.*Phaser|window\.|document\.|requestAnimationFrame' "$FILE_PATH" 2>/dev/null; then
    echo "ZONE VIOLATION: $FILE_PATH contains forbidden imports/globals" >&2
    echo "modules/ must be pure TypeScript with NO Phaser or browser references" >&2
    _emit_telemetry "violation" "Forbidden import/global in modules/"
    exit 2
  fi
fi
