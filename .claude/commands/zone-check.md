Run full zone defense validation and report results:

1. `bun run lint:zones`
2. `bun run deps:check`
3. `bun run typecheck`

If any step fails, report every violation with file:line.
If all pass, confirm: "All zone gates green."
