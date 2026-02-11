#!/usr/bin/env bash
# scripts/telemetry-report.sh — Human-run telemetry analysis
set -euo pipefail

TELEMETRY_DIR=".claude/telemetry"
EVENTS="$TELEMETRY_DIR/events.jsonl"
SESSIONS="$TELEMETRY_DIR/sessions.jsonl"

if [[ ! -f "$EVENTS" ]]; then
  echo "No telemetry data found."
  exit 0
fi

echo "==================================="
echo "  WYN DER SCHRANK — Agentic Telemetry"
echo "==================================="
echo ""

# Total stats
TOTAL_EVENTS=$(wc -l < "$EVENTS")
TOTAL_SESSIONS=$(wc -l < "$SESSIONS" 2>/dev/null || echo "0")
echo "Total events: $TOTAL_EVENTS across $TOTAL_SESSIONS sessions"
echo ""

# Events by category
echo "Events by category:"
jq -r '.category' "$EVENTS" | sort | uniq -c | sort -rn
echo ""

# Events by result
echo "Events by result:"
jq -r '.result' "$EVENTS" | sort | uniq -c | sort -rn
echo ""

# Violations detail
VIOLATION_COUNT=$(grep -c '"result":"violation"' "$EVENTS" || echo "0")
if [[ "$VIOLATION_COUNT" -gt 0 ]]; then
  echo "VIOLATIONS ($VIOLATION_COUNT):"
  grep '"result":"violation"' "$EVENTS" | jq -r '"  \(.timestamp) | \(.filePath) | \(.detail)"'
  echo ""
fi

# Blocked detail
BLOCKED_COUNT=$(grep -c '"result":"blocked"' "$EVENTS" || echo "0")
if [[ "$BLOCKED_COUNT" -gt 0 ]]; then
  echo "BLOCKED ACTIONS ($BLOCKED_COUNT):"
  grep '"result":"blocked"' "$EVENTS" | jq -r '"  \(.timestamp) | \(.toolName) | \(.detail)"'
  echo ""
fi

# Most-edited files
echo "Most-edited files (top 10):"
jq -r '.filePath // empty' "$EVENTS" | grep -v '^$' | sort | uniq -c | sort -rn | head -10
echo ""

# Session trend
if [[ -f "$SESSIONS" ]]; then
  echo "Session trend (last 10):"
  tail -10 "$SESSIONS" | jq -r '"  \(.sessionId[:8])... | events: \(.totalEvents) | violations: \(.violations) | blocked: \(.blocked)"'
fi
