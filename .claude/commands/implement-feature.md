Implement the feature described in $ARGUMENTS. Follow this sequence exactly:

**Gate 0 — Orient**
1. Read `docs/plans/active-plan.md` — find the Snapshot and current goal
2. Find the first goal with status `in-progress` or (if none) `ready`
3. Check: does $ARGUMENTS align with one of that goal's unchecked deliverables?
4. If no alignment: report which goal is current, list its deliverables, and STOP
5. If aligned: note which deliverable(s) this work addresses
6. If the goal is `ready`: update its status to `in-progress`, set the branch name, update Snapshot

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
5. If the deliverable will touch >8 files, decompose into sub-deliverables first
6. Present plan — stop for approval if it touches >5 files

**Gate 3 — Implement**
1. Schema changes first (if any) in packages/shared/
2. Port interfaces second (if any) in core/ports/
3. Domain logic in modules/ (with tests)
4. Container wiring in core/container.ts + main.ts
5. Scene integration in scenes/ (thin — read state, move sprites)

**Gate 4 — Verify**
1. `bun run check` — must pass with zero warnings
2. Review own diff against AGENTS.md boundaries
3. Verify any new Phaser symbols are recorded in `docs/PHASER_EVIDENCE.md`
4. Report: files changed, tests added, verification status

**Gate 5 — Update Plan**
1. In `docs/plans/active-plan.md`, check off completed deliverables: `- [ ]` -> `- [x]`
2. If ALL deliverables for the current goal are now checked:
   a. Set goal status to `done`, set branch to `merged`
   b. Move the goal to the Completed Log (date, summary, test count, branch)
   c. Set any goals whose `requires` included this goal from `not-started` -> `ready`
   d. Update Snapshot to show the next `ready` goal
3. If deliverables remain, update Snapshot to reflect progress
4. Set frontmatter `last_updated` to today's date
