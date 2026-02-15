---
paths:
  - packages/shared/**
---

# Schema Discipline: @hub-of-wyn/shared

This package is the **shared contract** between client, server, and the asset studio repo.

## Rules

- **z.infer<> only.** All types are inferred from Zod schemas. Never hand-write a type that Zod can generate.
- **No app dependencies.** The only runtime dependency is Zod. Never import from `client/`, `server/`, `phaser`, or any app-level package.
- **Contract coordination.** Schema changes affect the studio repo. Always coordinate via `docs/plans/studio-asset-interface.md`.
- **Schemas in `src/schema/`, types in `src/types/`.** 15 schema files, 40+ inferred types re-exported from `src/types/index.ts`.

## Publishing

- Published to npm as `@hub-of-wyn/shared`
- `prepublishOnly` runs `bun run typecheck` automatically
- Dry-run first: `bun publish --dry-run`
- Version bumps follow semver: patch (bug fixes), minor (new schemas/exports), major (breaking changes)
