import dagre from "@dagrejs/dagre";
import { Position, type Edge } from "@xyflow/react";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";

const NODE_W = 190;
const NODE_H = 72;

/** Run dagre and return the nodes with absolute positions + handle sides set. */
export function layout(
  nodes: FmlFlowNode[],
  edges: Edge[],
  dir: LayoutDirection,
): FmlFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 45, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    return {
      ...n,
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
      sourcePosition: dir === "LR" ? Position.Right : Position.Bottom,
      targetPosition: dir === "LR" ? Position.Left : Position.Top,
      data: { ...n.data, dir },
    };
  });
}
