// Turns one parsed FmlDoc into a laid-out React Flow graph. Shared by the
// active doc (useFmlChart) and by a portal's inline "bubble" (expandPortal) —
// both need exactly the same dagre → back-edge-routing → fan-out pipeline.

import type { Edge } from "@xyflow/react";
import type { FmlDoc } from "../fml/index.ts";
import { layout } from "./layout.ts";
import { toReactFlow } from "./toReactFlow.ts";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";

/** Parse-to-positions: dagre's rank layout, nothing position-dependent yet. */
export function buildDocGraph(
  doc: FmlDoc,
  dir: LayoutDirection,
): { nodes: FmlFlowNode[]; edges: Edge[] } {
  const { nodes, edges } = toReactFlow(doc, dir);
  return { nodes: layout(nodes, edges, dir), edges };
}

/**
 * A "back edge" points at a node in an earlier rank (its target sits above the
 * source in TB, or left of it in LR). With the default bottom→top handles it
 * would drive straight up through every rank in between, passing behind the
 * nodes. Re-route it out one side so it loops cleanly around the outside; the
 * side is picked so it bows away from the diagram's spine. Parallel edges are
 * already side-routed by `toReactFlow`, so they're left alone.
 */
function routeBackEdges(edges: Edge[], laid: FmlFlowNode[], dir: LayoutDirection): Edge[] {
  const pos = new Map(laid.map((n) => [n.id, n.position]));
  return edges.map((e) => {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) return e;
    if ((Number(e.data?.parallelCount ?? 1)) > 1) return e;

    const back = dir === "LR" ? t.x < s.x - 1 : t.y < s.y - 1;
    if (!back) return e;

    const side =
      dir === "LR"
        ? s.y <= t.y
          ? "bottom"
          : "top"
        : s.x >= t.x
          ? "right"
          : "left";

    return {
      ...e,
      sourceHandle: `s-${side}`,
      targetHandle: `t-${side}`,
      data: { ...e.data, routed: side },
    };
  });
}

/**
 * Edges that share an exit point (same source + source handle) or an entry
 * point (same target + target handle) get drawn on top of each other near the
 * node, and their labels stack. Tag each with its index within that fan so the
 * edge renderer can spread them along the node's side.
 */
function fanEdges(edges: Edge[]): Edge[] {
  const outKey = (e: Edge) => `${e.source}|${e.sourceHandle ?? ""}`;
  const inKey = (e: Edge) => `${e.target}|${e.targetHandle ?? ""}`;
  const out = new Map<string, string[]>();
  const inn = new Map<string, string[]>();
  for (const e of edges) {
    (out.get(outKey(e)) ?? out.set(outKey(e), []).get(outKey(e))!).push(e.id);
    (inn.get(inKey(e)) ?? inn.set(inKey(e), []).get(inKey(e))!).push(e.id);
  }
  return edges.map((e) => {
    const o = out.get(outKey(e))!;
    const i = inn.get(inKey(e))!;
    return {
      ...e,
      data: {
        ...e.data,
        outIndex: o.indexOf(e.id),
        outCount: o.length,
        inIndex: i.indexOf(e.id),
        inCount: i.length,
      },
    };
  });
}

/** Position-dependent edge refinements — call once the nodes' final positions
 *  (post any saved-position override) are settled. */
export function refineEdges(edges: Edge[], positionedNodes: FmlFlowNode[], dir: LayoutDirection): Edge[] {
  return fanEdges(routeBackEdges(edges, positionedNodes, dir));
}
