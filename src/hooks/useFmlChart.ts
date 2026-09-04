import { useMemo } from "react";
import { analyze, parse, type FmlDoc, type FmlFile, type FmlIssue, type FmlStats } from "../fml/index.ts";
import { buildDocGraph, refineEdges } from "../lib/docGraph.ts";
import { docPositionKey, getPositions } from "../lib/nodePositions.ts";
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
  /** The whole parsed file — every doc, so a portal bubble can look one up by name. */
  file: FmlFile;
  /** The doc currently laid out (falls back to the first if `activeDoc` is stale). */
  activeDoc: string;
  /** Identifies this doc for `nodePositions` — pass to `savePositions` on drag. */
  posDocKey: string;
  errors: FmlIssue[];
  warnings: FmlIssue[];
  ok: boolean;
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
    const { nodes: laid, edges } = buildDocGraph(doc, dir);

    // Auto-layout runs fresh on every parse — positions never live in the
    // .fml text. A node you've dragged keeps its spot across a doc switch by
    // being saved separately (nodePositions.ts) and reapplied here.
    const posDocKey = docPositionKey(workspace.entry, doc);
    const saved = getPositions(posDocKey);
    const positioned = Object.keys(saved).length
      ? laid.map((n) => (saved[n.id] ? { ...n, position: saved[n.id]! } : n))
      : laid;

    return {
      nodes: positioned,
      edges: refineEdges(edges, positioned, dir),
      stats: analyze(doc),
      doc,
      docs: res.file.docs.map((d) => d.name),
      file: res.file,
      activeDoc: doc.name,
      posDocKey,
      errors: res.errors,
      warnings: res.warnings,
      ok: res.ok,
    };
  }, [workspace, activeDoc, dir, strict]);
}
