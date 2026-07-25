// PROTOTYPE — Sweep / Salvage confirm preview.
// Variant C iteration: peer Salvage / Discard buttons open one detail pane;
// pane owns the rarity (salvage) or tier (discard) selector + Fill.
// Throwaway.

const VARIANTS = [
  { key: "A", name: "Spotlight grid" },
  { key: "B", name: "Icon filmstrip" },
  { key: "C", name: "Pane: pick then fill" },
];

const RARITY_LABEL = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
};

const NEXT_RARITY = {
  common: "uncommon",
  uncommon: "rare",
  rare: "epic",
};

/** Stub collection — includes rares/epics at IL 2 so Discard confirm has teeth. */
const ARMORY = [
  { id: 1, name: "Mossblade", glyph: "⚔", slot: "Weapon", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 2, name: "Thorn Vest", glyph: "🛡", slot: "Armor", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 3, name: "Glow Charm", glyph: "◆", slot: "Charm", rarity: "uncommon", il: 1, locked: false, equipped: false },
  { id: 4, name: "Reed Bow", glyph: "🏹", slot: "Weapon", rarity: "common", il: 2, locked: false, equipped: false },
  { id: 5, name: "Berry Plate", glyph: "▣", slot: "Armor", rarity: "common", il: 2, locked: false, equipped: false },
  { id: 6, name: "Pith Staff", glyph: "⚚", slot: "Weapon", rarity: "common", il: 2, locked: false, equipped: false },
  { id: 7, name: "Lantern Ring", glyph: "◎", slot: "Charm", rarity: "common", il: 2, locked: false, equipped: false },
  { id: 8, name: "Ash Cloak", glyph: "🧥", slot: "Armor", rarity: "common", il: 2, locked: false, equipped: false },
  { id: 9, name: "Night Quill", glyph: "✎", slot: "Charm", rarity: "uncommon", il: 2, locked: false, equipped: false },
  { id: 10, name: "Moonsteel Edge", glyph: "⚔", slot: "Weapon", rarity: "rare", il: 2, locked: false, equipped: false },
  { id: 11, name: "Starfall Amulet", glyph: "✦", slot: "Charm", rarity: "epic", il: 2, locked: false, equipped: false },
  { id: 12, name: "Worn Buckler", glyph: "◯", slot: "Armor", rarity: "common", il: 2, locked: true, equipped: false },
  { id: 13, name: "Equipped Blade", glyph: "⚔", slot: "Weapon", rarity: "uncommon", il: 2, locked: false, equipped: true },
  { id: 14, name: "Hollow Knife", glyph: "🗡", slot: "Weapon", rarity: "common", il: 3, locked: false, equipped: false },
  { id: 15, name: "Fern Mail", glyph: "▣", slot: "Armor", rarity: "common", il: 3, locked: false, equipped: false },
  { id: 16, name: "Seed Charm", glyph: "◆", slot: "Charm", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 17, name: "Drift Axe", glyph: "🪓", slot: "Weapon", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 18, name: "Peat Boots", glyph: "👢", slot: "Armor", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 19, name: "Cinder Loop", glyph: "◎", slot: "Charm", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 20, name: "Bark Shield", glyph: "◯", slot: "Armor", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 21, name: "Mist Dagger", glyph: "🗡", slot: "Weapon", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 22, name: "Root Band", glyph: "◎", slot: "Charm", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 23, name: "Ivy Wrap", glyph: "🧥", slot: "Armor", rarity: "common", il: 1, locked: false, equipped: false },
  { id: 24, name: "Pond Wand", glyph: "⚚", slot: "Weapon", rarity: "common", il: 2, locked: false, equipped: false },
];

const params = new URLSearchParams(location.search);

/** @type {{ variant: string, action: null|'salvage'|'discard', pick: string|null, filled: boolean }} */
const state = {
  variant: VARIANTS.some((v) => v.key === params.get("variant"))
    ? params.get("variant")
    : "C",
  action: ["salvage", "discard"].includes(params.get("action")) ? params.get("action") : null,
  pick: params.get("pick") || null,
  filled: params.get("filled") === "1",
};

function writeUrl() {
  const next = new URLSearchParams();
  next.set("variant", state.variant);
  if (state.action) next.set("action", state.action);
  if (state.pick) next.set("pick", state.pick);
  if (state.filled) next.set("filled", "1");
  history.replaceState(null, "", `?${next.toString()}`);
}

function eligible(drop) {
  return !drop.locked && !drop.equipped;
}

function salvagePool(rarity) {
  return ARMORY.filter((d) => eligible(d) && d.rarity === rarity)
    .slice()
    .sort((a, b) => b.il - a.il || a.id - b.id);
}

function discardPool(il) {
  return ARMORY.filter((d) => eligible(d) && d.il === Number(il));
}

function rarityOptions() {
  return ["common", "uncommon", "rare"].map((rarity) => {
    const pool = salvagePool(rarity);
    return { rarity, count: pool.length, ready: pool.length >= 10 };
  });
}

function tierOptions() {
  const levels = [...new Set(ARMORY.filter(eligible).map((d) => d.il))].sort((a, b) => a - b);
  return levels.map((il) => {
    const pool = discardPool(il);
    return { il, count: pool.length, ready: pool.length > 0 };
  });
}

function candidates() {
  if (!state.action || !state.pick || !state.filled) return [];
  if (state.action === "salvage") {
    return salvagePool(state.pick).slice(0, 10);
  }
  return discardPool(state.pick);
}

function candidateIds() {
  return candidates().map((d) => d.id);
}

function rareEpic(list) {
  return list.filter((d) => d.rarity === "rare" || d.rarity === "epic");
}

function salvageMeta(list, fromRarity) {
  const minIl = Math.min(...list.map((d) => d.il));
  return {
    from: fromRarity,
    to: NEXT_RARITY[fromRarity],
    minIl,
    count: list.length,
  };
}

function tileHtml(drop, isCandidate) {
  const gem =
    drop.rarity === "rare" || drop.rarity === "epic"
      ? `<span class="gem${drop.rarity === "epic" ? " epic" : ""}" title="${RARITY_LABEL[drop.rarity]}"></span>`
      : "";
  const flags = [drop.locked ? "🔒" : "", drop.equipped ? "EQ" : ""].filter(Boolean).join(" ");
  return `
    <article class="tile rarity-${drop.rarity}${isCandidate ? " candidate" : ""}" data-id="${drop.id}">
      ${gem}
      <div class="glyph">${drop.glyph}</div>
      <div class="name">${drop.name}</div>
      <div class="il">IL ${drop.il}${flags ? ` · ${flags}` : ""}</div>
    </article>`;
}

function gridHtml(ids) {
  const set = new Set(ids);
  return ARMORY.map((d) => tileHtml(d, set.has(d.id))).join("");
}

function actionsHtml(kind) {
  const yesClass = kind === "discard" ? "danger" : "craft";
  const yesLabel = kind === "discard" ? "Discard" : "Salvage";
  return `
    <div class="actions">
      <button type="button" class="confirm-yes ${yesClass}" data-act="confirm">${yesLabel}</button>
      <button type="button" class="confirm-no" data-act="cancel">Cancel</button>
    </div>`;
}

function idleDetail() {
  return `
    <aside class="detail">
      <h3>Reed Bow</h3>
      <p>Common · Weapon · IL 2</p>
      <p>Item detail (A/B keep this while confirm lives elsewhere).</p>
      <p class="placeholder idle-note">Detail pane idle</p>
    </aside>`;
}

function openAction(action) {
  state.action = action;
  state.pick = null;
  state.filled = false;
  // Sensible defaults: first ready option pre-selected but not filled.
  if (action === "salvage") {
    const ready = rarityOptions().find((o) => o.ready);
    state.pick = ready ? ready.rarity : null;
  } else {
    const ready = tierOptions().find((o) => o.ready);
    state.pick = ready ? String(ready.il) : null;
  }
}

function closeAction() {
  state.action = null;
  state.pick = null;
  state.filled = false;
}

/** Variant C — Salvage / Discard open one pane; pick then Fill. */
function actionPane() {
  if (!state.action) {
    return `
      <aside class="detail ledger ledger--empty">
        <div class="ledger-head">
          <h3>Action review</h3>
          <p class="outcome muted">Closed — pick Salvage or Discard.</p>
        </div>
        <div class="ledger-empty-body">
          <p><strong>Salvage</strong> opens rarity pick + ten slots.<br>
          <strong>Discard</strong> opens Item Level pick + the matching pile.<br>
          Fill stages the batch; confirm stays in this column.</p>
        </div>
      </aside>`;
  }

  const isSalvage = state.action === "salvage";
  const modeClass = isSalvage ? "salvage" : "sweep";
  const modeLabel = isSalvage ? "Salvage" : "Discard";
  const batch = candidates();

  const picker = isSalvage ? rarityPickerHtml() : tierPickerHtml();
  const fillDisabled =
    !state.pick ||
    (isSalvage
      ? salvagePool(state.pick).length < 10
      : discardPool(state.pick).length === 0);

  const body = isSalvage ? salvageSlotsHtml(batch) : discardListHtml(batch);

  let outcome = "";
  let foot = "";
  if (state.filled && batch.length > 0) {
    if (isSalvage) {
      const meta = salvageMeta(batch, state.pick);
      outcome = `<p class="outcome salvage">${meta.count} ${RARITY_LABEL[meta.from]} → 1 ${RARITY_LABEL[meta.to]} · IL ${meta.minIl}</p>`;
    } else {
      const precious = rareEpic(batch);
      outcome = `<p class="outcome sweep">Discard ${batch.length} at IL ${state.pick}${
        precious.length ? ` · ${precious.length} Rare/Epic` : ""
      }</p>`;
    }
    foot = `
      <div class="ledger-foot">
        <button type="button" class="confirm-yes ${isSalvage ? "craft" : "danger"}" data-act="confirm">${
          isSalvage ? "Salvage" : "Discard"
        }</button>
        <button type="button" class="confirm-no" data-act="cancel">Cancel</button>
      </div>`;
  } else {
    foot = `
      <div class="ledger-foot">
        <button type="button" class="confirm-no" data-act="cancel">Close</button>
      </div>`;
  }

  return `
    <aside class="detail ledger mode-${modeClass}">
      <div class="ledger-head">
        <div class="ledger-mode">
          <span class="mode-pill ${modeClass}">${modeLabel}</span>
          <span class="mode-count">${state.filled ? batch.length : "—"}</span>
        </div>
        ${picker}
        <div class="fill-row">
          <button type="button" class="tool-btn fill-btn" data-act="fill" ${
            fillDisabled ? "disabled" : ""
          }>${isSalvage ? "Fill 10 slots" : "Fill from tier"}</button>
          ${
            state.filled
              ? `<button type="button" class="tool-btn" data-act="clear-fill">Clear</button>`
              : ""
          }
        </div>
        ${outcome}
      </div>
      ${body}
      ${foot}
    </aside>`;
}

function rarityPickerHtml() {
  return `
    <div class="picker" role="group" aria-label="Salvage rarity">
      ${rarityOptions()
        .map((o) => {
          const pressed = state.pick === o.rarity;
          return `<button type="button" class="pick-chip rarity-${o.rarity}" data-pick="${o.rarity}" aria-pressed="${pressed}" ${
            o.ready ? "" : "disabled"
          }>${RARITY_LABEL[o.rarity]} <span class="n">${o.count}/10</span></button>`;
        })
        .join("")}
    </div>`;
}

function tierPickerHtml() {
  return `
    <div class="picker" role="group" aria-label="Discard Item Level">
      ${tierOptions()
        .map((o) => {
          const pressed = state.pick === String(o.il);
          return `<button type="button" class="pick-chip" data-pick="${o.il}" aria-pressed="${pressed}" ${
            o.ready ? "" : "disabled"
          }>IL ${o.il} <span class="n">${o.count}</span></button>`;
        })
        .join("")}
    </div>`;
}

function salvageSlotsHtml(batch) {
  const slots = Array.from({ length: 10 }, (_, i) => batch[i] || null);
  return `
    <div class="slot-grid" aria-label="Salvage slots">
      ${slots
        .map((d, i) => {
          if (!d) {
            return `<div class="slot empty"><span>${i + 1}</span></div>`;
          }
          return `
            <div class="slot filled rarity-${d.rarity}" title="${d.name}">
              <span class="glyph">${d.glyph}</span>
              <span class="il">IL ${d.il}</span>
            </div>`;
        })
        .join("")}
      ${
        state.filled && batch.length === 10
          ? `<div class="slot outcome-slot">
              <span class="q">?</span>
              <span class="il">${RARITY_LABEL[NEXT_RARITY[state.pick]]}</span>
            </div>`
          : ""
      }
    </div>`;
}

function discardListHtml(batch) {
  if (!state.filled) {
    return `<div class="ledger-empty-body"><p>Choose an Item Level, then <strong>Fill from tier</strong>.</p></div>`;
  }
  if (batch.length === 0) {
    return `<div class="ledger-empty-body"><p>Nothing eligible at this Item Level.</p></div>`;
  }
  const precious = rareEpic(batch);
  const rest = batch.filter((d) => d.rarity !== "rare" && d.rarity !== "epic");
  const rows = [...precious, ...rest]
    .map((d) => {
      const priority = d.rarity === "rare" || d.rarity === "epic";
      return `
        <div class="ledger-row${priority ? ` priority ${d.rarity}` : ""}">
          <div class="glyph">${d.glyph}</div>
          <div>
            <div>${d.name}</div>
            <div class="meta">${d.slot} · IL ${d.il}</div>
          </div>
          <div class="rarity-tag">${RARITY_LABEL[d.rarity]}</div>
        </div>`;
    })
    .join("");
  return `<div class="ledger-list">${rows}</div>`;
}

function filterToolbar(extraButtons) {
  return `
    <div class="toolbar">
      <span class="chip muted">Weapon</span>
      <span class="chip muted">Armor</span>
      <span class="chip muted">Charm</span>
      <span class="select-fake">Sort · Unseen first</span>
      ${extraButtons || ""}
    </div>`;
}

function variantC() {
  const salvageOpen = state.action === "salvage";
  const discardOpen = state.action === "discard";
  const peers = `
    <button type="button" class="tool-btn primary-salvage" data-act="open-salvage" aria-pressed="${salvageOpen}">Salvage</button>
    <button type="button" class="tool-btn primary-sweep" data-act="open-discard" aria-pressed="${discardOpen}">Discard</button>`;

  return `
    <div class="surface variant-c mode-${state.action || "idle"}${
      state.filled ? " pending" : ""
    }${state.action ? " open" : ""}">
      <h2 class="surface-title">Armory</h2>
      ${filterToolbar(peers)}
      <div class="body">
        <div class="grid">${gridHtml(candidateIds())}</div>
        ${actionPane()}
      </div>
    </div>`;
}

/* ---- A / B kept as comparison baselines (pre-filled confirm) ---- */

function legacyBatch(action) {
  if (action === "salvage") return salvagePool("common").slice(0, 10);
  return discardPool(2);
}

function variantA() {
  const action = state.action || "discard";
  const batch = legacyBatch(action);
  const n = batch.length;
  const precious = rareEpic(batch);
  let copy;
  if (action === "discard") {
    copy = precious.length
      ? `<p class="copy"><span class="count">${n}</span> at Item Level 2 · <span class="warn">${precious.length} Rare/Epic marked</span></p>`
      : `<p class="copy"><span class="count">${n}</span> pieces at Item Level 2</p>`;
  } else {
    const meta = salvageMeta(batch, "common");
    copy = `<p class="copy"><span class="count">${meta.count}</span> ${RARITY_LABEL[meta.from]} → 1 ${RARITY_LABEL[meta.to]} · IL ${meta.minIl}</p>`;
  }
  const pending = Boolean(state.action);
  return `
    <div class="surface variant-a mode-${action}${pending ? " pending" : ""}">
      <h2 class="surface-title">Armory</h2>
      ${filterToolbar(`<span class="select-fake">Baseline A — no pick/fill</span>`)}
      ${
        pending
          ? `<div class="sticky-confirm">${copy}${actionsHtml(action)}</div>`
          : ""
      }
      <div class="body">
        <div class="grid">${gridHtml(pending ? batch.map((d) => d.id) : [])}</div>
        ${idleDetail()}
      </div>
    </div>`;
}

function filmChip(drop) {
  const precious = drop.rarity === "rare" || drop.rarity === "epic";
  if (precious) {
    return `
      <div class="film-chip named ${drop.rarity}" title="${drop.name}">
        <span class="glyph">${drop.glyph}</span>
        <span class="label">${drop.name}<br>${RARITY_LABEL[drop.rarity]}</span>
      </div>`;
  }
  return `
    <div class="film-chip" title="${drop.name}">
      <span class="glyph">${drop.glyph}</span>
      <span class="il">IL ${drop.il}</span>
    </div>`;
}

function variantB() {
  const action = state.action || "discard";
  const batch = legacyBatch(action);
  const pending = Boolean(state.action);
  const precious = rareEpic(batch);
  const ordered = [...precious, ...batch.filter((d) => d.rarity !== "rare" && d.rarity !== "epic")];
  let headline;
  let sub;
  let outcome = "";
  if (action === "discard") {
    headline = `Discard · ${batch.length} pieces`;
    sub = precious.length ? `${precious.length} Rare/Epic named in strip` : "Commons stay icon-only";
  } else {
    const meta = salvageMeta(batch, "common");
    headline = `Salvage · ${meta.count} → 1`;
    sub = `${RARITY_LABEL[meta.from]} → ${RARITY_LABEL[meta.to]} · IL ${meta.minIl}`;
    outcome = `
      <span class="film-arrow" aria-hidden="true">→</span>
      <div class="outcome-chip">
        <span class="q">?</span>
        <span class="meta">${RARITY_LABEL[meta.to]}<br>IL ${meta.minIl}</span>
      </div>`;
  }
  const strip = pending
    ? `
      <div class="filmstrip">
        <div class="film-scroll">${ordered.map(filmChip).join("")}${outcome}</div>
        <div class="film-side">
          <div>
            <p class="headline">${headline}</p>
            <p class="sub">${sub}</p>
          </div>
          ${actionsHtml(action)}
        </div>
      </div>`
    : "";
  return `
    <div class="surface variant-b mode-${action}${pending ? " pending" : ""}">
      <h2 class="surface-title">Armory</h2>
      ${filterToolbar(`<span class="select-fake">Baseline B — no pick/fill</span>`)}
      ${strip}
      <div class="body">
        <div class="grid">${gridHtml(pending ? batch.map((d) => d.id) : [])}</div>
        ${idleDetail()}
      </div>
    </div>`;
}

function stateDump() {
  const batch = candidates();
  return `variant=${state.variant}  action=${state.action}  pick=${state.pick}  filled=${state.filled}
candidates=${batch.length}  ids=[${batch.map((d) => d.id).join(",")}]`;
}

function render() {
  writeUrl();
  const variant = VARIANTS.find((v) => v.key === state.variant);
  const surface =
    state.variant === "A" ? variantA() : state.variant === "B" ? variantB() : variantC();

  const stageBar =
    state.variant === "C"
      ? `<div class="mode-bar"><span>In-dock: Salvage / Discard open the pane.</span></div>`
      : `<div class="mode-bar">
          <span>Stage:</span>
          <button type="button" data-act="open-salvage" aria-pressed="${state.action === "salvage"}">Salvage</button>
          <button type="button" data-act="open-discard" aria-pressed="${state.action === "discard"}">Discard</button>
          <button type="button" data-act="cancel" ${state.action ? "" : "disabled"}>Clear</button>
        </div>`;

  document.getElementById("app").innerHTML = `
    <div class="chrome">
      <div class="banner">
        <div>
          <h1>PROTOTYPE — Sweep / Salvage confirm</h1>
          <p>On <strong>C</strong>: one Salvage + one Discard button. Each opens the detail pane with a picker, then Fill stages the batch.</p>
        </div>
        ${stageBar}
      </div>
      <div class="dock">
        <div class="tabs">
          <div class="tab">Party</div>
          <div class="tab">Loadout</div>
          <div class="tab">Talents</div>
          <div class="tab active">Armory</div>
          <div class="tab">Stage</div>
        </div>
        ${surface}
      </div>
      <pre class="state-dump" aria-live="polite">${stateDump()}</pre>
    </div>
    <div class="switcher" role="toolbar" aria-label="Prototype variant switcher">
      <button type="button" data-dir="-1" aria-label="Previous variant">←</button>
      <div class="label">${variant.key} — ${variant.name}</div>
      <button type="button" data-dir="1" aria-label="Next variant">→</button>
    </div>`;

  bind();
}

function cycleVariant(delta) {
  const idx = VARIANTS.findIndex((v) => v.key === state.variant);
  state.variant = VARIANTS[(idx + delta + VARIANTS.length) % VARIANTS.length].key;
  closeAction();
  render();
}

function bind() {
  document.querySelectorAll("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => cycleVariant(Number(btn.getAttribute("data-dir"))));
  });

  document.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.pick = btn.getAttribute("data-pick");
      state.filled = false;
      render();
    });
  });

  document.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-act");
      if (act === "open-salvage") {
        openAction("salvage");
      } else if (act === "open-discard") {
        openAction("discard");
      } else if (act === "fill") {
        state.filled = true;
      } else if (act === "clear-fill") {
        state.filled = false;
      } else if (act === "cancel" || act === "confirm") {
        closeAction();
      }
      render();
    });
  });
}

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) {
    return;
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    cycleVariant(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    cycleVariant(1);
  }
});

render();
