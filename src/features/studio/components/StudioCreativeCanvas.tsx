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
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import {
  STUDIO_CREATIVE_CANVAS_NODE_TYPES,
  studioCreativeCanvasNodeLabel,
  type StudioCreativeCanvasEditSession,
  type StudioCreativeCanvasEdgeType,
  type StudioCreativeCanvasGraph,
  type StudioCreativeCanvasGraphChange,
  type StudioCreativeCanvasNode,
  type StudioCreativeCanvasNodeType,
} from "@/features/studio/capabilities/studioCreativeCanvas";
import { useStudioApiIntegration } from "@/features/studio/components/StudioApiIntegration";
import {
  confirmStudioCreativeCanvasEditSession,
  createStudioCreativeCanvasEditSession,
  getStudioCreativeCanvas,
} from "@/lib/studio-creative-canvas-api";

type CreativeNodeData = {
  source: StudioCreativeCanvasNode;
  label: string;
  editable: boolean;
};
type CreativeFlowNode = Node<CreativeNodeData, "creativeCanvas">;
type CanvasMode = "VIEW" | "EDIT_DRAFT";

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

const editableNodeTypes = [
  "GOAL",
  "STRATEGY",
  "AGENT",
  "SCENE",
  "STORYBOARD",
  "SHOT",
] satisfies readonly StudioCreativeCanvasNodeType[];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CreativeNode = memo(function CreativeNode({ data, selected }: NodeProps<CreativeFlowNode>) {
  return (
    <article className={`studio-creative-canvas-node is-${data.source.nodeType.toLowerCase()}${selected ? " is-selected" : ""}${data.editable ? " is-editable" : ""}`}>
      <Handle type="target" position={Position.Left} isConnectable={data.editable} />
      <div>
        <span>{studioCreativeCanvasNodeLabel(data.source.nodeType)}</span>
        <b>{data.source.status}</b>
      </div>
      <strong>{data.label}</strong>
      <small>{String(data.source.metadata.source || "Project read model")}</small>
      {data.source.metadata.timelineRef ? <em>Timeline · {data.source.metadata.timelineRef}</em> : null}
      <Handle type="source" position={Position.Right} isConnectable={data.editable} />
    </article>
  );
});

const nodeTypes = { creativeCanvas: CreativeNode } satisfies NodeTypes;

function nodePosition(source: StudioCreativeCanvasNode, index: number) {
  const draftPosition = source.metadata.draftPosition;
  if (
    draftPosition &&
    typeof draftPosition === "object" &&
    Number.isFinite(Number((draftPosition as { x?: unknown }).x)) &&
    Number.isFinite(Number((draftPosition as { y?: unknown }).y))
  ) {
    return {
      x: Number((draftPosition as { x: number }).x),
      y: Number((draftPosition as { y: number }).y),
    };
  }
  return { x: laneX[source.nodeType], y: 60 + index * 142 };
}

function toFlowNodes(graph: Pick<StudioCreativeCanvasGraph, "nodes">, editable: boolean): CreativeFlowNode[] {
  const counts = new Map<StudioCreativeCanvasNodeType, number>();
  return graph.nodes.map((source) => {
    const index = counts.get(source.nodeType) || 0;
    counts.set(source.nodeType, index + 1);
    return {
      id: source.nodeId,
      type: "creativeCanvas",
      position: nodePosition(source, index),
      data: {
        source,
        label: String(source.metadata.title || source.referenceId),
        editable,
      },
      draggable: editable,
      connectable: editable,
      selectable: true,
    };
  });
}

function toFlowEdges(graph: Pick<StudioCreativeCanvasGraph, "edges">, editable: boolean): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.edgeId,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    label: edge.edgeType.toLowerCase(),
    animated: false,
    selectable: editable,
  }));
}

function defaultEdgeType(source: StudioCreativeCanvasNodeType, target: StudioCreativeCanvasNodeType): StudioCreativeCanvasEdgeType {
  if (source === "GOAL" && target === "STRATEGY") return "INFORMS";
  if (source === "STRATEGY" && target === "AGENT") return "PLANS";
  if (["AGENT", "SCENE", "STORYBOARD"].includes(source)) return "CONTAINS";
  if (target === "EXECUTION") return "GENERATES";
  if (["OUTPUT", "ASSET"].includes(target)) return "PRODUCES";
  if (target === "DELIVERY") return "DELIVERS";
  return "PLANS";
}

function changeLabel(change: StudioCreativeCanvasGraphChange) {
  switch (change.type) {
    case "ADD_NODE": return `Add ${change.node?.nodeType || "node"}`;
    case "REMOVE_NODE": return `Remove ${change.nodeId}`;
    case "MOVE_NODE": return `Move ${change.nodeId}`;
    case "CONNECT_EDGE": return `Connect ${change.source} → ${change.target}`;
    case "DISCONNECT_EDGE": return `Disconnect ${change.source} → ${change.target}`;
    case "UPDATE_CONFIG": return `Update ${change.nodeId}`;
  }
}

export function StudioCreativeCanvas({ projectId }: { projectId: string | null }) {
  const { featureStatus } = useStudioApiIntegration();
  const editingAvailability = featureStatus("creative_canvas_editing");
  const [loadState, setLoadState] = useState<{
    projectId: string | null;
    graph: StudioCreativeCanvasGraph | null;
    error: string;
  }>({ projectId: null, graph: null, error: "" });
  const [mode, setMode] = useState<CanvasMode>("VIEW");
  const [flowNodes, setFlowNodes] = useState<CreativeFlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [changes, setChanges] = useState<StudioCreativeCanvasGraphChange[]>([]);
  const [session, setSession] = useState<StudioCreativeCanvasEditSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newNodeType, setNewNodeType] = useState<StudioCreativeCanvasNodeType>("GOAL");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [actionState, setActionState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioCreativeCanvas(projectId, controller.signal)
      .then((value) => {
        setLoadState({ projectId, graph: value, error: "" });
        setSelectedId(value.nodes[0]?.nodeId || null);
        setFlowNodes(toFlowNodes(value, false));
        setFlowEdges(toFlowEdges(value, false));
        setMode("VIEW");
        setChanges([]);
        setSession(null);
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
  const selectedFlow = flowNodes.find((node) => node.id === selectedId) || null;
  const selected = selectedFlow?.data.source || null;
  const nodeCounts = useMemo(() => new Map(
    STUDIO_CREATIVE_CANVAS_NODE_TYPES.map((type) => [
      type,
      flowNodes.filter((node) => node.data.source.nodeType === type).length,
    ]),
  ), [flowNodes]);

  function startEditing() {
    if (!graph || editingAvailability !== "READY") return;
    setMode("EDIT_DRAFT");
    setFlowNodes(toFlowNodes(graph, true));
    setFlowEdges(toFlowEdges(graph, true));
    setChanges([]);
    setSession(null);
    setActionState({ busy: false, message: "Draft mode is local until you review the changes." });
  }

  function cancelEditing() {
    if (!graph) return;
    setMode("VIEW");
    setFlowNodes(toFlowNodes(graph, false));
    setFlowEdges(toFlowEdges(graph, false));
    setChanges([]);
    setSession(null);
    setActionState({ busy: false, message: "Draft discarded. The production Graph was unchanged." });
  }

  function addNode() {
    if (!projectId || !newNodeTitle.trim()) return;
    const nodeId = uid("draft-node");
    const referenceId = uid(`draft-${newNodeType.toLowerCase()}`);
    const source: StudioCreativeCanvasNode = {
      nodeId,
      projectId,
      nodeType: newNodeType,
      referenceId,
      status: "DRAFT",
      metadata: {
        title: newNodeTitle.trim(),
        source: "CREATIVE_CANVAS_EDIT_DRAFT",
        readOnly: false,
      },
      createdAt: new Date().toISOString(),
    };
    const position = { x: laneX[newNodeType], y: 80 + flowNodes.length * 36 };
    setFlowNodes((current) => [...current, {
      id: nodeId,
      type: "creativeCanvas",
      position,
      data: { source, label: newNodeTitle.trim(), editable: true },
      draggable: true,
      connectable: true,
      selectable: true,
    }]);
    setChanges((current) => [...current, {
      changeId: uid("change"),
      type: "ADD_NODE",
      node: source,
    }, {
      changeId: uid("change"),
      type: "MOVE_NODE",
      nodeId,
      position,
    }]);
    setSelectedId(nodeId);
    setNewNodeTitle("");
    setSession(null);
  }

  function removeSelected() {
    if (!selectedId) return;
    setFlowNodes((current) => current.filter((node) => node.id !== selectedId));
    setFlowEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setChanges((current) => [...current, {
      changeId: uid("change"),
      type: "REMOVE_NODE",
      nodeId: selectedId,
    }]);
    setSelectedId(null);
    setSession(null);
  }

  function updateSelectedConfig() {
    if (!selectedId || !configValue.trim()) return;
    setChanges((current) => [...current, {
      changeId: uid("change"),
      type: "UPDATE_CONFIG",
      nodeId: selectedId,
      config: { note: configValue.trim() },
    }]);
    setConfigValue("");
    setSession(null);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const sourceType = flowNodes.find((node) => node.id === connection.source)?.data.source.nodeType || "GOAL";
    const targetType = flowNodes.find((node) => node.id === connection.target)?.data.source.nodeType || "STRATEGY";
    const edgeType = defaultEdgeType(sourceType, targetType);
    const edgeId = uid("draft-edge");
    setFlowEdges((current) => [...current, {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      type: "smoothstep",
      label: edgeType.toLowerCase(),
      selectable: true,
    }]);
    setChanges((current) => [...current, {
      changeId: uid("change"),
      type: "CONNECT_EDGE",
      edgeId,
      source: connection.source,
      target: connection.target,
      edgeType,
    }]);
    setSession(null);
  }

  async function reviewChanges() {
    if (!projectId || !changes.length) return;
    setActionState({ busy: true, message: "Validating the Draft Graph…" });
    try {
      const value = await createStudioCreativeCanvasEditSession(projectId, changes);
      setSession(value);
      setFlowNodes(toFlowNodes(value.draftGraph, true));
      setFlowEdges(toFlowEdges(value.draftGraph, true));
      setActionState({
        busy: false,
        message: value.validation.status === "READY"
          ? "Draft is ready for human confirmation."
          : "Draft is blocked. Review the validation issues.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Draft validation failed.",
      });
    }
  }

  async function confirmDraft() {
    if (!projectId || !session || session.validation.status !== "READY") return;
    setActionState({ busy: true, message: "Confirming the Workflow Draft…" });
    try {
      const value = await confirmStudioCreativeCanvasEditSession(projectId, session.sessionId);
      setSession(value);
      setActionState({
        busy: false,
        message: "Draft confirmed. Production Graph and Execution Runtime remain unchanged.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Draft confirmation failed.",
      });
    }
  }

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
  if (!graph.nodes.length && mode === "VIEW") {
    return (
      <section className="studio-creative-canvas-empty">
        <strong>Project graph is ready</strong>
        <p>Add project goals, scenes, Storyboards, or completed Outputs through their existing confirmed workflows.</p>
        <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">Edit Canvas</button>
        <small>This view never creates or migrates project data.</small>
      </section>
    );
  }

  return (
    <section className={`studio-creative-canvas-layout is-${mode.toLowerCase()}`} aria-label="Unified Creative Operating Canvas">
      <div className="studio-creative-canvas-summary">
        <div>
          <span>Creative Operating Canvas</span>
          <strong>{flowNodes.length} nodes · {flowEdges.length} relationships</strong>
        </div>
        <div className="studio-creative-canvas-mode">
          <span>{graph.schemaVersion}</span>
          <b>{mode === "VIEW" ? "VIEW" : "EDIT DRAFT"}</b>
          {mode === "VIEW" ? (
            <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">
              {editingAvailability === "READY" ? "Edit Canvas" : "Editing unavailable"}
            </button>
          ) : (
            <button onClick={cancelEditing} type="button">Exit draft</button>
          )}
        </div>
      </div>
      {mode === "EDIT_DRAFT" ? (
        <section className="studio-creative-canvas-edit-toolbar" aria-label="Canvas Edit Mode">
          <div>
            <select onChange={(event) => setNewNodeType(event.target.value as StudioCreativeCanvasNodeType)} value={newNodeType}>
              {editableNodeTypes.map((type) => <option key={type} value={type}>{studioCreativeCanvasNodeLabel(type)}</option>)}
            </select>
            <input onChange={(event) => setNewNodeTitle(event.target.value)} placeholder="New node title" value={newNodeTitle} />
            <button disabled={!newNodeTitle.trim()} onClick={addNode} type="button">Add node</button>
          </div>
          <div>
            <button disabled={!selectedId} onClick={removeSelected} type="button">Remove selected</button>
            <button disabled={!changes.length || actionState.busy} onClick={() => void reviewChanges()} type="button">Review changes</button>
          </div>
          <small>Drag nodes or connect handles. Every change remains a Draft until review and explicit confirmation.</small>
        </section>
      ) : null}
      <div className="studio-creative-canvas-counts" aria-label="Creative Canvas node counts">
        {STUDIO_CREATIVE_CANVAS_NODE_TYPES.map((type) => (
          <span key={type}>{studioCreativeCanvasNodeLabel(type)} <b>{nodeCounts.get(type)}</b></span>
        ))}
      </div>
      <div className="studio-creative-canvas-main">
        <div className="studio-creative-canvas-flow">
          <ReactFlow<CreativeFlowNode, Edge>
            colorMode="dark"
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            nodesDraggable={mode === "EDIT_DRAFT"}
            nodesConnectable={mode === "EDIT_DRAFT"}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.16 }}
            minZoom={0.25}
            maxZoom={1.5}
            onConnect={mode === "EDIT_DRAFT" ? handleConnect : undefined}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onNodeDragStop={mode === "EDIT_DRAFT" ? (_, node) => {
              setFlowNodes((current) => current.map((item) => item.id === node.id ? { ...item, position: node.position } : item));
              setChanges((current) => [
                ...current.filter((change) => !(change.type === "MOVE_NODE" && change.nodeId === node.id)),
                { changeId: uid("change"), type: "MOVE_NODE", nodeId: node.id, position: node.position },
              ]);
              setSession(null);
            } : undefined}
            onEdgesDelete={mode === "EDIT_DRAFT" ? (deleted) => {
              setFlowEdges((current) => current.filter((edge) => !deleted.some((item) => item.id === edge.id)));
              setChanges((current) => [
                ...current,
                ...deleted.map((edge): StudioCreativeCanvasGraphChange => ({
                  changeId: uid("change"),
                  type: "DISCONNECT_EDGE",
                  edgeId: edge.id,
                  source: edge.source,
                  target: edge.target,
                  edgeType: "PLANS",
                })),
              ]);
              setSession(null);
            } : undefined}
          >
            <Background color="var(--studio-grid)" gap={22} size={1} variant={BackgroundVariant.Dots} />
            <Controls position="bottom-left" showInteractive={mode === "EDIT_DRAFT"} />
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
              {mode === "EDIT_DRAFT" ? (
                <div className="studio-creative-canvas-config">
                  <input onChange={(event) => setConfigValue(event.target.value)} placeholder="Draft configuration note" value={configValue} />
                  <button disabled={!configValue.trim()} onClick={updateSelectedConfig} type="button">Update config</button>
                </div>
              ) : (
                <small>Reference-only detail. Enter Edit Draft to propose graph changes.</small>
              )}
            </>
          ) : <p>Select a node to inspect its source and references.</p>}
          {mode === "EDIT_DRAFT" ? (
            <section className="studio-creative-canvas-change-list" aria-label="Graph changes">
              <header><span>Graph changes</span><b>{changes.length}</b></header>
              {changes.length ? changes.map((change) => <small key={change.changeId}>{changeLabel(change)}</small>) : <small>No changes yet.</small>}
            </section>
          ) : null}
        </aside>
      </div>
      {session ? (
        <section className="studio-creative-canvas-review" aria-label="Canvas Graph Diff">
          <header>
            <div><span>Graph Diff</span><strong>{session.status}</strong></div>
            <b className={session.validation.status === "READY" ? "is-ready" : "is-blocked"}>{session.validation.status}</b>
          </header>
          <div className="studio-creative-canvas-diff">
            <span>Added nodes <b>{session.diff.summary.addedNodes}</b></span>
            <span>Removed nodes <b>{session.diff.summary.removedNodes}</b></span>
            <span>Moved nodes <b>{session.diff.summary.movedNodes}</b></span>
            <span>Changed edges <b>{session.diff.summary.changedEdges}</b></span>
            <span>Config changes <b>{session.diff.summary.configChanges}</b></span>
          </div>
          <div className="studio-creative-canvas-validation">
            {session.validation.checks.map((check) => (
              <article className={check.passed ? "is-passed" : "is-blocked"} key={check.type}>
                <strong>{check.type.replaceAll("_", " ")}</strong>
                <b>{check.status}</b>
                {check.issues.map((issue) => <small key={issue}>{issue}</small>)}
              </article>
            ))}
          </div>
          {session.status === "CONFIRMED" ? (
            <p>Confirmed as Workflow Draft <b>{session.confirmedDraft?.draftId}</b>. No production Graph, Execution, Provider, or Credits action occurred.</p>
          ) : (
            <button disabled={session.validation.status !== "READY" || actionState.busy} onClick={() => void confirmDraft()} type="button">
              Confirm draft
            </button>
          )}
        </section>
      ) : null}
      {actionState.message ? <p className="studio-creative-canvas-message" role="status">{actionState.message}</p> : null}
      <footer className="studio-creative-canvas-migration">
        <div>
          <strong>Controlled Draft boundary</strong>
          <span>Confirmation creates a new Workflow Draft only. Production Graph, Runtime, Provider, Billing, and Credits remain unchanged.</span>
        </div>
        <a href={graph.migrationPlan.legacyRoute}>Open Legacy Canvas</a>
      </footer>
    </section>
  );
}
