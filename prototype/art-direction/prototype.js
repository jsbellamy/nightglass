// PROTOTYPE VERDICT: Moonberry Guild selected; this single direction is retained as the concrete art reference.
const direction = {
  name: "Moonberry Guild",
  thesis: "Storybook night-garden",
  copy: "Plump leaf silhouettes, berry-dark linework, stitched hems, and luminous botanical magic.",
  cues: ["plum ink", "mint + berry", "leaf hems", "petal halos"],
  stage: "Lantern Orchard",
  foe: "Pipcap",
};

const classes = ["knight", "wizard", "priest", "hunter"];
const classNames = { knight: "Knight", wizard: "Wizard", priest: "Priest", hunter: "Hunter" };
const state = { foes: 5, paused: false };

function face(ink, skin, x = 9, y = 8, w = 14, h = 13) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${skin}" stroke="${ink}" stroke-width="2"/><path d="M13 15h1m4 0h1" stroke="${ink}" stroke-width="1.5"/>`;
}

function spriteBody(kind) {
  const ink = "#432947", skin = "#f6c9aa", mint = "#86c9a0", berry = "#b65778", moon = "#ffe6a8", lilac = "#c9afe1";
  const common = `<ellipse cx="16" cy="45" rx="10" ry="2" fill="#43294733"/>`;
  if (kind === "knight") return `${common}<path d="M8 42q0-19 8-22 8 3 8 22z" fill="${mint}" stroke="${ink}" stroke-width="2"/><path d="M8 32q8 6 16 0" fill="none" stroke="${berry}" stroke-width="2"/>${face(ink,skin,9,9)}<path d="M8 11Q16 0 24 11l-5-2-3 4-3-4z" fill="${moon}" stroke="${ink}" stroke-width="2"/><path d="M26 21q-6 9 0 20m0-20q6 9 0 20" fill="${lilac}" stroke="${ink}" stroke-width="2"/>`;
  if (kind === "wizard") return `${common}<path d="M6 43q4-24 10-24t11 24z" fill="${berry}" stroke="${ink}" stroke-width="2"/><path d="M9 33q7-4 15 0" fill="none" stroke="${moon}" stroke-width="2"/>${face(ink,skin,9,10)}<path d="M6 12Q10 2 20 2l7 11-10-4-4 4z" fill="${lilac}" stroke="${ink}" stroke-width="2"/><path d="M27 18q-3 10 0 24" stroke="${ink}" stroke-width="3"/><path d="M23 18q4-8 8 0-4 5-8 0z" fill="${mint}" stroke="${ink}" stroke-width="1.5"/>`;
  if (kind === "priest") return `${common}<path d="M7 43q1-20 9-24 8 4 9 24z" fill="${moon}" stroke="${ink}" stroke-width="2"/><path d="M9 30q7 7 14 0M16 22v17" fill="none" stroke="${mint}" stroke-width="2"/>${face(ink,skin,9,9)}<path d="M8 10q8-11 16 0l-5-1-3 4-3-4z" fill="${berry}" stroke="${ink}" stroke-width="2"/><path d="M27 20v21m-4-15q4-7 8 0-4 5-8 0z" fill="${lilac}" stroke="${ink}" stroke-width="2"/>`;
  return `${common}<path d="M7 42q2-21 9-23 7 2 9 23z" fill="${mint}" stroke="${ink}" stroke-width="2"/><path d="M8 31q8-5 16 0" fill="none" stroke="${lilac}" stroke-width="2"/>${face(ink,skin,9,9)}<path d="M7 11Q14 1 25 9l-7 2-4-1-3 3z" fill="${berry}" stroke="${ink}" stroke-width="2"/><path d="M26 19q-11 11 0 22m-3-20l6 18" fill="none" stroke="${ink}" stroke-width="2"/>`;
}

function sprite(kind) {
  return `<svg class="sprite" viewBox="0 0 32 48" width="32" height="48" role="img" aria-label="${classNames[kind]}">${spriteBody(kind)}</svg>`;
}

function foe() {
  return `<svg class="foe" viewBox="0 0 24 32"><ellipse cx="12" cy="29" rx="9" ry="2" fill="#43294733"/><path d="M5 18q0-9 7-9t7 9v9H5z" fill="#d1889f" stroke="#432947" stroke-width="2"/><path d="M3 12q9-9 18 0z" fill="#ffe6a8" stroke="#432947" stroke-width="2"/><path d="M8 19h2m4 0h2" stroke="#432947" stroke-width="2"/></svg>`;
}

function battleTile() {
  const positions = [72, 79, 86, 92, 97];
  return `<section class="battle-tile ${state.paused ? "paused" : ""}" aria-label="480 by 112 Battle Tile">
    <header><strong>${direction.stage}</strong><span>WAVE 3</span><em>AUTO</em><button data-action="foes">${state.foes} FOES</button><button data-action="pause">${state.paused ? "PLAY" : "PAUSE"}</button></header>
    <div class="sky-detail"></div><div class="ground-detail"></div>
    <span class="scale-note">32×48 · 1×</span>
    <div class="party actor-1">${sprite("knight")}</div>
    <div class="party actor-2">${sprite("priest")}</div>
    <div class="party actor-3">${sprite("wizard")}</div>
    ${positions.slice(0, state.foes).map((x, i) => `<div class="enemy" style="--x:${x}%;--delay:${-i * .17}s">${foe()}</div>`).join("")}
    <i class="fx petals">✦</i><i class="fx moonring"></i>
    <div class="stage-line"><span>III</span><i><b></b></i><span>BOSS</span></div>
  </section>`;
}

function lineup() {
  return `<section class="lineup" aria-label="Enlarged four Class inspection lineup">${classes.map(kind => `<figure><div class="magnified">${sprite(kind)}</div><figcaption><strong>${classNames[kind]}</strong><span>fixed silhouette</span></figcaption></figure>`).join("")}</section>`;
}

function render() {
  document.getElementById("app").innerHTML = `<div class="prototype-shell">
    <header class="brief"><span class="eyebrow">SELECTED ART DIRECTION</span><h1>${direction.name}</h1><p><strong>${direction.thesis}.</strong> ${direction.copy}</p><div class="cues">${direction.cues.map(c => `<span>${c}</span>`).join("")}</div></header>
    <section class="native"><div class="measure"><span>← exactly 480px →</span><span>native gameplay view</span></div>${battleTile()}</section>
    <div class="inspection"><div><span class="eyebrow">4× INSPECTION ONLY</span><h2>Roster silhouettes</h2><p>Battle assets remain authored and displayed at 32×48. Sunsteel's bold-contour discipline remains a readability guardrail.</p></div>${lineup()}<aside><span class="eyebrow">WORLD KIT</span><strong>${direction.foe}</strong><div class="foe-large">${foe()}</div><span>Opponent family</span><strong>${direction.stage}</strong><span>Stage backdrop</span></aside></div>
  </div>`;
  document.querySelector('[data-action="foes"]').addEventListener("click", () => { state.foes = state.foes === 5 ? 3 : 5; render(); });
  document.querySelector('[data-action="pause"]').addEventListener("click", () => { state.paused = !state.paused; render(); });
}

render();
