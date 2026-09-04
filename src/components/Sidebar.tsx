import { useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import type { FmlEdge, FmlStats } from "../fml/index.ts";
import type { FmlFlowNode } from "../types/chart.ts";
import { kindColor, kindPlural } from "../lib/nodeStyle.ts";
import { Glyph } from "./Glyph.tsx";
import type { Selection } from "./PropertyPanel.tsx";

interface Props {
  files: string[];
  entry: string;
  onEntry: (name: string) => void;
  onRemoveFile: (name: string) => void;
  docs: string[];
  activeDoc: string;
  onActiveDoc: (name: string) => void;
  /** Laid-out nodes of the active doc. */
  nodes: FmlFlowNode[];
  /** Parsed edges of the active doc — used for the walkthrough. */
  edges: FmlEdge[];
  stats: FmlStats;
  selection: Selection | null;
  onSelect: (sel: Selection | null) => void;
  onCollapse: () => void;
}

/** Standard types first, in reading order; anything else falls to the bottom. */
const GROUP_ORDER = ["page", "api", "decision", "event", "flow"];

const navRow = (on: boolean) =>
  `group relative flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2.5 pr-1.5 text-left text-[12px] transition-colors ${
    on ? "bg-white/[0.06] text-ink" : "text-ink-dim hover:bg-white/[0.035] hover:text-ink"
  }`;

function ActiveBar() {
  return (
    <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
  );
}

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

interface WalkthroughStep {
  source: string;
  label: string;
  target: string;
  isBack: boolean;
}

function buildWalkthrough(nodes: FmlFlowNode[], edges: FmlEdge[]): WalkthroughStep[] {
  const hasInbound = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !hasInbound.has(n.id)).map((n) => n.id);
  // If everything is in a cycle (no root), start from the first node.
  const queue = roots.length > 0 ? [...roots] : nodes.slice(0, 1).map((n) => n.id);

  const steps: WalkthroughStep[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const e of edges.filter((e) => e.source === id)) {
      const isBack = visited.has(e.target);
      steps.push({ source: e.source, label: e.label, target: e.target, isBack });
      if (!isBack) queue.push(e.target);
    }
  }
  return steps;
}

export function Sidebar({
  files,
  entry,
  onEntry,
  onRemoveFile,
  docs,
  activeDoc,
  onActiveDoc,
  nodes,
  edges,
  stats,
  selection,
  onSelect,
  onCollapse,
}: Props) {
  const { setCenter, getNode } = useReactFlow();

  const walkthrough = useMemo(() => buildWalkthrough(nodes, edges), [nodes, edges]);

  const pick = (id: string) => {
    onSelect({ kind: "node", id });
    const n = getNode(id);
    if (!n) return;
    const w = n.measured?.width ?? 190;
    const h = n.measured?.height ?? 72;
    void setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1.1, duration: 350 });
  };

  const groups = useMemo(() => {
    const by = new Map<string, FmlFlowNode[]>();
    for (const n of nodes) {
      const kind = n.data.kind;
      const bucket = by.get(kind);
      if (bucket) bucket.push(n);
      else by.set(kind, [n]);
    }
    const rank = (k: string) => {
      const i = GROUP_ORDER.indexOf(k);
      return i === -1 ? GROUP_ORDER.length : i;
    };
    return [...by.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([kind, ns]) => ({
        kind,
        nodes: [...ns].sort((a, b) => a.data.label.localeCompare(b.data.label)),
      }));
  }, [nodes]);

  const selectedNode = selection?.kind === "node" ? selection.id : null;

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface text-ink-dim">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
        <span
          className="text-[15px] text-ink"
          style={{ fontFamily: "var(--font-brand)", fontWeight: 400 }}
        >
          protoArch
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-mute">fml</span>
        <button
          className="rounded px-1 text-[12px] leading-none text-ink-mute transition-colors hover:bg-white/10 hover:text-ink"
          onClick={onCollapse}
          title="Hide sidebar (⌘\)"
        >
          ⟨
        </button>
      </div>

      {files.length > 1 && (
        <Section title="Files">
          {files.map((f) => (
            <div key={f} className="group relative flex items-center">
              <button className={navRow(f === entry)} onClick={() => onEntry(f)}>
                {f === entry && <ActiveBar />}
                <span className="min-w-0 flex-1 truncate font-mono">{f}</span>
              </button>
              <button
                className="absolute right-1 rounded px-1 text-[11px] leading-none text-ink-mute opacity-0 transition-opacity hover:bg-white/10 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                onClick={() => onRemoveFile(f)}
                title={`Remove ${f} from the workspace`}
              >
                ✕
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title="Docs">
        {docs.map((d) => (
          <button key={d} className={navRow(d === activeDoc)} onClick={() => onActiveDoc(d)}>
            {d === activeDoc && <ActiveBar />}
            <span className="min-w-0 flex-1 truncate">{d}</span>
          </button>
        ))}
      </Section>

      <Section title={`${activeDoc} · layers`}>
        {groups.length === 0 && <p className="px-1.5 py-1 text-[12px] text-ink-mute">no nodes</p>}
        {groups.map((g) => (
          <div key={g.kind} className="pb-1.5">
            <div className="flex items-center gap-1.5 px-1.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-mute">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: kindColor(g.kind) }} />
              {kindPlural(g.kind)}
              <span className="text-ink-mute/70">{g.nodes.length}</span>
            </div>
            {g.nodes.map((n) => (
              <button
                key={n.id}
                className={`${navRow(n.id === selectedNode)} pl-3`}
                onClick={() => pick(n.id)}
                title={n.id}
              >
                {n.id === selectedNode && <ActiveBar />}
                <span className="shrink-0" style={{ color: kindColor(g.kind) }}>
                  <Glyph kind={g.kind} size={11} />
                </span>
                <span className="min-w-0 flex-1 truncate">{n.data.label}</span>
              </button>
            ))}
          </div>
        ))}
      </Section>

      {walkthrough.length > 0 && (
        <Section title="Walkthrough">
          <div className="flex flex-col gap-1.5 px-1">
            {walkthrough.map((step, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <span className={step.isBack ? "text-ink-mute/60" : "text-ink-dim"}>
                    {step.source}
                  </span>
                  <span className="text-ink-mute/50">→</span>
                  <span className={step.isBack ? "text-ink-mute/60" : "text-ink-dim"}>
                    {step.target}
                  </span>
                  {step.isBack && (
                    <span className="ml-auto text-[9px] text-ink-mute/50">↩ loop</span>
                  )}
                </div>
                {step.label && (
                  <span className="ml-2 font-mono text-[9px] text-ink-mute/70">{step.label}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-auto px-3.5 py-3 font-mono text-[10px] leading-relaxed text-ink-mute">
        {stats.nodes} nodes · {stats.edges} edges
        <br />
        {stats.flowCount} flow{stats.flowCount === 1 ? "" : "s"}
        {stats.unwired.length > 0 && ` · ${stats.unwired.length} unwired`}
      </div>
    </aside>
  );
}
