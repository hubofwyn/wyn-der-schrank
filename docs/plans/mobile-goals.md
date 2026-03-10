---
title: Mobile Goals — Implementation Plan
category: plans
status: draft
last_updated: 2026-03-09
---

# Mobile Goals — Implementation Plan

## Context

PR #21 (`feat/viewport-core`) established the mobile foundation:

- **Viewport core**: pure math module, IViewportProvider port, PhaserViewport adapter (40 tests)
- **Touch input**: DOM virtual buttons with multi-touch pointer capture (24 tests)
- **Adaptive input**: keyboard + touch composite IInputProvider (18 tests)
- **HTML hardening**: viewport-fit=cover, touch-action:none, overscroll-behavior:none
- **Schema additions**: ControlScheme, TouchStyle, TouchButtonSize in shared
- **Scene wiring**: PlatformerScene + MinigameScene use AdaptiveInput

This plan covers what remains to make the game fully playable and polished on mobile web.

## Audit Findings

### Positioning patterns across 16 scenes

| Pattern | Prevalence | Examples |
|---------|-----------|----------|
| Hardcoded pixel positions | 52% | HudScene (16px padding), GameOverScene (y=140, 260), MinigameHudScene |
| Percentage-based height | 29% | TitleScene (height * 0.25), PauseScene, SettingsScene |
| Grid/calculated | 15% | MainMenuScene (card grid), LevelSelectScene, CharacterSelectScene |
| Corner button hardcode | 4% (critical) | Back buttons at (80, height-50) in 4 scenes |

### Key gaps

1. ~~**Zero scenes use safe zone**~~ — **FIXED**: all 14 UI scenes now use `container.viewport.safeZone` via scene-layout helpers
2. **Zero scenes use `scaleFontSize()`** — all use fixed Typography sizes from design tokens
3. **No resize listeners** — HUD positions set once in `create()`, never update
4. **No touch target enforcement** — text buttons rely on glyph bounding box (~30px, below 44px minimum)
5. ~~**Hardcoded corner buttons**~~ — **FIXED**: all corner buttons now use `cornerButton()` with safe-zone anchoring
6. **No portrait overlay** — game adapts via clamping but never prompts rotation
7. **No PWA infrastructure** — no manifest, no service worker, no icons, no theme-color
8. **No wake lock** — screen dims during gameplay on mobile
9. **No visibility pause** — game keeps running when tab/app switches

### What's available but unused

- `container.viewport.safeZone` — safe zone rect (x, y, width, height, right, bottom)
- `container.viewport.scaleFontSize(basePx)` — responsive text scaling
- `anchorInSafeZone(anchor, offsetX, offsetY, safeZone)` — 5-point anchor positioning
- `container.viewport.onResize(callback)` — resize subscription with unsubscribe
- `container.viewport.isTouchDevice` — already used by PlatformerScene/MinigameScene
- `.claude/rules/scenes-thin.md` says "Position HUD and menu UI relative to `container.viewport.safeZone`" — zero scenes comply

## Proposed Goals

Goals are ordered by dependency and impact. Each is scoped to be completable in a single work session.

---

### G13: Safe-Zone Scene Anchoring

> **Status:** in-progress
> **Requires:** none (viewport infrastructure from PR #21 is merged)
> **Benefits from:** none
> **Unlocks:** G14, G15
> **Branch:** feat/safe-zone-anchoring

Migrate all 14 UI scenes (excluding BootScene and BaseScene) from hardcoded/percentage positions to safe-zone anchoring using `container.viewport.safeZone` and `anchorInSafeZone()`. Add touch-target hit area expansion to all interactive text elements (44px minimum height). This is the highest-impact mobile fix — it makes the game usable on devices with notches, home indicators, and varying aspect ratios.

**Approach:**

- Create a thin scene-layout helper in `modules/ui/` (pure TS, zone-safe) that wraps `anchorInSafeZone` and design-token spacing into a positioning API scenes can call
- Migrate each scene's `create()` to compute positions from safe zone instead of `this.scale.width/height`
- Add invisible hit-area rectangles behind text buttons (minimum 44px height, full label width + padding)
- Use `scaleFontSize()` for all text elements

**Deliverables:**

- [x] Scene layout helper module (`modules/ui/scene-layout.ts`) — pure TS functions for safe-zone-based positioning (menu centering, button stacking, corner anchoring, hit-area sizing)
- [x] Tests for scene layout helper (24 tests)
- [x] HudScene migrated to safe-zone anchoring
- [x] MinigameHudScene migrated to safe-zone anchoring
- [x] TitleScene migrated — buttons use safe-zone center
- [x] PauseScene migrated — buttons use safe-zone center
- [x] GameOverScene migrated — stats and buttons safe-zone positioned
- [x] LevelCompleteScene migrated — stars/stats/buttons safe-zone positioned
- [x] SettingsScene migrated — toggle rows safe-zone centered
- [x] CharacterSelectScene migrated — cards centered in safe zone, back button anchored to safe-zone corner
- [x] MainMenuScene migrated — grid and corner buttons safe-zone positioned
- [x] WorldSelectScene migrated — cards and back button safe-zone positioned
- [x] LevelSelectScene migrated — grid and back button safe-zone positioned
- [x] PreloadScene migrated — progress bar centered in safe zone
- [x] MinigameScene intro text positioned from safe zone center
- [ ] Hit-area expansion on text buttons (44px minimum)
- [ ] `scaleFontSize()` integration for all text elements

---

### G14: Resize Pipeline

> **Status:** not-started
> **Requires:** G13 (scenes must use safe-zone positioning for resize to reposition correctly)
> **Benefits from:** none
> **Unlocks:** G15

Wire the resize event pipeline so that viewport changes (orientation rotation, browser chrome collapse, desktop window resize) update the game canvas size and reposition scene UI in real time.

**Approach:**

- Call `game.scale.setGameSize(newWidth, 720)` when viewport dimensions change
- Scenes subscribe to `container.viewport.onResize()` and reposition UI elements
- Debounce resize handler at ~100ms to avoid layout thrash
- Add portrait orientation overlay (CSS-only, shown via media query when height > width)

**Deliverables:**

- [ ] Resize handler in `main.ts` calls `game.scale.setGameSize()` on viewport change with 100ms debounce
- [ ] BaseScene adds optional `onViewportResize()` hook that subclasses can override
- [ ] HudScene and MinigameHudScene implement `onViewportResize()` — reposition all elements
- [ ] Menu scenes (Title, Pause, Settings, GameOver, LevelComplete) implement `onViewportResize()`
- [ ] Selection scenes (CharacterSelect, MainMenu, WorldSelect, LevelSelect) implement `onViewportResize()`
- [ ] Portrait orientation overlay — CSS `@media (orientation: portrait)` shows "Rotate to landscape" message
- [ ] Tests for debounce logic and resize handler

---

### G15: PWA Shell and Session Polish

> **Status:** not-started
> **Requires:** G13 (safe-zone positioning ensures installable app looks correct)
> **Benefits from:** G14 (resize handling makes orientation changes smooth)
> **Unlocks:** none

Package the game as an installable web app with offline capability and session quality-of-life features. iOS 26 now opens all Home Screen sites as web apps by default, making this high-impact for mobile Safari users.

**Approach:**

- Use `vite-plugin-pwa` for manifest generation and service worker with Workbox
- Cache strategy: precache static assets (HTML, JS, CSS, audio, sprites, tilemaps), network-first for API calls
- Screen Wake Lock API prevents screen dimming during gameplay
- Page Visibility API pauses game when tab/app switches

**Deliverables:**

- [ ] Web app manifest (`manifest.webmanifest`) — name, short_name, icons (192px + 512px), start_url, display: standalone, theme_color, background_color, orientation: landscape
- [ ] Placeholder app icons (192x192 and 512x512 PNG) — simple geometric design using game's accent color
- [ ] `vite-plugin-pwa` configured in `vite.config.ts` — Workbox generateSW with precache of static assets
- [ ] `<link rel="manifest">` and `<meta name="theme-color">` added to `index.html`
- [ ] Apple touch icon meta tags for iOS compatibility
- [ ] Wake lock module (`modules/session/wake-lock.ts`) — pure TS port interface, request/release lifecycle, auto-reacquire on visibility change
- [ ] Wake lock adapter (`core/adapters/wake-lock-adapter.ts`) — implements port using `navigator.wakeLock.request('screen')`
- [ ] Page visibility handler wired to Phaser scene pause/resume — `document.visibilitychange` pauses game, resumes on return
- [ ] Container wiring for wake lock service
- [ ] Tests for wake lock module (mock navigator.wakeLock) and visibility handler

---

## Scope Boundaries

**In scope for these goals:**

- Safe-zone positioning for all scenes
- Font scaling for all text
- Touch target sizing for all interactive elements
- Resize pipeline with debounce
- Portrait overlay
- PWA manifest + service worker + icons
- Wake lock + visibility pause

**Explicitly out of scope (future work):**

- Joystick-style touch controls (virtual buttons are the shipped touch style)
- Web push notifications (capability exists in iOS 16.4+, but not needed for launch)
- Minigame world-size refactoring (Shake Rush 1024x768 and Coin Catch 1024x720 work fine within the generic MinigameScene renderer)
- Offline-first data sync (SessionSave is localStorage-only, no server sync needed)
- Performance profiling / GPU optimization (premature until art assets finalize)
- Haptic feedback API (nice-to-have, not standard enough yet)

## Effort Estimate

| Goal | Scenes touched | New files | Estimated tests |
|------|---------------|-----------|-----------------|
| G13 | 14 | 1 module + 1 test file | ~30 |
| G14 | 14 (+ main.ts) | 0 new (extend BaseScene) | ~15 |
| G15 | 0 scenes | 4 new (manifest, icons, wake-lock module, adapter) | ~20 |
| **Total** | | | **~65 new tests** |

## Research Document

Full research backing: `docs/plans/mobile-ui-ux-research.md`

Key validations from research:

- DOM overlay for touch controls (not in-world sprites) — confirmed correct for FIT scaling
- Pointer Events + pointer capture for multi-touch — implemented in PR #21
- CSS env() safe area insets — probed in PhaserViewport adapter
- `touch-action: none` on game surface — applied in HTML hardening
- iOS 26 home screen change — sites open as web apps by default, increases PWA importance
- Screen Wake Lock API — landed across all major browsers including Safari and Firefox
- Page Visibility API — standard, well-supported, critical for mobile game sessions
- WCAG 2.2 target sizing — 44px minimum, 48dp Android guidance
