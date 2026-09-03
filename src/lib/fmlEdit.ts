// Targeted text edits back into `.fml` source. Each function changes one thing
// (a node's block, a node's type, an edge's label) inside one `@doc` and leaves
// the rest of the file — comments, other nodes, formatting — untouched.

const DOC_HEADER = /^@doc\s+([A-Za-z0-9_]+)\s*$/;
const NODES_HEADER = /^\s*@nodes\s*$/;
const cleanLabel = (raw: string) => raw.replace(/^[-\s]+|[-\s]+$/g, "");

/** Line range [start, end) holding one doc's body. */
function docSpan(lines: string[], docName: string): { start: number; end: number } {
  const headers: { name: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = DOC_HEADER.exec(lines[i]!);
    if (m) headers.push({ name: m[1]!, line: i });
  }
  if (headers.length === 0) return { start: 0, end: lines.length };

  const idx = headers.findIndex((h) => h.name === docName);
  if (idx === -1) {
    return docName === "main"
      ? { start: 0, end: headers[0]!.line }
      : { start: 0, end: lines.length };
  }
  return {
    start: headers[idx]!.line + 1,
    end: idx + 1 < headers.length ? headers[idx + 1]!.line : lines.length,
  };
}

/** Where to drop a new `@node` block inside a doc. */
function nodeBlockInsertPoint(lines: string[], start: number, end: number): number {
  let lastClose = -1;
  let inNode = false;
  for (let i = start; i < end; i++) {
    if (/^\s*@node\s+[A-Za-z0-9_]+\s*\{\s*$/.test(lines[i]!)) inNode = true;
    else if (inNode && lines[i]!.trim() === "}") {
      lastClose = i;
      inNode = false;
    }
  }
  if (lastClose !== -1) return lastClose + 1;

  let nodesAt = -1;
  for (let i = start; i < end; i++) {
    if (NODES_HEADER.test(lines[i]!)) {
      nodesAt = i;
      break;
    }
  }
  if (nodesAt !== -1) {
    let last = nodesAt;
    for (let i = nodesAt + 1; i < end; i++) {
      if (/^@/.test(lines[i]!)) break;
      if (lines[i]!.trim() !== "") last = i;
    }
    return last + 1;
  }
  return end;
}

/**
 * Replace / insert / remove the `@node <id> { … }` block for one node.
 * `data` carries every key the block should have (`label` included); keys with
 * an empty value are dropped, and an empty `data` removes the block entirely.
 */
export function setNodeBlock(
  src: string,
  docName: string,
  nodeId: string,
  data: Record<string, string>,
): string {
  const lines = src.split("\n");
  const { start, end } = docSpan(lines, docName);
  const headerRe = new RegExp(`^\\s*@node\\s+${nodeId}\\s*\\{\\s*$`);

  let blkStart = -1;
  let blkEnd = -1;
  for (let i = start; i < end; i++) {
    if (!headerRe.test(lines[i]!)) continue;
    blkStart = i;
    for (let j = i + 1; j < end; j++) {
      if (lines[j]!.trim() === "}") {
        blkEnd = j;
        break;
      }
    }
    break;
  }

  const entries = Object.entries(data).filter(([k, v]) => k.trim() !== "" && v.trim() !== "");
  const block =
    entries.length > 0
      ? [`@node ${nodeId} {`, ...entries.map(([k, v]) => `  ${k}: ${v}`), "}"]
      : null;

  if (blkStart !== -1 && blkEnd !== -1) {
    if (block) lines.splice(blkStart, blkEnd - blkStart + 1, ...block);
    else lines.splice(blkStart, blkEnd - blkStart + 1);
  } else if (block) {
    const at = nodeBlockInsertPoint(lines, start, end);
    const prevBlank = at > 0 && lines[at - 1]!.trim() === "";
    lines.splice(at, 0, ...(prevBlank ? block : ["", ...block]));
  }
  return lines.join("\n");
}

/** Change a node's type on its `@nodes` declaration line. */
export function setNodeType(
  src: string,
  docName: string,
  nodeId: string,
  type: string,
): string {
  const lines = src.split("\n");
  const { start, end } = docSpan(lines, docName);
  const re = new RegExp(`^(\\s*)(${nodeId})\\s*=\\s*[A-Za-z0-9_]+\\s*$`);
  for (let i = start; i < end; i++) {
    const m = re.exec(lines[i]!);
    if (m) {
      lines[i] = `${m[1]}${m[2]} = ${type}`;
      break;
    }
  }
  return lines.join("\n");
}

/** Rewrite the label on the first flow line that matches this edge. */
export function setEdgeLabel(
  src: string,
  docName: string,
  edge: { source: string; target: string; label: string },
  newLabel: string,
): string {
  const lines = src.split("\n");
  const { start, end } = docSpan(lines, docName);
  const seg = newLabel.trim() === "" ? "->" : `-${newLabel.trim()}>`;

  let group: string | null = null;
  for (let i = start; i < end; i++) {
    const line = lines[i]!;

    const gOpen = /^(\s*)([A-Za-z0-9_]+)\s*:\s*$/.exec(line);
    if (gOpen) {
      group = gOpen[2]!;
      continue;
    }

    const inl = /^(\s*)([A-Za-z0-9_]+)\s*-([^>\n]*)>\s*([A-Za-z0-9_]+)(\s*\{)?\s*$/.exec(line);
    if (inl) {
      group = null;
      if (inl[2] === edge.source && inl[4] === edge.target && cleanLabel(inl[3]!) === edge.label) {
        lines[i] = `${inl[1]}${inl[2]} ${seg} ${inl[4]}${inl[5] ? " {" : ""}`;
        break;
      }
      continue;
    }

    const grp = /^(\s*)-([^>\n]*)>\s*([A-Za-z0-9_]+)(\s*\{)?\s*$/.exec(line);
    if (grp && group === edge.source && grp[3] === edge.target && cleanLabel(grp[2]!) === edge.label) {
      lines[i] = `${grp[1]}${seg} ${grp[3]}${grp[4] ? " {" : ""}`;
      break;
    }

    if (/^@/.test(line)) group = null;
  }
  return lines.join("\n");
}
