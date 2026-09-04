import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

/** Outward bow (px) for an edge routed around the nodes via a side handle. */
const SIDE_BOW = 62;

function awayFrom(p: Position): { x: number; y: number } {
  if (p === Position.Left) return { x: -1, y: 0 };
  if (p === Position.Right) return { x: 1, y: 0 };
  if (p === Position.Top) return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

/**
 * Edge renderer for FML flows.
 * - The primary edge of a node pair is an orthogonal (right-angle) step path,
 *   so a flow reads like a flowchart rather than a nest of curves.
 * - Reciprocal / repeated edges leave via a side handle (chosen in
 *   `toReactFlow`) and are drawn as a wide C-curve that bows away from the
 *   nodes, so they read as a route around rather than a straight line.
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
  // `useFmlChart` and marked here, so it gets the same wide arc as a parallel
  // edge instead of a bezier that would cut back through the node stack.
  const routed = typeof data?.routed === "string";

  let path: string;
  let labelX: number;
  let labelY: number;

  if (index === 0 && !routed) {
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });
    // Nudge the primary label off the mid-segment toward the source, so it
    // clears the bowed label of any side-routed return edge on the same pair.
    labelX += (sourceX - targetX) * 0.1;
    labelY += (sourceY - targetY) * 0.1;
  } else {
    // Same-side handles: bow outward by a fixed amount (getBezierPath collapses
    // to a near-straight line when the handles are vertically colinear).
    const tier = index > 0 ? Math.floor((index - 1) / 2) : 0; // 0 for idx 1/2…
    const span = Math.hypot(targetX - sourceX, targetY - sourceY);
    const bow = routed
      ? 74 + Math.min(span * 0.08, 64) // scale a back edge's bow with its reach
      : SIDE_BOW + tier * 46;
    const d = awayFrom(sourcePosition);
    const c1x = sourceX + d.x * bow;
    const c1y = sourceY + d.y * bow;
    const c2x = targetX + d.x * bow;
    const c2y = targetY + d.y * bow;
    path = `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2 + d.x * bow * 0.82;
    labelY = (sourceY + targetY) / 2 + d.y * bow * 0.82;
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={24} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className={`pointer-events-none absolute rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors ${
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
