---
name: fix-issue
description: Reproduce → failing test → fix → verify
---
# Fix Issue

1. **Reproduce.** Find the failing behavior. Add minimal repro notes to the task.
2. **Locate.** Use the zone map from @AGENTS.md to find the relevant module.
   - Game logic bug → `modules/`
   - Rendering bug → `scenes/` (visual) or `core/adapters/` (engine translation)
   - Schema/validation bug → `packages/shared/`
   - API bug → `apps/server/`
3. **Failing test.** Add or adjust a test in the relevant `__tests__/` directory that captures the bug.
   - modules/ tests use mock ports — never real Phaser.
4. **Fix.** Implement the smallest change that makes the test pass.
5. **Verify.** `bun run check` — zero warnings, zero errors.
6. **Document.** If behavior changed, note it in the relevant ADR or `docs/plans/active-plan.md`.
