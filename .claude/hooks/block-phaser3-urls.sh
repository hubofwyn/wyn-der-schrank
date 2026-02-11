#!/usr/bin/env bash
# .claude/hooks/block-phaser3-urls.sh
# PreToolUse hook for Bash|WebFetch — blocks Phaser 3 doc URLs
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
    echo "BLOCKED: Phaser 3 documentation URL detected" >&2
    echo "This project uses Phaser 4.0.0-rc.6 ONLY" >&2
    echo "Use: docs/vendor/phaser-4.0.0-rc.6/ or https://docs.phaser.io/api-documentation/4.0.0-rc.6/" >&2
    exit 2
  fi
done
