#!/usr/bin/env bash
# .claude/hooks/protect-main-branch.sh
# PreToolUse hook for Edit|Write — blocks source file edits on main branch
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  exit 0
fi

# Allow edits to agentic infra, docs, and root config files on main
if [[ "$FILE_PATH" =~ ^\.claude/ ]] || \
   [[ "$FILE_PATH" =~ ^docs/ ]] || \
   [[ "$FILE_PATH" == "AGENTS.md" ]] || \
   [[ "$FILE_PATH" == "CLAUDE.md" ]] || \
   [[ "$FILE_PATH" == ".gitignore" ]]; then
  exit 0
fi

# Block all other edits on main
jq -n --arg path "$FILE_PATH" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Cannot edit " + $path + " on main branch. Create a work branch first: git checkout -b type/short-description")
  }
}'
exit 0
