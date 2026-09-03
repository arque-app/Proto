/** Node-type accent colours, shared by the canvas nodes and the sidebar. */
const KIND_COLOR: Record<string, string> = {
  page: "var(--color-page)",
  api: "var(--color-api)",
  flow: "var(--color-flow)",
  decision: "var(--color-decision)",
};

export function kindColor(kind: string): string {
  return KIND_COLOR[kind] ?? "#8a8a8a";
}

/** How a type is labelled on a node's tag chip. */
export function kindTag(kind: string): string {
  return kind.toUpperCase();
}
