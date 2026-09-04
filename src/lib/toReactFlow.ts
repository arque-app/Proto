import { MarkerType, type Edge } from "@xyflow/react";
import type { FmlDoc } from "../fml/index.ts";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";

/** Map a parsed FML doc onto React Flow nodes/edges (positions filled in by layout). */
export function toReactFlow(
  doc: FmlDoc,
  dir: LayoutDirection,
): { nodes: FmlFlowNode[]; edges: Edge[] } {
  const nodes: FmlFlowNode[] = doc.nodes.map((n) => {
    // `label:` in a @node block overrides the displayed name; it is not shown
    // again in the metadata list.
    const { label, ...meta } = n.data;
    return {
      id: n.id,
      // One renderer for every FML type — the type is carried in `data.kind`
      // and drives the card's accent, glyph and shape cues.
      type: "fml",
      position: { x: 0, y: 0 },
      data: { label: label || n.id, kind: n.type, meta, dir },
    };
  });

  // Group edges by unordered node pair so the custom edge can fan apart
  // reciprocal (A→B / B→A) and repeated edges instead of overlapping them.
  const pairKey = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`);
  const pairs = new Map<string, string[]>();
  for (const e of doc.edges) {
    const k = pairKey(e.source, e.target);
    const arr = pairs.get(k);
    if (arr) arr.push(e.id);
    else pairs.set(k, [e.id]);
  }

  // A node pointing at itself can't use bottom→top of its own card — that's a
  // straight line through zero distance and folds into a squiggle over the
  // title. Route it corner-to-corner instead, so it loops visibly beside the
  // card. Grouped separately in case a node has more than one self edge.
  const selfLoops = new Map<string, string[]>();
  for (const e of doc.edges) {
    if (e.source !== e.target) continue;
    const arr = selfLoops.get(e.source);
    if (arr) arr.push(e.id);
    else selfLoops.set(e.source, [e.id]);
  }
  const SELF_LOOP_HANDLES = [
    { source: "s-right", target: "t-top" },
    { source: "s-left", target: "t-top" },
    { source: "s-right", target: "t-bottom" },
    { source: "s-left", target: "t-bottom" },
  ];

  // Primary flow uses the direction's main sides; extra edges between the same
  // pair (reciprocals, repeats) leave via a side handle so they loop *around*
  // the nodes instead of cutting through them.
  const primary =
    dir === "LR"
      ? { source: "s-right", target: "t-left" }
      : { source: "s-bottom", target: "t-top" };
  const sideA = dir === "LR" ? "bottom" : "right";
  const sideB = dir === "LR" ? "top" : "left";

  const edges: Edge[] = doc.edges.map((e) => {
    const siblings = pairs.get(pairKey(e.source, e.target))!;
    const idx = siblings.indexOf(e.id);
    const count = siblings.length;
    const selfLoop = e.source === e.target;

    let sourceHandle: string;
    let targetHandle: string;
    if (selfLoop) {
      const sibs = selfLoops.get(e.source)!;
      const hs = SELF_LOOP_HANDLES[sibs.indexOf(e.id) % SELF_LOOP_HANDLES.length]!;
      sourceHandle = hs.source;
      targetHandle = hs.target;
    } else if (count > 1 && idx > 0) {
      const side = idx % 2 === 1 ? sideA : sideB;
      sourceHandle = `s-${side}`;
      targetHandle = `t-${side}`;
    } else {
      sourceHandle = primary.source;
      targetHandle = primary.target;
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle,
      label: e.label || undefined,
      type: "flow",
      data: { parallelIndex: idx, parallelCount: count, selfLoop },
      style: { stroke: "#6f6f6f", strokeWidth: 1.75 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: "#6f6f6f" },
    };
  });

  return { nodes, edges };
}
