import type { NodeProps } from "@xyflow/react";
import type { FmlFlowNode } from "../../types/chart.ts";

/**
 * The tinted frame a `flow` portal unfolds into when expanded — a backdrop
 * behind its own React Flow children (the target doc's nodes/edges), not an
 * interactive card itself. `pointer-events-none` so a click on the padding
 * around its content falls through to the pane, same as clicking empty canvas.
 */
export function BubbleNode({ data }: NodeProps<FmlFlowNode>) {
  return (
    <div
      className="pointer-events-none h-full w-full rounded-2xl border"
      style={{
        borderColor: "color-mix(in srgb, var(--color-flow) 30%, transparent)",
        background: "color-mix(in srgb, var(--color-flow) 6%, var(--color-surface))",
      }}
    >
      <div className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute">
        {data.label}
      </div>
    </div>
  );
}
