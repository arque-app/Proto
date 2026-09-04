import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { FmlNode } from "./nodes/FmlNode.tsx";
import { FlowEdge } from "./edges/FlowEdge.tsx";
import type { FmlFlowNode } from "../types/chart.ts";
import type { Selection } from "./PropertyPanel.tsx";

const nodeTypes = { fml: FmlNode };
const edgeTypes = { flow: FlowEdge };

/**
 * Space the floating chrome (toolbar, side panels) takes off the viewport, as a
 * React Flow padding object — so `fitView` never tucks a node underneath it.
 */
export type FitPadding = Record<"top" | "right" | "bottom" | "left", `${number}px`>;

export function fitPadding(insets: {
  top: number;
  right: number;
  bottom: number;
  left: number;
}): FitPadding {
  return {
    top: `${insets.top}px`,
    right: `${insets.right}px`,
    bottom: `${insets.bottom}px`,
    left: `${insets.left}px`,
  };
}

interface Props {
  /** Freshly parsed + laid-out graph. New reference only when source/dir/strict changes. */
  chartNodes: FmlFlowNode[];
  chartEdges: Edge[];
  selection: Selection | null;
  onSelect: (sel: Selection | null) => void;
  /** Double-clicking a `flow` node drills into the doc it names. */
  onOpenDoc: (name: string) => void;
  /** Keeps `fitView` from tucking nodes under the toolbar or side panels. */
  padding: FitPadding;
}

export function FlowCanvas({
  chartNodes,
  chartEdges,
  selection,
  onSelect,
  onOpenDoc,
  padding,
}: Props) {
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  const [nodes, setNodes, onNodesChange] = useNodesState<FmlFlowNode>(chartNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(chartEdges);

  // Re-seed from the parsed chart only when the source / layout direction changes.
  // A drag mutates local state via onNodesChange and never touches chartNodes,
  // so hand-placed nodes stay where you drop them.
  useEffect(() => {
    setNodes(chartNodes);
    setEdges(chartEdges);
  }, [chartNodes, chartEdges, setNodes, setEdges]);

  // Auto-fit only when the graph itself changes (new file / doc / direction) —
  // never when a panel opens. `padding` changes on every selection, so it is
  // read from a ref here instead of being a dependency, or each node click
  // would kick off a viewport animation.
  const paddingRef = useRef(padding);
  paddingRef.current = padding;

  useEffect(() => {
    if (!initialized) return;
    const id = requestAnimationFrame(() =>
      void fitView({ padding: paddingRef.current, duration: 200 }),
    );
    return () => cancelAnimationFrame(id);
  }, [initialized, chartNodes, chartEdges, fitView]);

  // Selection is owned by the app (the sidebar can drive it too), so the
  // rendered graph mirrors that rather than React Flow's internal flag.
  const selNodeId = selection?.kind === "node" ? selection.id : null;
  const selEdgeId = selection?.kind === "edge" ? selection.id : null;

  const viewNodes = useMemo(
    () => nodes.map((n) => (n.selected === (n.id === selNodeId) ? n : { ...n, selected: n.id === selNodeId })),
    [nodes, selNodeId],
  );
  const viewEdges = useMemo(
    () => edges.map((e) => (e.selected === (e.id === selEdgeId) ? e : { ...e, selected: e.id === selEdgeId })),
    [edges, selEdgeId],
  );

  return (
    <>
      <ReactFlow
        nodes={viewNodes}
        edges={viewEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, n) => onSelect({ kind: "node", id: n.id })}
        onNodeDoubleClick={(_, n) => {
          const doc = n.data.kind === "flow" ? n.data.meta.doc : undefined;
          if (doc) onOpenDoc(doc);
        }}
        onEdgeClick={(_, e) => onSelect({ kind: "edge", id: e.id })}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding }}
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        className="bg-bg"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={2} color="#3d3d3d" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {chartNodes.length === 0 && <EmptyCanvas />}
    </>
  );
}

function EmptyCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-[320px] text-center">
        <p className="text-[13px] text-ink-dim">Nothing to draw yet.</p>
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-mute">
          Declare nodes under <span className="text-ink-dim">@nodes</span>, then wire them
          under <span className="text-ink-dim">@flow</span>. Open the Source panel to start.
        </p>
      </div>
    </div>
  );
}
