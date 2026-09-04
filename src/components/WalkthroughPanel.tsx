import { useMemo } from "react";
import type { FmlEdge } from "../fml/index.ts";
import type { FmlFlowNode } from "../types/chart.ts";
import { DockPanel } from "./DockPanel.tsx";

interface WalkthroughStep {
  source: string;
  label: string;
  target: string;
  isBack: boolean;
}

/**
 * BFS-trace the active doc from its roots into a flat step list. A step whose
 * target was already seen is a loop back and is marked, not followed.
 */
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

export function WalkthroughPanel({
  nodes,
  edges,
  inset = 0,
}: {
  nodes: FmlFlowNode[];
  edges: FmlEdge[];
  /** Px of docked panel on the right, so the card never slides underneath. */
  inset?: number;
}) {
  const steps = useMemo(() => buildWalkthrough(nodes, edges), [nodes, edges]);
  if (steps.length === 0) return null;

  return (
    <DockPanel
      id="walkthrough"
      side="right"
      inset={inset}
      // Sit above the zoom controls, which share the bottom-right corner.
      raise={96}
      title={`Walkthrough · ${steps.length} step${steps.length === 1 ? "" : "s"}`}
    >
      <div className="flex flex-col gap-1.5 px-1">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className={step.isBack ? "text-ink-mute/60" : "text-ink-dim"}>
                {step.source}
              </span>
              <span className="text-ink-mute/50">→</span>
              <span className={step.isBack ? "text-ink-mute/60" : "text-ink-dim"}>
                {step.target}
              </span>
              {step.isBack && <span className="ml-auto text-[9px] text-ink-mute/50">↩ loop</span>}
            </div>
            {step.label && (
              <span className="ml-2 font-mono text-[9px] text-ink-mute/70">{step.label}</span>
            )}
          </div>
        ))}
      </div>
    </DockPanel>
  );
}
