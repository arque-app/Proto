import { useEffect, useRef, useState } from "react";
import { forceCollide, forceManyBody, forceSimulation, forceX, forceY, type Simulation } from "d3-force";
import { nodeSize } from "../lib/layout.ts";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  w: number;
  h: number;
  /** Dagre's own position for this node — what "repel, but stay in order" pulls back toward. */
  anchorX: number;
  anchorY: number;
}

/** Minimum gap kept between two cards, beyond their own footprint. */
const PADDING = 16;
/** How hard a node is pulled back toward its dagre rank — the read-order axis. */
const RANK_PULL = 0.55;
/** How hard a node is pulled back toward its dagre column — the free axis. Weak,
 *  so collision/repulsion still has room to spread nodes out sideways. */
const DRIFT_PULL = 0.08;

/** Circular collision radius from a rectangular card — conservative (never
 *  under-estimates), so two cards can never actually overlap. */
function radius(n: SimNode): number {
  return Math.hypot(n.w, n.h) / 2 + PADDING / 2;
}

export interface ForceLayout {
  /** Live centre positions, keyed by node id. Empty until the first tick lands. */
  positions: Map<string, { x: number; y: number }>;
  /** Pin a node under the pointer and wake the simulation so neighbours react. */
  onDrag: (id: string, centerX: number, centerY: number) => void;
  /** Release the pin — the node keeps its dropped spot but is free to be pushed again. */
  onDragEnd: (id: string) => void;
}

/**
 * A light physics pass layered on dagre's rank layout — nodes repel each
 * other with a minimum-distance threshold (never overlap), gently spread out
 * when crowded, and react live while dragging, the way a force-directed graph
 * does. Dagre still decides *structure* (rank, back-edge routing, handle
 * sides, the step badge order); this only refines the pixel spacing, pulled
 * back toward dagre's own position so the flow keeps reading top to bottom.
 *
 * Existing nodes keep their current (settled or hand-dragged) spot across an
 * unrelated edit — only their anchor and size refresh — so editing a node's
 * text doesn't reset the whole graph's layout. New nodes seed in at their
 * dagre position and settle from there; nodes no longer in the doc drop out.
 */
export function useForceLayout(nodes: FmlFlowNode[], dir: LayoutDirection): ForceLayout {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const byId = useRef<Map<string, SimNode>>(new Map());

  useEffect(() => {
    const next = new Map<string, SimNode>();
    for (const n of nodes) {
      const { w, h } = nodeSize(n.data);
      const anchorX = n.position.x + w / 2;
      const anchorY = n.position.y + h / 2;
      const prev = byId.current.get(n.id);
      next.set(
        n.id,
        prev
          ? { ...prev, w, h, anchorX, anchorY }
          : { id: n.id, x: anchorX, y: anchorY, w, h, anchorX, anchorY },
      );
    }
    byId.current = next;
    const simNodes = [...next.values()];

    if (!simRef.current) {
      simRef.current = forceSimulation<SimNode>().velocityDecay(0.45).on("tick", () => {
        const p = new Map<string, { x: number; y: number }>();
        for (const n of byId.current.values()) p.set(n.id, { x: n.x, y: n.y });
        setPositions(p);
      });
    }

    const xStrength = dir === "LR" ? RANK_PULL : DRIFT_PULL;
    const yStrength = dir === "LR" ? DRIFT_PULL : RANK_PULL;

    simRef.current
      .nodes(simNodes)
      .force("collide", forceCollide<SimNode>(radius).strength(1))
      .force("charge", forceManyBody<SimNode>().strength(-60))
      .force("x", forceX<SimNode>((n) => n.anchorX).strength(xStrength))
      .force("y", forceY<SimNode>((n) => n.anchorY).strength(yStrength))
      .alpha(0.6)
      .restart();
  }, [nodes, dir]);

  useEffect(() => {
    return () => {
      simRef.current?.stop();
    };
  }, []);

  const onDrag = (id: string, centerX: number, centerY: number) => {
    const n = byId.current.get(id);
    if (!n) return;
    n.fx = centerX;
    n.fy = centerY;
    simRef.current?.alpha(0.3).restart();
  };

  const onDragEnd = (id: string) => {
    const n = byId.current.get(id);
    if (!n) return;
    // Where it was dropped becomes its new "home" — the rank pull should hold
    // it there, not drag it back toward dagre's original guess. (The chart's
    // own re-layout picks this up as the real anchor next time it re-parses,
    // via the saved position in nodePositions.ts; this just keeps the running
    // simulation from fighting the drop in the meantime.)
    n.anchorX = n.fx ?? n.x;
    n.anchorY = n.fy ?? n.y;
    n.fx = null;
    n.fy = null;
    simRef.current?.alpha(0.15).restart();
  };

  return { positions, onDrag, onDragEnd };
}
