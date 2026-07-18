# Research the SideScape foundation

Type: research
Status: resolved
Blocked by: none

## Question

Which SideScape windowing, headless Engine, save, Offline Progress, testing, asset-build, Tauri configuration, and macOS/Windows release-workflow patterns should be reused, adapted, or deliberately rejected for this separate application?

## Answer

Research asset: [SideScape foundation research](../research/sidescape-foundation.md), based on the local SideScape source at commit `190e020`.

Use SideScape as an architectural reference and release scaffold, not as a codebase fork:

- Reuse the caller-pumped, UI-free Simulation Engine shape; injected RNG and clock; command/Snapshot/Presentation Event boundary; tolerant field-by-field save reconstruction; pre-mount Offline Progress calculation; pure window-geometry functions behind platform ports; asset registries and validators; Vitest/Playwright/Rust checks; and macOS/Windows Tauri Action release matrix.
- Adapt all timing and domain details for independent continuous Action Cycles, Party/Formation/Stage state, separate combat and persisted loot RNG streams, Wave-boundary edits, a versioned save schema, accelerated Offline Progress that commits rewards then starts a fresh visible Stage Attempt, `32×48` Character animation manifests with separate Ability effects, and the fixed `480×112` Battle Tile plus its still-to-be-prototyped fan-out.
- Reject wholesale reuse of SideScape's Engine/domain modules, 600 ms Tick, eight-hour/48,000-Tick constant, save key/shape, geometry constants, square sprite registry and palette transforms, or art. Do not begin with its AppKit/WebKit transition overlay, macOS private APIs, global Tauri API, null CSP, broad opener permission, or unused scaffold command; add native workarounds and capabilities only when the new app demonstrates a need.
- Reuse the release workflow's semantic bump, version stamping, cached dual-platform build, Windows NSIS, and draft release patterns after renaming every identifier. Add the new project's complete CI gate and artifact smoke checks, choose its supported Node major deliberately, and avoid treating a tag as an irreversible source of truth before both platform builds succeed unless a documented retry path exists. Signing/notarization can follow when distribution expands beyond unsigned personal builds.

The next simulation prototype should prove that one seeded Stage yields identical Snapshot and Presentation Events under live advancement, accelerated advancement, save/reload, and Offline Progress, while keeping the Engine unaware of DOM, Tauri, audio, timers, and animation assets.
