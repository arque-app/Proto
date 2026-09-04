import { useEffect, useRef, useState } from "react";
import { forceCollide, forceManyBody, forceSimulation, type Simulation } from "d3-force";
import { nodeSize } from "../lib/layout.ts";
import type { FmlFlowNode } from "../types/chart.ts";

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
}

/** Minimum gap kept between two cards, beyond their own footprint. */
const PADDING = 16;

/** Circular collision radius from a rectangular card — conservative (never
 *  under-estimates), so two cards can never actually overlap. */
function radius(n: SimNode): number {
  return Math.hypot(n.w, n.h) / 2 + PADDING / 2;
}

export interface ForceLayout {
  /** Live centre-position overrides, keyed by node id. Empty at rest — the
   *  graph is exactly dagre's own static layout until a drag is in progress. */
  positions: Map<string, { x: number; y: number }>;
  /** Start a push session, seeded from every node's current on-screen spot. */
  onDragStart: (baseNodes: FmlFlowNode[]) => void;
  /** Pin a node under the pointer and wake the simulation so neighbours react. */
  onDrag: (id: string, centerX: number, centerY: number) => void;
  /** Freeze immediately where things are — no lingering settle afterward. */
  onDragEnd: () => void;
  /** Drop back to dagre's own static layout — call on any structural change
   *  (new parse, doc switch) so a stale push never lingers past its doc. */
  reset: () => void;
}

/**
 * Repulsion that only exists *during* a drag — at rest this changes nothing:
 * the graph is exactly dagre's static rank layout, no idle motion, no settle
 * animation. Drag a node and the simulation wakes up (collision + light
 * repulsion only, no pull back to any "home" position) so crowded neighbours
 * push out of the way live; release it and the simulation is stopped on the
 * spot, freezing whatever the current spacing is until the next drag.
 *
 * Dagre still decides *structure* — rank, back-edge routing, handle sides,
 * the step badge order — this never touches any of that, only final pixel
 * position while a push is actually happening.
 */
export function useForceLayout(): ForceLayout {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const byId = useRef<Map<string, SimNode>>(new Map());

  useEffect(() => {
    return () => {
      simRef.current?.stop();
    };
  }, []);

  const ensureSim = (): Simulation<SimNode, undefined> => {
    if (simRef.current) return simRef.current;
    const sim = forceSimulation<SimNode>().velocityDecay(0.5).on("tick", () => {
      const p = new Map<string, { x: number; y: number }>();
      for (const n of byId.current.values()) p.set(n.id, { x: n.x, y: n.y });
      setPositions(p);
    });
    simRef.current = sim;
    return sim;
  };

  const onDragStart = (baseNodes: FmlFlowNode[]) => {
    // Seed from wherever each node is *right now* — the frozen spot left by
    // an earlier push this session if there is one, otherwise dagre's own
    // position — never a stale/reset position, so starting a second drag
    // doesn't visually snap everything back first.
    const seeded = new Map<string, SimNode>();
    for (const n of baseNodes) {
      const { w, h } = nodeSize(n.data);
      const cur = positions.get(n.id);
      const x = cur ? cur.x : n.position.x + w / 2;
      const y = cur ? cur.y : n.position.y + h / 2;
      seeded.set(n.id, { id: n.id, x, y, w, h });
    }
    byId.current = seeded;

    const sim = ensureSim();
    sim
      .nodes([...seeded.values()])
      .force("collide", forceCollide<SimNode>(radius).strength(1))
      .force("charge", forceManyBody<SimNode>().strength(-40))
      .alpha(0.5)
      .restart();
  };

  const onDrag = (id: string, centerX: number, centerY: number) => {
    const n = byId.current.get(id);
    if (!n) return;
    n.fx = centerX;
    n.fy = centerY;
    simRef.current?.alpha(0.4).restart();
  };

  const onDragEnd = () => {
    for (const n of byId.current.values()) {
      n.fx = null;
      n.fy = null;
    }
    // Freeze right where things are — no continued settle, no snap-back.
    simRef.current?.stop();
  };

  const reset = () => {
    simRef.current?.stop();
    byId.current = new Map();
    setPositions((prev) => (prev.size === 0 ? prev : new Map()));
  };

  return { positions, onDragStart, onDrag, onDragEnd, reset };
}
