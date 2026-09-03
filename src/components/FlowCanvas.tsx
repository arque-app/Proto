import { useEffect } from "react";
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

const nodeTypes = { page: FmlNode, api: FmlNode };
const edgeTypes = { flow: FlowEdge };

interface Props {
  /** Freshly parsed + laid-out graph. New reference only when source/dir/strict changes. */
  chartNodes: FmlFlowNode[];
  chartEdges: Edge[];
  onSelect: (sel: { kind: "node" | "edge"; id: string } | null) => void;
}

export function FlowCanvas({ chartNodes, chartEdges, onSelect }: Props) {
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

  useEffect(() => {
    if (!initialized) return;
    const id = requestAnimationFrame(() => void fitView({ padding: 0.25, duration: 200 }));
    return () => cancelAnimationFrame(id);
  }, [initialized, chartNodes, chartEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, n) => onSelect({ kind: "node", id: n.id })}
      onEdgeClick={(_, e) => onSelect({ kind: "edge", id: e.id })}
      onPaneClick={() => onSelect(null)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
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
  );
}
