export type MechanicalPopoverSide = "right" | "left";

export interface MechanicalPopoverController {
  show(anchor: HTMLElement): void;
  reposition(): void;
  hide(): void;
  destroy(): void;
}

const DEFAULT_GAP = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function horizontalSpace(
  side: MechanicalPopoverSide,
  boundsRect: DOMRect,
  anchorRect: DOMRect,
  popoverWidth: number,
  gap: number,
): number {
  if (side === "right") {
    const left = anchorRect.right + gap;
    const available = boundsRect.right - gap - left;
    return Math.min(available, popoverWidth);
  }
  const left = anchorRect.left - gap - popoverWidth;
  const available = left - (boundsRect.left + gap);
  return Math.min(available, popoverWidth);
}

function fitsHorizontally(
  side: MechanicalPopoverSide,
  boundsRect: DOMRect,
  anchorRect: DOMRect,
  popoverWidth: number,
  gap: number,
): boolean {
  if (side === "right") {
    return anchorRect.right + gap + popoverWidth <= boundsRect.right - gap;
  }
  return anchorRect.left - gap - popoverWidth >= boundsRect.left + gap;
}

function leftForSide(
  side: MechanicalPopoverSide,
  anchorRect: DOMRect,
  popoverWidth: number,
  gap: number,
): number {
  return side === "right"
    ? anchorRect.right + gap
    : anchorRect.left - gap - popoverWidth;
}

function chooseSide(
  boundsRect: DOMRect,
  anchorRect: DOMRect,
  popoverWidth: number,
  gap: number,
): MechanicalPopoverSide {
  const rightFits = fitsHorizontally("right", boundsRect, anchorRect, popoverWidth, gap);
  if (rightFits) {
    return "right";
  }
  const leftFits = fitsHorizontally("left", boundsRect, anchorRect, popoverWidth, gap);
  if (leftFits) {
    return "left";
  }
  const rightSpace = horizontalSpace("right", boundsRect, anchorRect, popoverWidth, gap);
  const leftSpace = horizontalSpace("left", boundsRect, anchorRect, popoverWidth, gap);
  return rightSpace >= leftSpace ? "right" : "left";
}

function dockBounds(bounds: HTMLElement): HTMLElement {
  return bounds.closest<HTMLElement>(".management-dock") ?? bounds;
}

function placePopover(
  popover: HTMLElement,
  bounds: HTMLElement,
  anchor: HTMLElement,
  gap: number,
  lockedSide: MechanicalPopoverSide | null,
): MechanicalPopoverSide {
  popover.hidden = false;
  popover.style.visibility = "hidden";

  const boundsRect = dockBounds(bounds).getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const popoverWidth = popover.offsetWidth;
  const popoverHeight = popover.offsetHeight;

  const side =
    lockedSide ?? chooseSide(boundsRect, anchorRect, popoverWidth, gap);

  let left = leftForSide(side, anchorRect, popoverWidth, gap);
  const minLeft = boundsRect.left + gap;
  const maxLeft = boundsRect.right - gap - popoverWidth;
  left = clamp(left, minLeft, maxLeft);

  let top = anchorRect.top + (anchorRect.height - popoverHeight) / 2;
  const minTop = boundsRect.top + gap;
  const maxTop = boundsRect.bottom - gap - popoverHeight;
  top = clamp(top, minTop, maxTop);

  popover.style.position = "fixed";
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.style.visibility = "";
  popover.dataset["mechanicalPopoverSide"] = side;

  return side;
}

export function mountMechanicalPopoverController(options: {
  popover: HTMLElement;
  bounds: HTMLElement;
  gap?: number;
}): MechanicalPopoverController {
  const { popover, bounds } = options;
  const gap = options.gap ?? DEFAULT_GAP;
  let activeAnchor: HTMLElement | null = null;
  let lockedSide: MechanicalPopoverSide | null = null;
  let onResize: (() => void) | null = null;

  function bindResize(): void {
    if (onResize) {
      return;
    }
    onResize = () => {
      if (activeAnchor) {
        placePopover(popover, bounds, activeAnchor, gap, lockedSide);
      }
    };
    window.addEventListener("resize", onResize);
  }

  function unbindResize(): void {
    if (!onResize) {
      return;
    }
    window.removeEventListener("resize", onResize);
    onResize = null;
  }

  return {
    show(anchor: HTMLElement) {
      if (activeAnchor !== anchor) {
        if (!activeAnchor || document.contains(activeAnchor)) {
          lockedSide = null;
        }
      }
      activeAnchor = anchor;
      lockedSide = placePopover(popover, bounds, anchor, gap, lockedSide);
      bindResize();
    },
    reposition() {
      if (!activeAnchor) {
        return;
      }
      placePopover(popover, bounds, activeAnchor, gap, lockedSide);
    },
    hide() {
      activeAnchor = null;
      lockedSide = null;
      popover.hidden = true;
      delete popover.dataset["mechanicalPopoverSide"];
      unbindResize();
    },
    destroy() {
      this.hide();
    },
  };
}
