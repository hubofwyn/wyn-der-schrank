#!/usr/bin/env bash
# .claude/hooks/session-end-report.sh
# Runs on SessionEnd — creates final session report
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"
SESSIONS_FILE="$TELEMETRY_DIR/sessions.jsonl"
DRIFT_FILE="$TELEMETRY_DIR/drift-report.md"
CANARY_FILE="$TELEMETRY_DIR/.session-end-canary"

mkdir -p "$TELEMETRY_DIR"

# Canary: prove this hook fires. Write timestamp + input shape for debugging.
INPUT=$(cat)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | keys: $(echo "$INPUT" | jq -r 'keys | join(",")' 2>/dev/null || echo 'parse-failed')" >> "$CANARY_FILE"

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")
if [[ -z "$SESSION_ID" ]]; then
  # Fallback: summarize all "unknown" session events
  SESSION_ID="unknown"
fi

if [[ ! -f "$EVENTS_FILE" ]]; then
  exit 0
fi

EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null || true)
TOTAL=$(echo "$EVENTS" | grep -c . 2>/dev/null || echo "0")

if [[ "$TOTAL" -eq 0 ]]; then
  exit 0
fi

VIOLATIONS=$(echo "$EVENTS" | grep -c '"result":"violation"' 2>/dev/null || echo "0")
WARNINGS=$(echo "$EVENTS" | grep -c '"result":"warning"' 2>/dev/null || echo "0")
BLOCKED=$(echo "$EVENTS" | grep -c '"result":"blocked"' 2>/dev/null || echo "0")
FILES_TOUCHED=$(echo "$EVENTS" | jq -r '.filePath // empty' 2>/dev/null | sort -u | grep -c . || echo "0")

FIRST_TS=$(echo "$EVENTS" | head -1 | jq -r '.timestamp' 2>/dev/null || echo "unknown")
LAST_TS=$(echo "$EVENTS" | tail -1 | jq -r '.timestamp' 2>/dev/null || echo "unknown")

# Append to sessions log — compact single-line JSONL (jq -cn)
jq -cn \
  --arg sid "$SESSION_ID" \
  --arg start "$FIRST_TS" \
  --arg end "$LAST_TS" \
  --argjson total "$TOTAL" \
  --argjson violations "$VIOLATIONS" \
  --argjson warnings "$WARNINGS" \
  --argjson blocked "$BLOCKED" \
  --argjson files "$FILES_TOUCHED" \
  '{
    sessionId: $sid,
    startTime: $start,
    endTime: $end,
    totalEvents: $total,
    violations: $violations,
    warnings: $warnings,
    blocked: $blocked,
    filesTouched: $files
  }' >> "$SESSIONS_FILE"

# Update drift report (last 10 sessions)
{
  echo "# Agentic Drift Report"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Last 10 Sessions"
  echo ""
  echo "| Session | Events | Violations | Warnings | Blocked | Files |"
  echo "|---------|--------|------------|----------|---------|-------|"
  tail -10 "$SESSIONS_FILE" 2>/dev/null | while IFS= read -r line; do
    SID=$(echo "$line" | jq -r '.sessionId[:8]')
    TE=$(echo "$line" | jq -r '.totalEvents')
    VI=$(echo "$line" | jq -r '.violations')
    WA=$(echo "$line" | jq -r '.warnings')
    BL=$(echo "$line" | jq -r '.blocked')
    FI=$(echo "$line" | jq -r '.filesTouched')
    echo "| ${SID}... | $TE | $VI | $WA | $BL | $FI |"
  done
  echo ""

  RECENT_VIOLATIONS=$(tail -10 "$SESSIONS_FILE" 2>/dev/null | jq -s '[.[].violations] | add // 0')
  RECENT_BLOCKED=$(tail -10 "$SESSIONS_FILE" 2>/dev/null | jq -s '[.[].blocked] | add // 0')

  if [[ "$RECENT_VIOLATIONS" -gt 5 ]]; then
    echo "## DRIFT ALERT"
    echo ""
    echo "**$RECENT_VIOLATIONS violations across last 10 sessions.** Review patterns:"
    echo ""
    grep '"result":"violation"' "$EVENTS_FILE" 2>/dev/null | tail -10 | jq -r '"- \(.timestamp) | \(.filePath) | \(.detail)"' 2>/dev/null || true
  else
    echo "## Drift Status: Nominal"
    echo ""
    echo "Violations trending within acceptable range."
  fi
} > "$DRIFT_FILE"
