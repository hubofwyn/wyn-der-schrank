---
name: review-diff
description: Self-review checklist before handing back to a human
---
# Diff Review

Run through this checklist before declaring a task complete.

## Correctness
- [ ] Does the diff match the request exactly? No drive-by refactors.
- [ ] Are error paths handled and tested?
- [ ] Any deleted tests or weakened assertions?

## Zone compliance
- [ ] `bun run lint:zones` passes (modules/ clean of Phaser/browser)
- [ ] `bun run deps:check` passes (no circular deps, no forbidden imports)
- [ ] New files are in the correct zone directory

## Contract compliance
- [ ] New types use `z.infer<>` from @wds/shared (not hand-written)
- [ ] New services are in `Container` interface and wired in `createContainer()`
- [ ] Scenes remain thin (no game logic, only state-reading + sprite-moving)

## Boundary check (from AGENTS.md)
- [ ] No new dependencies added without "ask first" approval
- [ ] No schema changes without noting the contract impact
- [ ] No secrets, keys, or tokens in the diff
- [ ] No `--no-verify`, no disabled linters, no skipped tests

## Final gate
- [ ] `bun run check` passes with zero warnings
