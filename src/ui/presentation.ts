import effectManifest from "../assets/effects/manifest.json";
import type { EngineEvent } from "../core/events";
import type { Snapshot } from "../core/snapshot";
import type { Content, Rarity } from "../core/types";
import { effectRecipes } from "../data/effects";
import {
  damageNumberClass,
  formatDamageNumber,
  mergeDamageNumbers,
  type DamageNumberInput,
} from "./damage-numbers";
import { effectImageUrl, statusEffectGlyphUrl } from "./effect-images";
import { equipmentBaseForDrop } from "./equipment-format";
import { createEquipmentIconElement } from "./icons";

/** Contract constants — source: prototype/presentation-contract/present.py */
export const LUNGE = {
  rampMs: 54,
  holdMs: 66,
  outPx: 3,
  backPx: -1,
  settleMs: 140,
} as const;

export const HURT = {
  recoilPx: 2,
  recoilMs: 90,
  flashMs: 60,
  flashStrength: 0.6,
} as const;

export const DOWNED = {
  darken: 0.5,
  dropPx: 3,
} as const;

export const ACTOR_POOL = {
  rgb: [111, 227, 173] as const,
  rx: 11,
  ry: 3,
  dy: 1,
} as const;

export const STRIKE_DY = -26;
export const BANNER_DURATION_MS = 1500;
export const DAMAGE_FLOAT_MS = 900;
export const DROP_TOAST_MS = 2000;

export const ARMORY_BADGE_EVENT = "nightglass:armory-badge";

interface EffectManifestEntry {
  frame_size: [number, number];
  anchor_dx?: number;
  strike_dy?: number;
  total_ms: number;
  frames: { file: string; duration_ms: number }[];
}

const EFFECT_MANIFEST = effectManifest as unknown as Record<string, EffectManifestEntry>;

type BannerKind =
  | "wave-started"
  | "stage-cleared"
  | "party-defeat"
  | "stage-attempt-started";

interface ActiveHurt {
  entityId: string;
  startedAtMs: number;
}

interface ActiveEffect {
  id: string;
  abilityId: string;
  actorId: string;
  targetIds: string[];
  startedAtMs: number;
  impactAtMs: number;
}

interface ActiveBanner {
  kind: BannerKind;
  label: string;
  startedAtMs: number;
}

interface ActiveDropToast {
  dropId: number;
  rarity: Rarity;
  itemName: string;
  iconKey: string;
  startedAtMs: number;
}

export interface Presentation {
  applyEvents(events: EngineEvent[], snapshot: Snapshot): void;
  render(nowMs: number, snapshot: Snapshot): void;
  destroy(): void;
}

export interface PresentationOptions {
  battlefield: HTMLElement;
  effectLane: HTMLElement;
  feedbackLayer: HTMLElement;
  notificationLayer: HTMLElement;
  content: Content;
  reducedMotion?: boolean;
}

export function lungeOffset(tMs: number, facing: 1 | -1 = 1): { x: number; y: number } {
  const cue = LUNGE.rampMs + LUNGE.holdMs;
  if (tMs < 0 || tMs >= cue + LUNGE.settleMs) {
    return { x: 0, y: 0 };
  }
  if (tMs < LUNGE.rampMs) {
    return { x: Math.round((tMs * LUNGE.outPx) / LUNGE.rampMs) * facing, y: 0 };
  }
  if (tMs < cue) {
    return { x: LUNGE.outPx * facing, y: 0 };
  }
  const frac = (tMs - cue) / LUNGE.settleMs;
  return { x: Math.round(LUNGE.backPx * (1 - frac) * facing), y: 0 };
}

export function hurtOffset(tMs: number, facing: 1 | -1 = 1): { x: number; y: number } {
  if (tMs < 0 || tMs >= HURT.recoilMs) {
    return { x: 0, y: 0 };
  }
  const frac = 1 - tMs / HURT.recoilMs;
  return { x: Math.round(HURT.recoilPx * frac) * -facing, y: 0 };
}

export function strikePointOffset(anchorDx = 0): { x: number; y: number } {
  return { x: anchorDx, y: STRIKE_DY };
}

function facingForEntity(entityId: string): 1 | -1 {
  return entityId.startsWith("party:") ? 1 : -1;
}

function frameAtTime(entry: EffectManifestEntry, elapsedMs: number): string | null {
  let cursor = 0;
  for (const frame of entry.frames) {
    cursor += frame.duration_ms;
    if (elapsedMs < cursor) {
      return effectImageUrl(frame.file);
    }
  }
  return null;
}

function recipeForAbility(abilityId: string) {
  return effectRecipes[abilityId];
}

function manifestForRecipe(framesKey: string): EffectManifestEntry | undefined {
  return EFFECT_MANIFEST[framesKey];
}

function combatantElement(root: HTMLElement, entityId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-entity-id="${entityId}"]`);
}

function markLayer(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>(".layer-mark");
}

function bodyLayer(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>(".layer-body");
}

function bannerLabel(event: EngineEvent, content: Content): string | null {
  switch (event.type) {
    case "wave-started":
      return event.boss ? "Boss Wave" : null;
    case "stage-cleared":
      return content.stages.find((stage) => stage.id === event.stage)?.name ?? "Stage Cleared";
    case "party-defeat":
      return "Party Defeat";
    case "stage-attempt-started":
      return content.stages.find((stage) => stage.id === event.stage)?.name ?? "New Attempt";
    default:
      return null;
  }
}


export function createPresentation(options: PresentationOptions): Presentation {
  const { battlefield, effectLane, feedbackLayer, notificationLayer, content } = options;
  let reducedMotion = options.reducedMotion ?? false;

  const pendingDamage: DamageNumberInput[] = [];
  const activeHurts = new Map<string, ActiveHurt>();
  const activeEffects: ActiveEffect[] = [];
  let banner: ActiveBanner | null = null;
  let dropToast: ActiveDropToast | null = null;
  const statusByEntity = new Map<string, string[]>();

  const bannerEl = document.createElement("div");
  bannerEl.className = "lane-banner";
  bannerEl.hidden = true;

  const dropToastEl = document.createElement("div");
  dropToastEl.className = "drop-toast";
  dropToastEl.hidden = true;

  const damageLayer = document.createElement("div");
  damageLayer.className = "damage-layer";
  damageLayer.setAttribute("aria-hidden", "true");

  feedbackLayer.append(bannerEl, damageLayer);
  notificationLayer.append(dropToastEl);
  battlefield.classList.toggle("reduced-motion", reducedMotion);

  function setReducedMotion(next: boolean): void {
    reducedMotion = next;
    battlefield.classList.toggle("reduced-motion", reducedMotion);
  }

  function applyEvents(events: EngineEvent[], snapshot: Snapshot): void {
    for (const event of events) {
      switch (event.type) {
        case "action-started": {
          activeEffects.push({
            id: `${event.entityId}:${event.atMs}`,
            abilityId: event.abilityId,
            actorId: event.entityId,
            targetIds: event.targetIds,
            startedAtMs: event.atMs,
            impactAtMs: event.impactAtMs,
          });
          break;
        }
        case "impact": {
          for (const result of event.results) {
            pendingDamage.push({
              targetId: result.targetId,
              kind: result.kind,
              ...(result.channel !== undefined ? { channel: result.channel } : {}),
              amount: result.amount,
              atMs: event.atMs,
            });
            if (result.kind === "damage") {
              activeHurts.set(result.targetId, { entityId: result.targetId, startedAtMs: event.atMs });
            }
          }
          break;
        }
        case "status-applied": {
          const current = statusByEntity.get(event.entityId) ?? [];
          if (!current.includes(event.statusId)) {
            statusByEntity.set(event.entityId, [...current, event.statusId]);
          }
          break;
        }
        case "status-expired": {
          const current = statusByEntity.get(event.entityId) ?? [];
          statusByEntity.set(
            event.entityId,
            current.filter((statusId) => statusId !== event.statusId),
          );
          break;
        }
        case "knockout":
          break;
        case "wave-started":
        case "stage-cleared":
        case "party-defeat":
        case "stage-attempt-started": {
          const label = bannerLabel(event, content);
          if (label) {
            banner = { kind: event.type, label, startedAtMs: event.atMs };
          }
          break;
        }
        case "drop-awarded": {
          const drop = snapshot.progression.armory.find((entry) => entry.dropId === event.dropId);
          if (drop) {
            const base = equipmentBaseForDrop(drop, content);
            dropToast = {
              dropId: drop.dropId,
              rarity: drop.rarity,
              itemName: base.name,
              iconKey: base.iconKey,
              startedAtMs: event.atMs,
            };
            battlefield.dispatchEvent(new CustomEvent(ARMORY_BADGE_EVENT, { bubbles: true }));
          }
          break;
        }
        default:
          break;
      }
    }
  }

  function renderActorPool(entityId: string, nowMs: number, snapshot: Snapshot): void {
    const element = combatantElement(battlefield, entityId);
    const layer = element ? markLayer(element) : null;
    if (!layer) {
      return;
    }

    const combatant = snapshot.attempt?.combatants.find((entry) => entry.entityId === entityId);
    const action = combatant?.action;
    const active =
      action !== null &&
      action !== undefined &&
      nowMs >= action.startedAtMs &&
      nowMs < action.endsAtMs;

    let pool = layer.querySelector<HTMLElement>(".actor-pool");
    if (!active) {
      pool?.remove();
      return;
    }

    if (!pool) {
      pool = document.createElement("div");
      pool.className = "actor-pool";
      pool.setAttribute("aria-hidden", "true");
      pool.dataset["actorPoolRgb"] = ACTOR_POOL.rgb.join(",");
      pool.style.setProperty("--pool-rx", `${ACTOR_POOL.rx}px`);
      pool.style.setProperty("--pool-ry", `${ACTOR_POOL.ry}px`);
      pool.style.setProperty("--pool-dy", `${ACTOR_POOL.dy}px`);
      layer.append(pool);
    }
  }

  function renderBodyTransforms(entityId: string, nowMs: number, snapshot: Snapshot): void {
    const element = combatantElement(battlefield, entityId);
    const layer = element ? bodyLayer(element) : null;
    if (!element || !layer) {
      return;
    }

    const facing = facingForEntity(entityId);
    const combatant = snapshot.attempt?.combatants.find((entry) => entry.entityId === entityId);
    let offsetX = 0;
    let offsetY = 0;

    if (combatant?.knockedOut) {
      element.classList.add("knockout-collapse", "knockout-desaturate");
      offsetY = DOWNED.dropPx;
    } else {
      element.classList.remove("knockout-collapse", "knockout-desaturate");
    }

    const action = combatant?.action;
    if (action && nowMs >= action.startedAtMs && nowMs < action.endsAtMs && !reducedMotion) {
      const lunge = lungeOffset(nowMs - action.startedAtMs, facing);
      offsetX += lunge.x;
      offsetY += lunge.y;
    }

    const hurt = activeHurts.get(entityId);
    if (hurt && !reducedMotion) {
      const recoil = hurtOffset(nowMs - hurt.startedAtMs, facing);
      offsetX += recoil.x;
      offsetY += recoil.y;
      if (nowMs - hurt.startedAtMs < HURT.flashMs) {
        layer.classList.add("hurt-flash");
        layer.style.setProperty("--hurt-flash-strength", String(HURT.flashStrength));
      } else {
        layer.classList.remove("hurt-flash");
        layer.style.removeProperty("--hurt-flash-strength");
      }
      if (nowMs - hurt.startedAtMs >= HURT.recoilMs) {
        activeHurts.delete(entityId);
      }
    } else if (hurt && reducedMotion) {
      if (nowMs - hurt.startedAtMs < HURT.flashMs) {
        layer.classList.add("hurt-flash-reduced");
      } else {
        layer.classList.remove("hurt-flash-reduced");
        activeHurts.delete(entityId);
      }
    } else {
      layer.classList.remove("hurt-flash", "hurt-flash-reduced");
      layer.style.removeProperty("--hurt-flash-strength");
    }

    layer.style.transform = offsetX !== 0 || offsetY !== 0 ? `translate(${offsetX}px, ${offsetY}px)` : "";
    element.dataset["bodyOffsetX"] = String(offsetX);
    element.dataset["bodyOffsetY"] = String(offsetY);
  }

  function renderStatusIcons(entityId: string, snapshot: Snapshot): void {
    const element = combatantElement(battlefield, entityId);
    if (!element) {
      return;
    }

    const fromSnapshot =
      snapshot.attempt?.combatants.find((entry) => entry.entityId === entityId)?.statuses.map(
        (status) => status.statusId,
      ) ?? [];
    const tracked = statusByEntity.get(entityId) ?? fromSnapshot;
    const unique = [...new Set([...fromSnapshot, ...tracked])];

    let row = element.querySelector<HTMLElement>(".status-icons");
    if (unique.length === 0) {
      row?.remove();
      return;
    }

    if (!row) {
      row = document.createElement("div");
      row.className = "status-icons";
      element.append(row);
    }

    row.replaceChildren();
    const visible = unique.slice(0, 2);
    for (const statusId of visible) {
      const icon = document.createElement("img");
      icon.className = "status-icon";
      icon.src = statusEffectGlyphUrl(statusId);
      icon.alt = "";
      icon.width = 7;
      icon.height = 7;
      icon.draggable = false;
      row.append(icon);
    }
    if (unique.length > 2) {
      const chip = document.createElement("span");
      chip.className = "status-overflow-chip";
      chip.textContent = `+${unique.length - 2}`;
      row.append(chip);
    }
  }

  function renderEffects(nowMs: number): void {
    effectLane.replaceChildren();
    for (const effect of activeEffects) {
      if (nowMs >= effect.impactAtMs + 400) {
        continue;
      }
      const recipe = recipeForAbility(effect.abilityId);
      if (!recipe) {
        continue;
      }
      const manifest = manifestForRecipe(recipe.frames);
      if (!manifest) {
        continue;
      }

      const elapsed = Math.max(0, nowMs - effect.startedAtMs);
      const frameUrl = frameAtTime(manifest, elapsed);
      if (!frameUrl) {
        continue;
      }

      const anchorDx = recipe.anchorDx ?? manifest.anchor_dx ?? 0;
      const strike = strikePointOffset(anchorDx);
      const [frameW, frameH] = manifest.frame_size;

      if (recipe.anchor === "strike_target") {
        for (const targetId of effect.targetIds) {
          const target = combatantElement(battlefield, targetId);
          if (!target) {
            continue;
          }
          const img = document.createElement("img");
          img.className = "effect-frame strike-target";
          img.src = frameUrl;
          img.width = frameW;
          img.height = frameH;
          img.alt = "";
          img.draggable = false;
          img.dataset["strikeX"] = String(strike.x);
          img.dataset["strikeY"] = String(strike.y);
          img.style.left = `calc(50% + ${strike.x - frameW / 2}px)`;
          img.style.top = `calc(100% + ${strike.y - frameH}px)`;
          const host = document.createElement("div");
          host.className = "effect-host";
          host.style.left = `${target.offsetLeft}px`;
          host.style.bottom = `${parseInt(getComputedStyle(target).bottom || "6", 10)}px`;
          host.append(img);
          effectLane.append(host);
        }
      } else if (recipe.anchor === "lane_travel") {
        const actor = combatantElement(battlefield, effect.actorId);
        const target = combatantElement(battlefield, effect.targetIds[0] ?? "");
        if (!actor || !target) {
          continue;
        }
        const progress = reducedMotion
          ? 1
          : Math.min(1, Math.max(0, (nowMs - effect.startedAtMs) / recipe.durationMs));
        const startX = actor.offsetLeft + 16;
        const endX = target.offsetLeft + 16;
        const x = startX + (endX - startX) * progress;
        const img = document.createElement("img");
        img.className = "effect-frame lane-travel";
        img.src = frameUrl;
        img.width = frameW;
        img.height = frameH;
        img.alt = "";
        img.draggable = false;
        img.style.left = `${x - frameW / 2}px`;
        img.style.bottom = `${30 - frameH / 2}px`;
        effectLane.append(img);
      } else if (recipe.anchor === "band") {
        const target = combatantElement(battlefield, effect.targetIds[0] ?? effect.actorId);
        if (!target) {
          continue;
        }
        const reveal = reducedMotion
          ? 1
          : Math.min(1, Math.max(0, (nowMs - effect.startedAtMs) / recipe.durationMs));
        const bandHi = Math.round(frameH * reveal);
        const img = document.createElement("img");
        img.className = "effect-frame heal-band";
        img.src = frameUrl;
        img.width = frameW;
        img.height = frameH;
        img.alt = "";
        img.draggable = false;
        img.style.clipPath = `inset(${frameH - bandHi}px 0 0 0)`;
        img.style.left = `calc(50% - ${frameW / 2}px)`;
        img.style.bottom = `${24 - frameH}px`;
        const host = document.createElement("div");
        host.className = "effect-host";
        host.style.left = `${target.offsetLeft}px`;
        host.style.bottom = `${parseInt(getComputedStyle(target).bottom || "6", 10)}px`;
        host.append(img);
        effectLane.append(host);
      }
    }

    const cutoff = nowMs - 1200;
    while (activeEffects.length > 0 && activeEffects[0]!.impactAtMs < cutoff) {
      activeEffects.shift();
    }
  }

  function renderDamageNumbers(nowMs: number): void {
    damageLayer.replaceChildren();
    const merged = mergeDamageNumbers(pendingDamage.filter((entry) => nowMs - entry.atMs <= DAMAGE_FLOAT_MS));
    for (const entry of merged) {
      const target = combatantElement(battlefield, entry.targetId);
      if (!target) {
        continue;
      }
      const float = document.createElement("span");
      float.className = `${damageNumberClass(entry)} floating`;
      float.textContent = formatDamageNumber(entry.amount, entry.kind);
      float.style.left = `${target.offsetLeft + 8}px`;
      float.style.bottom = `${target.offsetHeight + 18}px`;
      damageLayer.append(float);
    }
    while (pendingDamage.length > 0 && pendingDamage[0]!.atMs < nowMs - DAMAGE_FLOAT_MS) {
      pendingDamage.shift();
    }
  }

  function renderBanner(nowMs: number): void {
    if (!banner || nowMs - banner.startedAtMs > BANNER_DURATION_MS) {
      banner = null;
      bannerEl.hidden = true;
      bannerEl.textContent = "";
      bannerEl.classList.remove("lane-banner-visible");
      return;
    }
    bannerEl.hidden = false;
    bannerEl.textContent = banner.label;
    bannerEl.dataset["bannerKind"] = banner.kind;
    bannerEl.classList.add("lane-banner-visible");
    bannerEl.classList.toggle("lane-banner-static", reducedMotion);
  }

  function renderDropToast(nowMs: number): void {
    if (!dropToast || nowMs - dropToast.startedAtMs > DROP_TOAST_MS) {
      dropToast = null;
      dropToastEl.hidden = true;
      dropToastEl.replaceChildren();
      dropToastEl.removeAttribute("aria-label");
      dropToastEl.className = "drop-toast";
      return;
    }
    dropToastEl.hidden = false;
    dropToastEl.dataset["dropId"] = String(dropToast.dropId);
    dropToastEl.className = `drop-toast rarity-${dropToast.rarity}`;
    dropToastEl.setAttribute("aria-label", `${dropToast.itemName} drop`);

    dropToastEl.replaceChildren(
      createEquipmentIconElement(dropToast.iconKey, "content", { extraClass: "drop-toast-icon" }),
    );
  }

  function render(nowMs: number, snapshot: Snapshot): void {
    const combatants = snapshot.attempt?.combatants ?? [];
    for (const combatant of combatants) {
      renderActorPool(combatant.entityId, nowMs, snapshot);
      renderBodyTransforms(combatant.entityId, nowMs, snapshot);
      renderStatusIcons(combatant.entityId, snapshot);
    }
    renderEffects(nowMs);
    renderDamageNumbers(nowMs);
    renderBanner(nowMs);
    renderDropToast(nowMs);
  }

  function destroy(): void {
    feedbackLayer.replaceChildren();
    notificationLayer.replaceChildren();
    effectLane.replaceChildren();
    for (const element of battlefield.querySelectorAll(".actor-pool, .status-icons")) {
      element.remove();
    }
    for (const element of battlefield.querySelectorAll(".layer-body")) {
      element.classList.remove("hurt-flash", "hurt-flash-reduced");
      (element as HTMLElement).style.transform = "";
    }
    for (const element of battlefield.querySelectorAll(".combatant")) {
      element.classList.remove("knockout-collapse", "knockout-desaturate");
    }
  }

  return {
    applyEvents,
    render,
    destroy,
    setReducedMotion,
  } as Presentation & { setReducedMotion(next: boolean): void };
}
