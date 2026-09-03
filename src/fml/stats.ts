// FML — structural analysis of a parsed doc.
// A "flow" here is a weakly-connected component that contains at least one edge.

import type { FmlDoc, FmlFile } from "./types.ts";

export interface FlowGroup {
  /** Node ids in this connected component, sorted. */
  nodes: string[];
  /** Edge count wholly inside this component. */
  edges: number;
  /** Nodes in this component with in-degree 0. Empty ⇒ the flow is cyclic. */
  entryPoints: string[];
}

export interface FmlStats {
  nodes: number;
  edges: number;
  /** Node count per type, e.g. { page: 7, api: 2 }. */
  byType: Record<string, number>;
  /** All in-degree-0 nodes that touch at least one edge, sorted. */
  entryPoints: string[];
  /** All out-degree-0 nodes that touch at least one edge, sorted. */
  terminals: string[];
  /** Declared nodes that appear in no edge, sorted. */
  unwired: string[];
  /** Connected components with ≥ 1 edge, largest first. */
  flows: FlowGroup[];
  /** flows.length — the "how many flows" number. */
  flowCount: number;
}

export function analyze(doc: FmlDoc): FmlStats {
  const ids = doc.nodes.map((n) => n.id);
  const idSet = new Set(ids);

  const inDeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const outDeg = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]));
  const touched = new Set<string>();

  for (const e of doc.edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
    touched.add(e.source);
    touched.add(e.target);
  }

  const byType: Record<string, number> = {};
  for (const n of doc.nodes) byType[n.type] = (byType[n.type] ?? 0) + 1;

  const entryPoints = ids.filter((id) => touched.has(id) && inDeg.get(id) === 0).sort();
  const terminals = ids.filter((id) => touched.has(id) && outDeg.get(id) === 0).sort();
  const unwired = ids.filter((id) => !touched.has(id)).sort();

  // Weakly-connected components over the nodes that touch an edge.
  const seen = new Set<string>();
  const flows: FlowGroup[] = [];
  for (const start of ids) {
    if (seen.has(start) || !touched.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    comp.sort();
    const compSet = new Set(comp);
    flows.push({
      nodes: comp,
      edges: doc.edges.filter((e) => compSet.has(e.source) && compSet.has(e.target)).length,
      entryPoints: comp.filter((id) => inDeg.get(id) === 0).sort(),
    });
  }
  flows.sort((a, b) => b.nodes.length - a.nodes.length || a.nodes[0]!.localeCompare(b.nodes[0]!));

  return {
    nodes: doc.nodes.length,
    edges: doc.edges.length,
    byType,
    entryPoints,
    terminals,
    unwired,
    flows,
    flowCount: flows.length,
  };
}

export interface DocStats {
  name: string;
  stats: FmlStats;
}

/** Per-doc analysis for a whole parsed file. */
export function analyzeFile(file: FmlFile): DocStats[] {
  return file.docs.map((d) => ({ name: d.name, stats: analyze(d) }));
}

export function formatStats(s: FmlStats, title?: string): string {
  const out: string[] = [];
  if (title) out.push(title);

  out.push(`  flows:        ${s.flowCount}`);
  s.flows.forEach((f, i) => {
    const entry = f.entryPoints.length > 0 ? f.entryPoints.join(", ") : "(none — cyclic)";
    out.push(`    ${i + 1}. ${f.nodes.length} nodes · ${f.edges} edges · entry: ${entry}`);
  });

  const types = Object.entries(s.byType)
    .map(([t, c]) => `${c} ${t}`)
    .join(" · ");
  out.push(`  nodes:        ${s.nodes}${types ? `   (${types})` : ""}`);
  out.push(`  edges:        ${s.edges}`);
  out.push(
    `  entry points: ${s.entryPoints.length}${s.entryPoints.length > 0 ? `   (${s.entryPoints.join(", ")})` : ""}`,
  );
  out.push(
    `  terminals:    ${s.terminals.length}${s.terminals.length > 0 ? `   (${s.terminals.join(", ")})` : ""}`,
  );
  if (s.unwired.length > 0) {
    out.push(`  unwired:      ${s.unwired.length}   (${s.unwired.join(", ")})`);
  }
  return out.join("\n");
}
