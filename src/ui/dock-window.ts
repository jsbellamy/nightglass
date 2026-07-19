import { dockRect, type Rect } from "./dock-geometry";
import { DOCK_HEIGHT, DOCK_WIDTH } from "./dock-geometry";

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
}

export interface DockWebviewWindow {
  show(): Promise<void>;
  hide(): Promise<void>;
  setPosition(x: number, y: number): Promise<void>;
  once(event: "tauri://created", handler: () => void): void;
}

export function createDockWindowPort(deps: DockWindowDeps = {}): DockWindowPort {
  const isTauri = deps.isTauri ?? isTauriRuntime();
  let open = false;
  let moveCleanup: (() => void) | null = null;
  let dockWindow: DockWebviewWindow | null = null;

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

  return {
    async open() {
      if (open) {
        return;
      }
      const windowRef = await ensureDockWindow();
      await applyPosition();
      if (windowRef) {
        await windowRef.show();
      }
      open = true;
      if (!moveCleanup && deps.onTileMoved) {
        moveCleanup = deps.onTileMoved(() => {
          void applyPosition();
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

export function createProductionDockWindowPort(): DockWindowPort {
  if (!isTauriRuntime()) {
    return createDockWindowPort();
  }

  return createDockWindowPort({
    isTauri: true,
    dockUrl: `${window.location.origin}${window.location.pathname}?window=dock`,
    async getTileOuterPosition() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const tile = getCurrentWindow();
      const position = await tile.outerPosition();
      const size = await tile.outerSize();
      return {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      };
    },
    async getMonitorForTile() {
      const { currentMonitor } = await import("@tauri-apps/api/window");
      const monitor = await currentMonitor();
      if (!monitor) {
        return { x: 0, y: 0, width: 1920, height: 1080 };
      }
      return {
        x: monitor.position.x,
        y: monitor.position.y,
        width: monitor.size.width,
        height: monitor.size.height,
      };
    },
    async getDockWindow() {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { LogicalPosition } = await import("@tauri-apps/api/dpi");
      const existing = await WebviewWindow.getByLabel(DOCK_WINDOW_LABEL);
      if (!existing) {
        return null;
      }
      return {
        show: () => existing.show(),
        hide: () => existing.hide(),
        setPosition: async (x, y) => {
          await existing.setPosition(new LogicalPosition(x, y));
        },
        once: (event, handler) => {
          existing.once(event, handler);
        },
      };
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
      return {
        show: () => dock.show(),
        hide: () => dock.hide(),
        setPosition: async (x, y) => {
          await dock.setPosition(new LogicalPosition(x, y));
        },
        once: (event, handler) => {
          dock.once(event, handler);
        },
      };
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
