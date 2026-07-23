import type { ReadonlySnapshot } from "../core/snapshot";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";

type Child = Node | string | null | undefined | false;

interface ElAttrs {
  class?: string;
  text?: string;
  data?: Record<string, string>;
  aria?: Record<string, string>;
  /** Any remaining DOM property assignment, e.g. { type: "button", hidden: true }. */
  props?: Record<string, unknown>;
}

function appendChild(parent: HTMLElement, child: Child): void {
  if (child === null || child === undefined || child === false) {
    return;
  }
  if (typeof child === "string") {
    parent.append(child);
    return;
  }
  parent.append(child);
}

/** Build an element. Falsy children are skipped so callers can inline conditionals. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: ElAttrs,
  children?: Child[],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attrs?.class !== undefined) {
    element.className = attrs.class;
  }
  if (attrs?.text !== undefined) {
    element.textContent = attrs.text;
  }
  if (attrs?.data) {
    for (const [key, value] of Object.entries(attrs.data)) {
      element.dataset[key] = value;
    }
  }
  if (attrs?.aria) {
    for (const [key, value] of Object.entries(attrs.aria)) {
      element.setAttribute(`aria-${key}`, value);
    }
  }
  if (attrs?.props) {
    for (const [key, value] of Object.entries(attrs.props)) {
      (element as unknown as Record<string, unknown>)[key] = value;
    }
  }
  if (children) {
    for (const child of children) {
      appendChild(element, child);
    }
  }

  return element;
}

export interface SurfaceShellOptions {
  /** Rendered as the h2.dock-surface-title. */
  title: string;
  /**
   * Render the h2. False when the surface is a whole dock panel whose tab
   * already names it. Defaults to true for composed section headings.
   */
  showTitle?: boolean;
  /** Body builder. Not called when the Snapshot is null. */
  body(snapshot: ReadonlySnapshot, legality: EngineLegalityView): Child[];
  /**
   * When true, the shell holds an opaque selection key across rebuilds.
   * Read/write via getSelection / setSelection; setSelection re-renders when
   * a Snapshot is held.
   */
  selection?: boolean;
  /**
   * When true, rebuilds are non-destructive:
   *  - decoded icon <img> nodes are reused across rebuilds (no re-decode flash), and
   *  - the rebuild is paused while the surface hosts a live interaction (a focused
   *    <select> or a node marked data-surface-preserve-live, e.g. an armory drag
   *    source), flushing the latest Snapshot when the interaction ends.
   * Default false keeps the destructive rebuild used by Stage and unmigrated surfaces.
   */
  reconcile?: boolean;
}

export interface MountedSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
  getSelection(): string | null;
  setSelection(key: string | null): void;
}

/** Selectors for scroll containers the Management Dock may rebuild on remount. */
const DOCK_SCROLL_PRESERVE_SELECTORS = [
  ".character-picker",
  ".dock-panel:not([hidden])",
  ".armory-grid",
  ".armory-detail",
  ".talent-tree-scroll",
] as const;

type ScrollPositionMap = Record<string, { top: number; left: number }>;

/** Capture scroll offsets keyed by selector before a remount replaces those nodes. */
function captureScrollPositions(
  root: ParentNode,
  selectors: readonly string[] = DOCK_SCROLL_PRESERVE_SELECTORS,
): ScrollPositionMap {
  const positions: ScrollPositionMap = {};
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    positions[selector] = { top: element.scrollTop, left: element.scrollLeft };
  }
  return positions;
}

/** Restore scroll offsets onto the post-remount nodes matching the same selectors. */
function restoreScrollPositions(root: ParentNode, positions: ScrollPositionMap): void {
  for (const [selector, position] of Object.entries(positions)) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    element.scrollTop = position.top;
    element.scrollLeft = position.left;
  }
}

/** Stable identity from an element's data-* attributes, used to restore focus. */
function focusIdentity(element: HTMLElement): string | null {
  const keys = Object.keys(element.dataset).sort();
  if (keys.length === 0) {
    return null;
  }
  return keys.map((key) => `${key}=${element.dataset[key]}`).join("\0");
}

function captureFocusIdentity(root: HTMLElement): string | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) {
    return null;
  }
  return focusIdentity(active);
}

function restoreFocusIdentity(root: HTMLElement, identity: string | null): void {
  if (identity === null) {
    return;
  }
  for (const node of root.querySelectorAll<HTMLElement>("*")) {
    if (focusIdentity(node) === identity) {
      node.focus();
      return;
    }
  }
}

/**
 * The shared management-surface shell: clears the root, renders the empty
 * state when there is no Snapshot yet, renders the title, then the body.
 * Scroll, focus, selection, and retained nodes survive a rebuild.
 */
export function mountSurfaceShell(
  root: HTMLElement,
  className: string,
  options: SurfaceShellOptions,
): MountedSurface {
  root.classList.add(className);

  let selectionKey: string | null = null;
  let lastSnapshot: ReadonlySnapshot | null = null;
  let lastLegality: EngineLegalityView = EMPTY_ENGINE_LEGALITY;
  let rendering = false;
  let pointerHeld = false;
  let pending: {
    snapshot: ReadonlySnapshot | null;
    legality: EngineLegalityView;
  } | null = null;
  const teardown: Array<() => void> = [];

  function hasLiveInteraction(): boolean {
    if (pointerHeld) {
      return true;
    }
    const active = document.activeElement;
    if (active instanceof HTMLSelectElement && root.contains(active)) {
      return true;
    }
    return root.querySelector("[data-surface-preserve-live]") !== null;
  }

  function flushPending(): void {
    if (!pending) {
      return;
    }
    const next = pending;
    pending = null;
    render(next.snapshot, next.legality);
  }

  if (options.reconcile) {
    // focusout: the new activeElement settles after this event, so re-check on a microtask.
    root.addEventListener("focusout", () => queueMicrotask(flushPending));
    // Capture phase so the flush is queued before per-node dragend handlers tear down
    // state; microtask so hasLiveInteraction observes the post-teardown DOM.
    root.addEventListener(
      "dragend",
      () => {
        pointerHeld = false;
        queueMicrotask(flushPending);
      },
      true,
    );
    root.addEventListener("drop", () => queueMicrotask(flushPending), true);
    // A pointer pressed inside the surface — grabbing a tile before its HTML5 dragstart
    // fires, or click-holding a control — must not be torn out from under the gesture.
    // Pause rebuilds for the whole press and flush the latest Snapshot on release. This
    // covers the mousedown -> dragstart window that the preserve-live marker cannot,
    // because the marker is only set once dragstart has already fired.
    const onPointerDown = (): void => {
      pointerHeld = true;
    };
    const onPointerRelease = (): void => {
      if (!pointerHeld) {
        return;
      }
      pointerHeld = false;
      queueMicrotask(flushPending);
    };
    root.addEventListener("pointerdown", onPointerDown);
    // Release can land outside root (drag, or the pointer leaves the window), so listen
    // wide and clean these up on destroy.
    document.addEventListener("pointerup", onPointerRelease, true);
    document.addEventListener("pointercancel", onPointerRelease, true);
    teardown.push(() => {
      document.removeEventListener("pointerup", onPointerRelease, true);
      document.removeEventListener("pointercancel", onPointerRelease, true);
    });
  }

  function getSelection(): string | null {
    if (!options.selection) {
      return null;
    }
    return selectionKey;
  }

  function setSelection(key: string | null): void {
    if (!options.selection) {
      return;
    }
    if (selectionKey === key) {
      return;
    }
    selectionKey = key;
    if (lastSnapshot && !rendering) {
      render(lastSnapshot, lastLegality);
    }
  }

  function render(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView = EMPTY_ENGINE_LEGALITY,
  ): void {
    if (options.reconcile && hasLiveInteraction()) {
      pending = { snapshot, legality };
      lastSnapshot = snapshot;
      lastLegality = legality;
      return;
    }

    lastSnapshot = snapshot;
    lastLegality = legality;

    if (options.reconcile) {
      renderReconcile(snapshot, legality);
    } else {
      renderDestructive(snapshot, legality);
    }
  }

  /** The default path: tear the whole surface down and rebuild it every render. */
  function renderDestructive(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView,
  ): void {
    const scrolls = captureScrollPositions(root);
    const focusKey = captureFocusIdentity(root);
    const retained = [...root.querySelectorAll<HTMLElement>("[data-surface-retain]")];

    rendering = true;
    try {
      root.replaceChildren();
      if (!snapshot) {
        const empty = document.createElement("p");
        empty.className = "surface-empty";
        empty.textContent = "No Snapshot yet.";
        root.append(empty);
        return;
      }

      if (options.showTitle !== false) {
        const title = document.createElement("h2");
        title.className = "dock-surface-title";
        title.textContent = options.title;
        root.append(title);
      }

      for (const child of options.body(snapshot, legality)) {
        appendChild(root, child);
      }

      for (const node of retained) {
        if (!node.isConnected) {
          root.append(node);
        }
      }
    } finally {
      rendering = false;
    }

    restoreScrollPositions(root, scrolls);
    restoreFocusIdentity(root, focusKey);
  }

  /**
   * Non-destructive path: reconcile root's top-level children in place so nodes that
   * are the same instance across renders (a persistent, retained body) are never
   * detached — the key to preserving native `:hover`, an active drag, and decoded
   * icons through a rebuild, since any detach (even momentary) drops all three. Loose
   * decoded icons — those NOT inside a retained subtree, which manages its own reuse —
   * are pooled and reattached without a re-decode flash.
   */
  function renderReconcile(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView,
  ): void {
    const scrolls = captureScrollPositions(root);
    const focusKey = captureFocusIdentity(root);

    if (!snapshot) {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "No Snapshot yet.";
      root.replaceChildren(empty);
      return;
    }

    const iconPool = new Map<string, HTMLElement[]>();
    for (const img of root.querySelectorAll<HTMLElement>("[data-icon-pool-key]")) {
      if (img.closest("[data-surface-retain]")) {
        continue;
      }
      const key = img.dataset["iconPoolKey"]!;
      const bucket = iconPool.get(key) ?? [];
      bucket.push(img);
      iconPool.set(key, bucket);
    }

    rendering = true;
    try {
      const next: Node[] = [];
      if (options.showTitle !== false) {
        const title = document.createElement("h2");
        title.className = "dock-surface-title";
        title.textContent = options.title;
        next.push(title);
      }
      for (const child of options.body(snapshot, legality)) {
        if (child === null || child === undefined || child === false) {
          continue;
        }
        next.push(typeof child === "string" ? document.createTextNode(child) : child);
      }

      // Remove children that are gone, then order the rest — insertBefore skips any node
      // already sitting in its target position, so a persistent body is left untouched.
      const keep = new Set<Node>(next);
      for (const current of [...root.childNodes]) {
        if (!keep.has(current)) {
          root.removeChild(current);
        }
      }
      let cursor = root.firstChild;
      for (const node of next) {
        if (node === cursor) {
          cursor = cursor.nextSibling;
          continue;
        }
        root.insertBefore(node, cursor);
      }

      for (const fresh of root.querySelectorAll<HTMLElement>("[data-icon-pool-key]")) {
        if (fresh.closest("[data-surface-retain]")) {
          continue;
        }
        const key = fresh.dataset["iconPoolKey"]!;
        const reused = iconPool.get(key)?.shift();
        if (reused && reused !== fresh) {
          const aria = fresh.getAttribute("aria-label");
          if (aria !== null) {
            reused.setAttribute("aria-label", aria);
          } else {
            reused.removeAttribute("aria-label");
          }
          fresh.replaceWith(reused);
        }
      }
    } finally {
      rendering = false;
    }

    restoreScrollPositions(root, scrolls);
    restoreFocusIdentity(root, focusKey);
  }

  function destroy(): void {
    for (const fn of teardown) {
      fn();
    }
    root.replaceChildren();
    root.classList.remove(className);
    lastSnapshot = null;
    selectionKey = null;
    pending = null;
  }

  return { render, destroy, getSelection, setSelection };
}

/** The "Applies at next Wave" pending-edit marker, duplicated across three surfaces today. */
export function pendingMarker(): HTMLElement {
  const marker = document.createElement("p");
  marker.className = "pending-marker pending-wave";
  marker.textContent = "Applies at next Wave";
  return marker;
}

/**
 * Marks a scroll region with `data-overflow="true|false"` via ResizeObserver +
 * MutationObserver. CSS can show a fade only when overflowing. No scroll
 * listeners and no per-frame style writes — observers schedule at most one
 * rAF sync after a size or content change.
 */
export function bindScrollOverflowAffordance(el: HTMLElement): () => void {
  let scheduled = 0;
  const sync = (): void => {
    if (scheduled !== 0) {
      return;
    }
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      const overflows = el.scrollHeight > el.clientHeight + 1;
      el.dataset["overflow"] = overflows ? "true" : "false";
    });
  };
  const resizeObserver = new ResizeObserver(() => {
    sync();
  });
  resizeObserver.observe(el);
  const mutationObserver = new MutationObserver(() => {
    sync();
  });
  mutationObserver.observe(el, { childList: true, subtree: true, characterData: true });
  sync();
  return () => {
    if (scheduled !== 0) {
      cancelAnimationFrame(scheduled);
      scheduled = 0;
    }
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    delete el.dataset["overflow"];
  };
}
