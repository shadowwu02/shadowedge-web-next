"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
  type StudioCreativeCanvasEditStatus,
  type StudioCreativeCanvasEditSession,
  type StudioCreativeCanvasEdgeType,
  type StudioCreativeCanvasGraph,
  type StudioCreativeCanvasGraphChange,
  type StudioCreativeCanvasNode,
  type StudioCreativeCanvasNodeType,
} from "@/features/studio/capabilities/studioCreativeCanvas";
import type { StudioAIPlannedCanvasDraft } from "@/features/studio/capabilities/studioCreativeCanvasPlanning";
import {
  STUDIO_CANVAS_OPTIMIZATION_TYPES,
  studioCanvasOptimizationLabel,
  type StudioAIOptimizedCanvasDraft,
  type StudioCanvasOptimizationType,
} from "@/features/studio/capabilities/studioCreativeCanvasOptimization";
import {
  studioCanvasImpactLabel,
  type StudioCanvasChangeSimulation,
} from "@/features/studio/capabilities/studioCreativeCanvasSimulation";
import {
  studioCanvasLearningSignalLabel,
  type StudioCanvasDecisionHistory,
  type StudioCanvasDecisionOptionId,
} from "@/features/studio/capabilities/studioCreativeCanvasDecision";
import { useStudioApiIntegration } from "@/features/studio/components/StudioApiIntegration";
import {
  getStudioCreativeCanvasDecisionHistory,
  recordStudioCreativeCanvasDecision,
} from "@/lib/studio-creative-canvas-decision-api";
import {
  createStudioCreativeCanvasOptimization,
  getStudioCreativeCanvasOptimization,
} from "@/lib/studio-creative-canvas-optimization-api";
import {
  createStudioCreativeCanvasPlan,
  getStudioCreativeCanvasPlan,
} from "@/lib/studio-creative-canvas-planning-api";
import { createStudioCreativeCanvasSimulation } from "@/lib/studio-creative-canvas-simulation-api";
import {
  confirmStudioCreativeCanvasEditSession,
  createStudioCreativeCanvasEditSession,
  getStudioCreativeCanvas,
  getStudioCreativeCanvasEditSession,
} from "@/lib/studio-creative-canvas-api";
import {
  STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY,
  clearActiveStudioCreativeCanvasDraft,
  getActiveStudioCreativeCanvasDraft,
  saveActiveStudioCreativeCanvasDraft,
  type StudioCreativeCanvasActiveDraft,
  type StudioCreativeCanvasDraftType,
} from "@/lib/studio-creative-canvas-draft-recovery";
import { LEGACY_CANVAS_ROUTE } from "@/lib/canvas/canvasRoutes";

type CreativeNodeData = {
  source: StudioCreativeCanvasNode;
  label: string;
  editable: boolean;
};
type CreativeFlowNode = Node<CreativeNodeData, "creativeCanvas">;
type CanvasMode = "VIEW" | "EDIT_DRAFT";
type DraftRecoveryStatus = "IDLE" | "RESTORING" | "SAVED" | "RESTORED" | "UNAVAILABLE" | "UNSAVED";

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
  const planningAvailability = featureStatus("creative_canvas_auto_planning");
  const optimizationAvailability = featureStatus("creative_canvas_workflow_optimization");
  const simulationAvailability = featureStatus("creative_canvas_impact_simulation");
  const decisionAvailability = featureStatus("creative_canvas_decision_learning");
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
  const [plannedDraft, setPlannedDraft] = useState<StudioAIPlannedCanvasDraft | null>(null);
  const [optimizedDraft, setOptimizedDraft] = useState<StudioAIOptimizedCanvasDraft | null>(null);
  const [activeDraft, setActiveDraft] = useState<StudioCreativeCanvasActiveDraft | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<{
    status: DraftRecoveryStatus;
    message: string;
  }>({ status: "IDLE", message: "" });
  const [draftRestoreVersion, setDraftRestoreVersion] = useState(0);
  const draftRestoreAttemptRef = useRef("");
  const [simulation, setSimulation] = useState<StudioCanvasChangeSimulation | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<StudioCanvasDecisionHistory | null>(null);
  const [decisionChoice, setDecisionChoice] = useState<StudioCanvasDecisionOptionId>("SELECT_DRAFT");
  const [decisionReason, setDecisionReason] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [optimizationOpen, setOptimizationOpen] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotGoal, setCopilotGoal] = useState("");
  const [copilotDuration, setCopilotDuration] = useState("");
  const [copilotRatio, setCopilotRatio] = useState("16:9");
  const [optimizationTarget, setOptimizationTarget] = useState<StudioCanvasOptimizationType>("QUALITY_IMPROVEMENT");
  const [optimizationConstraint, setOptimizationConstraint] = useState("");
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
        setPlannedDraft(null);
        setOptimizedDraft(null);
        setActiveDraft(null);
        setDraftRecovery({ status: "IDLE", message: "" });
        draftRestoreAttemptRef.current = "";
        setSimulation(null);
        setDecisionHistory(null);
        setDecisionChoice("SELECT_DRAFT");
        setDecisionReason("");
        setCopilotOpen(false);
        setOptimizationOpen(false);
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

  useEffect(() => {
    const handleDraftStorage = (event: StorageEvent) => {
      if (event.key !== STUDIO_CREATIVE_CANVAS_ACTIVE_DRAFTS_STORAGE_KEY) return;
      draftRestoreAttemptRef.current = "";
      if (projectId && !getActiveStudioCreativeCanvasDraft(projectId)) {
        setActiveDraft(null);
        setDraftRecovery({ status: "IDLE", message: "" });
      }
      setDraftRestoreVersion((value) => value + 1);
    };
    window.addEventListener("storage", handleDraftStorage);
    return () => window.removeEventListener("storage", handleDraftStorage);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || loadState.projectId !== projectId || !loadState.graph) return;
    const storedDraft = getActiveStudioCreativeCanvasDraft(projectId);
    if (!storedDraft) return;

    const availability = storedDraft.draftType === "AI_PLAN"
      ? planningAvailability
      : storedDraft.draftType === "AI_OPTIMIZATION"
        ? optimizationAvailability
        : editingAvailability;
    if (availability !== "READY") {
      const stateTimer = window.setTimeout(() => {
        setActiveDraft(storedDraft);
        setDraftRecovery({
          status: availability === "AVAILABLE" ? "RESTORING" : "UNAVAILABLE",
          message: availability === "AVAILABLE"
            ? "Waiting for the Canvas Draft service before restoring Preview."
            : "The saved Draft is retained, but its service is currently unavailable.",
        });
      }, 0);
      return () => window.clearTimeout(stateTimer);
    }

    const attemptKey = `${projectId}:${storedDraft.draftType}:${storedDraft.draftId}:${draftRestoreVersion}`;
    if (draftRestoreAttemptRef.current === attemptKey) return;
    draftRestoreAttemptRef.current = attemptKey;
    const controller = new AbortController();
    const stateTimer = window.setTimeout(() => {
      setActiveDraft(storedDraft);
      setDraftRecovery({ status: "RESTORING", message: "Restoring the saved Draft Preview…" });
    }, 0);

    void (async () => {
      let nextPlannedDraft: StudioAIPlannedCanvasDraft | null = null;
      let nextOptimizedDraft: StudioAIOptimizedCanvasDraft | null = null;
      let editSessionId = storedDraft.editSessionId;

      if (storedDraft.draftType === "AI_PLAN") {
        nextPlannedDraft = await getStudioCreativeCanvasPlan(
          projectId,
          storedDraft.draftId,
          controller.signal,
        );
        editSessionId = nextPlannedDraft.editSession.sessionId;
      } else if (storedDraft.draftType === "AI_OPTIMIZATION") {
        nextOptimizedDraft = await getStudioCreativeCanvasOptimization(
          projectId,
          storedDraft.draftId,
          controller.signal,
        );
        editSessionId = nextOptimizedDraft.editSession.sessionId;
      }

      const nextSession = await getStudioCreativeCanvasEditSession(
        projectId,
        editSessionId,
        controller.signal,
      );
      return { nextOptimizedDraft, nextPlannedDraft, nextSession };
    })()
      .then(({ nextOptimizedDraft, nextPlannedDraft, nextSession }) => {
        if (controller.signal.aborted) return;
        const currentPointer = getActiveStudioCreativeCanvasDraft(projectId);
        if (
          !currentPointer ||
          currentPointer.draftId !== storedDraft.draftId ||
          currentPointer.draftType !== storedDraft.draftType
        ) return;

        const draftGraph = nextPlannedDraft?.graph || nextOptimizedDraft?.optimizedGraph || nextSession.draftGraph;
        const refreshedDraft: StudioCreativeCanvasActiveDraft = {
          ...storedDraft,
          editSessionId: nextSession.sessionId,
          graphVersion: nextSession.baseGraphVersion,
          status: nextSession.status,
        };
        saveActiveStudioCreativeCanvasDraft(refreshedDraft);
        setActiveDraft(refreshedDraft);
        setPlannedDraft(nextPlannedDraft);
        setOptimizedDraft(nextOptimizedDraft);
        setSession(nextSession);
        setChanges([...nextSession.changes]);
        setFlowNodes(toFlowNodes(draftGraph, true));
        setFlowEdges(toFlowEdges(draftGraph, true));
        setSelectedId(draftGraph.nodes[0]?.nodeId || null);
        setMode("EDIT_DRAFT");
        setCopilotOpen(false);
        setOptimizationOpen(false);
        setDraftRecovery({
          status: "RESTORED",
          message: `${nextSession.status} Draft restored with Preview, Diff, and evidence.`,
        });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setDraftRecovery({
          status: "UNAVAILABLE",
          message: reason instanceof Error
            ? reason.message
            : "The saved Canvas Draft could not be restored.",
        });
      });

    return () => {
      window.clearTimeout(stateTimer);
      controller.abort();
      if (draftRestoreAttemptRef.current === attemptKey) {
        draftRestoreAttemptRef.current = "";
      }
    };
  }, [
    draftRestoreVersion,
    editingAvailability,
    loadState.graph,
    loadState.projectId,
    optimizationAvailability,
    planningAvailability,
    projectId,
  ]);

  useEffect(() => {
    if (!projectId || decisionAvailability !== "READY") return;
    const controller = new AbortController();
    void getStudioCreativeCanvasDecisionHistory(projectId, controller.signal)
      .then(setDecisionHistory)
      .catch(() => {
        if (!controller.signal.aborted) setDecisionHistory(null);
      });
    return () => controller.abort();
  }, [decisionAvailability, projectId]);

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
  const simulationDraftId = optimizedDraft?.draftId || plannedDraft?.draftId || session?.sessionId || null;
  const draftConfidence = plannedDraft?.confidence || optimizedDraft?.confidence || "NOT_RATED";
  const draftEvidenceCount = plannedDraft?.evidence.length || optimizedDraft?.evidence.length || 0;

  function rememberDraft(
    draftType: StudioCreativeCanvasDraftType,
    draftId: string,
    editSession: StudioCreativeCanvasEditSession,
    createdAt = editSession.createdAt,
    status: StudioCreativeCanvasEditStatus = editSession.status,
  ) {
    if (!projectId) return;
    const record: StudioCreativeCanvasActiveDraft = {
      draftId,
      projectId,
      graphVersion: editSession.baseGraphVersion,
      status,
      createdAt,
      draftType,
      editSessionId: editSession.sessionId,
    };
    const saved = saveActiveStudioCreativeCanvasDraft(record);
    setActiveDraft(record);
    setDraftRecovery({
      status: saved ? "SAVED" : "UNSAVED",
      message: saved
        ? "Draft recovery is enabled for refresh, new tabs, and the next authenticated session."
        : "Draft Preview is available now, but browser storage could not save its recovery pointer.",
    });
  }

  function forgetActiveDraft() {
    if (projectId) clearActiveStudioCreativeCanvasDraft(projectId);
    setActiveDraft(null);
    setDraftRecovery({ status: "IDLE", message: "" });
    draftRestoreAttemptRef.current = "";
  }

  function invalidateReviewedDraft() {
    setSession(null);
    setPlannedDraft(null);
    setOptimizedDraft(null);
    setSimulation(null);
    forgetActiveDraft();
  }

  function startEditing() {
    if (!graph || editingAvailability !== "READY") return;
    setMode("EDIT_DRAFT");
    setFlowNodes(toFlowNodes(graph, true));
    setFlowEdges(toFlowEdges(graph, true));
    setChanges([]);
    setSession(null);
    setPlannedDraft(null);
    setOptimizedDraft(null);
    setSimulation(null);
    setOptimizationOpen(false);
    forgetActiveDraft();
    setActionState({ busy: false, message: "Draft mode is local until you review the changes." });
  }

  function cancelEditing() {
    if (!graph) return;
    setMode("VIEW");
    setFlowNodes(toFlowNodes(graph, false));
    setFlowEdges(toFlowEdges(graph, false));
    setChanges([]);
    setSession(null);
    setPlannedDraft(null);
    setOptimizedDraft(null);
    setSimulation(null);
    setCopilotOpen(false);
    setOptimizationOpen(false);
    forgetActiveDraft();
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
    invalidateReviewedDraft();
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
    invalidateReviewedDraft();
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
    invalidateReviewedDraft();
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
    invalidateReviewedDraft();
  }

  async function reviewChanges() {
    if (!projectId || !changes.length) return;
    setActionState({ busy: true, message: "Validating the Draft Graph…" });
    try {
      const value = await createStudioCreativeCanvasEditSession(projectId, changes);
      setSession(value);
      setFlowNodes(toFlowNodes(value.draftGraph, true));
      setFlowEdges(toFlowEdges(value.draftGraph, true));
      rememberDraft("EDIT_SESSION", value.sessionId, value);
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
    if (
      !projectId ||
      !session ||
      !["DRAFT", "REVIEW"].includes(session.status) ||
      session.validation.status !== "READY"
    ) return;
    setActionState({ busy: true, message: "Confirming the Workflow Draft…" });
    try {
      const value = await confirmStudioCreativeCanvasEditSession(projectId, session.sessionId);
      setSession(value);
      rememberDraft(
        activeDraft?.draftType || "EDIT_SESSION",
        activeDraft?.draftId || value.sessionId,
        value,
        activeDraft?.createdAt || value.createdAt,
      );
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

  async function createWithCopilot() {
    if (!projectId || !copilotPrompt.trim() || planningAvailability !== "READY") return;
    setActionState({ busy: true, message: "Copilot is building a reviewable Canvas Draft…" });
    try {
      const value = await createStudioCreativeCanvasPlan(projectId, {
        prompt: copilotPrompt.trim(),
        goal: copilotGoal.trim() || copilotPrompt.trim(),
        constraints: {
          ...(copilotDuration.trim() ? { duration: copilotDuration.trim() } : {}),
          ...(copilotRatio ? { ratio: copilotRatio } : {}),
        },
      });
      setPlannedDraft(value);
      setOptimizedDraft(null);
      setSimulation(null);
      setSession(value.editSession);
      setChanges([...value.changes]);
      setFlowNodes(toFlowNodes(value.graph, true));
      setFlowEdges(toFlowEdges(value.graph, true));
      setSelectedId(value.graph.nodes[0]?.nodeId || null);
      setMode("EDIT_DRAFT");
      setCopilotOpen(false);
      rememberDraft("AI_PLAN", value.draftId, value.editSession, value.createdAt);
      setActionState({
        busy: false,
        message: value.validation.status === "READY"
          ? "AI Canvas Draft is ready for Diff Review and human confirmation."
          : "AI Canvas Draft is blocked by validation. Nothing was applied.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Copilot could not create the Canvas Draft.",
      });
    }
  }

  async function optimizeWithCopilot() {
    if (!projectId || !graph || optimizationAvailability !== "READY") return;
    setActionState({ busy: true, message: "Copilot is analyzing the current Workflow…" });
    try {
      const value = await createStudioCreativeCanvasOptimization(projectId, {
        graphVersion: graph.graphId,
        target: optimizationTarget,
        constraints: optimizationConstraint.trim()
          ? { userConstraint: optimizationConstraint.trim() }
          : {},
      });
      setOptimizedDraft(value);
      setPlannedDraft(null);
      setSimulation(null);
      setSession(value.editSession);
      setChanges([...value.changes]);
      setFlowNodes(toFlowNodes(value.optimizedGraph, true));
      setFlowEdges(toFlowEdges(value.optimizedGraph, true));
      setSelectedId(value.optimizedGraph.nodes[0]?.nodeId || null);
      setMode("EDIT_DRAFT");
      setOptimizationOpen(false);
      setCopilotOpen(false);
      rememberDraft("AI_OPTIMIZATION", value.draftId, value.editSession, value.createdAt);
      setActionState({
        busy: false,
        message: value.validation.status === "READY"
          ? "Optimization Draft is ready for Diff Review and human confirmation."
          : "Optimization Draft is blocked by validation. Nothing was applied.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Copilot could not optimize this Workflow.",
      });
    }
  }

  async function simulateChange() {
    if (
      !projectId ||
      !simulationDraftId ||
      simulationAvailability !== "READY"
    ) return;
    setActionState({ busy: true, message: "Simulating Draft impact without applying changes…" });
    try {
      const value = await createStudioCreativeCanvasSimulation(projectId, simulationDraftId);
      setSimulation(value);
      setActionState({
        busy: false,
        message: "Impact Simulation is ready. The Draft and production Graph remain unchanged.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Canvas impact simulation failed.",
      });
    }
  }

  async function recordDecision() {
    if (
      !projectId ||
      !simulation ||
      !decisionReason.trim() ||
      decisionAvailability !== "READY"
    ) return;
    setActionState({ busy: true, message: "Recording your Canvas decision without applying the Draft…" });
    try {
      await recordStudioCreativeCanvasDecision(projectId, {
        simulationId: simulation.simulationId,
        selectedOption: decisionChoice,
        reason: decisionReason.trim(),
      });
      setDecisionHistory(await getStudioCreativeCanvasDecisionHistory(projectId));
      setDecisionReason("");
      setActionState({
        busy: false,
        message: "Decision recorded for future suggestions. Preferences and the production Canvas remain unchanged.",
      });
    } catch (reason) {
      setActionState({
        busy: false,
        message: reason instanceof Error ? reason.message : "Canvas decision could not be recorded.",
      });
    }
  }

  if (!projectId) {
    return (
      <section className="studio-creative-canvas-empty" aria-label="Unified Creative Canvas empty state">
        <strong>Open a saved Studio project</strong>
        <p>The unified canvas is derived from project, Timeline, Storyboard, Execution, Output, Asset, and Delivery data.</p>
        <a href={LEGACY_CANVAS_ROUTE}>Open preserved Legacy Canvas</a>
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
        <div className="studio-creative-canvas-empty-actions">
          <button disabled={planningAvailability !== "READY"} onClick={() => setCopilotOpen(true)} type="button">Create with Copilot</button>
          <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">Edit Canvas</button>
        </div>
        {copilotOpen ? (
          <section className="studio-creative-canvas-copilot-form" aria-label="Create Canvas with Copilot">
            <textarea onChange={(event) => setCopilotPrompt(event.target.value)} placeholder="What do you want to create?" value={copilotPrompt} />
            <button disabled={!copilotPrompt.trim() || actionState.busy} onClick={() => void createWithCopilot()} type="button">Generate Draft Canvas</button>
          </section>
        ) : null}
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
            <div className="studio-creative-canvas-mode-actions">
              <button disabled={planningAvailability !== "READY"} onClick={() => {
                setCopilotOpen((value) => !value);
                setOptimizationOpen(false);
              }} type="button">
                {planningAvailability === "READY" ? "Create with Copilot" : "Copilot unavailable"}
              </button>
              <button disabled={optimizationAvailability !== "READY"} onClick={() => {
                setOptimizationOpen((value) => !value);
                setCopilotOpen(false);
              }} type="button">
                {optimizationAvailability === "READY" ? "Optimize with Copilot" : "Optimization unavailable"}
              </button>
              <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">
                {editingAvailability === "READY" ? "Edit Canvas" : "Editing unavailable"}
              </button>
            </div>
          ) : (
            <button onClick={cancelEditing} type="button">Exit draft</button>
          )}
        </div>
      </div>
      {activeDraft ? (
        <section
          className={`studio-creative-canvas-draft-banner is-${activeDraft.status.toLowerCase()}`}
          aria-label="Recovered Canvas Draft"
        >
          <header>
            <div>
              <span>{draftRecovery.status === "RESTORED" ? "DRAFT RESTORED" : "ACTIVE DRAFT"}</span>
              <strong>{activeDraft.draftType.replaceAll("_", " ")}</strong>
            </div>
            <b>{activeDraft.status}</b>
          </header>
          <div>
            <span>Draft <b>{activeDraft.draftId}</b></span>
            <span>Graph <b>{activeDraft.graphVersion}</b></span>
            <span>Changes <b>{session?.changes.length || changes.length}</b></span>
            <span>Evidence <b>{draftEvidenceCount}</b></span>
            <span>Confidence <b>{draftConfidence}</b></span>
            <span>Confirm <b>{session?.status || activeDraft.status}</b></span>
          </div>
          <footer>
            <small>{draftRecovery.message}</small>
            {draftRecovery.status === "UNAVAILABLE" ? (
              <button onClick={() => {
                draftRestoreAttemptRef.current = "";
                setDraftRestoreVersion((value) => value + 1);
              }} type="button">
                Retry restore
              </button>
            ) : null}
          </footer>
        </section>
      ) : null}
      {copilotOpen ? (
        <section className="studio-creative-canvas-copilot-form" aria-label="Create Canvas with Copilot">
          <header>
            <div><span>Creative Copilot</span><strong>AI Canvas Draft Planner</strong></div>
            <b>PREVIEW ONLY</b>
          </header>
          <label>
            <span>Prompt</span>
            <textarea onChange={(event) => setCopilotPrompt(event.target.value)} placeholder="Describe what you want to create…" value={copilotPrompt} />
          </label>
          <label>
            <span>Creative goal</span>
            <input onChange={(event) => setCopilotGoal(event.target.value)} placeholder="Optional — defaults to your Prompt" value={copilotGoal} />
          </label>
          <div>
            <label>
              <span>Duration</span>
              <input onChange={(event) => setCopilotDuration(event.target.value)} placeholder="e.g. 15s" value={copilotDuration} />
            </label>
            <label>
              <span>Ratio</span>
              <select onChange={(event) => setCopilotRatio(event.target.value)} value={copilotRatio}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
          </div>
          <footer>
            <small>Uses this project’s Goal, Strategy, Memory, successful Workflow Templates, and qualified past success patterns.</small>
            <button disabled={!copilotPrompt.trim() || actionState.busy} onClick={() => void createWithCopilot()} type="button">Generate Draft Canvas</button>
          </footer>
        </section>
      ) : null}
      {optimizationOpen ? (
        <section className="studio-creative-canvas-copilot-form" aria-label="Optimize Canvas with Copilot">
          <header>
            <div><span>Creative Copilot</span><strong>Workflow Optimization</strong></div>
            <b>PREVIEW ONLY</b>
          </header>
          <label>
            <span>Optimization target</span>
            <select
              onChange={(event) => setOptimizationTarget(event.target.value as StudioCanvasOptimizationType)}
              value={optimizationTarget}
            >
              {STUDIO_CANVAS_OPTIMIZATION_TYPES.map((type) => (
                <option key={type} value={type}>{studioCanvasOptimizationLabel(type)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Constraints</span>
            <textarea
              onChange={(event) => setOptimizationConstraint(event.target.value)}
              placeholder="Optional constraints, such as preserve approved Storyboard nodes"
              value={optimizationConstraint}
            />
          </label>
          <footer>
            <small>Analyzes Production, Quality, Revision, Cost, Historical Success, Governance Knowledge, and Project Memory.</small>
            <button disabled={actionState.busy} onClick={() => void optimizeWithCopilot()} type="button">
              Create Optimization Draft
            </button>
          </footer>
        </section>
      ) : null}
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
              setSimulation(null);
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
              setSimulation(null);
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
      {plannedDraft ? (
        <section className="studio-creative-canvas-ai-plan" aria-label="AI Planned Canvas Draft">
          <header>
            <div>
              <span>CANVAS_AUTO_PLAN_DRAFT</span>
              <strong>{plannedDraft.planningRequest.intent.replaceAll("_", " ")}</strong>
            </div>
            <b className={`is-${plannedDraft.confidence.toLowerCase()}`}>{plannedDraft.confidence} CONFIDENCE</b>
          </header>
          <p>{plannedDraft.planningRequest.goal}</p>
          <div className="studio-creative-canvas-ai-grid">
            <section>
              <header><strong>Why these nodes</strong><span>{plannedDraft.reasoning.length}</span></header>
              <div>
                {plannedDraft.reasoning.map((item) => (
                  <article key={item.nodeId}>
                    <span>{item.nodeType}</span>
                    <strong>{item.label}</strong>
                    <small>{item.reason}</small>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <header><strong>Evidence used</strong><span>{plannedDraft.evidence.length}</span></header>
              <div>
                {plannedDraft.evidence.map((item) => (
                  <article key={item.evidenceId}>
                    <span>{item.type.replaceAll("_", " ")}</span>
                    <strong>{item.confidence}</strong>
                    <small>{item.summary}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <footer>
            <span>Preview → Diff Review → Human Confirm</span>
            <small>Copilot created only a Draft. It did not modify the production Graph or start Execution.</small>
          </footer>
        </section>
      ) : null}
      {optimizedDraft ? (
        <section className="studio-creative-canvas-ai-plan is-optimization" aria-label="AI Optimized Canvas Draft">
          <header>
            <div>
              <span>CANVAS_WORKFLOW_OPTIMIZATION_DRAFT</span>
              <strong>{studioCanvasOptimizationLabel(optimizedDraft.optimizationRequest.target)}</strong>
            </div>
            <b className={`is-${optimizedDraft.confidence.toLowerCase()}`}>{optimizedDraft.confidence} CONFIDENCE</b>
          </header>
          <p>Current Graph {optimizedDraft.optimizationRequest.graphVersion} remains unchanged while this Draft is reviewed.</p>
          <div className="studio-creative-canvas-ai-grid">
            <section>
              <header><strong>Why this refinement</strong><span>{optimizedDraft.reasons.length}</span></header>
              <div>
                {optimizedDraft.reasons.map((item) => (
                  <article key={item.reasonId}>
                    <span>{item.type.replaceAll("_", " ")}</span>
                    <strong>{item.changeRefs.length} proposed changes</strong>
                    <small>{item.summary}</small>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <header><strong>Evidence used</strong><span>{optimizedDraft.evidence.length}</span></header>
              <div>
                {optimizedDraft.evidence.map((item) => (
                  <article key={item.evidenceId}>
                    <span>{item.type.replaceAll("_", " ")}</span>
                    <strong>{item.confidence}</strong>
                    <small>{item.summary}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <footer>
            <span>Existing Canvas → Optimization Analysis → Draft Graph → Diff Review → Human Confirm</span>
            <small>No production Graph mutation, task creation, Provider call, execution, or Credits action occurred.</small>
          </footer>
        </section>
      ) : null}
      {session ? (
        <section className="studio-creative-canvas-review" aria-label="Canvas Graph Diff">
          <header>
            <div><span>Graph Diff</span><strong>{session.status}</strong></div>
            <div className="studio-creative-canvas-review-actions">
              <button
                disabled={!simulationDraftId || simulationAvailability !== "READY" || actionState.busy}
                onClick={() => void simulateChange()}
                type="button"
              >
                {simulationAvailability === "READY" ? "Simulate Change" : "Simulation unavailable"}
              </button>
              <b className={session.validation.status === "READY" ? "is-ready" : "is-blocked"}>{session.validation.status}</b>
            </div>
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
          ) : session.status === "REJECTED" || session.status === "EXPIRED" ? (
            <p>
              This Draft is <b>{session.status}</b> and cannot be confirmed. Create a new Draft to continue; the production Graph remains unchanged.
            </p>
          ) : (
            <button disabled={session.validation.status !== "READY" || actionState.busy} onClick={() => void confirmDraft()} type="button">
              Confirm draft
            </button>
          )}
        </section>
      ) : null}
      {simulation ? (
        <section className="studio-creative-canvas-simulation" aria-label="Canvas Change Simulation">
          <header>
            <div>
              <span>CHANGE SIMULATION</span>
              <strong>{simulation.draftSource.replaceAll("_", " ")}</strong>
            </div>
            <b className={`is-${simulation.confidence.toLowerCase()}`}>{simulation.confidence} CONFIDENCE</b>
          </header>
          <div className="studio-creative-canvas-simulation-comparison">
            <article>
              <span>Before</span>
              <strong>{simulation.beforeState.agentCount} Agents</strong>
              <small>{simulation.beforeState.nodeCount} nodes · {simulation.beforeState.edgeCount} edges</small>
            </article>
            <em>→</em>
            <article>
              <span>After</span>
              <strong>{simulation.afterState.agentCount} Agents</strong>
              <small>{simulation.afterState.nodeCount} nodes · {simulation.afterState.edgeCount} edges</small>
            </article>
            <article>
              <span>Agent changes</span>
              <strong>
                {simulation.comparison.addedAgents.length
                  ? `+ ${simulation.comparison.addedAgents.join(", ")}`
                  : "No additions"}
              </strong>
              <small>
                {simulation.comparison.removedAgents.length
                  ? `− ${simulation.comparison.removedAgents.join(", ")}`
                  : "No removals"}
              </small>
            </article>
          </div>
          <div className="studio-creative-canvas-simulation-grid">
            <section>
              <header><strong>Impact</strong><span>{simulation.impact.length} metrics</span></header>
              {simulation.impact.map((item) => (
                <article key={item.metric}>
                  <div><strong>{studioCanvasImpactLabel(item.metric)}</strong><b>{item.assessment.replaceAll("_", " ")}</b></div>
                  <small>{item.summary}</small>
                </article>
              ))}
            </section>
            <section>
              <header><strong>Risk analysis</strong><span>{simulation.risks.length} checks</span></header>
              {simulation.risks.map((risk) => (
                <article className={`is-${risk.severity.toLowerCase()}`} key={risk.riskId}>
                  <div><strong>{risk.type.replaceAll("_", " ")}</strong><b>{risk.severity}</b></div>
                  <small>{risk.message}</small>
                </article>
              ))}
            </section>
          </div>
          <footer>
            <span>Comparison Preview only</span>
            <small>No change was applied. Cost values are estimates and Credits remain unchanged.</small>
          </footer>
          <section className="studio-creative-canvas-decision-form" aria-label="Record Canvas decision">
            <header>
              <strong>Record your choice</strong>
              <small>This records a human decision; it does not confirm or apply the Draft.</small>
            </header>
            <div>
              <button
                className={decisionChoice === "SELECT_DRAFT" ? "is-selected" : ""}
                onClick={() => setDecisionChoice("SELECT_DRAFT")}
                type="button"
              >
                Select Draft
              </button>
              <button
                className={decisionChoice === "KEEP_CURRENT" ? "is-selected" : ""}
                onClick={() => setDecisionChoice("KEEP_CURRENT")}
                type="button"
              >
                Keep current
              </button>
            </div>
            <textarea
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder="Why did you choose this option?"
              value={decisionReason}
            />
            <button
              disabled={!decisionReason.trim() || actionState.busy || decisionAvailability !== "READY"}
              onClick={() => void recordDecision()}
              type="button"
            >
              Record decision
            </button>
          </section>
        </section>
      ) : null}
      <section className="studio-creative-canvas-decision-history" aria-label="Decision History">
        <header>
          <div><span>DECISION MEMORY</span><strong>Decision History</strong></div>
          <small>
            Project-scoped · {decisionHistory?.outcomeAnalysis.recorded || 0} outcomes · future suggestions only
          </small>
        </header>
        {decisionHistory?.learningSignals.length ? (
          <div className="studio-creative-canvas-learning-signals">
            {decisionHistory.learningSignals.map((item) => (
              <span key={item.signal}>
                {studioCanvasLearningSignalLabel(item.signal)} · {item.confidence}
              </span>
            ))}
          </div>
        ) : null}
        {decisionHistory?.decisions.length ? (
          <div className="studio-creative-canvas-decision-list">
            {decisionHistory.decisions.map((decision) => (
              <article key={decision.decisionId}>
                <header>
                  <strong>{decision.selectedOption === "SELECT_DRAFT" ? "Selected Draft" : "Kept current Canvas"}</strong>
                  <small>{new Date(decision.createdAt).toLocaleDateString()}</small>
                </header>
                <p>{decision.reason}</p>
                <span>{decision.sourceDraft.draftSource.replaceAll("_", " ")}</span>
                <small>
                  {decision.outcome
                    ? `Outcome: quality ${String(decision.outcome.quality ?? "unknown")} · delivery ${String(decision.outcome.delivery ?? "unknown")}`
                    : "Outcome pending"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p>No Canvas decisions recorded for this project.</p>
        )}
        <footer>No cross-user learning, automatic preference changes, execution, Provider calls, or Credits actions.</footer>
      </section>
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
