import dagre from "@dagrejs/dagre";
import { Position, type Edge } from "@xyflow/react";
import type { FmlFlowNode, FmlNodeData, LayoutDirection } from "../types/chart.ts";

/** Flat width estimate — the card is clamped to 188–264px; this sits mid-range. */
const NODE_W = 212;

/** Keep in sync with FmlNode: header, per-row height, the "+n more" row, image. */
const HEADER_H = 40;
const ROW_H = 19;
const MORE_H = 18;
const IMAGE_H = 96;
const META_LIMIT = 4;
const RENDERABLE_IMAGE = /^(https?:|data:image\/)/i;

/**
 * Estimate a node's rendered height from its data, so dagre reserves enough
 * vertical room and tall API cards stop overlapping their neighbours. It only
 * needs to be close — React Flow still positions from the real measured box.
 */
function estimateHeight(data: FmlNodeData): number {
  const hasImage = !!data.meta.image && RENDERABLE_IMAGE.test(data.meta.image);
  const rows = Object.keys(data.meta).filter((k) => !(hasImage && k === "image")).length;
  let h = HEADER_H;
  if (rows > 0) h += Math.min(rows, META_LIMIT) * ROW_H + 8;
  if (rows > META_LIMIT) h += MORE_H;
  if (hasImage) h += IMAGE_H;
  return h;
}

/** Run dagre and return the nodes with absolute positions + handle sides set. */
export function layout(
  nodes: FmlFlowNode[],
  edges: Edge[],
  dir: LayoutDirection,
): FmlFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: 48, ranksep: 88, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const size = new Map<string, { w: number; h: number }>();
  for (const n of nodes) {
    const h = estimateHeight(n.data);
    size.set(n.id, { w: NODE_W, h });
    g.setNode(n.id, { width: NODE_W, height: h });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const p = g.node(n.id);
    const { w, h } = size.get(n.id)!;
    return {
      ...n,
      position: { x: p.x - w / 2, y: p.y - h / 2 },
      sourcePosition: dir === "LR" ? Position.Right : Position.Bottom,
      targetPosition: dir === "LR" ? Position.Left : Position.Top,
      data: { ...n.data, dir },
    };
  });
}
