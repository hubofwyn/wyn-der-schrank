#!/usr/bin/env bash
# .claude/hooks/telemetry-log.sh
# Append a telemetry event to .claude/telemetry/events.jsonl
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"
mkdir -p "$TELEMETRY_DIR"

# Read hook input
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "unknown")
if [[ -z "$SESSION_ID" ]]; then
  SESSION_ID="unknown"
fi
EVENT_TYPE=$(echo "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null || echo "${1:-PostToolUse}")
if [[ -z "$EVENT_TYPE" ]]; then
  EVENT_TYPE="${1:-PostToolUse}"
fi
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty' 2>/dev/null || echo "")

# Determine category
CATEGORY="edit"
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  CATEGORY="zone"
elif [[ "$FILE_PATH" =~ apps/client/src/scenes/ ]]; then
  CATEGORY="scene"
elif [[ "$FILE_PATH" =~ packages/shared/ ]]; then
  CATEGORY="schema"
elif [[ "$TOOL_NAME" == "Bash" ]]; then
  CATEGORY="command"
fi

RESULT="${TELEMETRY_RESULT:-ok}"

# Append event — compact single-line JSONL (jq -cn)
jq -cn \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg sid "$SESSION_ID" \
  --arg et "$EVENT_TYPE" \
  --arg tn "$TOOL_NAME" \
  --arg fp "$FILE_PATH" \
  --arg res "$RESULT" \
  --arg cat "$CATEGORY" \
  --arg det "${TELEMETRY_DETAIL:-}" \
  '{
    timestamp: $ts,
    sessionId: $sid,
    eventType: $et,
    toolName: $tn,
    filePath: $fp,
    result: $res,
    category: $cat,
    detail: $det
  }' >> "$EVENTS_FILE"
