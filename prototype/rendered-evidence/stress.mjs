// Can a harness force an arbitrary Engine state purely over the bus,
// with no production test hook? This is the decisive question for #91.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = new URL("./evidence/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 480, height: 112 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto("http://localhost:4319", { waitUntil: "networkidle" });
await p.waitForSelector(".battle-tile");

// Inject a command from a *third* participant on the channel — the harness
// itself acting as a bus peer, exactly as the Dock does.
const stage = process.argv[2] ?? "stage-3";
await p.evaluate((stageId) => {
  const ch = new BroadcastChannel("nightglass");
  ch.postMessage({ type: "command", command: { cmd: "selectStage", args: [stageId] } });
}, stage);

// wait until a five-opponent wave is on screen
let reached = false;
try {
  await p.waitForFunction(() => document.querySelectorAll(".opponent-zone .combatant").length >= 5, {
    timeout: 20000,
  });
  reached = true;
} catch {}

const geo = await p.evaluate(() => {
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  };
  const opp = [...document.querySelectorAll(".opponent-zone .combatant")];
  return {
    count: opp.length,
    stressLayout: !!document.querySelector(".battlefield.opponent-stress-layout"),
    stageWave: document.querySelector(".stage-wave-text")?.textContent,
    rects: opp.map((e) => ({ cls: e.className.replace("combatant opponent facing-left ", ""), ...r(e) })),
    party: [...document.querySelectorAll(".party-zone .combatant")].map((e) => r(e)),
  };
});

console.log(`bus-injected selectStage(${stage}) -> reached 5 opponents: ${reached}`);
console.log(JSON.stringify(geo, null, 2));

const ov = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
const all = [...geo.rects, ...geo.party];
const hits = [];
for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++) if (ov(all[i], all[j])) hits.push([i, j]);
console.log(`overlaps among ${all.length}: ${hits.length ? JSON.stringify(hits) : "none"}`);

const escaped = all.filter((c) => c.x < 0 || c.x + c.w > 480.5 || c.y + c.h > 112.5);
console.log(`out of bounds: ${escaped.length ? JSON.stringify(escaped) : "none"}`);

await p.screenshot({ path: `${OUT}05-tile-five-opponents.png` });
console.log("-> 05-tile-five-opponents.png");
await b.close();
