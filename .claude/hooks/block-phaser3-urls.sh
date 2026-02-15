#!/usr/bin/env bash
# .claude/hooks/block-phaser3-urls.sh
# PreToolUse hook for Bash|WebFetch — blocks Phaser 3 doc URLs
# Uses hookSpecificOutput JSON protocol for proper denial
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input.url // empty')

BLOCKED_PATTERNS=(
  "photonstorm.github.io/phaser3-docs"
  "docs.phaser.io/api-documentation/api-documentation"
  "docs.phaser.io/api-documentation/3"
  "newdocs.phaser.io.*3\."
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern" 2>/dev/null; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Phaser 3 URL blocked. This project uses Phaser 4.0.0-rc.6 ONLY. Use: https://docs.phaser.io/api-documentation/4.0.0-rc.6/"
      }
    }'
    exit 0
  fi
done
