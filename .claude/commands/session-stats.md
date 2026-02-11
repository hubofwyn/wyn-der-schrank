Show telemetry for the current or most recent session:

1. `tail -1 .claude/telemetry/sessions.jsonl | jq .`
2. `grep "${CLAUDE_SESSION_ID:-}" .claude/telemetry/events.jsonl | jq -s 'group_by(.category) | map({category: .[0].category, count: length})'`
3. Report: events by category, any violations, any blocked actions.
