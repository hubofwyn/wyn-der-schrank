Investigate $ARGUMENTS before any implementation.

1. Read `docs/plans/active-plan.md` — note the current goal and its deliverables
2. `grep -rn "$ARGUMENTS" apps/ packages/ --include="*.ts" | head -30`
3. `ls docs/adr/` — scan for relevant decisions
4. `grep -rn "$ARGUMENTS" apps/client/src/core/ports/` — check existing abstractions
5. `grep -rn "$ARGUMENTS" apps/client/src/core/container.ts` — check current wiring

Report findings with file:line references. Do NOT write any code.
If the investigation reveals an existing pattern, describe it.
If nothing exists, outline where the new code should live per zone rules.
If $ARGUMENTS does not align with the current goal, flag this.
