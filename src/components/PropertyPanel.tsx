import { useEffect, useState } from "react";
import type { FmlDoc, FmlEdge, FmlNode } from "../fml/index.ts";

export interface Selection {
  kind: "node" | "edge";
  id: string;
}

interface Props {
  sel: Selection;
  doc: FmlDoc;
  shiftLeft: boolean;
  onClose: () => void;
  onCommitNode: (id: string, block: Record<string, string>, type: string) => void;
  onCommitEdgeLabel: (edge: FmlEdge, label: string) => void;
}

const KNOWN_TYPES = ["page", "api", "flow", "decision"];
const field =
  "w-full rounded-md border border-line bg-bg px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-line-strong";
const keyLabel = "font-mono text-[11px] text-ink-mute";

export function PropertyPanel({
  sel,
  doc,
  shiftLeft,
  onClose,
  onCommitNode,
  onCommitEdgeLabel,
}: Props) {
  const node = sel.kind === "node" ? doc.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel.kind === "edge" ? doc.edges.find((e) => e.id === sel.id) : undefined;

  return (
    <div
      className="absolute top-0 z-10 flex h-full w-[272px] flex-col border-l border-line bg-surface"
      style={{ right: shiftLeft ? 400 : 0 }}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-mute">
          {sel.kind}
        </span>
        <button
          className="rounded px-1.5 text-[13px] leading-none text-ink-mute hover:bg-white/10 hover:text-ink"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {node && <NodeForm key={sel.id} node={node} onCommit={onCommitNode} />}
        {edge && <EdgeForm key={sel.id} edge={edge} onCommit={onCommitEdgeLabel} />}
        {!node && !edge && (
          <p className="text-[12px] text-ink-mute">this element is no longer in the doc</p>
        )}
      </div>
    </div>
  );
}

function NodeForm({
  node,
  onCommit,
}: {
  node: FmlNode;
  onCommit: (id: string, block: Record<string, string>, type: string) => void;
}) {
  const [type, setType] = useState(node.type);
  // rows = every key/value the @node block should hold (label first)
  const seed = () => {
    const { label, ...meta } = node.data;
    const rows: [string, string][] = [];
    if (label !== undefined) rows.push(["label", label]);
    for (const [k, v] of Object.entries(meta)) rows.push([k, v]);
    return rows;
  };
  const [rows, setRows] = useState<[string, string][]>(seed);

  useEffect(() => {
    setType(node.type);
    setRows(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const block = (r: [string, string][]) => Object.fromEntries(r.filter(([k]) => k.trim() !== ""));

  const commit = (nextRows: [string, string][], nextType = type) =>
    onCommit(node.id, block(nextRows), nextType);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className={keyLabel}>id</div>
        <div className="mt-1 font-mono text-[12px] text-ink">{node.id}</div>
      </div>

      <div>
        <div className={keyLabel}>type</div>
        <select
          className={`${field} mt-1`}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            commit(rows, e.target.value);
          }}
        >
          {(KNOWN_TYPES.includes(type) ? KNOWN_TYPES : [type, ...KNOWN_TYPES]).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="h-px bg-line" />

      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input
              className={`${field} flex-1`}
              value={k}
              placeholder="key"
              onChange={(e) => {
                const next = rows.map((r, j) => (j === i ? ([e.target.value, r[1]] as [string, string]) : r));
                setRows(next);
              }}
              onBlur={() => commit(rows)}
            />
            <button
              className="rounded px-1.5 text-[12px] text-ink-mute hover:bg-white/10 hover:text-ink"
              onClick={() => {
                const next = rows.filter((_, j) => j !== i);
                setRows(next);
                commit(next);
              }}
            >
              ✕
            </button>
          </div>
          <input
            className={field}
            value={v}
            placeholder={k === "label" ? node.id : "value"}
            onChange={(e) => {
              const next = rows.map((r, j) => (j === i ? ([r[0], e.target.value] as [string, string]) : r));
              setRows(next);
            }}
            onBlur={() => commit(rows)}
            onKeyDown={(e) => e.key === "Enter" && commit(rows)}
          />
        </div>
      ))}

      <button
        className="self-start rounded-md border border-line px-2 py-1 text-[11px] text-ink-dim hover:bg-white/[0.06] hover:text-ink"
        onClick={() => setRows([...rows, ["", ""]])}
      >
        + property
      </button>
    </div>
  );
}

function EdgeForm({
  edge,
  onCommit,
}: {
  edge: FmlEdge;
  onCommit: (edge: FmlEdge, label: string) => void;
}) {
  const [label, setLabel] = useState(edge.label);
  useEffect(() => setLabel(edge.label), [edge]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className={keyLabel}>edge</div>
        <div className="mt-1 font-mono text-[12px] text-ink">
          {edge.source} <span className="text-ink-mute">→</span> {edge.target}
        </div>
      </div>

      <div>
        <div className={keyLabel}>label</div>
        <input
          className={`${field} mt-1`}
          value={label}
          placeholder="(none)"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onCommit(edge, label)}
          onKeyDown={(e) => e.key === "Enter" && onCommit(edge, label)}
        />
      </div>

      {edge.data && Object.keys(edge.data).length > 0 && (
        <div>
          <div className={keyLabel}>note</div>
          <dl className="mt-1 space-y-1 font-mono text-[11px]">
            {Object.entries(edge.data).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-ink-mute">{k}</dt>
                <dd className="text-ink-dim">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-[10px] text-ink-mute">edit notes in the Source panel for now</p>
        </div>
      )}
    </div>
  );
}
