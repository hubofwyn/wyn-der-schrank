Investigate $ARGUMENTS before any implementation.

1. `grep -rn "$ARGUMENTS" apps/ packages/ --include="*.ts" | head -30`
2. `ls docs/adr/` — scan for relevant decisions
3. `grep -rn "$ARGUMENTS" apps/client/src/core/ports/` — check existing abstractions
4. `grep -rn "$ARGUMENTS" apps/client/src/core/container.ts` — check current wiring
5. Check `docs/plans/active-plan.md` for context on current phase

Report findings with file:line references. Do NOT write any code.
If the investigation reveals an existing pattern, describe it.
If nothing exists, outline where the new code should live per zone rules.
