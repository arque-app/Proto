import { useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import type { FmlFlowNode } from "../types/chart.ts";
import { kindColor } from "../lib/nodeStyle.ts";

interface Props {
  files: string[];
  entry: string;
  onEntry: (name: string) => void;
  docs: string[];
  activeDoc: string;
  onActiveDoc: (name: string) => void;
  /** Laid-out nodes of the active doc. */
  nodes: FmlFlowNode[];
}

const GROUP_LABEL: Record<string, string> = {
  page: "Pages",
  api: "APIs",
  flow: "Flows",
  decision: "Decisions",
};
const groupLabel = (k: string) => GROUP_LABEL[k] ?? `${k[0]!.toUpperCase()}${k.slice(1)}`;
const GROUP_ORDER = ["page", "api", "flow", "decision"];

const navRow = (on: boolean) =>
  `group relative w-full truncate rounded-md py-1.5 pl-2.5 pr-2 text-left text-[12px] transition-colors ${
    on ? "bg-white/[0.06] text-ink" : "text-ink-dim hover:bg-white/[0.035] hover:text-ink"
  }`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-2.5 py-3">
      <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-mute">
        {title}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

export function Sidebar({ files, entry, onEntry, docs, activeDoc, onActiveDoc, nodes }: Props) {
  const { setCenter, getNode } = useReactFlow();

  const focus = (id: string) => {
    const n = getNode(id);
    if (!n) return;
    const w = n.measured?.width ?? 190;
    const h = n.measured?.height ?? 72;
    void setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1.1, duration: 350 });
  };

  const groups = useMemo(() => {
    const by = new Map<string, FmlFlowNode[]>();
    for (const n of nodes) (by.get(n.data.kind) ?? by.set(n.data.kind, []).get(n.data.kind)!).push(n);
    return [...by.entries()]
      .sort((a, b) => {
        const ia = GROUP_ORDER.indexOf(a[0]);
        const ib = GROUP_ORDER.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a[0].localeCompare(b[0]);
      })
      .map(([kind, ns]) => ({
        kind,
        nodes: [...ns].sort((a, b) => a.data.label.localeCompare(b.data.label)),
      }));
  }, [nodes]);

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface text-ink-dim">
      <div className="flex items-center border-b border-line px-3.5 py-3">
        <span
          className="text-[15px] text-ink"
          style={{ fontFamily: "var(--font-brand)", fontWeight: 400 }}
        >
          protoArch
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-mute">fml</span>
      </div>

      {files.length > 1 && (
        <Section title="Files">
          {files.map((f) => (
            <button key={f} className={navRow(f === entry)} onClick={() => onEntry(f)}>
              {f === entry && (
                <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
              <span className="font-mono">{f}</span>
            </button>
          ))}
        </Section>
      )}

      <Section title="Docs">
        {docs.map((d) => (
          <button key={d} className={navRow(d === activeDoc)} onClick={() => onActiveDoc(d)}>
            {d === activeDoc && (
              <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            {d}
          </button>
        ))}
      </Section>

      <Section title={`${activeDoc} · layers`}>
        {groups.length === 0 && (
          <p className="px-1.5 py-1 text-[12px] text-ink-mute">no nodes</p>
        )}
        {groups.map((g) => (
          <div key={g.kind} className="pb-1.5">
            <div className="flex items-center gap-1.5 px-1.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-mute">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: kindColor(g.kind) }} />
              {groupLabel(g.kind)}
              <span className="text-ink-mute/70">{g.nodes.length}</span>
            </div>
            {g.nodes.map((n) => (
              <button
                key={n.id}
                className={`${navRow(false)} pl-3.5`}
                onClick={() => focus(n.id)}
                title={n.id}
              >
                {n.data.label}
              </button>
            ))}
          </div>
        ))}
      </Section>
    </aside>
  );
}
