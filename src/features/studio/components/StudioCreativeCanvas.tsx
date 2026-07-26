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
  canvasDraftRecoveryErrorMessage,
  clearActiveStudioCreativeCanvasDraft,
  getActiveStudioCreativeCanvasDraft,
  recoverStudioCreativeCanvasDraft,
  saveActiveStudioCreativeCanvasDraft,
  type StudioCreativeCanvasActiveDraft,
  type StudioCreativeCanvasDraftType,
} from "@/lib/studio-creative-canvas-draft-recovery";
import type { StudioExperienceMode } from "@/features/studio/lib/studioExperienceMode";
import { useI18n } from "@/i18n/useI18n";

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
        label: String(source.metadata.title || studioCreativeCanvasNodeLabel(source.nodeType)),
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

function changeLabel(change: StudioCreativeCanvasGraphChange, tf: ReturnType<typeof useI18n>["tf"]) {
  switch (change.type) {
    case "ADD_NODE": return tf("studio.creativeCanvas.change.add", { value: change.node?.nodeType || "node" });
    case "REMOVE_NODE": return tf("studio.creativeCanvas.change.remove", { value: change.nodeId });
    case "MOVE_NODE": return tf("studio.creativeCanvas.change.move", { value: change.nodeId });
    case "CONNECT_EDGE": return tf("studio.creativeCanvas.change.connect", { source: change.source, target: change.target });
    case "DISCONNECT_EDGE": return tf("studio.creativeCanvas.change.disconnect", { source: change.source, target: change.target });
    case "UPDATE_CONFIG": return tf("studio.creativeCanvas.change.update", { value: change.nodeId });
  }
}

export function StudioCreativeCanvas({
  projectId,
  authReady = true,
  experienceMode = "CREATOR",
}: {
  projectId: string | null;
  authReady?: boolean;
  experienceMode?: StudioExperienceMode;
}) {
  const { t, tf } = useI18n();
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
    if (!projectId || !authReady) return;
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
  }, [authReady, projectId]);

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
    if (!authReady || !projectId || loadState.projectId !== projectId || !loadState.graph) return;
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
            ? t("studio.creativeCanvas.recovery.waiting")
            : t("studio.creativeCanvas.recovery.unavailable"),
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
      setDraftRecovery({ status: "RESTORING", message: t("studio.creativeCanvas.recovery.restoring") });
    }, 0);

    void recoverStudioCreativeCanvasDraft(async (attemptSignal) => {
      let nextPlannedDraft: StudioAIPlannedCanvasDraft | null = null;
      let nextOptimizedDraft: StudioAIOptimizedCanvasDraft | null = null;
      let editSessionId = storedDraft.editSessionId;

      if (storedDraft.draftType === "AI_PLAN") {
        nextPlannedDraft = await getStudioCreativeCanvasPlan(
          projectId,
          storedDraft.draftId,
          attemptSignal,
        );
        editSessionId = nextPlannedDraft.editSession.sessionId;
      } else if (storedDraft.draftType === "AI_OPTIMIZATION") {
        nextOptimizedDraft = await getStudioCreativeCanvasOptimization(
          projectId,
          storedDraft.draftId,
          attemptSignal,
        );
        editSessionId = nextOptimizedDraft.editSession.sessionId;
      }

      const nextSession = await getStudioCreativeCanvasEditSession(
        projectId,
        editSessionId,
        attemptSignal,
      );
      return { nextOptimizedDraft, nextPlannedDraft, nextSession };
    }, { signal: controller.signal })
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
          message: tf("studio.creativeCanvas.recovery.complete", { status: nextSession.status }),
        });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setDraftRecovery({
          status: "UNAVAILABLE",
          message: canvasDraftRecoveryErrorMessage(reason),
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
    authReady,
    draftRestoreVersion,
    editingAvailability,
    loadState.graph,
    loadState.projectId,
    optimizationAvailability,
    planningAvailability,
    projectId,
    t,
    tf,
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
    setActionState({ busy: false, message: t("studio.creativeCanvas.action.localDraft") });
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
    setActionState({ busy: false, message: t("studio.creativeCanvas.action.discarded") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.validating") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.confirming") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.planning") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.optimizing") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.simulating") });
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
    setActionState({ busy: true, message: t("studio.creativeCanvas.action.recording") });
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
      <section className="studio-creative-canvas-empty" aria-label={t("studio.creativeCanvas.empty.aria")}>
        <strong>{t("studio.creativeCanvas.empty.title")}</strong>
        <p>{t("studio.creativeCanvas.empty.message")}</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="studio-creative-canvas-empty is-error" role="alert">
        <strong>{t("studio.creativeCanvas.error.title")}</strong>
        <p>{error}</p>
        <small>{t("studio.creativeCanvas.error.boundary")}</small>
      </section>
    );
  }
  if (!graph) return <div className="studio-agent-canvas-empty">{t("studio.creativeCanvas.loading")}</div>;
  if (!graph.nodes.length && mode === "VIEW") {
    return (
      <section className="studio-creative-canvas-empty">
        <strong>{t("studio.creativeCanvas.ready.title")}</strong>
        <p>{t("studio.creativeCanvas.ready.message")}</p>
        <div className="studio-creative-canvas-empty-actions">
          <button disabled={planningAvailability !== "READY"} onClick={() => setCopilotOpen(true)} type="button">{t("studio.creativeCanvas.createWithCopilot")}</button>
          <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">{t("studio.creativeCanvas.edit")}</button>
        </div>
        {copilotOpen ? (
          <section className="studio-creative-canvas-copilot-form" aria-label={t("studio.creativeCanvas.planner.aria")}>
            <textarea onChange={(event) => setCopilotPrompt(event.target.value)} placeholder={t("studio.creativeCanvas.prompt.placeholder")} value={copilotPrompt} />
            <button disabled={!copilotPrompt.trim() || actionState.busy} onClick={() => void createWithCopilot()} type="button">{t("studio.creativeCanvas.generateDraft")}</button>
          </section>
        ) : null}
        <small>{t("studio.creativeCanvas.ready.boundary")}</small>
      </section>
    );
  }

  return (
    <section
      className={`studio-creative-canvas-layout is-${mode.toLowerCase()} is-${experienceMode.toLowerCase()}`}
      aria-label={t("studio.creativeCanvas.layoutAria")}
    >
      <div className="studio-creative-canvas-summary">
        <div>
          <span>{t("studio.creativeCanvas.title")}</span>
          <strong>{tf("studio.creativeCanvas.relationships", { nodes: flowNodes.length, edges: flowEdges.length })}</strong>
        </div>
        <div className="studio-creative-canvas-mode">
          {experienceMode === "ADVANCED" ? <span>{graph.schemaVersion}</span> : null}
          <b>{mode === "VIEW" ? t("studio.creativeCanvas.mode.view") : t("studio.creativeCanvas.mode.edit")}</b>
          {mode === "VIEW" ? (
            <div className="studio-creative-canvas-mode-actions">
              <button disabled={planningAvailability !== "READY"} onClick={() => {
                setCopilotOpen((value) => !value);
                setOptimizationOpen(false);
              }} type="button">
                {planningAvailability === "READY" ? t("studio.creativeCanvas.createWithCopilot") : t("studio.creativeCanvas.copilotUnavailable")}
              </button>
              <button disabled={optimizationAvailability !== "READY"} onClick={() => {
                setOptimizationOpen((value) => !value);
                setCopilotOpen(false);
              }} type="button">
                {optimizationAvailability === "READY" ? t("studio.creativeCanvas.optimize") : t("studio.creativeCanvas.optimizationUnavailable")}
              </button>
              <button disabled={editingAvailability !== "READY"} onClick={startEditing} type="button">
                {editingAvailability === "READY" ? t("studio.creativeCanvas.edit") : t("studio.creativeCanvas.editingUnavailable")}
              </button>
            </div>
          ) : (
            <button onClick={cancelEditing} type="button">{t("studio.creativeCanvas.exitDraft")}</button>
          )}
        </div>
      </div>
      {activeDraft ? (
        <section
          className={`studio-creative-canvas-draft-banner is-${activeDraft.status.toLowerCase()}`}
          aria-label={t("studio.creativeCanvas.recovery.aria")}
        >
          <header>
            <div>
              <span>{draftRecovery.status === "RESTORED" ? t("studio.creativeCanvas.recovery.restored") : t("studio.creativeCanvas.recovery.active")}</span>
              <strong>{experienceMode === "CREATOR" ? t("studio.creator.copilot.suggestion") : activeDraft.draftType.replaceAll("_", " ")}</strong>
            </div>
            <b>{activeDraft.status}</b>
          </header>
          <div>
            {experienceMode === "ADVANCED" ? (
              <>
                <span>{t("studio.creativeCanvas.recovery.draft")} <b>{activeDraft.draftId}</b></span>
                <span>{t("studio.creativeCanvas.recovery.graph")} <b>{activeDraft.graphVersion}</b></span>
              </>
            ) : null}
            <span>{t("studio.common.changes")} <b>{session?.changes.length || changes.length}</b></span>
            <span>{t(experienceMode === "CREATOR" ? "studio.creator.copilot.reasons" : "studio.common.evidence")} <b>{draftEvidenceCount}</b></span>
            <span>{t(experienceMode === "CREATOR" ? "studio.creator.copilot.guidance" : "studio.common.confidence")} <b>{draftConfidence}</b></span>
            <span>{t(experienceMode === "CREATOR" ? "studio.creator.copilot.nextStep" : "studio.common.confirm")} <b>{session?.status || activeDraft.status}</b></span>
          </div>
          <footer>
            <small>{draftRecovery.message}</small>
            {draftRecovery.status === "UNAVAILABLE" ? (
              <button onClick={() => {
                draftRestoreAttemptRef.current = "";
                setDraftRestoreVersion((value) => value + 1);
              }} type="button">
                {t("studio.creativeCanvas.recovery.retry")}
              </button>
            ) : null}
          </footer>
        </section>
      ) : null}
      {copilotOpen ? (
        <section className="studio-creative-canvas-copilot-form" aria-label={t("studio.creativeCanvas.planner.aria")}>
          <header>
            <div><span>{t("studio.copilot.title")}</span><strong>{t("studio.creativeCanvas.planner.title")}</strong></div>
            <b>{t("studio.creativeCanvas.previewOnly")}</b>
          </header>
          <label>
            <span>{t("studio.creativeCanvas.prompt")}</span>
            <textarea onChange={(event) => setCopilotPrompt(event.target.value)} placeholder="Describe what you want to create…" value={copilotPrompt} />
          </label>
          <label>
            <span>{t("studio.creativeCanvas.goal")}</span>
            <input onChange={(event) => setCopilotGoal(event.target.value)} placeholder="Optional — defaults to your Prompt" value={copilotGoal} />
          </label>
          <div>
            <label>
              <span>{t("studio.creativeCanvas.duration")}</span>
              <input onChange={(event) => setCopilotDuration(event.target.value)} placeholder={t("studio.creativeCanvas.duration.placeholder")} value={copilotDuration} />
            </label>
            <label>
              <span>{t("studio.creativeCanvas.ratio")}</span>
              <select onChange={(event) => setCopilotRatio(event.target.value)} value={copilotRatio}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
          </div>
          <footer>
            <small>{t("studio.creativeCanvas.planner.sources")}</small>
            <button disabled={!copilotPrompt.trim() || actionState.busy} onClick={() => void createWithCopilot()} type="button">{t("studio.creativeCanvas.generateDraft")}</button>
          </footer>
        </section>
      ) : null}
      {optimizationOpen ? (
        <section className="studio-creative-canvas-copilot-form" aria-label={t("studio.creativeCanvas.optimization.aria")}>
          <header>
            <div><span>{t("studio.copilot.title")}</span><strong>{t("studio.creativeCanvas.optimization.title")}</strong></div>
            <b>{t("studio.creativeCanvas.previewOnly")}</b>
          </header>
          <label>
            <span>{t("studio.creativeCanvas.optimization.target")}</span>
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
            <span>{t("studio.creativeCanvas.optimization.constraints")}</span>
            <textarea
              onChange={(event) => setOptimizationConstraint(event.target.value)}
              placeholder={t("studio.creativeCanvas.optimization.placeholder")}
              value={optimizationConstraint}
            />
          </label>
          <footer>
            <small>{t("studio.creativeCanvas.optimization.sources")}</small>
            <button disabled={actionState.busy} onClick={() => void optimizeWithCopilot()} type="button">
              {t("studio.creativeCanvas.optimization.createDraft")}
            </button>
          </footer>
        </section>
      ) : null}
      {mode === "EDIT_DRAFT" ? (
        <section className="studio-creative-canvas-edit-toolbar" aria-label={t("studio.creativeCanvas.edit.aria")}>
          <div>
            <select onChange={(event) => setNewNodeType(event.target.value as StudioCreativeCanvasNodeType)} value={newNodeType}>
              {editableNodeTypes.map((type) => <option key={type} value={type}>{studioCreativeCanvasNodeLabel(type)}</option>)}
            </select>
            <input onChange={(event) => setNewNodeTitle(event.target.value)} placeholder={t("studio.creativeCanvas.edit.newNode")} value={newNodeTitle} />
            <button disabled={!newNodeTitle.trim()} onClick={addNode} type="button">{t("studio.creativeCanvas.edit.addNode")}</button>
          </div>
          <div>
            <button disabled={!selectedId} onClick={removeSelected} type="button">{t("studio.creativeCanvas.edit.removeSelected")}</button>
            <button disabled={!changes.length || actionState.busy} onClick={() => void reviewChanges()} type="button">{t("studio.creativeCanvas.edit.reviewChanges")}</button>
          </div>
          <small>{t("studio.creativeCanvas.edit.message")}</small>
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
        <aside className="studio-creative-canvas-details" aria-label={t("studio.creativeCanvas.details.aria")}>
          {selected ? (
            <>
              <span>{studioCreativeCanvasNodeLabel(selected.nodeType)}</span>
              <h3>{String(selected.metadata.title || studioCreativeCanvasNodeLabel(selected.nodeType))}</h3>
              <dl>
                <div><dt>{t("studio.creativeCanvas.details.status")}</dt><dd>{selected.status}</dd></div>
                <div><dt>{t("studio.creativeCanvas.details.updated")}</dt><dd>{selected.createdAt || t("studio.creativeCanvas.details.unknown")}</dd></div>
                {experienceMode === "ADVANCED" ? (
                  <>
                    <div><dt>{t("studio.creativeCanvas.details.source")}</dt><dd>{String(selected.metadata.source || selected.metadata.sourceCanvas || t("studio.creativeCanvas.details.projectData"))}</dd></div>
                    <div><dt>{t("studio.creativeCanvas.details.reference")}</dt><dd>{selected.referenceId}</dd></div>
                    {selected.metadata.timelineRef ? <div><dt>{t("studio.creativeCanvas.details.timeline")}</dt><dd>{selected.metadata.timelineRef}</dd></div> : null}
                    {selected.metadata.version ? <div><dt>{t("studio.creativeCanvas.details.version")}</dt><dd>{selected.metadata.version}</dd></div> : null}
                  </>
                ) : null}
              </dl>
              {mode === "EDIT_DRAFT" ? (
                <div className="studio-creative-canvas-config">
                  <input onChange={(event) => setConfigValue(event.target.value)} placeholder={t("studio.creativeCanvas.details.configPlaceholder")} value={configValue} />
                  <button disabled={!configValue.trim()} onClick={updateSelectedConfig} type="button">{t("studio.creativeCanvas.details.updateConfig")}</button>
                </div>
              ) : (
                <small>{t("studio.creativeCanvas.details.readOnly")}</small>
              )}
            </>
          ) : <p>{t("studio.creativeCanvas.details.select")}</p>}
          {mode === "EDIT_DRAFT" ? (
            <section className="studio-creative-canvas-change-list" aria-label={t("studio.creativeCanvas.diff.title")}>
              <header><span>{t("studio.creativeCanvas.diff.title")}</span><b>{changes.length}</b></header>
              {changes.length ? changes.map((change) => <small key={change.changeId}>{changeLabel(change, tf)}</small>) : <small>{t("studio.creativeCanvas.diff.empty")}</small>}
            </section>
          ) : null}
        </aside>
      </div>
      {plannedDraft ? (
        <section className="studio-creative-canvas-ai-plan" aria-label={t("studio.creativeCanvas.plan.aria")}>
          <header>
            <div>
              <span>{experienceMode === "CREATOR" ? t("studio.creator.copilot.suggestion") : "CANVAS_AUTO_PLAN_DRAFT"}</span>
              <strong>{plannedDraft.planningRequest.intent.replaceAll("_", " ")}</strong>
            </div>
            <b className={`is-${plannedDraft.confidence.toLowerCase()}`}>
              {experienceMode === "CREATOR" ? `${t("studio.creator.copilot.guidance")} · ${plannedDraft.confidence}` : `${plannedDraft.confidence} CONFIDENCE`}
            </b>
          </header>
          <p>{plannedDraft.planningRequest.goal}</p>
          <div className="studio-creative-canvas-ai-grid">
            <section>
              <header><strong>{t("studio.creativeCanvas.plan.reasoning")}</strong><span>{plannedDraft.reasoning.length}</span></header>
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
              <header><strong>{t(experienceMode === "CREATOR" ? "studio.creator.copilot.reasons" : "studio.creativeCanvas.plan.evidence")}</strong><span>{plannedDraft.evidence.length}</span></header>
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
            <span>{t("studio.creativeCanvas.plan.flow")}</span>
            <small>{t("studio.creativeCanvas.plan.boundary")}</small>
          </footer>
        </section>
      ) : null}
      {optimizedDraft ? (
        <section className="studio-creative-canvas-ai-plan is-optimization" aria-label={t("studio.creativeCanvas.optimized.aria")}>
          <header>
            <div>
              <span>{experienceMode === "CREATOR" ? t("studio.creator.copilot.suggestion") : "CANVAS_WORKFLOW_OPTIMIZATION_DRAFT"}</span>
              <strong>{studioCanvasOptimizationLabel(optimizedDraft.optimizationRequest.target)}</strong>
            </div>
            <b className={`is-${optimizedDraft.confidence.toLowerCase()}`}>
              {experienceMode === "CREATOR" ? `${t("studio.creator.copilot.guidance")} · ${optimizedDraft.confidence}` : `${optimizedDraft.confidence} CONFIDENCE`}
            </b>
          </header>
          <p>
            {experienceMode === "CREATOR"
              ? t("studio.creativeCanvas.optimized.boundary")
              : `Current Graph ${optimizedDraft.optimizationRequest.graphVersion} remains unchanged while this Draft is reviewed.`}
          </p>
          <div className="studio-creative-canvas-ai-grid">
            <section>
              <header><strong>{t("studio.creativeCanvas.optimized.reasoning")}</strong><span>{optimizedDraft.reasons.length}</span></header>
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
              <header><strong>{t(experienceMode === "CREATOR" ? "studio.creator.copilot.reasons" : "studio.creativeCanvas.plan.evidence")}</strong><span>{optimizedDraft.evidence.length}</span></header>
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
            <span>{t("studio.creativeCanvas.optimized.flow")}</span>
            <small>{t("studio.creativeCanvas.optimized.boundary")}</small>
          </footer>
        </section>
      ) : null}
      {session ? (
        <section className="studio-creative-canvas-review" aria-label={t("studio.creativeCanvas.diff.aria")}>
          <header>
            <div><span>{t("studio.creativeCanvas.diff.title")}</span><strong>{session.status}</strong></div>
            <div className="studio-creative-canvas-review-actions">
              <button
                disabled={!simulationDraftId || simulationAvailability !== "READY" || actionState.busy}
                onClick={() => void simulateChange()}
                type="button"
              >
                {simulationAvailability === "READY" ? t("studio.creativeCanvas.simulation.action") : t("studio.creativeCanvas.simulation.unavailable")}
              </button>
              <b className={session.validation.status === "READY" ? "is-ready" : "is-blocked"}>{session.validation.status}</b>
            </div>
          </header>
          <div className="studio-creative-canvas-diff">
            <span>{t("studio.creativeCanvas.diff.added")} <b>{session.diff.summary.addedNodes}</b></span>
            <span>{t("studio.creativeCanvas.diff.removed")} <b>{session.diff.summary.removedNodes}</b></span>
            <span>{t("studio.creativeCanvas.diff.moved")} <b>{session.diff.summary.movedNodes}</b></span>
            <span>{t("studio.creativeCanvas.diff.edges")} <b>{session.diff.summary.changedEdges}</b></span>
            <span>{t("studio.creativeCanvas.diff.config")} <b>{session.diff.summary.configChanges}</b></span>
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
            <p>{tf("studio.creativeCanvas.diff.confirmed", { id: session.confirmedDraft?.draftId })}</p>
          ) : session.status === "REJECTED" || session.status === "EXPIRED" ? (
            <p>{tf("studio.creativeCanvas.diff.terminal", { status: session.status })}</p>
          ) : (
            <button disabled={session.validation.status !== "READY" || actionState.busy} onClick={() => void confirmDraft()} type="button">
              {t("studio.creativeCanvas.diff.confirmDraft")}
            </button>
          )}
        </section>
      ) : null}
      {simulation ? (
        <section className="studio-creative-canvas-simulation" aria-label={t("studio.creativeCanvas.simulation.aria")}>
          <header>
            <div>
              <span>{t("studio.creativeCanvas.simulation.title")}</span>
              <strong>{simulation.draftSource.replaceAll("_", " ")}</strong>
            </div>
            <b className={`is-${simulation.confidence.toLowerCase()}`}>{simulation.confidence} CONFIDENCE</b>
          </header>
          <div className="studio-creative-canvas-simulation-comparison">
            <article>
              <span>{t("studio.creativeCanvas.simulation.before")}</span>
              <strong>{simulation.beforeState.agentCount} Agents</strong>
              <small>{simulation.beforeState.nodeCount} nodes · {simulation.beforeState.edgeCount} edges</small>
            </article>
            <em>→</em>
            <article>
              <span>{t("studio.creativeCanvas.simulation.after")}</span>
              <strong>{simulation.afterState.agentCount} Agents</strong>
              <small>{simulation.afterState.nodeCount} nodes · {simulation.afterState.edgeCount} edges</small>
            </article>
            <article>
              <span>{t("studio.creativeCanvas.simulation.agentChanges")}</span>
              <strong>
                {simulation.comparison.addedAgents.length
                  ? `+ ${simulation.comparison.addedAgents.join(", ")}`
                  : t("studio.creativeCanvas.simulation.noAdditions")}
              </strong>
              <small>
                {simulation.comparison.removedAgents.length
                  ? `− ${simulation.comparison.removedAgents.join(", ")}`
                  : t("studio.creativeCanvas.simulation.noRemovals")}
              </small>
            </article>
          </div>
          <div className="studio-creative-canvas-simulation-grid">
            <section>
              <header><strong>{t("studio.creativeCanvas.simulation.impact")}</strong><span>{tf("studio.creativeCanvas.simulation.metrics", { count: simulation.impact.length })}</span></header>
              {simulation.impact.map((item) => (
                <article key={item.metric}>
                  <div><strong>{studioCanvasImpactLabel(item.metric)}</strong><b>{item.assessment.replaceAll("_", " ")}</b></div>
                  <small>{item.summary}</small>
                </article>
              ))}
            </section>
            <section>
              <header><strong>{t("studio.creativeCanvas.simulation.risk")}</strong><span>{tf("studio.creativeCanvas.simulation.checks", { count: simulation.risks.length })}</span></header>
              {simulation.risks.map((risk) => (
                <article className={`is-${risk.severity.toLowerCase()}`} key={risk.riskId}>
                  <div><strong>{risk.type.replaceAll("_", " ")}</strong><b>{risk.severity}</b></div>
                  <small>{risk.message}</small>
                </article>
              ))}
            </section>
          </div>
          <footer>
            <span>{t("studio.creativeCanvas.simulation.previewOnly")}</span>
            <small>{t("studio.creativeCanvas.simulation.boundary")}</small>
          </footer>
          <section className="studio-creative-canvas-decision-form" aria-label={t("studio.creativeCanvas.decision.aria")}>
            <header>
              <strong>{t("studio.creativeCanvas.decision.title")}</strong>
              <small>{t("studio.creativeCanvas.decision.message")}</small>
            </header>
            <div>
              <button
                className={decisionChoice === "SELECT_DRAFT" ? "is-selected" : ""}
                onClick={() => setDecisionChoice("SELECT_DRAFT")}
                type="button"
              >
                {t("studio.creativeCanvas.decision.selectDraft")}
              </button>
              <button
                className={decisionChoice === "KEEP_CURRENT" ? "is-selected" : ""}
                onClick={() => setDecisionChoice("KEEP_CURRENT")}
                type="button"
              >
                {t("studio.creativeCanvas.decision.keepCurrent")}
              </button>
            </div>
            <textarea
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder={t("studio.creativeCanvas.decision.reasonPlaceholder")}
              value={decisionReason}
            />
            <button
              disabled={!decisionReason.trim() || actionState.busy || decisionAvailability !== "READY"}
              onClick={() => void recordDecision()}
              type="button"
            >
              {t("studio.creativeCanvas.decision.record")}
            </button>
          </section>
        </section>
      ) : null}
      <section className="studio-creative-canvas-decision-history" aria-label={t("studio.creativeCanvas.decision.history")}>
        <header>
          <div><span>{t("studio.creativeCanvas.decision.memory")}</span><strong>{t("studio.creativeCanvas.decision.history")}</strong></div>
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
                  <strong>{decision.selectedOption === "SELECT_DRAFT" ? t("studio.creativeCanvas.decision.selected") : t("studio.creativeCanvas.decision.kept")}</strong>
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
          <p>{t("studio.creativeCanvas.decision.empty")}</p>
        )}
        <footer>{t("studio.creativeCanvas.decision.boundary")}</footer>
      </section>
      {actionState.message ? <p className="studio-creative-canvas-message" role="status">{actionState.message}</p> : null}
      <footer className="studio-creative-canvas-migration">
        <div>
          <strong>{t("studio.creativeCanvas.boundary.title")}</strong>
          <span>{t("studio.creativeCanvas.boundary.message")}</span>
        </div>
      </footer>
    </section>
  );
}
