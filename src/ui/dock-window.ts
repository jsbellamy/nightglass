import { dockRect, type Rect } from "./dock-geometry";
import { DOCK_HEIGHT, DOCK_WIDTH } from "./dock-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "./battle-tile-layout";
import type { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const DOCK_WINDOW_LABEL = "dock";

export interface MonitorRect extends Rect {}

export interface DockWindowGeometry {
  tile: Rect;
  monitor: MonitorRect;
}

export interface DockWindowPort {
  open(): Promise<void>;
  close(): Promise<void>;
  toggle(): Promise<boolean>;
  isOpen(): boolean;
  reposition(geometry: DockWindowGeometry): Promise<void>;
  syncPositionFromTile(): Promise<void>;
  destroy(): void;
}

export interface DockWindowDeps {
  isTauri?: boolean;
  dockUrl?: string;
  getTileOuterPosition?: () => Promise<Rect>;
  getMonitorForTile?: () => Promise<MonitorRect>;
  getDockWindow?: () => Promise<DockWebviewWindow | null>;
  createDockWindow?: (url: string) => Promise<DockWebviewWindow>;
  onTileMoved?: (listener: () => void) => () => void;
  /** Frame scheduler, injectable so tests can step it. Defaults to requestAnimationFrame. */
  scheduleFrame?: (callback: () => void | Promise<void>) => void;
  /** Clears cached scale-factor / monitor reads. Called from close() and destroy(). */
  invalidateGeometryCache?: () => void;
}

export interface DockWebviewWindow {
  show(): Promise<void>;
  hide(): Promise<void>;
  setPosition(x: number, y: number): Promise<void>;
  ready(): Promise<void>;
}

export interface DockGeometryHost {
  scaleFactor(): Promise<number>;
  outerPosition(): Promise<{ x: number; y: number }>;
  currentMonitor(): Promise<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>;
}

export function physicalRectToLogical(rect: Rect, scaleFactor: number): Rect {
  return {
    x: rect.x / scaleFactor,
    y: rect.y / scaleFactor,
    width: rect.width / scaleFactor,
    height: rect.height / scaleFactor,
  };
}

function defaultScheduleFrame(callback: () => void | Promise<void>): void {
  const run = () => {
    void callback();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
    return;
  }
  queueMicrotask(run);
}

function monitorIdentity(
  monitor: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null,
): string {
  if (!monitor) {
    return "none";
  }
  return `${monitor.position.x},${monitor.position.y},${monitor.size.width},${monitor.size.height}`;
}

/** Cached tile/monitor geometry readers — scale and monitor stay warm mid-drag. */
export function createCachedDockGeometryDeps(host: DockGeometryHost): {
  getTileOuterPosition: () => Promise<Rect>;
  getMonitorForTile: () => Promise<MonitorRect>;
  invalidateGeometryCache: () => void;
} {
  let scaleFactorCache: number | null = null;
  let monitorCache: MonitorRect | null = null;
  let lastMonitorIdentity: string | null = null;

  async function readScaleFactor(): Promise<number> {
    if (scaleFactorCache != null) {
      return scaleFactorCache;
    }
    scaleFactorCache = await host.scaleFactor();
    return scaleFactorCache;
  }

  return {
    async getTileOuterPosition() {
      const scaleFactor = await readScaleFactor();
      const position = await host.outerPosition();
      return physicalRectToLogical(
        {
          x: position.x,
          y: position.y,
          width: TILE_WIDTH * scaleFactor,
          height: TILE_HEIGHT * scaleFactor,
        },
        scaleFactor,
      );
    },
    async getMonitorForTile() {
      if (monitorCache) {
        return monitorCache;
      }
      const raw = await host.currentMonitor();
      const identity = monitorIdentity(raw);
      if (lastMonitorIdentity != null && identity !== lastMonitorIdentity) {
        scaleFactorCache = null;
      }
      lastMonitorIdentity = identity;
      const scaleFactor = await readScaleFactor();
      if (!raw) {
        monitorCache = { x: 0, y: 0, width: 1920, height: 1080 };
        return monitorCache;
      }
      monitorCache = physicalRectToLogical(
        {
          x: raw.position.x,
          y: raw.position.y,
          width: raw.size.width,
          height: raw.size.height,
        },
        scaleFactor,
      );
      return monitorCache;
    },
    invalidateGeometryCache() {
      scaleFactorCache = null;
      monitorCache = null;
    },
  };
}

export function createDockWindowPort(deps: DockWindowDeps = {}): DockWindowPort {
  const isTauri = deps.isTauri ?? isTauriRuntime();
  const scheduleFrame = deps.scheduleFrame ?? defaultScheduleFrame;
  let open = false;
  let moveCleanup: (() => void) | null = null;
  let dockWindow: DockWebviewWindow | null = null;
  let pendingMove = false;
  let frameScheduled = false;

  async function ensureDockWindow(): Promise<DockWebviewWindow | null> {
    if (!isTauri) {
      return null;
    }
    if (dockWindow) {
      return dockWindow;
    }
    const existing = deps.getDockWindow ? await deps.getDockWindow() : null;
    if (existing) {
      dockWindow = existing;
      return dockWindow;
    }
    const url = deps.dockUrl ?? `${window.location.origin}${window.location.pathname}?window=dock`;
    dockWindow = deps.createDockWindow ? await deps.createDockWindow(url) : null;
    return dockWindow;
  }

  async function readGeometry(): Promise<DockWindowGeometry | null> {
    if (!deps.getTileOuterPosition || !deps.getMonitorForTile) {
      return null;
    }
    const tile = await deps.getTileOuterPosition();
    const monitor = await deps.getMonitorForTile();
    return { tile, monitor };
  }

  async function applyPosition(): Promise<void> {
    const geometry = await readGeometry();
    if (!geometry) {
      return;
    }
    const next = dockRect(geometry.tile, geometry.monitor);
    const windowRef = await ensureDockWindow();
    if (windowRef) {
      await windowRef.setPosition(next.x, next.y);
    }
  }

  async function runScheduledFrame(): Promise<void> {
    frameScheduled = false;
    if (!pendingMove) {
      return;
    }
    pendingMove = false;
    await applyPosition();
    if (pendingMove) {
      scheduleMoveFrame();
    }
  }

  function scheduleMoveFrame(): void {
    if (frameScheduled) {
      return;
    }
    frameScheduled = true;
    scheduleFrame(() => runScheduledFrame());
  }

  function onTileMoved(): void {
    pendingMove = true;
    scheduleMoveFrame();
  }

  return {
    async open() {
      if (open) {
        return;
      }
      const windowRef = await ensureDockWindow();
      if (windowRef) {
        try {
          await windowRef.ready();
        } catch {
          dockWindow = null;
          return;
        }
        await applyPosition();
        await windowRef.show();
      }
      open = true;
      if (!moveCleanup && deps.onTileMoved) {
        moveCleanup = deps.onTileMoved(() => {
          onTileMoved();
        });
      }
    },
    async close() {
      if (!open) {
        return;
      }
      const windowRef = await ensureDockWindow();
      if (windowRef) {
        await windowRef.hide();
      }
      open = false;
      deps.invalidateGeometryCache?.();
    },
    async toggle() {
      if (open) {
        await this.close();
        return false;
      }
      await this.open();
      return true;
    },
    isOpen() {
      return open;
    },
    async reposition(geometry) {
      const next = dockRect(geometry.tile, geometry.monitor);
      const windowRef = await ensureDockWindow();
      if (windowRef) {
        await windowRef.setPosition(next.x, next.y);
      }
    },
    async syncPositionFromTile() {
      await applyPosition();
    },
    destroy() {
      moveCleanup?.();
      moveCleanup = null;
      dockWindow = null;
      open = false;
      pendingMove = false;
      frameScheduled = false;
      deps.invalidateGeometryCache?.();
    },
  };
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const DOCK_WINDOW_SIZE = {
  width: DOCK_WIDTH,
  height: DOCK_HEIGHT,
} as const;

export function wrapDockWebviewWindow(
  windowRef: Pick<WebviewWindow, "show" | "hide" | "setPosition" | "once">,
  LogicalPosition: new (x: number, y: number) => object,
  options: { awaitCreated: boolean },
): DockWebviewWindow {
  const readinessPromise = options.awaitCreated
    ? new Promise<void>((resolve, reject) => {
        windowRef.once("tauri://created", () => {
          resolve();
        });
        windowRef.once("tauri://error", () => {
          reject(new Error("tauri://error"));
        });
      })
    : null;

  if (readinessPromise) {
    readinessPromise.catch(() => {});
  }

  return {
    show: () => windowRef.show(),
    hide: () => windowRef.hide(),
    setPosition: async (x, y) => {
      await windowRef.setPosition(
        new LogicalPosition(x, y) as Parameters<WebviewWindow["setPosition"]>[0],
      );
    },
    ready: () => readinessPromise ?? Promise.resolve(),
  };
}

export function createProductionDockWindowPort(): DockWindowPort {
  if (!isTauriRuntime()) {
    return createDockWindowPort();
  }

  const geometry = createCachedDockGeometryDeps({
    async scaleFactor() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow().scaleFactor();
    },
    async outerPosition() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const position = await getCurrentWindow().outerPosition();
      return { x: position.x, y: position.y };
    },
    async currentMonitor() {
      const { currentMonitor } = await import("@tauri-apps/api/window");
      const monitor = await currentMonitor();
      if (!monitor) {
        return null;
      }
      return {
        position: { x: monitor.position.x, y: monitor.position.y },
        size: { width: monitor.size.width, height: monitor.size.height },
      };
    },
  });

  return createDockWindowPort({
    isTauri: true,
    dockUrl: `${window.location.origin}${window.location.pathname}?window=dock`,
    getTileOuterPosition: geometry.getTileOuterPosition,
    getMonitorForTile: geometry.getMonitorForTile,
    invalidateGeometryCache: geometry.invalidateGeometryCache,
    async getDockWindow() {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { LogicalPosition } = await import("@tauri-apps/api/dpi");
      const existing = await WebviewWindow.getByLabel(DOCK_WINDOW_LABEL);
      if (!existing) {
        return null;
      }
      return wrapDockWebviewWindow(existing, LogicalPosition, { awaitCreated: false });
    },
    async createDockWindow(url) {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { LogicalPosition } = await import("@tauri-apps/api/dpi");
      const dock = new WebviewWindow(DOCK_WINDOW_LABEL, {
        url,
        width: DOCK_WIDTH,
        height: DOCK_HEIGHT,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        visible: false,
        focus: true,
      });
      return wrapDockWebviewWindow(dock, LogicalPosition, { awaitCreated: true });
    },
    onTileMoved(listener) {
      let unlisten: (() => void) | null = null;
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        void getCurrentWindow()
          .onMoved(() => {
            listener();
          })
          .then((dispose: () => void) => {
            unlisten = dispose;
          });
      });
      return () => {
        unlisten?.();
      };
    },
  });
}
