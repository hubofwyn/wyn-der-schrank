---
name: phaser-doc
description: Look up Phaser 4.0.0-rc.6 API documentation before using any Phaser symbol
---
# Phaser Doc Lookup

When asked about Phaser APIs, or when you need to use a Phaser symbol not already in the codebase:

## Step 1: Search Local Mirror
```bash
rg -n "$ARGUMENTS" docs/vendor/phaser-4.0.0-rc.6/ --max-count 10
```

## Step 2: Search Type Declarations
```bash
rg -n "$ARGUMENTS" node_modules/phaser/types/ --max-count 10
```

## Step 3: Report
Return:
- The best-matching doc page path(s)
- The exact class/method/property signature (short excerpt)
- The canonical online URL: `https://docs.phaser.io/api-documentation/4.0.0-rc.6/<path>`

## Step 4: Evidence
If this is a NEW symbol for the project, add an entry to `docs/PHASER_EVIDENCE.md`.

## If Not Found
Say: "Not found in Phaser 4.0.0-rc.6 docs or types."
Do NOT answer from memory. Do NOT guess from Phaser 3.
Ask if the user wants to search for an alternative.
