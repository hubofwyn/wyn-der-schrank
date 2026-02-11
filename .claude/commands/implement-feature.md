Implement the feature described in $ARGUMENTS. Follow this sequence exactly:

**Gate 1 — Investigate**
1. grep for related patterns in the codebase
2. Read relevant ADRs in docs/adr/
3. Check core/ports/ and core/container.ts
4. Report findings — stop if the feature already exists

**Gate 2 — Plan**
1. List files to create/modify with full paths
2. Identify which zone each file belongs to
3. Identify new port interfaces or container changes needed
4. Identify schema changes in @wds/shared
5. Present plan — stop for approval if it touches >5 files

**Gate 3 — Implement**
1. Schema changes first (if any) in packages/shared/
2. Port interfaces second (if any) in core/ports/
3. Domain logic in modules/ (with tests)
4. Container wiring in core/container.ts + main.ts
5. Scene integration in scenes/ (thin — read state, move sprites)

**Gate 4 — Verify**
1. `bun run check` — must pass with zero warnings
2. Review own diff against AGENTS.md boundaries
3. Report: files changed, tests added, verification status
