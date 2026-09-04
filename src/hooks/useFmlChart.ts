import { useMemo } from "react";
import { analyze, parse, type FmlDoc, type FmlIssue, type FmlStats } from "../fml/index.ts";
import { layout, nodeRects, type NodeRect } from "../lib/layout.ts";
import { toReactFlow } from "../lib/toReactFlow.ts";
import type { FmlFlowNode, LayoutDirection } from "../types/chart.ts";
import { makeResolver, type Workspace } from "../types/workspace.ts";
import type { Edge } from "@xyflow/react";

export interface FmlChart {
  nodes: FmlFlowNode[];
  edges: Edge[];
  stats: FmlStats;
  /** The raw parsed doc being shown — for the property panel to read/edit. */
  doc: FmlDoc;
  /** Every doc in the parsed file — `main` plus any `@doc` / resolved `@fof`. */
  docs: string[];
  /** The doc currently laid out (falls back to the first if `activeDoc` is stale). */
  activeDoc: string;
  errors: FmlIssue[];
  warnings: FmlIssue[];
  ok: boolean;
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

/**
 * Give each edge a label anchor (`data.lx/ly`) that isn't parked on top of a
 * node. Start at the midpoint between the two node centres; if that lands
 * inside any node box, slide it toward the source end, then sideways, until it
 * clears. Gutter-routed back edges keep the anchor the edge renderer computes.
 */
function placeLabels(edges: Edge[], rects: Map<string, NodeRect>): Edge[] {
  const boxes = [...rects.values()];
  const hits = (x: number, y: number) =>
    boxes.some((r) => x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2);

  return edges.map((e) => {
    if (typeof e.data?.routed === "string") return e;
    const s = rects.get(e.source);
    const t = rects.get(e.target);
    if (!s || !t) return e;

    let mx = (s.cx + t.cx) / 2;
    let my = (s.cy + t.cy) / 2;

    if (hits(mx, my)) {
      const dx = s.cx - t.cx;
      const dy = s.cy - t.cy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      let done = false;
      for (let d = 10; d <= 160 && !done; d += 10) {
        if (!hits(mx + ux * d, my + uy * d)) {
          mx += ux * d;
          my += uy * d;
          done = true;
        }
      }
      for (let d = 28; d <= 220 && !done; d += 14) {
        if (!hits(mx + d, my)) {
          mx += d;
          done = true;
        } else if (!hits(mx - d, my)) {
          mx -= d;
          done = true;
        }
      }
    }

    return { ...e, data: { ...e.data, lx: mx, ly: my } };
  });
}

/**
 * Parse the workspace entry file (resolving `@fof` against the other files),
 * then lay out whichever doc is active.
 * `strict: false` keeps rendering a half-typed file — undeclared refs become
 * warnings and get placeholder nodes instead of blocking the whole chart.
 */
export function useFmlChart(
  workspace: Workspace,
  activeDoc: string | null,
  dir: LayoutDirection,
  strict: boolean,
): FmlChart {
  return useMemo(() => {
    const src = workspace.files[workspace.entry] ?? "";
    const res = parse(src, { strict, resolve: makeResolver(workspace.files) });
    const doc = res.file.docs.find((d) => d.name === activeDoc) ?? res.file.docs[0]!;
    const { nodes, edges } = toReactFlow(doc, dir);
    const laid = layout(nodes, edges, dir);
    return {
      nodes: laid,
      edges: placeLabels(fanEdges(routeBackEdges(edges, laid, dir)), nodeRects(laid)),
      stats: analyze(doc),
      doc,
      docs: res.file.docs.map((d) => d.name),
      activeDoc: doc.name,
      errors: res.errors,
      warnings: res.warnings,
      ok: res.ok,
    };
  }, [workspace, activeDoc, dir, strict]);
}
