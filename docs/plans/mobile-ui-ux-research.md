---
title: Mobile Web Platform Research
category: plans
component: viewport
status: reference
last_updated: 2026-03-09
tags: [mobile, viewport, touch, pwa, accessibility]
priority: high
---

# Mobile web platform decisions for Wyn der Schrank in March 2026

## Executive synthesis

Your core architectural stance—domain logic isolated behind ports, scenes kept view-thin, and input flowing through a single `IInputProvider` abstraction—maps unusually well to “next-level” mobile web delivery because it lets you add web-specific surface area (DOM, CSS safe areas, PWA shell, pointer-event nuance) without contaminating gameplay logic. This is exactly the kind of separation that reduces long-term mobile maintenance risk as browsers evolve. citeturn7search4turn0search20

The most “expert-aligned” direction in March 2026 is to treat mobile as a first-class web app surface, not as “desktop controls but smaller.” Concretely:

- Implement touch as a **DOM-based virtual-button layer** that drives the same `ActionKey` edges (pressed / released) your platformer controller already needs, and do it with **Pointer Events** + **pointer capture** to make multi-touch reliable under real browser behaviors. citeturn7search4turn2search6turn2search30  
- Harden the HTML shell around **safe areas** and browser gesture interference using standards like `viewport-fit=cover`, CSS `env(safe-area-inset-*)`, `touch-action`, and `overscroll-behavior`. citeturn0search9turn0search1turn0search0turn1search2  
- Refactor in-canvas UI placement to your `safeZone` and make touch targets meet accessibility minima (WCAG 2.2’s target sizing) while aiming for platform comfort targets (44pt iOS, 48dp Android guidance). citeturn0search2turn1search12turn1search1  
- Wire the remaining resize pipeline pieces using the engine’s intended scaling API (`setGameSize` under FIT-like scaling) and treat mobile browser UI dynamics as first-order (Visual Viewport changes are real resize signals). citeturn0search3turn3search6turn3search0  
- Package and polish as a web app: manifest + install path + offline reliability, and recognize that iOS home-screen behavior materially changed recently (sites added to Home Screen opening as web apps by default in iOS/iPadOS “26” per WebKit’s 2025 documentation). citeturn6search2turn6search20turn6search5  

A situational note on engine maturity: as of Dec 23, 2025, entity["organization","Phaser","html5 game framework"] 4.0 remained in “Release Candidate 6,” and the public docs refer to the 4.0.0-rc.6 API as unreleased, pointing developers to a 3.x stable line for “up-to-date” documentation. That doesn’t invalidate your choice, but it increases the value of your clean port boundaries and DI wiring because mobile quirks often surface first during RC-to-stable transitions. citeturn8search1turn8search15turn8search6  

## Touch controls built for platformers

The web-standard “expert” move in 2026 is to unify touch, mouse, and stylus interactions under **Pointer Events** rather than maintaining separate touch/mouse stacks. The W3C spec is explicitly designed to provide a single hardware-agnostic event model (`pointerdown`, `pointermove`, `pointerup`) across devices. citeturn7search4turn2search2  

That choice directly supports your “platformer-specific” requirements:

- **Discrete actions** (jump/attack/interact/pause) map cleanly to a button-down / button-up edge model.  
- **Multi-touch** (hold left while tapping jump) becomes straightforward if each button tracks `pointerId` ownership and you guard against cancellation conditions. The Pointer Events model explicitly supports multi-touch via multiple pointers. citeturn7search11turn7search0  

### Why DOM overlay is the higher-trust approach

Your draft recommendation (“DOM overlay, not in-world sprites”) is consistent with how FIT-style scaling works: the engine’s scale system commonly keeps a fixed logical game size and then scales the canvas via CSS to fit the available parent space. Under that model, “world-space controls” can become visually and physically too small because they shrink with the canvas, while mobile usability is governed by **CSS pixels** and finger geometry, not your world units. citeturn0search7turn0search3  

Using DOM buttons also unlocks browser-native primitives you genuinely need for modern phones: safe-area padding via `env()`, pointer-capture, easy `touch-action` control, and per-element `pointer-events` behavior. citeturn0search1turn2search6turn0search12turn0search0  

### The interaction model that avoids “stuck buttons”

Mobile browsers can cancel pointer streams in ways that create sticky movement if you don’t explicitly handle them. In particular, a `pointercancel` can fire if the pointer is commandeered for viewport manipulation (panning/zooming/scrolling) after `pointerdown`. citeturn2search30  

Two standards-based tactics reduce this risk:

1. Apply `touch-action: none` to the control surface so the browser doesn’t interpret touches as scroll/zoom gestures in the first place. MDN explicitly calls out disabling gestures on elements such as “a map or game surface.” citeturn0search0turn0search20  
2. When a finger goes down on a specific button, call `setPointerCapture(pointerId)` on that button so subsequent events for that pointer stay targeted at the same element until release (or until the UA implicitly releases capture). citeturn2search6turn2search10turn2search30  

A practical “edge semantics” mapping (aligned to your `justPressed` / `justReleased` design) is therefore:

- On `pointerdown`: mark `down=true`, and if previously `down=false` set `justPressed=true` for that frame.  
- On `pointerup` **or** `pointercancel`: mark `down=false`, and if previously `down=true` set `justReleased=true` for that frame. citeturn2search14turn2search10turn2search30  

To drive “auto mode,” using `PointerEvent.pointerType` gives you an evidence-based signal (`"touch"`, `"mouse"`, `"pen"`) without relying on fragile UA sniffing. citeturn7search0turn7search6  

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["mobile platformer virtual buttons overlay","mobile game on-screen controls d-pad jump attack","CSS safe area inset iPhone notch web app"],"num_per_query":1}

## Safe areas and browser-gesture hardening in the HTML shell

The “mobile web app” experience lives and dies in the HTML shell. For 2026-quality results, you want to prevent accidental browser UI behaviors from stealing input, and you want all UI (including your DOM overlay) to respect modern device cutouts.

### Safe areas and full-bleed layout

WebKit’s guidance around iPhone X-era notches introduced the modern approach: add `viewport-fit=cover` to allow content behind rounded corners / sensor housings, then use CSS safe-area insets to pad UI away from unsafe regions. citeturn0search9turn3search2  

On the CSS side, `env()` is the standardized way to read environment variables like safe-area insets. citeturn0search1  

In practice, you typically anchor overlay UI with something like `padding: env(safe-area-inset-top) env(safe-area-inset-right) …`, which keeps your bottom HUD and controls off the home-indicator region. citeturn0search9turn0search1  

### Preventing scroll-chaining and gesture interruption

Two CSS primitives matter most for a web game:

- `touch-action`: declaratively tells the browser what default touch behaviors (panning/zooming) are allowed. Setting `touch-action: none` prevents the browser from handling those gestures on that element, which is exactly what you want on a game canvas or control layer. citeturn0search0turn0search20  
- `overscroll-behavior`: controls scroll chaining and pull-to-refresh style effects on scroll containers. MDN documents it specifically as a way to remove “pull to refresh”-type behavior and scroll chaining. citeturn1search2turn1search26  

For DOM overlays, `pointer-events` is the core mechanism that lets your overlay container be visually present while still allowing the canvas to receive pointer input everywhere except the actual buttons. citeturn0search12  

### Eliminating selection and tap-flash artifacts

Two widely used mobile-web polish settings:

- `user-select: none` prevents accidental text selection; MDN documents it as controlling whether the user can select text. Note that cross-browser support can require vendor prefixes depending on target browsers, so treat it as progressive enhancement and test on your supported matrix. citeturn2search1turn2search37  
- `-webkit-tap-highlight-color` is a non-standard property for controlling the highlight shown when tapping links; MDN documents it, and Apple’s Safari content guidance describes using an alpha of 0 to disable the highlight. citeturn3search7turn3search22  

### Zoom and accessibility tradeoffs

It’s common for web games to try to disable zoom via viewport meta settings, but MDN explicitly warns that setting `user-scalable=no` prevents users with low vision from zooming, and ties this to WCAG expectations about minimum scaling. citeturn4search2turn4search22  

A defensible “expert” compromise for a game is: avoid disabling zoom globally when you can, and instead prevent gesture-zoom specifically on the game surface using `touch-action: none` (so the page can remain standards-compliant in other contexts, like your marketing pages), while providing in-game UI scaling / readability controls if you do need to block zoom for gameplay stability. citeturn0search0turn4search22  

## Responsive UI and accessibility inside the game

You already built the hard part (world sizing + safe zone + font scaling). The remaining question is how to align your scene UI and menus with mobile accessibility expectations without breaking your scene flow.

### Safe-zone anchoring as the canonical layout basis

The high-confidence approach is to treat `safeZone` as the single coordinate system for all “must be visible” UI, because the entire notch/safe-area ecosystem assumes that the render surface can extend behind system UI but interactive controls should not. WebKit’s safe-area model and CSS `env()` exist to solve exactly this mismatch between physical display and safe content. citeturn0search9turn0search1  

Your plan—reposition scene UI on resize using a viewport provider hook—is consistent with the web platform reality that the visual viewport can change when the browser UI changes (address bar, pinch zoom, keyboard), even if the layout viewport is stable. citeturn3search6turn3search0  

### Touch target sizing and “menu button” hit areas

For mobile UX, the strongest “expert” evidence comes from accessibility standards and platform guidelines:

- WCAG 2.2 includes **Target Size (Minimum)**, intended to reduce mis-taps and improve activation for users with limited dexterity. citeturn0search2turn4search8  
- entity["company","Apple","consumer electronics company"]’s design guidance recommends hit targets of at least 44pt × 44pt for accurate tapping. citeturn1search12  
- entity["company","Google","technology company"]’s Android accessibility guidance recommends touch targets of 48×48dp (roughly ~9mm physical size) for reliable interaction. citeturn1search1  

These sources align with your diagnosis: text-only interactive labels whose hit area is just glyph bounds will become too small once FIT scaling reduces the effective rendered size. citeturn0search7turn0search3  

Your recommended fix—rectangle-backed buttons with expanded hit areas—aligns better with WCAG target sizing than relying on tight text hitboxes, and it avoids mixing DOM navigation into scene flow. citeturn0search2turn1search12  

### Supporting multiple input mechanisms

Keeping keyboard active even when touch controls are shown is not just pragmatism; it lines up with accessibility guidance about allowing users to use and switch between input mechanisms. WCAG’s **Concurrent Input Mechanisms** intent is explicitly about allowing combinations like keyboard + touch/pointer without restricting users. citeturn4search0turn4search8  

At the same time, input-modality detection is messy on hybrid devices. Using media queries like `(pointer: coarse)` / `(hover: none)` can help, but real-world reporting can be inconsistent on some platforms, so a “first pointerdown pointerType wins” approach is often more robust for deciding when to reveal touch UI while still keeping keyboard enabled. citeturn3search9turn3search32turn7search0  

## Resizing and camera stability under real mobile viewports

### Treat resize as a frequent, legitimate runtime event

On mobile web, resizing is not rare: dynamic browser UI (collapsing address bars), pinch zoom, and other UI changes can resize the **visual viewport**. MDN’s viewport documentation explains the distinction and notes that the visual viewport can change while the layout viewport is unchanged. citeturn3search6turn3search0  

This justifies your plan to have scenes subscribe to viewport resize events and reposition UI accordingly. citeturn3search0  

### Updating the game canvas size correctly in FIT-style scaling

Your note that `game.scale.setGameSize()` needs to be called on resize is consistent with Phaser’s own documentation: `setGameSize(width, height)` is the intended way to change the base game size when using scaling modes like FIT. citeturn0search3  

Because the scale manager approach often operates by setting the canvas to a fixed logical size and then scaling via CSS, you should assume the DOM control layer must be resilient to CSS-space changes as well (again reinforcing DOM overlay). citeturn0search7turn0search3  

### Debouncing and event storms

The “100ms debounce” guidance you referenced is directionally consistent with the fact that viewport changes can fire in bursts (orientation rotation, browser chrome collapsing). While the exact debounce value depends on your tolerance for UI latency during rotation, using `requestAnimationFrame` scheduling or a short debounce window is a common way to avoid repeated relayout thrash when mobile browsers emit multiple size changes. The underlying reason—visual viewport changes can be rapid and sequential—is documented in MDN’s VisualViewport overview examples. citeturn3search0turn3search4  

Camera-wise, your conclusion is sound: widening the viewport simply increases peripheral visibility; the actual playable space is still tilemap bounds. The important part is updating camera viewport dimensions and bounds when the scale changes, not changing physics world bounds if your collision world is tilemap-defined. citeturn0search3  

## “Next-level” web app experience for mobile players

This section is about shipping a web game that feels like a platform app in 2026, not a webpage.

### Installability, manifest, and iOS changes you should design for

The standards baseline is the W3C Web Application Manifest specification: a JSON manifest centralizes metadata like name, icons, and preferred start URL. citeturn6search5  

In the broader PWA ecosystem, installability is still widely tied to having a manifest and being served over HTTPS (or localhost in development). MDN documents HTTPS as required for installability, and web.dev describes install criteria (manifest presence, icons, engagement heuristics) used by Chromium-based browsers. citeturn2search15turn2search19turn6search3  

Testing reality check: web.dev specifically notes that Safari doesn’t provide the same manifest debugging tooling, so iOS/iPadOS testing still tends to be “try installing on device.” citeturn6search7  

The most consequential iOS-facing update for web-app shipping is WebKit’s 2025 documentation that iOS/iPadOS “26” changed Home Screen behavior: **every site added to the Home Screen opens as a web app by default**, with a user-facing “Open as Web App” toggle to opt out. That reduces the historical penalty for sites that weren’t perfectly configured, but it also increases the importance of executing well on web-app polish because more users will experience your game in that context. citeturn6search2turn6search6  

For user instructions and UX copy, Apple’s end-user support flow remains “Add to Home Screen” in Safari to open a site “as if it’s an app.” citeturn6search20  

### Icons, splash, and Apple-specific compatibility

Even with modern manifest support, Apple’s platform has long supported web-app configuration through Apple-specific meta tags (e.g., enabling standalone mode via `apple-mobile-web-app-capable`) and `window.navigator.standalone` detection. The archived Safari Web Content Guide documents this behavior. citeturn6search25  

For manifests specifically, Safari 15.4 release notes documented support for Web App Manifest icons (including conditions around `purpose` and when no `apple-touch-icon` is provided). If you want your 2026 delivery to be resilient across a range of Apple OS versions, it’s reasonable to ship both manifest icons and Apple touch icons as progressive enhancement. citeturn6search19turn6search5  

### Offline reliability and startup performance

From an “app-feel” perspective, the single most noticeable win for a mobile web game is consistent startup under flaky connectivity. In practice, that usually means a service worker caching strategy appropriate for large immutable assets (art/audio bundles) and a manifest providing a clean standalone display mode. The platform-level guidance across MDN and web.dev consistently treats service workers and manifests as core PWA building blocks; Microsoft’s guidance also notes that while a service worker may be optional for installation in some contexts, it is recommended to make the app faster and more reliable offline. citeturn2search15turn2search27turn2search39  

### Session UX polish: wake lock and background pausing

Two web APIs matter disproportionately for a mobile game:

- **Screen Wake Lock API**: prevents the device from dimming/locking during play sessions. MDN documents the intent and the `navigator.wakeLock.request()` flow, and web.dev reports the API landing across major browsers (including Safari and Firefox). citeturn9search0turn9search5turn9search27  
- **Page Visibility API**: lets you pause or throttle when the page becomes hidden (tab switch, app switch on mobile). MDN documents both the API and the `visibilitychange` event pattern. citeturn9search2turn9search3turn9search10  

These two together reduce rage-quit moments: the screen won’t turn off mid-level, and you won’t keep simulating when the user can’t see the game. citeturn9search0turn9search2  

### Optional “next level” capability: web push for installed web apps

If you eventually want re-engagement (events, daily challenges), iOS is no longer a hard blocker: WebKit documents that iOS/iPadOS 16.4 added Web Push support for web apps added to the Home Screen, using Push API + Notifications API + service workers, and Apple’s Safari 16.4 release notes explicitly call out Web Push support in home-screen web apps. citeturn10search0turn10search3turn10search7  

For a platformer, push is not a launch requirement—but it’s now a credible “future-facing” capability you can design space for in your ports/adapters without committing to it immediately. citeturn10search1turn10search0
