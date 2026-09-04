import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

/**
 * Edge renderer for FML flows. Every edge is an orthogonal (right-angle) step
 * path so a flow reads like a flowchart, not a nest of curves.
 * - The primary edge of a node pair runs straight between the main handles.
 * - Reciprocal / repeated / back edges leave via a side handle (chosen in
 *   `toReactFlow` / `useFmlChart`) and are stood off from the node by a growing
 *   `offset`, so each runs in its own vertical gutter around the stack instead
 *   of one big curve bellying across the whole diagram.
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

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
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
