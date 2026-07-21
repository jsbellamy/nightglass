import type { ReadonlySnapshot } from "../core/snapshot";

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
  body(snapshot: ReadonlySnapshot): Child[];
}

export interface MountedSurface {
  render(snapshot: ReadonlySnapshot | null): void;
  destroy(): void;
}

/**
 * The shared management-surface shell: clears the root, renders the empty
 * state when there is no Snapshot yet, renders the title, then the body.
 */
export function mountSurfaceShell(
  root: HTMLElement,
  className: string,
  options: SurfaceShellOptions,
): MountedSurface {
  root.classList.add(className);

  function render(snapshot: ReadonlySnapshot | null): void {
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

    for (const child of options.body(snapshot)) {
      appendChild(root, child);
    }
  }

  function destroy(): void {
    root.replaceChildren();
    root.classList.remove(className);
  }

  return { render, destroy };
}

/** The "Applies at next Wave" pending-edit marker, duplicated across three surfaces today. */
export function pendingMarker(): HTMLElement {
  const marker = document.createElement("p");
  marker.className = "pending-marker pending-wave";
  marker.textContent = "Applies at next Wave";
  return marker;
}
