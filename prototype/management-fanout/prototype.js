// PROTOTYPE — Compact management fan-out around the fixed 480×112 Battle Tile.
// Three variants of the management fan-out around the fixed Battle Tile,
// switchable via ?variant=, on a simulated desktop. Throwaway code.

const TILE_W = 480;
const TILE_H = 112;
const GAP = 8;
const EDGE = 10; // simulated screen-edge margin

const VARIANTS = [
  { key: "A", name: "Card Fan" },
  { key: "B", name: "Command Dock" },
  { key: "C", name: "Ledger Spine" },
];

const PARKS = [
  { key: "bottom-center", label: "Bottom centre" },
  { key: "bottom-right", label: "Bottom right corner" },
  { key: "top-center", label: "Top centre" },
  { key: "top-left", label: "Top left corner" },
];

// ---- fake management content (read-only stubs) ----

const ROSTER = [
  { name: "Bram", cls: "Knight", pos: "Front", lv: 4, hp: 0.82, party: true },
  { name: "Liora", cls: "Wizard", pos: "Back", lv: 4, hp: 0.64, party: true },
  { name: "Fen", cls: "Priest", pos: "Middle", lv: 3, hp: 0.91, party: true },
  { name: "Tansy", cls: "Hunter", pos: "Reserve", lv: 3, hp: 1.0, party: false },
];

const SURFACES = {
  party: {
    title: "Party",
    body: () => `
      <h4>Formation</h4>
      ${ROSTER.filter((c) => c.party)
        .map(
          (c) => `<div class="row"><span class="chip on">${c.pos}</span>
            <span>${c.name} · ${c.cls} · Lv ${c.lv}</span>
            <span class="bar"><i style="width:${c.hp * 100}%"></i></span></div>`
        )
        .join("")}
      <h4>Reserve — half Character XP</h4>
      ${ROSTER.filter((c) => !c.party)
        .map(
          (c) => `<div class="row"><span class="chip dim">Reserve</span>
            <span>${c.name} · ${c.cls} · Lv ${c.lv}</span></div>`
        )
        .join("")}`,
  },
  loadout: {
    title: "Loadout",
    body: () => `
      <h4>Bram — Knight</h4>
      <div class="row"><span class="chip">1</span><span>Shield Bash</span></div>
      <div class="row"><span class="chip">2</span><span>Bulwark Stance</span></div>
      <div class="row"><span class="chip">3</span><span>Rallying Cry</span></div>
      <h4>Liora — Wizard</h4>
      <div class="row"><span class="chip">1</span><span>Ember Bolt</span></div>
      <div class="row"><span class="chip">2</span><span>Frost Lattice</span></div>
      <div class="row"><span class="chip">3</span><span>Starfall</span></div>
      <h4>Fen — Priest</h4>
      <div class="row"><span class="chip">1</span><span>Mend</span></div>
      <div class="row"><span class="chip">2</span><span>Ward of Petals</span></div>
      <div class="row"><span class="chip">3</span><span>Lantern Vigil</span></div>`,
  },
  talents: {
    title: "Talents",
    body: () => `
      <h4>Bram — 4 / 6 points</h4>
      <div class="row"><span class="chip on">2</span><span>Stone Discipline</span></div>
      <div class="row"><span class="chip on">2</span><span>Taunting Edge</span></div>
      <div class="row"><span class="chip dim">0</span><span>Iron Bloom (locked)</span></div>
      <h4>Liora — 6 / 6 points</h4>
      <div class="row"><span class="chip on">3</span><span>Kindled Focus</span></div>
      <div class="row"><span class="chip on">3</span><span>Deep Current</span></div>
      <h4>Respec</h4>
      <div class="row"><span>Manual respec allowed between Waves</span></div>`,
  },
  armory: {
    title: "Armory",
    body: () => `
      <h4>Equipped</h4>
      <div class="row"><span class="chip on">Weapon</span><span>Thornwood Blade · Tier I</span></div>
      <div class="row"><span class="chip on">Armor</span><span>Mosscloak Vest · Tier I</span></div>
      <div class="row"><span class="chip dim">Trinket</span><span>—</span></div>
      <h4>Stored</h4>
      <div class="row"><span class="chip">Weapon</span><span>Glowpith Staff · Tier II</span></div>
      <div class="row"><span class="chip">Armor</span><span>Berrysteel Plate · Tier I</span></div>
      <div class="row"><span class="chip">Trinket</span><span>Night-Garden Charm · Tier I</span></div>`,
  },
  stage: {
    title: "Stage",
    body: () => `
      <h4>Progress</h4>
      <div class="row"><span class="chip on">Stage 1</span><span>Cleared</span></div>
      <div class="row"><span class="chip on">Stage 2</span><span>Cleared</span></div>
      <div class="row"><span class="chip">Stage 3</span><span>Wave 2 of 2 + Boss</span></div>
      <h4>Failure Policy</h4>
      <div class="row"><span class="chip on">Retry Stage</span><span class="chip dim">Retreat one Stage</span></div>
      <h4>Offline Progress</h4>
      <div class="row"><span>Capped · summary before fresh Attempt</span></div>`,
  },
};

const SURFACE_KEYS = Object.keys(SURFACES);

// ---- state ----

const params = new URLSearchParams(location.search);
const state = {
  variant: VARIANTS.some((v) => v.key === params.get("variant"))
    ? params.get("variant")
    : "A",
  park: PARKS.some((p) => p.key === params.get("park"))
    ? params.get("park")
    : "bottom-center",
  open: [], // surface keys in open order (A: many, B/C: managed per variant)
  dockTab: "party", // variant B active tab when dock is open
  collapsed: {}, // variant C: surface key -> true when collapsed
};

function setUrl() {
  const q = new URLSearchParams({ variant: state.variant, park: state.park });
  history.replaceState(null, "", `?${q}`);
}

function tileRect() {
  const vw = innerWidth;
  const vh = innerHeight;
  const x = {
    "bottom-center": (vw - TILE_W) / 2,
    "bottom-right": vw - TILE_W - EDGE,
    "top-center": (vw - TILE_W) / 2,
    "top-left": EDGE,
  }[state.park];
  const y = state.park.startsWith("top") ? EDGE : vh - TILE_H - EDGE;
  return { x, y, top: state.park.startsWith("top") };
}

// ---- shared pieces ----

function battleTileHtml(tile) {
  const buttons = SURFACE_KEYS.map((k) => {
    const active =
      state.variant === "B"
        ? state.open.length && state.dockTab === k
        : state.open.includes(k) && !(state.variant === "C" && state.collapsed[k]);
    return `<button class="mgmt-btn ${active ? "active" : ""}" data-surface="${k}">
      ${SURFACES[k].title}</button>`;
  }).join("");
  return `
    <div class="battle-tile" style="left:${tile.x}px;top:${tile.y}px">
      <div class="status-line"><span class="stage">Stage 3 · Wave 2</span>${buttons}</div>
      <div class="battlefield">
        <div class="actor pm pm-knight" style="left:64px"><div class="body"></div><div class="head"></div></div>
        <div class="actor pm pm-priest" style="left:36px;animation-delay:.2s"><div class="body"></div><div class="head"></div></div>
        <div class="actor pm pm-wizard" style="left:8px;animation-delay:.4s"><div class="body"></div><div class="head"></div></div>
        <div class="actor foe" style="right:12px"><div class="body"></div><div class="head"></div></div>
        <div class="actor foe" style="right:46px;animation-delay:.3s"><div class="body"></div><div class="head"></div></div>
        <div class="actor foe" style="right:80px;animation-delay:.6s"><div class="body"></div><div class="head"></div></div>
        <div class="projectile"></div>
        <div class="impact"></div>
      </div>
    </div>`;
}

function cardHtml(key, style, extraClass, w, h, headerExtra = "") {
  const s = SURFACES[key];
  return `
    <section class="mgmt-card ${extraClass}" data-card="${key}" style="${style}">
      <header>${s.title}${headerExtra}
        <span class="dims">${w}×${h}</span>
        <button class="close" data-close="${key}" title="Close">✕</button>
      </header>
      <div class="card-body">${s.body()}</div>
    </section>`;
}

// ---- Variant A: Card Fan — independent floating cards, up to 3 at once ----

const FAN_W = 264;
const FAN_H = 312;
const FAN_MAX = 3;

function variantA(tile) {
  const vw = innerWidth;
  const y = tile.top ? tile.y + TILE_H + GAP : tile.y - FAN_H - GAP;
  // Fan grows rightward from the tile's left edge; clamp the row inside the screen.
  const rowW = state.open.length * (FAN_W + GAP) - GAP;
  let startX = Math.min(tile.x, vw - rowW - EDGE);
  startX = Math.max(EDGE, startX);
  return state.open
    .map((key, i) => {
      const x = startX + i * (FAN_W + GAP);
      return cardHtml(
        key,
        `left:${x}px;top:${y}px;width:${FAN_W}px;height:${FAN_H}px`,
        "",
        FAN_W,
        FAN_H
      );
    })
    .join("");
}

function toggleA(key) {
  if (state.open.includes(key)) {
    state.open = state.open.filter((k) => k !== key);
  } else {
    state.open.push(key);
    if (state.open.length > FAN_MAX) state.open.shift(); // oldest card yields
  }
}

// ---- Variant B: Command Dock — one tile-width tabbed panel ----

const DOCK_H = 336;

function variantB(tile) {
  if (!state.open.length) return "";
  const y = tile.top ? tile.y + TILE_H + GAP : tile.y - DOCK_H - GAP;
  const tabs = SURFACE_KEYS.map(
    (k) => `<button class="${state.dockTab === k ? "active" : ""}" data-tab="${k}">
      ${SURFACES[k].title}</button>`
  ).join("");
  const s = SURFACES[state.dockTab];
  return `
    <section class="mgmt-card" data-card="dock"
      style="left:${tile.x}px;top:${y}px;width:${TILE_W}px;height:${DOCK_H}px">
      <div class="dock-tabs">${tabs}</div>
      <header>${s.title}
        <span class="dims">${TILE_W}×${DOCK_H}</span>
        <button class="close" data-close="dock" title="Close">✕</button>
      </header>
      <div class="card-body">${s.body()}</div>
    </section>`;
}

function toggleB(key) {
  if (state.open.length && state.dockTab === key) {
    state.open = [];
  } else {
    state.open = ["dock"];
    state.dockTab = key;
  }
}

// ---- Variant C: Ledger Spine — accordion column beside the tile ----

const SPINE_W = 300;
const SPINE_HEADER_H = 30;
const SPINE_BODY_H = 190;

function variantC(tile) {
  if (!state.open.length) return "";
  const vw = innerWidth;
  const vh = innerHeight;
  // Column sits beside the tile: right side unless that would leave the screen.
  const rightX = tile.x + TILE_W + GAP;
  const x = rightX + SPINE_W + EDGE <= vw ? rightX : tile.x - SPINE_W - GAP;
  const heights = state.open.map(
    (k) => SPINE_HEADER_H + (state.collapsed[k] ? 0 : SPINE_BODY_H)
  );
  const total = heights.reduce((a, b) => a + b + GAP, -GAP);
  // Grow away from the parked edge, clamped to the screen.
  let y = tile.top ? tile.y : tile.y + TILE_H - total;
  y = Math.max(EDGE, Math.min(y, vh - total - EDGE));
  let cursor = y;
  return state.open
    .map((key, i) => {
      const h = heights[i];
      const html = cardHtml(
        key,
        `left:${x}px;top:${cursor}px;width:${SPINE_W}px;height:${h}px`,
        `spine-section ${state.collapsed[key] ? "collapsed" : ""}`,
        SPINE_W,
        h,
        ` <span class="caret">${state.collapsed[key] ? "▸" : "▾"}</span>`
      );
      cursor += h + GAP;
      return html;
    })
    .join("");
}

function toggleC(key) {
  if (!state.open.includes(key)) {
    state.open.push(key);
    state.collapsed[key] = false;
  } else if (state.collapsed[key]) {
    state.collapsed[key] = false;
  } else {
    state.collapsed[key] = true; // second press collapses; close via ✕
  }
}

// ---- prototype chrome ----

function chromeHtml() {
  const v = VARIANTS.find((v) => v.key === state.variant);
  const parks = PARKS.map(
    (p) => `<option value="${p.key}" ${p.key === state.park ? "selected" : ""}>${p.label}</option>`
  ).join("");
  return `
    <div class="proto-park">Park position <select id="park">${parks}</select></div>
    <div class="proto-switcher">
      <button id="prev">←</button>
      <span class="label">${v.key} — ${v.name}</span>
      <button id="next">→</button>
    </div>`;
}

// ---- render loop ----

function render() {
  const tile = tileRect();
  const fan = { A: variantA, B: variantB, C: variantC }[state.variant](tile);
  document.getElementById("app").innerHTML = `
    <div class="desktop-icon" style="top:70px;right:30px"><div class="glyph"></div>Notes</div>
    <div class="desktop-icon" style="top:160px;right:30px"><div class="glyph"></div>Recycle</div>
    ${fan}
    ${battleTileHtml(tile)}
    ${chromeHtml()}`;
  wire();
}

function cycle(dir) {
  const i = VARIANTS.findIndex((v) => v.key === state.variant);
  state.variant = VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length].key;
  state.open = [];
  state.collapsed = {};
  setUrl();
  render();
}

function wire() {
  document.querySelectorAll("[data-surface]").forEach((b) =>
    b.addEventListener("click", () => {
      ({ A: toggleA, B: toggleB, C: toggleC })[state.variant](b.dataset.surface);
      render();
    })
  );
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.close === "dock") state.open = [];
      else state.open = state.open.filter((k) => k !== b.dataset.close);
      render();
    })
  );
  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      state.dockTab = b.dataset.tab;
      render();
    })
  );
  document.querySelectorAll(".spine-section header").forEach((h) =>
    h.addEventListener("click", (e) => {
      if (e.target.dataset.close) return;
      const key = h.closest("[data-card]").dataset.card;
      state.collapsed[key] = !state.collapsed[key];
      render();
    })
  );
  document.getElementById("prev").addEventListener("click", () => cycle(-1));
  document.getElementById("next").addEventListener("click", () => cycle(1));
  document.getElementById("park").addEventListener("change", (e) => {
    state.park = e.target.value;
    setUrl();
    render();
  });
}

addEventListener("keydown", (e) => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === "ArrowLeft") cycle(-1);
  if (e.key === "ArrowRight") cycle(1);
});

addEventListener("resize", render);
setUrl();
render();
