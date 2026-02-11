---
name: add-module
description: Add a new domain module to modules/ following zone rules
---
# Add Module

A module is a self-contained domain concern in `apps/client/src/modules/<name>/`.

## Structure
```text
modules/<name>/
├── <name>-controller.ts    # or <name>-system.ts, <name>-manager.ts
├── <name>-state.ts         # (if stateful)
└── __tests__/
    └── <name>-controller.test.ts
```

## Checklist
1. **Schema first.** If the module introduces new data shapes, define Zod schemas in
   `packages/shared/src/schema/` and export inferred types from `packages/shared/src/types/index.ts`.
2. **Port check.** Does the module need engine capabilities (input, physics, audio, time)?
   Import ONLY from `core/ports/` — never from `phaser` or `core/adapters/`.
   If no existing port covers the need, propose a new port interface (requires "ask first" approval).
3. **Constructor injection.** The module receives all dependencies as constructor parameters.
   Types must be port interfaces, not concrete classes.
4. **Register in container.** Add the service to the `Container` interface in `core/container.ts`
   and wire it in the `createContainer()` factory in `main.ts`.
5. **Tests.** Write tests using mock ports from `modules/__test-utils__/mocks.ts`.
6. **Zone verify.** `bun run lint:zones` — must pass with zero warnings.
7. **Full verify.** `bun run check`.
