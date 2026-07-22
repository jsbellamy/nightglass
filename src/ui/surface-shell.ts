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
    lastSnapshot = snapshot;
    lastLegality = legality;

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

  function destroy(): void {
    root.replaceChildren();
    root.classList.remove(className);
    lastSnapshot = null;
    selectionKey = null;
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
