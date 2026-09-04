import type { Node } from "@xyflow/react";

export type LayoutDirection = "TB" | "LR";

export interface FmlNodeData {
  /** Display name — the FML node id. */
  label: string;
  /** FML node type ("page", "api", or anything else declared). */
  kind: string;
  /** Metadata from the node's `@node { ... }` block. */
  meta: Record<string, string>;
  /** Current layout direction, so the custom node can place its handles. */
  dir: LayoutDirection;
  /** 1-based flow position (dagre rank), for the step badge. Same-rank nodes share it. */
  order?: number;
  /** Set while a node's badge is "traced": this node's role relative to it. */
  traceRole?: "self" | "in" | "out" | "dim";
  /** Toggle trace mode for a node id — wired in by FlowCanvas, called from the badge. */
  onBadge?: (id: string) => void;
  /** React Flow requires node data to be an index signature. */
  [key: string]: unknown;
}

export type FmlFlowNode = Node<FmlNodeData>;
