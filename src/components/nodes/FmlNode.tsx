import { Fragment } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FmlFlowNode } from "../../types/chart.ts";
import { kindColor, kindTag } from "../../lib/nodeStyle.ts";

const SIDES = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
] as const;

/** One node renderer for every FML type; the type only changes the accent. */
export function FmlNode({ data }: NodeProps<FmlFlowNode>) {
  const { label, kind, meta, dir } = data;
  const lr = dir === "LR";
  const primaryTarget = lr ? "left" : "top";
  const primarySource = lr ? "right" : "bottom";
  const accent = kindColor(kind);
  const entries = Object.entries(meta);

  const handleClass = (visible: boolean) =>
    visible
      ? "!h-1.5 !w-1.5 !bg-[#3d3d3d]"
      : "!h-1 !w-1 !bg-transparent !opacity-0";

  return (
    <div
      className="min-w-[176px] max-w-[248px] overflow-hidden rounded-xl border border-line bg-surface-2 shadow-[0_2px_14px_-3px_rgba(0,0,0,0.55)]"
    >
      {SIDES.map(([name, pos]) => (
        <Fragment key={name}>
          <Handle
            id={`t-${name}`}
            type="target"
            position={pos}
            className={handleClass(name === primaryTarget)}
          />
          <Handle
            id={`s-${name}`}
            type="source"
            position={pos}
            className={handleClass(name === primarySource)}
          />
        </Fragment>
      ))}

      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 15%, transparent)` }}
        >
          {kindTag(kind)}
        </span>
        <span className="truncate text-[13px] font-medium text-ink">{label}</span>
      </div>

      {entries.length > 0 && (
        <dl className="space-y-1 border-t border-line px-3 py-2 font-mono text-[11px] leading-relaxed">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-ink-mute">{k}</dt>
              <dd className="truncate text-ink-dim">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
