import { useEffect, useState } from "react";
import {
  NODE_TYPES,
  UNTYPED,
  isKnownType,
  missingKeys,
  nodeTypeSpec,
  type FmlDoc,
  type FmlEdge,
  type FmlNode,
} from "../fml/index.ts";
import { kindColor } from "../lib/nodeStyle.ts";
import { Glyph } from "./Glyph.tsx";

export interface Selection {
  kind: "node" | "edge";
  id: string;
}

interface Props {
  sel: Selection;
  doc: FmlDoc;
  /** Panel width taken by the source editor, so this docks beside it. */
  shiftLeft: number;
  onClose: () => void;
  onCommitNode: (id: string, block: Record<string, string>, type: string) => void;
  onCommitEdgeLabel: (edge: FmlEdge, label: string) => void;
  onCommitEdgeNote: (edge: FmlEdge, data: Record<string, string>) => void;
}

type Row = [string, string];

const field =
  "w-full rounded-md border border-line bg-bg px-2 py-1 font-mono text-[11px] text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent/60";
const keyLabel = "font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute";
const chip =
  "rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink";

export function PropertyPanel({
  sel,
  doc,
  shiftLeft,
  onClose,
  onCommitNode,
  onCommitEdgeLabel,
  onCommitEdgeNote,
}: Props) {
  const node = sel.kind === "node" ? doc.nodes.find((n) => n.id === sel.id) : undefined;
  const edge = sel.kind === "edge" ? doc.edges.find((e) => e.id === sel.id) : undefined;
  const accent = node ? kindColor(node.type) : "var(--color-accent)";

  return (
    <div
      className="absolute top-0 z-10 flex h-full w-[280px] flex-col border-l border-line bg-surface"
      style={{ right: shiftLeft }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span style={{ color: accent }}>
          {node ? <Glyph kind={node.type} size={13} /> : <ArrowGlyph />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
          {node ? (node.data.label || node.id) : edge ? `${edge.source} → ${edge.target}` : sel.id}
        </span>
        <button
          className="rounded px-1.5 text-[13px] leading-none text-ink-mute transition-colors hover:bg-white/10 hover:text-ink"
          onClick={onClose}
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {node && <NodeForm key={sel.id} node={node} onCommit={onCommitNode} />}
        {edge && (
          <EdgeForm
            key={sel.id}
            edge={edge}
            onCommitLabel={onCommitEdgeLabel}
            onCommitNote={onCommitEdgeNote}
          />
        )}
        {!node && !edge && (
          <p className="text-[12px] text-ink-mute">this element is no longer in the doc</p>
        )}
      </div>
    </div>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 8h11 M10 4.5 13.5 8 10 11.5" />
    </svg>
  );
}

/** Editable list of `key: value` rows shared by the node block and the edge note. */
function KeyValueRows({
  rows,
  setRows,
  commit,
  valuePlaceholder,
}: {
  rows: Row[];
  setRows: (r: Row[]) => void;
  commit: (r: Row[]) => void;
  valuePlaceholder?: (key: string) => string;
}) {
  const patch = (i: number, next: Row) => setRows(rows.map((r, j) => (j === i ? next : r)));

  return (
    <>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input
              className={`${field} flex-1`}
              value={k}
              placeholder="key"
              onChange={(e) => patch(i, [e.target.value, v])}
              onBlur={() => commit(rows)}
            />
            <button
              className="rounded px-1.5 text-[12px] text-ink-mute transition-colors hover:bg-white/10 hover:text-ink"
              onClick={() => {
                const next = rows.filter((_, j) => j !== i);
                setRows(next);
                commit(next);
              }}
              title={`Remove ${k || "row"}`}
            >
              ✕
            </button>
          </div>
          <input
            className={field}
            value={v}
            placeholder={valuePlaceholder?.(k) ?? "value"}
            onChange={(e) => patch(i, [k, e.target.value])}
            onBlur={() => commit(rows)}
            onKeyDown={(e) => e.key === "Enter" && commit(rows)}
          />
        </div>
      ))}
    </>
  );
}

function NodeForm({
  node,
  onCommit,
}: {
  node: FmlNode;
  onCommit: (id: string, block: Record<string, string>, type: string) => void;
}) {
  const seed = (): Row[] => {
    const { label, ...meta } = node.data;
    const rows: Row[] = [];
    if (label !== undefined) rows.push(["label", label]);
    for (const [k, v] of Object.entries(meta)) rows.push([k, v]);
    return rows;
  };

  const [type, setType] = useState(node.type);
  const [rows, setRows] = useState<Row[]>(seed);

  useEffect(() => {
    setType(node.type);
    setRows(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const commit = (nextRows: Row[], nextType = type) =>
    onCommit(node.id, Object.fromEntries(nextRows.filter(([k]) => k.trim() !== "")), nextType);

  const addKey = (key: string) => {
    const next: Row[] = [...rows.filter(([k]) => k !== key), [key, ""]];
    setRows(next);
  };

  const spec = nodeTypeSpec(type);
  const present = new Set(rows.map(([k]) => k));
  const missing = missingKeys(type, Object.fromEntries(rows));
  const suggestions = spec ? spec.optional.filter((k) => !present.has(k)) : [];
  const options = isKnownType(type) ? NODE_TYPES.map((t) => t.type) : [type, ...NODE_TYPES.map((t) => t.type)];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className={keyLabel}>id</div>
        <div className="mt-1 font-mono text-[12px] text-ink">{node.id}</div>
      </div>

      <div>
        <div className={keyLabel}>type</div>
        <select
          className={`${field} mt-1 cursor-pointer`}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            commit(rows, e.target.value);
          }}
        >
          {options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] leading-snug text-ink-mute">
          {spec
            ? spec.summary
            : type === UNTYPED
              ? "Never declared under @nodes — give it a type to make it mean something."
              : "Outside the standard vocabulary. It draws, but nothing can reason about it."}
        </p>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-line bg-bg/60 p-2">
          <div className="text-[11px] text-ink-dim">
            A <span className="font-mono">{type}</span> is expected to carry:
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {missing.map((k) => (
              <button key={k} className={chip} onClick={() => addKey(k)}>
                + {k}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-line" />

      <KeyValueRows
        rows={rows}
        setRows={setRows}
        commit={commit}
        valuePlaceholder={(k) => (k === "label" ? node.id : "value")}
      />

      <div className="flex flex-wrap items-center gap-1">
        <button
          className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
          onClick={() => setRows([...rows, ["", ""]])}
        >
          + property
        </button>
        {suggestions.map((k) => (
          <button key={k} className={chip} onClick={() => addKey(k)}>
            + {k}
          </button>
        ))}
      </div>
    </div>
  );
}

function EdgeForm({
  edge,
  onCommitLabel,
  onCommitNote,
}: {
  edge: FmlEdge;
  onCommitLabel: (edge: FmlEdge, label: string) => void;
  onCommitNote: (edge: FmlEdge, data: Record<string, string>) => void;
}) {
  const [label, setLabel] = useState(edge.label);
  const [rows, setRows] = useState<Row[]>(() => Object.entries(edge.data ?? {}));

  useEffect(() => {
    setLabel(edge.label);
    setRows(Object.entries(edge.data ?? {}));
  }, [edge]);

  const commitNote = (next: Row[]) =>
    onCommitNote(edge, Object.fromEntries(next.filter(([k]) => k.trim() !== "")));

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
          onBlur={() => onCommitLabel(edge, label)}
          onKeyDown={(e) => e.key === "Enter" && onCommitLabel(edge, label)}
        />
        <p className="mt-1 text-[11px] leading-snug text-ink-mute">
          Shown on the arrow — a status, a trigger, a condition.
        </p>
      </div>

      <div className="h-px bg-line" />

      <div className={keyLabel}>note</div>
      <KeyValueRows rows={rows} setRows={setRows} commit={commitNote} />

      <button
        className="self-start rounded-md border border-line px-2 py-1 text-[11px] text-ink-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
        onClick={() => setRows([...rows, ["", ""]])}
      >
        + note key
      </button>
    </div>
  );
}
