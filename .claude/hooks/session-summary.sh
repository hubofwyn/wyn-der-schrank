#!/usr/bin/env bash
# .claude/hooks/session-summary.sh
# Runs on Stop — summarizes the current response cycle
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS_FILE="$TELEMETRY_DIR/events.jsonl"

if [[ ! -f "$EVENTS_FILE" ]]; then
  exit 0
fi

SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

# Count events for this session
TOTAL=$(grep -c "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null || echo "0")
VIOLATIONS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"violation"' || echo "0")
WARNINGS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"warning"' || echo "0")
BLOCKED=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"result":"blocked"' || echo "0")
ZONE_EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"category":"zone"' || echo "0")
PHASER_EVENTS=$(grep "\"sessionId\":\"$SESSION_ID\"" "$EVENTS_FILE" 2>/dev/null | grep -c '"category":"phaser"' || echo "0")

if [[ "$TOTAL" -gt 0 ]]; then
  echo "Session $SESSION_ID: $TOTAL events, $VIOLATIONS violations, $WARNINGS warnings, $BLOCKED blocked" >&2
  if [[ "$VIOLATIONS" -gt 0 ]] || [[ "$BLOCKED" -gt 0 ]]; then
    echo "  Zone events: $ZONE_EVENTS | Phaser events: $PHASER_EVENTS" >&2
  fi
fi
