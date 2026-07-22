# Vertical slice sign-off checklist (§10 / §12)

Manual measurements for budgets the automated suite does not fully enforce. Tick each row after recording the observed value on the stated platform. Expected bounds come from `docs/vertical-slice-spec.md` §10.

## Performance

- [ ] **Battle Tile frame cap (~30 fps)** — **Measure:** macOS or Windows, `npm run tauri dev`, Activity Monitor / Task Manager while a Stage Attempt is visible and the Dock is closed; sample the Battle Tile webview process for ~30 s. **Expected:** sustained rendering stays at or below ~30 fps (no uncapped 60 fps burn on the tile).
- [ ] **Sustained CPU (<5% of one core)** — **Measure:** same session, Dock closed, fight visible, sample CPU for ~60 s. **Expected:** <5% of one logical core on Apple Silicon or an equivalent single-core share on Windows.
- [ ] **Memory (<250 MB)** — **Measure:** same session, resident memory of the Nightglass process with tile visible. **Expected:** <250 MB RSS during live combat with Dock closed.
- [ ] **Glass via compositor only** — **Measure:** inspect `src/styles.css` and runtime compositing (no WebGL post-processing shaders); optional Instruments/Core Animation on macOS. **Expected:** frosted glass from CSS/compositor layers only, no GPU post-processing pass.
- [ ] **Hidden heartbeat** — **Measure:** hide/minimize the tile window in `tauri dev`, observe pump/logging or CPU. **Expected:** rendering stops and pumping drops to the slow heartbeat described in §10.

## Accessibility (both platforms)

- [ ] **Keyboard floor (macOS)** — **Measure:** `npm run tauri dev` on macOS; repeat the flows in `e2e/keyboard.spec.ts` with keyboard only. **Expected:** every Dock surface operable; visible focus rings.
- [ ] **Keyboard floor (Windows)** — **Measure:** same on Windows. **Expected:** parity with macOS keyboard flows.
- [ ] **Contrast / reduced motion / colour independence** — **Measure:** `npm run test:evidence` green on CI or locally; orchestrator reviews `e2e-screenshots/` per `docs/agents/acceptance-evidence.md`. **Expected:** Playwright specs in `e2e/` pass on Chromium.

## Assets and simulation

- [ ] **Archived Raw Bundle offline** — **Measure:** clean checkout, no network, `npm run assets:verify`. **Expected:** all contract validators green (Python pipeline gates).
- [ ] **Offline Progress wall time** — **Measure:** `npm test` — `offline progress CI timing budget` in `src/ui/boot.test.ts`. **Expected:** full 8 h cap advances in <2 s wall time on CI hardware class.

## Notes

- Native dock lifecycle (OS close, positioning) remains in `docs/agents/native-observation.md` when `src-tauri/**` changes.
- Rendered evidence automation: `npm run test:evidence`.
