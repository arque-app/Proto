import type { ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.ts";

interface Props {
  /** Stable key — the collapsed state is remembered per panel. */
  id: string;
  title: ReactNode;
  side: "left" | "right";
  /** Extra px to inset from that side (docked right panels, zoom controls). */
  inset?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A floating card docked to the bottom-left or bottom-right of the canvas.
 * The title bar is always shown; clicking it collapses the body so the panel
 * shrinks to just that bar at the bottom edge. Collapsed state persists.
 */
export function DockPanel({ id, title, side, inset = 0, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useLocalStorage(`protoarque_dock_${id}`, defaultOpen);

  return (
    <div
      className="absolute bottom-3 z-10 w-[min(400px,calc(50%-1rem))] overflow-hidden rounded-xl border border-line bg-surface/95 backdrop-blur-md"
      style={side === "left" ? { left: 12 + inset } : { right: 12 + inset }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute transition-colors hover:text-ink"
        title={open ? "Minimise" : "Expand"}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span aria-hidden className="text-[10px] leading-none">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="max-h-[40vh] overflow-auto border-t border-line p-1.5">{children}</div>
      )}
    </div>
  );
}
