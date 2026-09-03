import { useMemo } from "react";
import { analyze, parse, type FmlDoc, type FmlIssue, type FmlStats } from "../fml/index.ts";
import { layout } from "../lib/layout.ts";
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
    return {
      nodes: layout(nodes, edges, dir),
      edges,
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
