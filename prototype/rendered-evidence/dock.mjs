// Dock surfaces at the REAL window geometry (DOCK_WIDTH x DOCK_HEIGHT = 480x336).
import { chromium } from "playwright";
const OUT = new URL("./evidence/", import.meta.url).pathname;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 480, height: 112 }, deviceScaleFactor: 1 });
const tile = await ctx.newPage();
await tile.goto("http://localhost:4319", { waitUntil: "networkidle" });
await tile.waitForSelector(".battle-tile");

const dock = await ctx.newPage();
await dock.setViewportSize({ width: 480, height: 336 });
await dock.goto("http://localhost:4319/?window=dock", { waitUntil: "networkidle" });
await dock.waitForSelector(".management-dock");
await dock.waitForTimeout(600);

// do the five tabs fit on one row at the real width?
const tabFit = await dock.evaluate(() => {
  const list = document.querySelector(".dock-tabs");
  const tabs = [...document.querySelectorAll("[data-dock-tab]")];
  const lr = list.getBoundingClientRect();
  return {
    listWidth: +lr.width.toFixed(1),
    scrollWidth: list.scrollWidth,
    clipped: tabs
      .filter((t) => t.getBoundingClientRect().right > lr.right + 0.5)
      .map((t) => t.dataset.dockTab),
    rows: new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().y))).size,
  };
});
console.log("tab fit @480:", JSON.stringify(tabFit));

// does the shell fill the window, and does the surface scroll rather than clip?
const shell = await dock.evaluate(() => {
  const s = document.querySelector(".dock-shell");
  const sr = s.getBoundingClientRect();
  const surf = document.querySelector(".dock-surface");
  const cs = surf ? getComputedStyle(surf) : null;
  return {
    shell: `${sr.width.toFixed(0)}x${sr.height.toFixed(0)}`,
    fillsWindow: Math.round(sr.height) >= 336,
    surfaceOverflowY: cs?.overflowY,
    surfaceScrollable: surf ? surf.scrollHeight > surf.clientHeight : null,
    bodyOverflow: document.body.scrollHeight,
  };
});
console.log("shell:", JSON.stringify(shell));

const tabs = await dock.evaluate(() =>
  [...document.querySelectorAll("[data-dock-tab]")].map((t) => t.dataset.dockTab),
);
for (const [i, t] of tabs.entries()) {
  await dock.click(`[data-dock-tab="${t}"]`);
  await dock.waitForTimeout(150);
  await dock.screenshot({ path: `${OUT}06-dock480-${i + 1}-${t}.png` });
}
console.log("wrote 06-dock480-*.png for:", tabs.join(", "));
await b.close();
