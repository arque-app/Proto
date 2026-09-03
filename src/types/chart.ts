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
  /** React Flow requires node data to be an index signature. */
  [key: string]: unknown;
}

export type FmlFlowNode = Node<FmlNodeData>;
