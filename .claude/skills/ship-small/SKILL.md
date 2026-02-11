---
name: ship-small
description: Keep changes small, reviewable, and reversible
---
# Ship Small

- 1–3 focused commits per task. No sprawl.
- If touching >10 files, stop and write a plan with rationale first.
- No drive-by refactors. If you spot something unrelated, note it for a separate task.
- Keep public API changes (ports, container interface, schemas) explicit and documented.
- Prefer adding new code alongside old code, then switching over, then removing old code — not all at once.
- If a task is growing beyond scope, split it. Ship the smaller piece first.
