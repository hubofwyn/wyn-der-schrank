#!/usr/bin/env bash
# .claude/hooks/notify-attention.sh
# Notification hook — macOS desktop alert when Claude needs attention
set -euo pipefail

# Only run on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  exit 0
fi

osascript -e 'display notification "Claude Code needs your attention" with title "Claude Code" sound name "Ping"' 2>/dev/null || true
