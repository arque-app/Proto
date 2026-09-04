import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

/** Max gap between two edges sharing one exit/entry point, before it's clamped. */
const FAN_GAP = 20;

const horiz = (p: Position) => p === Position.Top || p === Position.Bottom;

/** Even spread of `n` items around 0, so index `i` sits at its share of a fan. */
function fanShift(i: number, n: number): number {
  if (n <= 1) return 0;
  const gap = Math.min(FAN_GAP, 150 / (n - 1));
  return (i - (n - 1) / 2) * gap;
}

/**
 * Edge renderer for FML flows. Every edge is an orthogonal (right-angle) step
 * path so a flow reads like a flowchart, not a nest of curves.
 * - The primary edge of a node pair runs straight between the main handles.
 * - Reciprocal / repeated / back edges leave via a side handle (chosen in
 *   `toReactFlow` / `useFmlChart`) and are stood off from the node by a growing
 *   `offset`, so each runs in its own vertical gutter around the stack instead
 *   of one big curve bellying across the whole diagram.
 * - Edges sharing one exit (or entry) point are fanned apart along that side
 *   (`fanEdges` in `useFmlChart` tags the index), so their labels stop stacking.
 */
export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps) {
  const index = Number(data?.parallelIndex ?? 0);
  // A back edge (target in an earlier rank) is re-routed onto one side by
  // `useFmlChart` and marked here, so it takes the gutter route rather than a
  // straight path that would cut back up through the node stack.
  const routed = typeof data?.routed === "string";

  // `offset` = how far the path stands off the node before it turns. The
  // primary edge hugs the handle (small offset); side-routed edges push out
  // into a gutter, further per tier so parallels don't stack on one line.
  const tier = index > 0 ? Math.floor((index - 1) / 2) : 0;
  const offset = index === 0 && !routed ? 10 : routed ? 30 : 24 + tier * 18;

  // Spread this edge along its source/target side if it shares that point with
  // siblings. The shift is along the side (x for a top/bottom handle, y for a
  // left/right one), so the endpoint stays on the node's border.
  const outShift = fanShift(Number(data?.outIndex ?? 0), Number(data?.outCount ?? 1));
  const inShift = fanShift(Number(data?.inIndex ?? 0), Number(data?.inCount ?? 1));
  const sx = sourceX + (horiz(sourcePosition) ? outShift : 0);
  const sy = sourceY + (horiz(sourcePosition) ? 0 : outShift);
  const tx = targetX + (horiz(targetPosition) ? inShift : 0);
  const ty = targetY + (horiz(targetPosition) ? 0 : inShift);

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    borderRadius: 8,
    offset,
  });

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            title={typeof label === "string" ? label : undefined}
            className={`pointer-events-none absolute z-[6] max-w-[150px] truncate rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium shadow-[0_1px_6px_rgba(0,0,0,0.55)] transition-colors ${
              data?.traceDim === true ? "opacity-20" : ""
            } ${
              selected
                ? "bg-accent/15 text-ink ring-1 ring-accent/60"
                : "bg-elevated text-ink-dim ring-1 ring-line"
            }`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
