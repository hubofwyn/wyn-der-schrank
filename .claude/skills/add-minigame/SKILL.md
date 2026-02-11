---
name: add-minigame
description: Add a new minigame to the Registry + Factory system
---
# Add Minigame

Minigames live in `modules/minigame/games/<name>/` and are registered via the MinigameRegistry.

## Steps

1. **Add ID to schema.** In `packages/shared/src/schema/minigame.ts`, add the new ID to `MinigameIdSchema`:
   ```typescript
   export const MinigameIdSchema = z.enum(['dice-duel', '<new-name>']);
   ```

2. **Create logic module.** `modules/minigame/games/<name>/logic.ts` implementing `MinigameLogic`:
   ```typescript
   import type { MinigameLogic } from '../../minigame-logic';
   // Pure TS — no Phaser, no browser globals
   ```

3. **Create tests.** `modules/minigame/games/<name>/__tests__/logic.test.ts`
   Test start, update, handleInput, getState, and cleanup.

4. **Register factory.** In the MinigameRegistry setup (called from `main.ts`):
   ```typescript
   registry.register('<new-name>', () => new NewNameLogic());
   ```

5. **Scene rendering** (if the minigame needs unique visuals beyond MinigameScene):
   Add a rendering helper in `scenes/` that reads `MinigameLogic.getState()` and draws sprites.
   Keep it thin — zero game logic in the scene.

6. **Verify.** `bun run check`.
