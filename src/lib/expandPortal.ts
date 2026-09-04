// Unfolds a `flow` portal's target doc inline, right under the portal card, as
// a self-contained "bubble": one container node (rendered as a tinted frame)
// holding the sub-doc's own nodes as React Flow children.
//
// The sub-doc is laid out completely on its own (same dagre pipeline as the
// active doc), then translated + namespaced into the bubble's local space —
// the active doc never knows these ids exist, so nothing here can collide
// with it.

import type { Edge } from "@xyflow/react";
import type { FmlDoc } from "../fml/index.ts";
import { buildDocGraph, refineEdges } from "./docGraph.ts";
import { nodeSize } from "./layout.ts";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";

/** Gap between a portal card and the bubble that unfolds below it. */
const GAP_BELOW = 60;
/** Space kept inside the bubble's frame around its content. */
const PAD = 24;
/** Height of the bubble's own title strip, above the padded content. */
const HEADER_H = 32;
/** Fallback content box for a target doc with nothing in it. */
const EMPTY_W = 220;
const EMPTY_H = 60;

/** What a namespaced bubble-child id maps back to — the real doc + node id,
 *  for resolving selection and edits to the right place. */
export interface BubbleIdEntry {
  doc: string;
  rawId: string;
}

export interface BubbleGraph {
  containerId: string;
  /** Container first, then its namespaced children — React Flow requires a
   *  parent to appear before any node that names it as `parentId`. */
  nodes: FmlFlowNode[];
  edges: Edge[];
  idMap: Map<string, BubbleIdEntry>;
}

/**
 * Lay out `targetDoc` on its own, then re-home it as a bubble anchored just
 * below `portalBox` (the expanding portal's own on-screen rect).
 */
export function expandPortal(
  portalId: string,
  portalBox: { x: number; y: number; w: number; h: number },
  targetDoc: FmlDoc,
  dir: LayoutDirection,
): BubbleGraph {
  const ns = `${portalId}::`;
  const containerId = `${ns}bubble`;
  const idMap = new Map<string, BubbleIdEntry>();
  const origin = { x: portalBox.x, y: portalBox.y + portalBox.h + GAP_BELOW };

  const { nodes: laid, edges: rawEdges } = buildDocGraph(targetDoc, dir);

  if (laid.length === 0) {
    const empty: FmlFlowNode = {
      id: containerId,
      type: "bubble",
      position: origin,
      draggable: false,
      selectable: false,
      zIndex: -1,
      style: { width: EMPTY_W, height: EMPTY_H },
      data: { label: targetDoc.name, kind: "bubble", meta: {}, dir },
    };
    return { containerId, nodes: [empty], edges: [], idMap };
  }

  const finalEdges = refineEdges(rawEdges, laid, dir);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of laid) {
    const { w, h } = nodeSize(n.data);
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const namespacedNodes: FmlFlowNode[] = laid.map((n) => {
    idMap.set(ns + n.id, { doc: targetDoc.name, rawId: n.id });
    return {
      ...n,
      id: ns + n.id,
      parentId: containerId,
      extent: "parent",
      // Bubble content is a read/edit peek, not a rearrangeable mini-canvas —
      // keeping it static sidesteps parent-relative drag + physics-with-
      // nesting edge cases entirely for v1.
      draggable: false,
      position: { x: n.position.x - minX + PAD, y: n.position.y - minY + PAD + HEADER_H },
    };
  });

  const namespacedEdges: Edge[] = finalEdges.map((e) => ({
    ...e,
    id: ns + e.id,
    source: ns + e.source,
    target: ns + e.target,
  }));

  const containerNode: FmlFlowNode = {
    id: containerId,
    type: "bubble",
    position: origin,
    draggable: false,
    selectable: false,
    zIndex: -1,
    style: { width: contentW + PAD * 2, height: contentH + PAD * 2 + HEADER_H },
    data: { label: targetDoc.name, kind: "bubble", meta: {}, dir },
  };

  return {
    containerId,
    nodes: [containerNode, ...namespacedNodes],
    edges: namespacedEdges,
    idMap,
  };
}
