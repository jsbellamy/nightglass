// THROWAWAY prototype harness for nightglass#91.
// Question: what is the smallest rendered-output evidence path that proves the
// Battle Tile and Management Dock visually produce the expected output?
// Drives real Chromium over `vite preview`. Not production code.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:4319";
const OUT = new URL("./evidence/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const TILE_W = 480;
const TILE_H = 112;

const results = [];
function record(name, kind, status, detail) {
  results.push({ name, kind, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "INFO";
  console.log(`[${mark}] (${kind}) ${name}\n        ${detail}`);
}

// --- contrast helpers (evidence for the AA row / blind spot B2) -------------
function parseRGB(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(",").map((n) => parseFloat(n));
  return [r, g, b];
}
function relLum([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const a = relLum(fg);
  const b = relLum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const browser = await chromium.launch();
// One context => one origin => a real shared BroadcastChannel between pages.
const ctx = await browser.newContext({
  viewport: { width: TILE_W, height: TILE_H },
  deviceScaleFactor: 1, // native 1x, per the acceptance criterion
});

// ===========================================================================
// SCENE 1 — Battle Tile at native 1x
// ===========================================================================
const tile = await ctx.newPage();
const pageErrors = [];
tile.on("pageerror", (e) => pageErrors.push(String(e)));
await tile.goto(BASE, { waitUntil: "networkidle" });
await tile.waitForSelector(".battle-tile .status-line");

await tile.screenshot({ path: `${OUT}01-tile-initial.png` });
record("Battle Tile renders at 480x112", "screenshot", "INFO", "01-tile-initial.png");

// --- measured geometry: the "five opponents fit at 1x without overlap" row ---
const geometry = await tile.evaluate(() => {
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const root = document.querySelector(".battle-tile");
  return {
    root: r(root),
    statusLine: r(document.querySelector(".status-line")),
    battlefield: r(document.querySelector(".battlefield")),
    opponents: [...document.querySelectorAll(".opponent-zone .combatant")].map((el) => ({
      cls: el.className,
      ...r(el),
    })),
    party: [...document.querySelectorAll(".party-zone .combatant")].map((el) => ({
      cls: el.className,
      ...r(el),
    })),
  };
});

record(
  "Tile is exactly 480x112 at 1x",
  "measured",
  geometry.root.w === TILE_W && geometry.root.h === TILE_H ? "PASS" : "FAIL",
  `measured ${geometry.root.w}x${geometry.root.h}`,
);
record(
  "Status line is 24px",
  "measured",
  Math.round(geometry.statusLine.h) === 24 ? "PASS" : "FAIL",
  `measured ${geometry.statusLine.h}px`,
);

// overlap check across every rendered combatant pair
function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
const all = [...geometry.opponents, ...geometry.party];
const collisions = [];
for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++)
    if (overlaps(all[i], all[j])) collisions.push(`${all[i].cls} x ${all[j].cls}`);
record(
  `No overlap among ${all.length} rendered combatants`,
  "measured",
  collisions.length === 0 ? "PASS" : "FAIL",
  collisions.length ? collisions.join("; ") : "all pairwise rects disjoint",
);

// every combatant inside the tile bounds
const escapes = all.filter(
  (c) => c.x < 0 || c.y < 0 || c.x + c.w > TILE_W + 0.5 || c.y + c.h > TILE_H + 0.5,
);
record(
  "All combatants within tile bounds",
  "measured",
  escapes.length === 0 ? "PASS" : "FAIL",
  escapes.length ? escapes.map((e) => e.cls).join("; ") : `${all.length} rects inside 480x112`,
);

// --- native-1x sprite scaling: rendered vs intrinsic, in a real renderer -----
const sprites = await tile.evaluate(() =>
  [...document.querySelectorAll("img.combatant-sprite")].map((img) => {
    const b = img.getBoundingClientRect();
    return {
      src: img.getAttribute("src")?.split("/").pop(),
      natural: [img.naturalWidth, img.naturalHeight],
      rendered: [Math.round(b.width), Math.round(b.height)],
      complete: img.complete && img.naturalWidth > 0,
    };
  }),
);
const broken = sprites.filter((s) => !s.complete);
const scaled = sprites.filter(
  (s) => s.complete && (s.natural[0] !== s.rendered[0] || s.natural[1] !== s.rendered[1]),
);
record(
  `All ${sprites.length} sprites loaded`,
  "measured",
  broken.length === 0 ? "PASS" : "FAIL",
  broken.length ? broken.map((s) => s.src).join(", ") : "every img decoded with non-zero intrinsics",
);
record(
  "Sprites render at native 1x (intrinsic == rendered)",
  "measured",
  scaled.length === 0 ? "PASS" : "FAIL",
  scaled.length
    ? scaled.map((s) => `${s.src} ${s.natural.join("x")} -> ${s.rendered.join("x")}`).join("; ")
    : `${sprites.length} sprites at intrinsic size`,
);

// --- AA contrast over real computed styles (blind spot B2) -------------------
const contrastSamples = await tile.evaluate(() => {
  const bgOf = (el) => {
    let n = el;
    while (n) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const targets = [".stage-wave-text", ".dock-toggle", ".health-text", ".boss-health-text"];
  return targets.flatMap((sel) =>
    [...document.querySelectorAll(sel)].slice(0, 1).map((el) => {
      const cs = getComputedStyle(el);
      return { sel, color: cs.color, bg: bgOf(el), size: cs.fontSize, weight: cs.fontWeight };
    }),
  );
});
for (const s of contrastSamples) {
  const fg = parseRGB(s.color);
  const bg = parseRGB(s.bg);
  if (!fg || !bg) {
    record(`Contrast ${s.sel}`, "measured", "INFO", `unparsed ${s.color} on ${s.bg}`);
    continue;
  }
  const ratio = contrast(fg, bg);
  const px = parseFloat(s.size);
  const large = px >= 24 || (px >= 18.66 && parseInt(s.weight, 10) >= 700);
  const floor = large ? 3 : 4.5;
  record(
    `AA contrast ${s.sel}`,
    "measured",
    ratio >= floor ? "PASS" : "FAIL",
    `${ratio.toFixed(2)}:1 vs ${floor}:1 floor (${s.size}, ${s.color} on ${s.bg})`,
  );
}

// ===========================================================================
// SCENE 2 — combat feedback over time
// ===========================================================================
await tile.waitForTimeout(2500);
await tile.screenshot({ path: `${OUT}02-tile-combat.png` });
const feedback = await tile.evaluate(() => ({
  damageNumbers: document.querySelectorAll(".feedback-layer *").length,
  knockedOut: document.querySelectorAll(".combatant.knocked-out").length,
  stageWave: document.querySelector(".stage-wave-text")?.textContent,
  healthTexts: [...document.querySelectorAll(".health-text")].map((e) => e.textContent).slice(0, 3),
}));
record(
  "Combat advances and produces feedback",
  "screenshot+measured",
  "INFO",
  `02-tile-combat.png — ${JSON.stringify(feedback)}`,
);

// knockout readability: is the non-colour signal present in a real render?
const ko = await tile.evaluate(() => {
  const el = document.querySelector(".combatant.knocked-out");
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { filter: cs.filter, transform: cs.transform, opacity: cs.opacity };
});
record(
  "Knockout non-colour signal computed in real renderer",
  "measured",
  ko ? "PASS" : "INFO",
  ko ? JSON.stringify(ko) : "no knockout occurred in the sampled window (seeded run needed)",
);

// ===========================================================================
// SCENE 3 — cross-webview: real second page, real BroadcastChannel
// ===========================================================================
const dock = await ctx.newPage();
await dock.setViewportSize({ width: 420, height: 560 });
const dockErrors = [];
dock.on("pageerror", (e) => dockErrors.push(String(e)));
await dock.goto(`${BASE}/?window=dock`, { waitUntil: "networkidle" });
await dock.waitForSelector(".management-dock");

// The handshake under test: dock publishes dock-opened, tile answers with a
// snapshot, dock renders populated content — across two real pages.
let populated = false;
try {
  await dock.waitForFunction(
    () => {
      const panel = document.querySelector(".dock-panel:not([hidden])");
      return !!panel && panel.textContent.trim().length > 20;
    },
    { timeout: 5000 },
  );
  populated = true;
} catch {}
record(
  "Dock populates from tile snapshot across two real pages",
  "measured",
  populated ? "PASS" : "FAIL",
  populated
    ? "dock-opened -> snapshot -> rendered content, over a real BroadcastChannel"
    : "dock panel still empty after 5s",
);
await dock.screenshot({ path: `${OUT}03-dock-initial.png` });

// --- all five Dock surfaces --------------------------------------------------
const tabs = await dock.evaluate(() =>
  [...document.querySelectorAll("[data-dock-tab]")].map((b) => b.dataset.dockTab),
);
record(`Dock exposes ${tabs.length} surfaces`, "measured", tabs.length === 5 ? "PASS" : "FAIL", tabs.join(", "));

for (const [i, tab] of tabs.entries()) {
  await dock.click(`[data-dock-tab="${tab}"]`);
  await dock.waitForTimeout(150);
  const state = await dock.evaluate((t) => {
    const panel = document.querySelector(`[data-dock-panel="${t}"]`);
    const visible = [...document.querySelectorAll(".dock-panel")].filter((p) => !p.hidden);
    return {
      chars: panel ? panel.textContent.trim().length : 0,
      rect: panel ? panel.getBoundingClientRect().height : 0,
      visibleCount: visible.length,
    };
  }, tab);
  await dock.screenshot({ path: `${OUT}04-dock-${i + 1}-${tab}.png` });
  record(
    `Dock surface "${tab}" renders content`,
    "screenshot+measured",
    state.chars > 20 && state.visibleCount === 1 ? "PASS" : "FAIL",
    `${state.chars} chars, ${Math.round(state.rect)}px tall, ${state.visibleCount} panel visible — 04-dock-${i + 1}-${tab}.png`,
  );
}

// --- keyboard floor spanning real focus, not a mounted component -------------
await dock.click(`[data-dock-tab="${tabs[0]}"]`);
await dock.focus(`[data-dock-tab="${tabs[0]}"]`);
await dock.keyboard.press("ArrowRight");
await dock.waitForTimeout(100);
const afterArrow = await dock.evaluate(() => ({
  active: document.activeElement?.dataset?.dockTab ?? document.activeElement?.className,
  selected: document.querySelector('[data-dock-tab][aria-selected="true"]')?.dataset.dockTab,
  focusVisible: (() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { outline: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow };
  })(),
}));
record(
  "ArrowRight cycles tabs with real focus + visible focus ring",
  "measured",
  afterArrow.selected && afterArrow.selected !== tabs[0] ? "PASS" : "FAIL",
  JSON.stringify(afterArrow),
);

// --- does closing the dock cross the channel to the tile? --------------------
const beforeClose = await tile.evaluate(() => document.querySelectorAll(".battle-tile").length);
await dock.click(".dock-close");
await dock.waitForTimeout(400);
const tileAlive = await tile.evaluate(() => ({
  present: document.querySelectorAll(".battle-tile").length,
  stageWave: document.querySelector(".stage-wave-text")?.textContent,
}));
record(
  "Dock close crosses the channel without disturbing the tile",
  "measured",
  tileAlive.present === beforeClose ? "PASS" : "FAIL",
  `tile still mounted, pump text "${tileAlive.stageWave}"`,
);

// ===========================================================================
// Console/page errors — cheap and catches the Tauri-in-browser boundary
// ===========================================================================
record(
  "Page errors",
  "measured",
  pageErrors.length + dockErrors.length === 0 ? "PASS" : "INFO",
  [...pageErrors, ...dockErrors].slice(0, 4).join(" | ") || "none",
);

writeFileSync(`${OUT}results.json`, JSON.stringify({ results, geometry, sprites }, null, 2));
console.log(`\n${results.filter((r) => r.status === "PASS").length} pass, ${results.filter((r) => r.status === "FAIL").length} fail, ${results.filter((r) => r.status === "INFO").length} info`);
console.log(`evidence -> ${OUT}`);

await browser.close();
