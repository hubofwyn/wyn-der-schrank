#!/usr/bin/env bash
# .claude/hooks/zone-lint-on-edit.sh
# PostToolUse hook for Edit|Write — lint modules/ zone + Phaser check
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.ts$ ]]; then
  exit 0
fi

# Zone check for modules/
if [[ "$FILE_PATH" =~ apps/client/src/modules/ ]]; then
  # Fast ESLint on just this file
  if command -v bunx &>/dev/null; then
    RESULT=$(bunx eslint "$FILE_PATH" --max-warnings 0 2>&1) || {
      echo "ZONE VIOLATION in $FILE_PATH:" >&2
      echo "$RESULT" >&2
      exit 2
    }
  fi

  # Double-check: grep for forbidden imports (belt + suspenders)
  if grep -qE 'from\s+["'"'"']phaser|import.*Phaser|window\.|document\.|requestAnimationFrame' "$FILE_PATH" 2>/dev/null; then
    echo "ZONE VIOLATION: $FILE_PATH contains forbidden imports/globals" >&2
    echo "modules/ must be pure TypeScript with NO Phaser or browser references" >&2
    exit 2
  fi
fi
