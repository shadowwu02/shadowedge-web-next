"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  STUDIO_CREATIVE_CANVAS_NODE_TYPES,
  studioCreativeCanvasNodeLabel,
  type StudioCreativeCanvasGraph,
  type StudioCreativeCanvasNode,
  type StudioCreativeCanvasNodeType,
} from "@/features/studio/capabilities/studioCreativeCanvas";
import { getStudioCreativeCanvas } from "@/lib/studio-creative-canvas-api";

type CreativeNodeData = {
  source: StudioCreativeCanvasNode;
  label: string;
};
type CreativeFlowNode = Node<CreativeNodeData, "creativeCanvas">;

const laneX: Record<StudioCreativeCanvasNodeType, number> = {
  GOAL: 20,
  STRATEGY: 280,
  AGENT: 540,
  SCENE: 800,
  STORYBOARD: 1060,
  SHOT: 1320,
  EXECUTION: 1580,
  OUTPUT: 1840,
  ASSET: 2100,
  DELIVERY: 2360,
};

const CreativeNode = memo(function CreativeNode({ data, selected }: NodeProps<CreativeFlowNode>) {
  return (
    <article className={`studio-creative-canvas-node is-${data.source.nodeType.toLowerCase()}${selected ? " is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div>
        <span>{studioCreativeCanvasNodeLabel(data.source.nodeType)}</span>
        <b>{data.source.status}</b>
      </div>
      <strong>{data.label}</strong>
      <small>{String(data.source.metadata.source || "Project read model")}</small>
      {data.source.metadata.timelineRef ? <em>Timeline · {data.source.metadata.timelineRef}</em> : null}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  );
});

const nodeTypes = { creativeCanvas: CreativeNode } satisfies NodeTypes;

function toFlowNodes(graph: StudioCreativeCanvasGraph): CreativeFlowNode[] {
  const counts = new Map<StudioCreativeCanvasNodeType, number>();
  return graph.nodes.map((source) => {
    const index = counts.get(source.nodeType) || 0;
    counts.set(source.nodeType, index + 1);
    return {
      id: source.nodeId,
      type: "creativeCanvas",
      position: { x: laneX[source.nodeType], y: 60 + index * 142 },
      data: {
        source,
        label: String(source.metadata.title || source.referenceId),
      },
      draggable: false,
      connectable: false,
      selectable: true,
    };
  });
}

function toFlowEdges(graph: StudioCreativeCanvasGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    label: edge.edgeType.toLowerCase(),
    animated: false,
    selectable: false,
  }));
}

export function StudioCreativeCanvas({ projectId }: { projectId: string | null }) {
  const [loadState, setLoadState] = useState<{
    projectId: string | null;
    graph: StudioCreativeCanvasGraph | null;
    error: string;
  }>({ projectId: null, graph: null, error: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioCreativeCanvas(projectId, controller.signal)
      .then((value) => {
        setLoadState({ projectId, graph: value, error: "" });
        setSelectedId(value.nodes[0]?.nodeId || null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          projectId,
          graph: null,
          error: reason instanceof Error ? reason.message : "Creative Canvas is unavailable.",
        });
      });
    return () => controller.abort();
  }, [projectId]);

  const graph = loadState.projectId === projectId ? loadState.graph : null;
  const error = loadState.projectId === projectId ? loadState.error : "";
  const nodes = useMemo(() => graph ? toFlowNodes(graph) : [], [graph]);
  const edges = useMemo(() => graph ? toFlowEdges(graph) : [], [graph]);
  const selected = graph?.nodes.find((node) => node.nodeId === selectedId) || null;
  const nodeCounts = useMemo(() => new Map(
    STUDIO_CREATIVE_CANVAS_NODE_TYPES.map((type) => [
      type,
      graph?.nodes.filter((node) => node.nodeType === type).length || 0,
    ]),
  ), [graph]);

  if (!projectId) {
    return (
      <section className="studio-creative-canvas-empty" aria-label="Unified Creative Canvas empty state">
        <strong>Open a saved Studio project</strong>
        <p>The unified canvas is derived from project, Timeline, Storyboard, Execution, Output, Asset, and Delivery data.</p>
        <a href="/workspace/canvas">Open preserved Legacy Canvas</a>
      </section>
    );
  }
  if (error) {
    return (
      <section className="studio-creative-canvas-empty is-error" role="alert">
        <strong>Creative Canvas unavailable</strong>
        <p>{error}</p>
        <small>No project data, workflow, execution, or legacy Canvas was changed.</small>
      </section>
    );
  }
  if (!graph) return <div className="studio-agent-canvas-empty">Building the unified Creative Operating Canvas…</div>;
  if (!graph.nodes.length) {
    return (
      <section className="studio-creative-canvas-empty">
        <strong>Project graph is ready</strong>
        <p>Add project goals, scenes, Storyboards, or completed Outputs through their existing confirmed workflows.</p>
        <small>This view never creates or migrates project data.</small>
      </section>
    );
  }

  return (
    <section className="studio-creative-canvas-layout" aria-label="Unified Creative Operating Canvas">
      <div className="studio-creative-canvas-summary">
        <div>
          <span>Creative Operating Canvas</span>
          <strong>{graph.nodes.length} nodes · {graph.edges.length} relationships</strong>
        </div>
        <div>
          <span>{graph.schemaVersion}</span>
          <b>READ ONLY</b>
        </div>
      </div>
      <div className="studio-creative-canvas-counts" aria-label="Creative Canvas node counts">
        {STUDIO_CREATIVE_CANVAS_NODE_TYPES.map((type) => (
          <span key={type}>{studioCreativeCanvasNodeLabel(type)} <b>{nodeCounts.get(type)}</b></span>
        ))}
      </div>
      <div className="studio-creative-canvas-main">
        <div className="studio-creative-canvas-flow">
          <ReactFlow<CreativeFlowNode, Edge>
            colorMode="dark"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.25}
            maxZoom={1.5}
            onNodeClick={(_, node) => setSelectedId(node.id)}
          >
            <Background color="var(--studio-grid)" gap={22} size={1} variant={BackgroundVariant.Dots} />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap className="studio-minimap" maskColor="rgba(5, 7, 11, 0.7)" nodeColor="#38bdf8" pannable zoomable />
          </ReactFlow>
        </div>
        <aside className="studio-creative-canvas-details" aria-label="Creative Canvas node details">
          {selected ? (
            <>
              <span>{studioCreativeCanvasNodeLabel(selected.nodeType)}</span>
              <h3>{String(selected.metadata.title || selected.referenceId)}</h3>
              <dl>
                <div><dt>Status</dt><dd>{selected.status}</dd></div>
                <div><dt>Source</dt><dd>{String(selected.metadata.source || selected.metadata.sourceCanvas || "Project data")}</dd></div>
                <div><dt>Reference</dt><dd>{selected.referenceId}</dd></div>
                <div><dt>Updated</dt><dd>{selected.createdAt || "Unknown"}</dd></div>
                {selected.metadata.timelineRef ? <div><dt>Timeline</dt><dd>{selected.metadata.timelineRef}</dd></div> : null}
                {selected.metadata.version ? <div><dt>Version</dt><dd>{selected.metadata.version}</dd></div> : null}
              </dl>
              <small>Reference-only detail. This panel cannot edit, connect, execute, generate, or migrate nodes.</small>
            </>
          ) : <p>Select a node to inspect its source and references.</p>}
        </aside>
      </div>
      <footer className="studio-creative-canvas-migration">
        <div>
          <strong>Legacy Canvas preserved</strong>
          <span>/workspace/canvas remains local and editable. No production data migration runs automatically.</span>
        </div>
        <a href={graph.migrationPlan.legacyRoute}>Open Legacy Canvas</a>
      </footer>
    </section>
  );
}
