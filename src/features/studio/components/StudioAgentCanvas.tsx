"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  STUDIO_AGENT_CANVAS_NODE_TYPES,
  studioCanvasDraftActionLabel,
  studioCanvasDraftActionType,
  studioAgentCanvasNodeLabel,
  type StudioAgentCanvasGraph,
  type StudioAgentCanvasNode,
  type StudioAgentCanvasNodeType,
  type StudioCanvasDraftActionPreviewResult,
} from "@/features/studio/capabilities/studioAgentCanvas";
import {
  confirmStudioCanvasDraftAction,
  getStudioAgentCanvas,
  previewStudioCanvasDraftAction,
} from "@/lib/studio-agent-canvas-api";

type AgentFlowNodeData = {
  source: StudioAgentCanvasNode;
  label: string;
  busy: boolean;
  onPreview: (node: StudioAgentCanvasNode) => void;
};
type AgentFlowNode = Node<AgentFlowNodeData, "agentCanvas">;

const laneX: Record<StudioAgentCanvasNodeType, number> = {
  GOAL: 20,
  STRATEGY: 300,
  AGENT_TEAM: 580,
  TASK: 860,
  EXECUTION: 1140,
  ASSET: 1420,
};

function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const markers = data.source.metadata.insightMarkers || [];
  return (
    <article className={`studio-agent-canvas-node studio-agent-canvas-node-${data.source.nodeType.toLowerCase()}${selected ? " is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div>
        <span>{studioAgentCanvasNodeLabel(data.source.nodeType)}</span>
        <b>{data.source.status}</b>
      </div>
      <strong>{data.label}</strong>
      <small>{data.source.metadata.source || "Project intelligence"}</small>
      {markers.length ? (
        <div className="studio-agent-canvas-markers">
          {markers.slice(0, 2).map((marker) => <em key={marker.insightId}>⚠ {marker.label}</em>)}
        </div>
      ) : null}
      <div className="studio-agent-canvas-node-actions">
        {markers[0] ? <a href={markers[0].href} onClick={(event) => event.stopPropagation()}>View Insight</a> : null}
        <button disabled={data.busy} onClick={(event) => { event.stopPropagation(); data.onPreview(data.source); }} type="button">Create Draft</button>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  );
}

const agentNodeTypes = { agentCanvas: AgentNode } satisfies NodeTypes;

function toFlowNodes(graph: StudioAgentCanvasGraph, busyNodeId: string | null, onPreview: (node: StudioAgentCanvasNode) => void): AgentFlowNode[] {
  const counts = new Map<StudioAgentCanvasNodeType, number>();
  return graph.nodes.map((source) => {
    const index = counts.get(source.nodeType) || 0;
    counts.set(source.nodeType, index + 1);
    return {
      id: source.nodeId,
      type: "agentCanvas",
      position: { x: laneX[source.nodeType], y: 70 + index * 150 },
      data: { source, label: String(source.metadata.title || source.referenceId), busy: busyNodeId === source.nodeId, onPreview },
      draggable: false,
      connectable: false,
      selectable: true,
    };
  });
}

function toFlowEdges(graph: StudioAgentCanvasGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    label: edge.relationType.replaceAll("_", " ").toLowerCase(),
    animated: false,
    selectable: false,
  }));
}

function detailValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" · ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

export function StudioAgentCanvas({ projectId }: { projectId: string | null }) {
  const [graphState, setGraphState] = useState<{ projectId: string; graph: StudioAgentCanvasGraph } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<StudioCanvasDraftActionPreviewResult | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const graph = graphState?.projectId === projectId ? graphState.graph : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    void getStudioAgentCanvas(projectId)
      .then((value) => { if (active) { setGraphState({ projectId, graph: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Agent Canvas is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  const previewDraft = useCallback(async (node: StudioAgentCanvasNode) => {
    if (!projectId || busyNodeId) return;
    setSelectedId(node.nodeId);
    setBusyNodeId(node.nodeId);
    setActionMessage("");
    try {
      const marker = node.metadata.insightMarkers?.[0];
      const result = await previewStudioCanvasDraftAction(projectId, node.nodeId, {
        actionType: studioCanvasDraftActionType(node.nodeType),
        insightId: marker?.insightId || null,
      });
      setDraftPreview(result);
      setActionMessage("Draft preview ready. The Canvas and Workflow are unchanged.");
    } catch {
      setDraftPreview(null);
      setActionMessage("No compatible Copilot Draft is available for this node. Nothing changed.");
    } finally {
      setBusyNodeId(null);
    }
  }, [busyNodeId, projectId]);

  const confirmDraft = useCallback(async () => {
    if (!projectId || !draftPreview || busyNodeId) return;
    setBusyNodeId(draftPreview.action.nodeId);
    setActionMessage("");
    try {
      const result = await confirmStudioCanvasDraftAction(projectId, draftPreview.action.nodeId, draftPreview.action.actionId);
      setActionMessage(`${result.draft.draftType.replaceAll("_", " ")} created in the existing Copilot Action Center. Review it before any execution.`);
      setDraftPreview(null);
    } catch {
      setActionMessage("Draft confirmation failed. The Canvas and Workflow remain unchanged.");
    } finally {
      setBusyNodeId(null);
    }
  }, [busyNodeId, draftPreview, projectId]);

  const nodes = useMemo(() => graph ? toFlowNodes(graph, busyNodeId, previewDraft) : [], [busyNodeId, graph, previewDraft]);
  const edges = useMemo(() => graph ? toFlowEdges(graph) : [], [graph]);
  const selected = graph?.nodes.find((node) => node.nodeId === selectedId) || null;

  if (!projectId) {
    return <div className="studio-agent-canvas-empty">Open a cloud project to view its Agent Canvas.</div>;
  }
  if (error) return <div className="studio-agent-canvas-empty" role="alert">{error}</div>;
  if (!graph) return <div className="studio-agent-canvas-empty">Building the read-only project graph…</div>;
  if (!graph.nodes.length) return <div className="studio-agent-canvas-empty">No Agent project data has been recorded yet.</div>;

  return (
    <div className="studio-agent-canvas-layout">
      <div className="studio-agent-canvas-flow" aria-label="Agent Canvas graph">
        <ReactFlow<AgentFlowNode, Edge>
          nodes={nodes}
          edges={edges}
          nodeTypes={agentNodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.35}
          maxZoom={1.4}
          panOnDrag
          selectionOnDrag={false}
          zoomOnDoubleClick={false}
          deleteKeyCode={null}
        >
          <Background color="var(--studio-grid)" gap={22} size={1} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap maskColor="rgba(5, 7, 11, 0.72)" nodeColor="#818cf8" pannable position="bottom-right" zoomable />
        </ReactFlow>
      </div>
      <aside className="studio-agent-canvas-details" aria-label="Agent Canvas node details">
        {selected ? (
          <>
            <header>
              <span>{studioAgentCanvasNodeLabel(selected.nodeType)}</span>
              <b>{selected.status}</b>
            </header>
            <h3>{String(selected.metadata.title || selected.referenceId)}</h3>
            <dl>
              <div><dt>Source</dt><dd>{String(selected.metadata.source || "Project intelligence")}</dd></div>
              <div><dt>Reference</dt><dd>{selected.referenceId}</dd></div>
              <div><dt>Updated</dt><dd>{selected.createdAt || "Not recorded"}</dd></div>
              {Object.entries(selected.metadata)
                .filter(([key, value]) => !["title", "source", "insightMarkers"].includes(key) && value !== undefined && value !== "" && (!Array.isArray(value) || value.length))
                .slice(0, 6)
                .map(([key, value]) => <div key={key}><dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt><dd>{detailValue(value)}</dd></div>)}
            </dl>
            {(selected.metadata.insightMarkers || []).map((marker) => (
              <a className="studio-agent-canvas-insight" href={marker.href} key={marker.insightId}>⚠ {marker.label} · View insight</a>
            ))}
            <button className="studio-agent-canvas-create-draft" disabled={Boolean(busyNodeId)} onClick={() => void previewDraft(selected)} type="button">
              {busyNodeId === selected.nodeId ? "Preparing…" : "Create Draft"}
            </button>
            {draftPreview?.action.nodeId === selected.nodeId ? (
              <section className="studio-agent-canvas-draft-preview" aria-label="Canvas Draft Action preview">
                <span>{studioCanvasDraftActionLabel(draftPreview.action.actionType)}</span>
                <strong>{draftPreview.action.reason}</strong>
                <dl>
                  <div><dt>Impact</dt><dd>{draftPreview.action.impact.replaceAll("_", " ")}</dd></div>
                  <div><dt>Draft</dt><dd>{draftPreview.preview.draftType.replaceAll("_", " ")}</dd></div>
                  <div><dt>Insight</dt><dd>{draftPreview.action.binding.insightId || "No direct Insight"}</dd></div>
                  <div><dt>Explanation</dt><dd>{draftPreview.action.binding.explanationReference ? "Linked" : "Unavailable"}</dd></div>
                </dl>
                <small>Preview only. Confirm delegates Draft creation to the existing Copilot Action Center.</small>
                <button disabled={Boolean(busyNodeId)} onClick={() => void confirmDraft()} type="button">Confirm Create Draft</button>
              </section>
            ) : null}
            {actionMessage ? <small className="studio-agent-canvas-action-message" role="status">{actionMessage}</small> : null}
          </>
        ) : (
          <>
            <span>Node details</span>
            <p>Select a node to inspect its source, status, evidence, and update time.</p>
            <small>{STUDIO_AGENT_CANVAS_NODE_TYPES.length} read-only node types · No drag, delete, connect, or execute controls.</small>
          </>
        )}
      </aside>
    </div>
  );
}
