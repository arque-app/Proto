import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
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
 * - The primary edge of a node pair is a plain bezier (straight down a stack).
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
}: EdgeProps) {
  const index = Number(data?.parallelIndex ?? 0);

  let path: string;
  let labelX: number;
  let labelY: number;

  if (index === 0) {
    [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    // Nudge the primary label back toward the source so it clears the
    // mid-curve labels of any side-routed return edge on the same pair.
    labelX += (sourceX - targetX) * 0.13;
    labelY += (sourceY - targetY) * 0.13;
  } else {
    // Same-side handles: bow outward by a fixed amount (getBezierPath collapses
    // to a near-straight line when the handles are vertically colinear).
    const tier = Math.floor((index - 1) / 2); // 0 for idx 1/2, 1 for idx 3/4…
    const bow = SIDE_BOW + tier * 46;
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
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-dim ring-1 ring-line"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
