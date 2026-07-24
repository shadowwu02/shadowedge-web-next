"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  STUDIO_CANVAS_EXECUTION_GATE_LABELS,
  studioCanvasDraftActionLabel,
  studioCanvasDraftActionType,
  studioAgentCanvasNodeLabel,
  type StudioAgentCanvasGraph,
  type StudioAgentCanvasNode,
  type StudioAgentCanvasNodeType,
  type StudioCanvasProductionResults,
  type StudioCanvasDraftActionPreviewResult,
  type StudioCanvasExecutionApproval,
  type StudioCanvasExecutionPreview,
  type StudioCanvasExecutionStatusProjection,
  type StudioCanvasWorkflowChange,
  type StudioCanvasWorkflowDraft,
} from "@/features/studio/capabilities/studioAgentCanvas";
import {
  STUDIO_AGENT_WORKFLOW_NODE_TYPES,
  type StudioAgentWorkflowDraft,
  type StudioAgentWorkflowDraftChange,
  type StudioAgentWorkflowGraph,
  type StudioAgentWorkflowNodeType,
} from "@/features/studio/capabilities/studioAgentWorkflowGraph";
import type { StudioAgentRunPlan } from "@/features/studio/capabilities/studioAgentRunPlan";
import type {
  StudioWorkflowTemplateApplyDraft,
  StudioWorkflowTemplateLibrary,
} from "@/features/studio/capabilities/studioWorkflowTemplateLibrary";
import {
  confirmStudioCanvasWorkflowDraft,
  confirmStudioCanvasDraftAction,
  confirmStudioCanvasExecutionApproval,
  createStudioCanvasExecutionApproval,
  createStudioCanvasWorkflowDraft,
  createStudioCanvasExecutionPreview,
  getStudioAgentCanvas,
  getStudioCanvasExecutionStatus,
  getStudioCanvasWorkflowDraft,
  getStudioCanvasProductionResults,
  previewStudioCanvasDraftAction,
} from "@/lib/studio-agent-canvas-api";
import {
  confirmStudioWorkflowTemplateApply,
  getStudioUserWorkflowTemplates,
  previewStudioWorkflowTemplateApply,
  saveStudioWorkflowTemplate,
} from "@/lib/studio-workflow-template-api";
import {
  confirmStudioAgentWorkflowDraft,
  createStudioAgentWorkflowDraft,
  getStudioAgentWorkflowGraph,
} from "@/lib/studio-agent-workflow-graph-api";
import { createStudioAgentRunPlan } from "@/lib/studio-agent-run-plan-api";

type AgentFlowNodeData = {
  source: StudioAgentCanvasNode;
  label: string;
  busy: boolean;
  onPreview: (node: StudioAgentCanvasNode) => void;
};
type AgentFlowNode = Node<AgentFlowNodeData, "agentCanvas">;
type AgentWorkflowFlowNodeData = {
  label: string;
  nodeType: StudioAgentWorkflowNodeType | "TASK";
  status: string;
  detail: string;
  waiting: boolean;
};
type AgentWorkflowFlowNode = Node<AgentWorkflowFlowNodeData, "agentWorkflow">;
type StudioFlowNode = AgentFlowNode | AgentWorkflowFlowNode;

const laneX: Record<StudioAgentCanvasNodeType, number> = {
  GOAL: 20,
  STRATEGY: 300,
  AGENT_TEAM: 580,
  TASK: 860,
  EXECUTION: 1140,
  ASSET: 1420,
};

const AgentNode = memo(function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
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
});

const AgentWorkflowNode = memo(function AgentWorkflowNode({ data, selected }: NodeProps<AgentWorkflowFlowNode>) {
  return (
    <article className={`studio-agent-workflow-node studio-agent-workflow-node-${data.nodeType.toLowerCase()}${selected ? " is-selected" : ""}${data.waiting ? " is-waiting" : ""}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div>
        <span>{data.nodeType.replaceAll("_", " ")}</span>
        <b>{data.status}</b>
      </div>
      <strong>{data.label}</strong>
      <small>{data.detail}</small>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </article>
  );
});

const agentNodeTypes = { agentCanvas: AgentNode, agentWorkflow: AgentWorkflowNode } satisfies NodeTypes;

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

function toAgentWorkflowFlowNodes(graph: StudioAgentWorkflowGraph): AgentWorkflowFlowNode[] {
  const roleX = new Map(graph.agents.map((agent, index) => [agent.agentId, 30 + index * 285]));
  const taskCounts = new Map<string, number>();
  const taskPositions = new Map<string, { x: number; y: number }>();
  const agents = graph.agents.map((agent) => ({
    id: agent.agentId,
    type: "agentWorkflow" as const,
    position: { x: roleX.get(agent.agentId) || 30, y: 45 },
    data: {
      label: agent.label,
      nodeType: agent.nodeType,
      status: agent.status,
      detail: `${agent.taskIds.length} task${agent.taskIds.length === 1 ? "" : "s"} · ${agent.source.replaceAll("_", " ")}`,
      waiting: agent.status === "WAITING_HUMAN",
    },
    draggable: false,
    connectable: false,
    selectable: true,
  }));
  const tasks = graph.tasks.map((task) => {
    const index = taskCounts.get(task.agentId) || 0;
    taskCounts.set(task.agentId, index + 1);
    const position = { x: roleX.get(task.agentId) || 30, y: 205 + index * 135 };
    taskPositions.set(task.taskId, position);
    return {
      id: task.taskId,
      type: "agentWorkflow" as const,
      position,
      data: {
        label: task.capabilities[0] || task.sourceTaskId || task.taskId,
        nodeType: "TASK" as const,
        status: task.status,
        detail: `${task.roleId.replaceAll("_", " ")} · priority ${task.priority}`,
        waiting: task.waiting,
      },
      draggable: false,
      connectable: false,
      selectable: true,
    };
  });
  const checkpoints = graph.checkpoints.map((checkpoint, index) => {
    const source = taskPositions.get(checkpoint.taskId) || { x: 30 + index * 285, y: 205 };
    return {
      id: checkpoint.checkpointId,
      type: "agentWorkflow" as const,
      position: { x: source.x, y: source.y + 125 },
      data: {
        label: checkpoint.type.replaceAll("_", " "),
        nodeType: "HUMAN_CHECKPOINT" as const,
        status: checkpoint.status,
        detail: checkpoint.reason || "Human decision required",
        waiting: checkpoint.status === "WAITING_HUMAN" || checkpoint.status === "DEFERRED",
      },
      draggable: false,
      connectable: false,
      selectable: true,
    };
  });
  return [...agents, ...tasks, ...checkpoints];
}

function toAgentWorkflowFlowEdges(graph: StudioAgentWorkflowGraph): Edge[] {
  const taskOwnership = graph.tasks.map((task) => ({
    id: `agent-task:${task.agentId}:${task.taskId}`,
    source: task.agentId,
    target: task.taskId,
    type: "smoothstep",
    label: "owns",
    selectable: false,
    style: { stroke: "rgba(148, 163, 184, 0.35)", strokeDasharray: "4 4" },
  }));
  const dependencies = graph.dependencies.map((dependency) => ({
    id: dependency.dependencyId,
    source: dependency.sourceId,
    target: dependency.targetId,
    type: "smoothstep",
    label: dependency.type.toLowerCase(),
    animated: dependency.type === "PARALLEL",
    selectable: false,
    style: {
      stroke: dependency.type === "CHECKPOINT" ? "#fbbf24" : dependency.type === "PARALLEL" ? "#a78bfa" : "#38bdf8",
      strokeWidth: dependency.type === "CHECKPOINT" ? 2 : 1.5,
    },
  }));
  return [...taskOwnership, ...dependencies];
}

function detailValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" · ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function CanvasErrorPanel({
  title = "Canvas Error Panel",
  reason,
  nodeId,
  executionId,
}: {
  title?: string;
  reason: string;
  nodeId?: string | null;
  executionId?: string | null;
}) {
  return (
    <section className="studio-agent-canvas-error-panel" role="alert">
      <header>
        <span>Read-only diagnostic</span>
        <strong>{title}</strong>
      </header>
      <dl>
        <div><dt>Failed Node</dt><dd>{nodeId || "Not available"}</dd></div>
        <div><dt>Reason</dt><dd>{reason}</dd></div>
        <div><dt>Related Execution</dt><dd>{executionId || "Not available"}</dd></div>
      </dl>
      <small>No Runtime control, Retry, Cancel, Provider call, or Credits action is available here.</small>
    </section>
  );
}

export function StudioAgentCanvas({ projectId }: { projectId: string | null }) {
  const [graphState, setGraphState] = useState<{ projectId: string; graph: StudioAgentCanvasGraph } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);
  const [draftPreview, setDraftPreview] = useState<StudioCanvasDraftActionPreviewResult | null>(null);
  const [confirmedCanvasActionId, setConfirmedCanvasActionId] = useState<string | null>(null);
  const [executionPreview, setExecutionPreview] = useState<StudioCanvasExecutionPreview | null>(null);
  const [executionBusy, setExecutionBusy] = useState(false);
  const [executionApproval, setExecutionApproval] = useState<StudioCanvasExecutionApproval | null>(null);
  const [executionApprovalBusy, setExecutionApprovalBusy] = useState(false);
  const [executionApprovalMessage, setExecutionApprovalMessage] = useState("");
  const [executionStatusState, setExecutionStatusState] = useState<{
    projectId: string;
    value: StudioCanvasExecutionStatusProjection;
  } | null>(null);
  const [executionStatusError, setExecutionStatusError] = useState("");
  const [executionRefreshState, setExecutionRefreshState] = useState<{
    projectId: string;
    lastSuccessAt: string | null;
    consecutiveFailures: number;
    nextRefreshMs: number;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [productionState, setProductionState] = useState<{ projectId: string; results: StudioCanvasProductionResults } | null>(null);
  const [productionError, setProductionError] = useState("");
  const [workflowEditing, setWorkflowEditing] = useState(false);
  const [workflowChanges, setWorkflowChanges] = useState<StudioCanvasWorkflowChange[]>([]);
  const [workflowDraft, setWorkflowDraft] = useState<StudioCanvasWorkflowDraft | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [connectionSource, setConnectionSource] = useState("");
  const [connectionTarget, setConnectionTarget] = useState("");
  const [templateLibraryState, setTemplateLibraryState] = useState<{ projectId: string; library: StudioWorkflowTemplateLibrary } | null>(null);
  const [templateApplyPreview, setTemplateApplyPreview] = useState<StudioWorkflowTemplateApplyDraft | null>(null);
  const [templateBusyId, setTemplateBusyId] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState("");
  const [templateName, setTemplateName] = useState("Reusable Agent Workflow");
  const [agentCanvasMode, setAgentCanvasMode] = useState<
    "PROJECT" | "AGENT_WORKFLOW" | "LIVE_EXECUTION"
  >("PROJECT");
  const [agentWorkflowState, setAgentWorkflowState] = useState<{ projectId: string; graph: StudioAgentWorkflowGraph } | null>(null);
  const [agentWorkflowError, setAgentWorkflowError] = useState("");
  const [agentWorkflowChanges, setAgentWorkflowChanges] = useState<StudioAgentWorkflowDraftChange[]>([]);
  const [agentWorkflowDraft, setAgentWorkflowDraft] = useState<StudioAgentWorkflowDraft | null>(null);
  const [agentWorkflowBusy, setAgentWorkflowBusy] = useState(false);
  const [agentWorkflowMessage, setAgentWorkflowMessage] = useState("");
  const [agentRoleDraft, setAgentRoleDraft] = useState<Exclude<StudioAgentWorkflowNodeType, "HUMAN_CHECKPOINT">>("CHARACTER_AGENT");
  const [agentDependencySource, setAgentDependencySource] = useState("");
  const [agentDependencyTarget, setAgentDependencyTarget] = useState("");
  const [agentDependencyType, setAgentDependencyType] = useState<"SEQUENTIAL" | "PARALLEL" | "CHECKPOINT">("SEQUENTIAL");
  const [agentCheckpointNode, setAgentCheckpointNode] = useState("");
  const [agentCheckpointType, setAgentCheckpointType] = useState<"PLAN_REVIEW" | "OUTPUT_REVIEW" | "EXECUTION_APPROVAL">("PLAN_REVIEW");
  const [agentRunPlan, setAgentRunPlan] = useState<StudioAgentRunPlan | null>(null);
  const [agentRunPlanBusy, setAgentRunPlanBusy] = useState(false);
  const [agentRunPlanMessage, setAgentRunPlanMessage] = useState("");
  const graph = graphState?.projectId === projectId ? graphState.graph : null;
  const production = productionState?.projectId === projectId ? productionState.results : null;
  const templateLibrary = templateLibraryState?.projectId === projectId ? templateLibraryState.library : null;
  const agentWorkflowGraph = agentWorkflowState?.projectId === projectId ? agentWorkflowState.graph : null;
  const executionStatus = executionStatusState?.projectId === projectId
    ? executionStatusState.value
    : null;
  const visibleAgentWorkflowGraph = agentWorkflowDraft?.projectId === projectId ? agentWorkflowDraft.previewGraph : agentWorkflowGraph;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!projectId) return () => { active = false; };
    void getStudioAgentCanvas(projectId, controller.signal)
      .then((value) => { if (active) { setGraphState({ projectId, graph: value }); setErrorState(null); } })
      .catch((loadError: unknown) => {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setErrorState({
            projectId,
            message: "Agent Canvas could not load. Verify project access and data availability.",
          });
        }
      });
    void getStudioCanvasProductionResults(projectId, controller.signal)
      .then((value) => { if (active) { setProductionState({ projectId, results: value }); setProductionError(""); } })
      .catch((loadError: unknown) => {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setProductionError("Result bindings are temporarily unavailable.");
        }
      });
    void getStudioUserWorkflowTemplates()
      .then((value) => { if (active) { setTemplateLibraryState({ projectId, library: value }); setTemplateMessage(""); } })
      .catch(() => { if (active) setTemplateMessage("Workflow Templates are temporarily unavailable."); });
    void getStudioAgentWorkflowGraph(projectId)
      .then((value) => {
        if (active) {
          setAgentWorkflowState({ projectId, graph: value });
          setAgentWorkflowError("");
          setAgentRunPlan(null);
          setAgentRunPlanMessage("");
          setExecutionApproval(null);
          setExecutionApprovalMessage("");
        }
      })
      .catch(() => { if (active) setAgentWorkflowError("Agent Workflow Graph is temporarily unavailable."); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let consecutiveFailures = 0;
    if (!projectId || agentCanvasMode !== "LIVE_EXECUTION") {
      return () => { active = false; };
    }
    const schedule = (delay: number) => {
      if (!active) return;
      timeoutId = setTimeout(() => void refresh(), delay);
    };
    const refresh = async () => {
      if (!active) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        schedule(15000);
        return;
      }
      controller?.abort();
      controller = new AbortController();
      try {
        const value = await getStudioCanvasExecutionStatus(projectId, controller.signal);
        if (!active) return;
        consecutiveFailures = 0;
        setExecutionStatusState((current) =>
          current?.projectId === projectId && current.value.revision === value.revision
            ? current
            : { projectId, value }
        );
        setExecutionStatusError("");
        setExecutionRefreshState({
          projectId,
          lastSuccessAt: value.generatedAt,
          consecutiveFailures: 0,
          nextRefreshMs: value.refresh.recommendedIntervalMs,
        });
        schedule(value.refresh.recommendedIntervalMs);
      } catch (refreshError: unknown) {
        if (!active || (refreshError instanceof DOMException && refreshError.name === "AbortError")) return;
        consecutiveFailures += 1;
        const delay = Math.min(30000, 5000 * (2 ** Math.min(3, consecutiveFailures - 1)));
        setExecutionStatusError(
          "Runtime refresh failed. Showing the last successful snapshot while monitoring backs off safely.",
        );
        setExecutionRefreshState((current) => ({
          projectId,
          lastSuccessAt: current?.projectId === projectId ? current.lastSuccessAt : null,
          consecutiveFailures,
          nextRefreshMs: delay,
        }));
        schedule(delay);
      }
    };
    void refresh();
    return () => {
      active = false;
      controller?.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [agentCanvasMode, projectId]);

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
      setConfirmedCanvasActionId(result.action.actionId);
      setActionMessage(`${result.draft.draftType.replaceAll("_", " ")} created in the existing Copilot Action Center. Review it before any execution.`);
      setDraftPreview(null);
    } catch {
      setActionMessage("Draft confirmation failed. The Canvas and Workflow remain unchanged.");
    } finally {
      setBusyNodeId(null);
    }
  }, [busyNodeId, draftPreview, projectId]);

  const buildExecutionPreview = useCallback(async () => {
    if (!projectId || executionBusy) return;
    setExecutionBusy(true);
    setActionMessage("");
    try {
      const result = await createStudioCanvasExecutionPreview(projectId, confirmedCanvasActionId);
      setExecutionPreview(result);
      setExecutionApproval(null);
      setExecutionApprovalMessage("");
      setActionMessage(result.status === "READY"
        ? "Execution Preview ready. No Job, Queue, Provider call, or Credits deduction occurred."
        : "Execution Preview is blocked. Review the Gate results before continuing.");
    } catch {
      setExecutionPreview(null);
      setActionMessage("Confirm a Canvas Draft and clear the execution gates before building a Preview. Nothing executed.");
    } finally {
      setExecutionBusy(false);
    }
  }, [confirmedCanvasActionId, executionBusy, projectId]);

  const createExecutionApproval = useCallback(async () => {
    if (!projectId || !agentRunPlan || !executionPreview ||
        executionPreview.status !== "READY" || executionApprovalBusy) return;
    setExecutionApprovalBusy(true);
    setExecutionApprovalMessage("");
    try {
      const result = await createStudioCanvasExecutionApproval(projectId, {
        runPlanId: agentRunPlan.runPlanId,
        executionPreviewId: executionPreview.previewId,
      });
      setExecutionApproval(result);
      setExecutionApprovalMessage(result.status === "PENDING"
        ? "Approval Summary ready. Review Policy, Cost, and Risks before confirming."
        : "This Approval is no longer available. Build a current Run Plan and Execution Preview.");
    } catch {
      setExecutionApproval(null);
      setExecutionApprovalMessage("Approval Summary could not be prepared. No Runtime, Provider, or Credits action occurred.");
    } finally {
      setExecutionApprovalBusy(false);
    }
  }, [agentRunPlan, executionApprovalBusy, executionPreview, projectId]);

  const confirmExecutionApproval = useCallback(async () => {
    if (!projectId || !executionApproval || executionApproval.status !== "PENDING" ||
        executionApprovalBusy) return;
    setExecutionApprovalBusy(true);
    setExecutionApprovalMessage("");
    try {
      const result = await confirmStudioCanvasExecutionApproval(projectId, executionApproval.approvalId);
      setExecutionApproval(result);
      setExecutionPreview((current) => current ? {
        ...current,
        status: "CONFIRMED",
        confirmedAt: result.executionConfirmation?.confirmedAt,
      } : current);
      setExecutionApprovalMessage(
        "Human approval recorded through the existing Execution Confirm. Runtime still requires its separate control.",
      );
    } catch {
      setExecutionApprovalMessage(
        "Approval was blocked by current Policy, Cost, or Execution gates. Nothing executed and no Credits were deducted.",
      );
    } finally {
      setExecutionApprovalBusy(false);
    }
  }, [executionApproval, executionApprovalBusy, projectId]);

  const nodes = useMemo(() => graph ? toFlowNodes(graph, busyNodeId, previewDraft) : [], [busyNodeId, graph, previewDraft]);
  const edges = useMemo(() => graph ? toFlowEdges(graph) : [], [graph]);
  const agentWorkflowNodes = useMemo(
    () => visibleAgentWorkflowGraph ? toAgentWorkflowFlowNodes(visibleAgentWorkflowGraph) : [],
    [visibleAgentWorkflowGraph],
  );
  const agentWorkflowEdges = useMemo(
    () => visibleAgentWorkflowGraph ? toAgentWorkflowFlowEdges(visibleAgentWorkflowGraph) : [],
    [visibleAgentWorkflowGraph],
  );
  const activeFlowNodeCount = agentCanvasMode === "AGENT_WORKFLOW"
    ? agentWorkflowNodes.length
    : nodes.length;
  const largeGraph = activeFlowNodeCount > 150;
  const executionRefresh = executionRefreshState?.projectId === projectId
    ? executionRefreshState
    : null;
  const selected = graph?.nodes.find((node) => node.nodeId === selectedId) || null;
  const selectedResult = production?.bindings.find((binding) => binding.canvasNodeId === selectedId) || null;
  const completedExecutionPlanId = graph?.nodes.find((node) =>
    node.nodeType === "EXECUTION" &&
    node.status === "COMPLETED" &&
    typeof node.metadata.executionId === "string"
  )?.metadata.executionId as string | undefined;
  const draftAgentNodes = workflowChanges
    .filter((change) => change.type === "ADD_NODE" && change.node?.nodeId)
    .map((change) => ({
      nodeId: String(change.node?.nodeId),
      label: change.role === "QUALITY_AGENT" ? "Quality Agent" : "Storyboard Agent",
      immutable: false,
    }));
  const workflowSelectableNodes = [
    ...(graph?.nodes || [])
      .filter((node) => !["EXECUTION", "ASSET"].includes(node.nodeType))
      .map((node) => ({
        nodeId: node.nodeId,
        label: String(node.metadata.title || node.referenceId),
        immutable: false,
      })),
    ...draftAgentNodes,
  ];
  const draftRemovedAgentIds = new Set(agentWorkflowChanges.filter((change) => change.type === "REMOVE_AGENT").map((change) => change.agentId));
  const draftAgentOptions = agentWorkflowChanges
    .filter((change) => change.type === "ADD_AGENT" && change.agentId && !draftRemovedAgentIds.has(change.agentId))
    .map((change) => ({ nodeId: String(change.agentId), label: String(change.roleId).replaceAll("_", " ") }));
  const agentWorkflowSelectableNodes = visibleAgentWorkflowGraph ? [
    ...visibleAgentWorkflowGraph.agents.map((agent) => ({ nodeId: agent.agentId, label: agent.label })),
    ...visibleAgentWorkflowGraph.tasks.map((task) => ({
      nodeId: task.taskId,
      label: `${task.roleId.replaceAll("_", " ")} task`,
    })),
    ...visibleAgentWorkflowGraph.checkpoints.map((checkpoint) => ({
      nodeId: checkpoint.checkpointId,
      label: checkpoint.type.replaceAll("_", " "),
    })),
    ...draftAgentOptions.filter((draftAgent) =>
      !visibleAgentWorkflowGraph.agents.some((agent) => agent.agentId === draftAgent.nodeId)
    ),
  ] : [];

  function addDraftAgent(role: "QUALITY_AGENT" | "STORYBOARD_AGENT") {
    const nodeId = `draft-agent-${role.toLowerCase().replaceAll("_", "-")}`;
    if (workflowChanges.some((change) => change.type === "ADD_NODE" && change.node?.nodeId === nodeId)) return;
    setWorkflowChanges((changes) => [...changes, {
      changeId: `add-${role.toLowerCase()}`,
      type: "ADD_NODE",
      role,
      node: { nodeId, role },
    }]);
    setWorkflowDraft(null);
    setWorkflowMessage(`${role.replaceAll("_", " ")} added to the local Draft preview.`);
  }

  function addConnectionChange(type: "CONNECT_NODE" | "DISCONNECT_NODE") {
    if (!connectionSource || !connectionTarget || connectionSource === connectionTarget) {
      setWorkflowMessage("Choose two different Draft nodes before changing a connection.");
      return;
    }
    setWorkflowChanges((changes) => [...changes, {
      changeId: `${type.toLowerCase()}-${connectionSource}-${connectionTarget}`,
      type,
      sourceNodeId: connectionSource,
      targetNodeId: connectionTarget,
    }]);
    setWorkflowDraft(null);
    setWorkflowMessage(type === "CONNECT_NODE" ? "Connection added to the local Draft preview." : "Connection removal added to the local Draft preview.");
  }

  async function previewWorkflowChanges() {
    if (!projectId || !workflowChanges.length || workflowBusy) return;
    setWorkflowBusy(true);
    setWorkflowMessage("");
    try {
      const draft = await createStudioCanvasWorkflowDraft(projectId, workflowChanges);
      setWorkflowDraft(draft);
      setWorkflowMessage("Workflow Draft preview saved. The original Canvas and Execution history are unchanged.");
    } catch {
      setWorkflowDraft(null);
      setWorkflowMessage("Workflow Draft preview was rejected. No Canvas or Execution data changed.");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function confirmWorkflowChanges() {
    if (!projectId || !workflowDraft || workflowDraft.status !== "DRAFT" || workflowBusy) return;
    setWorkflowBusy(true);
    setWorkflowMessage("");
    try {
      const confirmed = await confirmStudioCanvasWorkflowDraft(projectId, workflowDraft.draftId);
      setWorkflowDraft(confirmed);
      setWorkflowMessage("Workflow Proposal Draft confirmed. A new Execution Preview is still required before Runtime.");
    } catch {
      setWorkflowMessage("Workflow Draft confirmation was blocked. Nothing was executed or written to the original Canvas.");
    } finally {
      setWorkflowBusy(false);
    }
  }

  async function refreshTemplateLibrary() {
    if (!projectId) return;
    const library = await getStudioUserWorkflowTemplates();
    setTemplateLibraryState({ projectId, library });
  }

  async function saveConfirmedWorkflowTemplate() {
    if (!projectId || !workflowDraft || workflowDraft.status !== "CONFIRMED" || !completedExecutionPlanId || templateBusyId) return;
    setTemplateBusyId("save");
    setTemplateMessage("");
    try {
      await saveStudioWorkflowTemplate({
        projectId,
        draftId: workflowDraft.draftId,
        executionPlanId: completedExecutionPlanId,
        name: templateName,
      });
      await refreshTemplateLibrary();
      setTemplateMessage("Workflow Template saved from the confirmed Draft and successful Execution evidence.");
    } catch {
      setTemplateMessage("Template qualification failed. The current Workflow and Canvas remain unchanged.");
    } finally {
      setTemplateBusyId(null);
    }
  }

  async function previewTemplateApply(templateId: string) {
    if (!projectId || templateBusyId) return;
    setTemplateBusyId(templateId);
    setTemplateMessage("");
    try {
      const preview = await previewStudioWorkflowTemplateApply(projectId, templateId);
      setTemplateApplyPreview(preview);
      setTemplateMessage(preview.status === "DRAFT"
        ? "Apply Preview ready. Review impact before creating a new Workflow Draft."
        : "This Template is blocked for the current Canvas. Review the missing anchors.");
    } catch {
      setTemplateApplyPreview(null);
      setTemplateMessage("Template Apply Preview could not be built. Nothing changed.");
    } finally {
      setTemplateBusyId(null);
    }
  }

  async function confirmTemplateApply() {
    if (!projectId || !templateApplyPreview || templateApplyPreview.status !== "DRAFT" || templateBusyId) return;
    setTemplateBusyId(templateApplyPreview.templateId);
    setTemplateMessage("");
    try {
      const applied = await confirmStudioWorkflowTemplateApply(projectId, templateApplyPreview.applyId);
      const draft = await getStudioCanvasWorkflowDraft(projectId, String(applied.workflowDraft?.draftId));
      setWorkflowEditing(true);
      setWorkflowChanges([...draft.changes]);
      setWorkflowDraft(draft);
      setTemplateApplyPreview(applied);
      await refreshTemplateLibrary();
      setTemplateMessage("Template applied as a new Workflow Draft. Review and confirm that Draft separately.");
    } catch {
      setTemplateMessage("Template confirmation was blocked. The current Workflow remains unchanged.");
    } finally {
      setTemplateBusyId(null);
    }
  }

  function addAgentWorkflowChange(change: StudioAgentWorkflowDraftChange, message: string) {
    setAgentWorkflowChanges((changes) => [...changes, change]);
    setAgentWorkflowDraft(null);
    setAgentRunPlan(null);
    setAgentRunPlanMessage("Run Plan cleared because the Workflow Draft changed.");
    setAgentWorkflowMessage(message);
  }

  function addAgentRoleToDraft() {
    const agentId = `draft-agent:${agentRoleDraft}`;
    if (visibleAgentWorkflowGraph?.agents.some((agent) => agent.roleId === agentRoleDraft) ||
        agentWorkflowChanges.some((change) => change.type === "ADD_AGENT" && change.roleId === agentRoleDraft)) {
      setAgentWorkflowMessage("That Agent role is already represented in the Workflow.");
      return;
    }
    addAgentWorkflowChange(
      { type: "ADD_AGENT", roleId: agentRoleDraft, agentId },
      `${agentRoleDraft.replaceAll("_", " ")} added to the local orchestration Draft.`,
    );
  }

  function removeDraftAgent(agentId: string) {
    addAgentWorkflowChange(
      { type: "REMOVE_AGENT", agentId },
      "Draft-only Agent removal added. Historical Agent Team nodes remain immutable.",
    );
  }

  function addAgentDependencyToDraft() {
    if (!agentDependencySource || !agentDependencyTarget || agentDependencySource === agentDependencyTarget) {
      setAgentWorkflowMessage("Choose two different Workflow nodes for the dependency.");
      return;
    }
    addAgentWorkflowChange({
      type: "CHANGE_DEPENDENCY",
      sourceId: agentDependencySource,
      targetId: agentDependencyTarget,
      dependencyType: agentDependencyType,
    }, `${agentDependencyType} dependency added to the local Draft.`);
  }

  function addAgentCheckpointToDraft() {
    if (!agentCheckpointNode) {
      setAgentWorkflowMessage("Choose a Workflow node for the Human Checkpoint.");
      return;
    }
    addAgentWorkflowChange({
      type: "ADD_CHECKPOINT",
      afterNodeId: agentCheckpointNode,
      checkpointType: agentCheckpointType,
    }, `${agentCheckpointType.replaceAll("_", " ")} added to the local Draft.`);
  }

  async function previewAgentWorkflowDraft() {
    if (!projectId || !agentWorkflowChanges.length || agentWorkflowBusy) return;
    setAgentWorkflowBusy(true);
    setAgentWorkflowMessage("");
    try {
      const draft = await createStudioAgentWorkflowDraft(projectId, agentWorkflowChanges);
      setAgentWorkflowDraft(draft);
      setAgentWorkflowMessage("Multi-Agent Workflow Preview ready. Team Plan and Task Runtime are unchanged.");
    } catch {
      setAgentWorkflowDraft(null);
      setAgentWorkflowMessage("Agent Workflow Preview was rejected. Nothing changed.");
    } finally {
      setAgentWorkflowBusy(false);
    }
  }

  async function confirmAgentWorkflowDesign() {
    if (!projectId || !agentWorkflowDraft || agentWorkflowDraft.status !== "DRAFT" || agentWorkflowBusy) return;
    setAgentWorkflowBusy(true);
    setAgentWorkflowMessage("");
    try {
      const confirmed = await confirmStudioAgentWorkflowDraft(projectId, agentWorkflowDraft.draftId);
      setAgentWorkflowDraft(confirmed);
      setAgentWorkflowMessage("Human Review recorded. Separate Execution Preview and confirmation are still required.");
    } catch {
      setAgentWorkflowMessage("Human Review confirmation was blocked. No Agent or Task started.");
    } finally {
      setAgentWorkflowBusy(false);
    }
  }

  async function previewAgentRunPlan() {
    if (!projectId || !agentWorkflowGraph || agentRunPlanBusy) return;
    setAgentRunPlanBusy(true);
    setAgentRunPlanMessage("");
    try {
      const plan = await createStudioAgentRunPlan(projectId, agentWorkflowGraph.graphId);
      setAgentRunPlan(plan);
      setExecutionApproval(null);
      setExecutionApprovalMessage("");
      setAgentRunPlanMessage("Run Plan Preview ready. Queue, Agents, Tasks, Provider, and Credits remain untouched.");
    } catch {
      setAgentRunPlan(null);
      setExecutionApproval(null);
      setExecutionApprovalMessage("");
      setAgentRunPlanMessage("Run Plan Preview was blocked. No Queue or execution was started.");
    } finally {
      setAgentRunPlanBusy(false);
    }
  }

  if (!projectId) {
    return (
      <section className="studio-agent-canvas-empty-state">
        <span>New Project Canvas</span>
        <strong>Start with a controlled draft</strong>
        <p>Open a cloud project, then create a Workflow, import one of your Templates, or ask Copilot for a draft.</p>
      </section>
    );
  }
  if (error) {
    return <CanvasErrorPanel reason={error} title="Canvas could not load" />;
  }
  if (!graph) return <div className="studio-agent-canvas-empty">Building the read-only project graph…</div>;
  if (!graph.nodes.length) {
    const projectQuery = encodeURIComponent(projectId);
    return (
      <section className="studio-agent-canvas-empty-state">
        <span>New Project Canvas</span>
        <strong>Build your first Creative Workflow</strong>
        <p>No Agent project data has been recorded yet. Every option creates or opens a Draft; nothing executes automatically.</p>
        <div>
          <a href={`/studio?projectId=${projectQuery}&view=agent-canvas&action=create-workflow`}>Create Workflow</a>
          <a href={`/studio?projectId=${projectQuery}&view=agent-canvas&action=import-template`}>Import Template</a>
          <a href={`/studio?projectId=${projectQuery}&view=copilot`}>Ask Copilot</a>
        </div>
        <small>Draft only · Human Confirm required · no Provider or Credits action</small>
      </section>
    );
  }

  return (
    <div className="studio-agent-canvas-production">
      <div className="studio-agent-canvas-layout">
        <div className="studio-agent-canvas-flow" aria-label="Agent Canvas graph">
        <div className="studio-agent-workflow-mode-switcher" aria-label="Agent Canvas mode">
          <button className={agentCanvasMode === "PROJECT" ? "is-active" : ""} onClick={() => setAgentCanvasMode("PROJECT")} type="button">Project Graph</button>
          <button className={agentCanvasMode === "AGENT_WORKFLOW" ? "is-active" : ""} onClick={() => setAgentCanvasMode("AGENT_WORKFLOW")} type="button">Agent Workflow Mode</button>
          <button className={agentCanvasMode === "LIVE_EXECUTION" ? "is-active" : ""} onClick={() => setAgentCanvasMode("LIVE_EXECUTION")} type="button">Live Execution Mode</button>
        </div>
        {agentCanvasMode === "AGENT_WORKFLOW" && agentWorkflowError ? (
          <div className="studio-agent-workflow-mode-error" role="status">{agentWorkflowError}</div>
        ) : null}
        {agentCanvasMode === "LIVE_EXECUTION" ? (
          <section className="studio-agent-live-execution" aria-label="Live Execution Monitoring">
            <header>
              <div>
                <span>Runtime Projection</span>
                <strong>Live Execution</strong>
              </div>
              <b className={`is-${(executionStatus?.status || "PENDING").toLowerCase()}`}>
                {executionStatus?.status || "PENDING"}
              </b>
            </header>
            {executionStatusError ? (
              <CanvasErrorPanel
                reason={executionStatusError}
                title="Runtime refresh warning"
              />
            ) : null}
            {!executionStatus && !executionStatusError ? <p>Loading current Runtime state…</p> : null}
            {executionStatus ? (
              <>
                <div className="studio-agent-live-refresh">
                  <span>
                    Last synced{" "}
                    {executionRefresh?.lastSuccessAt
                      ? new Date(executionRefresh.lastSuccessAt).toLocaleTimeString()
                      : "not yet"}
                  </span>
                  <span>
                    Next read in {Math.round((executionRefresh?.nextRefreshMs || executionStatus.refresh.recommendedIntervalMs) / 1000)}s
                  </span>
                  {executionRefresh?.consecutiveFailures
                    ? <b>{executionRefresh.consecutiveFailures} refresh failure(s)</b>
                    : <b>Runtime sync healthy</b>}
                </div>
                <div className="studio-agent-live-current">
                  <span>Current Step</span>
                  <strong>
                    {executionStatus.currentStep
                      ? executionStatus.currentStep.agent.roleId.replaceAll("_", " ")
                      : executionStatus.status === "COMPLETED"
                        ? "All steps completed"
                        : "Waiting for an active step"}
                  </strong>
                  <small>
                    {executionStatus.currentStep?.capability || "No Runtime control is exposed in Canvas"}
                  </small>
                </div>
                <div className="studio-agent-live-metrics">
                  <span><b>{executionStatus.timeline.currentNodeIds.length}</b> Running</span>
                  <span><b>{executionStatus.timeline.completedNodeIds.length}</b> Completed</span>
                  <span><b>{executionStatus.timeline.waitingNodeIds.length}</b> Waiting</span>
                  <span><b>{executionStatus.timeline.failedNodeIds.length}</b> Failed</span>
                </div>
                {executionStatus.issues.length ? (
                  <section className="studio-agent-live-errors" aria-label="Canvas Error Panel">
                    <header>
                      <span>Canvas Error Panel</span>
                      <b>{executionStatus.issues.length} diagnostic{executionStatus.issues.length === 1 ? "" : "s"}</b>
                    </header>
                    {executionStatus.issues.map((issue) => (
                      <CanvasErrorPanel
                        executionId={issue.executionId}
                        key={`${issue.code}:${issue.executionId}:${issue.nodeId}`}
                        nodeId={issue.nodeId}
                        reason={`${issue.code.replaceAll("_", " ")} · ${issue.reason}`}
                        title={issue.severity === "ERROR" ? "Failed Runtime Node" : "Runtime sync warning"}
                      />
                    ))}
                  </section>
                ) : null}
                <div className="studio-agent-live-timeline" aria-label="Live Timeline">
                  {executionStatus.executions.map((execution) => (
                    <article className={`is-${execution.status.toLowerCase()}`} key={`${execution.executionId}:${execution.nodeId}`}>
                      <header>
                        <div>
                          <strong>{execution.agent.roleId.replaceAll("_", " ")}</strong>
                          <small>{execution.capability || execution.nodeId}</small>
                        </div>
                        <div className="studio-agent-live-state">
                          <b>{execution.status}</b>
                          {execution.syncState !== "CURRENT" ? <em>{execution.syncState.replaceAll("_", " ")}</em> : null}
                        </div>
                      </header>
                      <div
                        aria-label={`${execution.progress}% complete`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={execution.progress}
                        className="studio-agent-live-progress"
                        role="progressbar"
                      >
                        <span style={{ width: `${execution.progress}%` }} />
                      </div>
                      <footer>
                        <span>{execution.progress}%</span>
                        <small>{execution.progressSource === "RUNTIME_REPORTED" ? "Runtime reported" : "Stage estimate"}</small>
                      </footer>
                      {execution.blocker ? <p>{execution.blocker.replaceAll("_", " ")}</p> : null}
                      {execution.result ? (
                        <div className="studio-agent-live-result">
                          <strong>Result Preview</strong>
                          <span>Timeline · {execution.result.timeline.clipId}</span>
                          <span>Asset · {execution.result.asset.displayName || execution.result.asset.assetId}</span>
                          <span>Output · {execution.result.output.status}</span>
                          {execution.result.output.url ? (
                            <a href={execution.result.output.url} rel="noreferrer" target="_blank">Open Output</a>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {!executionStatus.executions.length ? (
                    <div className="studio-agent-live-empty">No Execution Runtime is associated with this project yet.</div>
                  ) : null}
                </div>
                <small className="studio-agent-live-boundary">
                  Read-only monitoring · refreshes every 5 seconds · no Execute, Retry, Cancel, Provider, or Credits control
                </small>
              </>
            ) : null}
          </section>
        ) : (
          <>
            {largeGraph ? (
              <div className="studio-agent-canvas-performance-note" role="status">
                Large workflow · {activeFlowNodeCount} nodes · viewport rendering optimized
              </div>
            ) : null}
            <ReactFlow<StudioFlowNode, Edge>
              nodes={agentCanvasMode === "AGENT_WORKFLOW" ? agentWorkflowNodes : nodes}
              edges={agentCanvasMode === "AGENT_WORKFLOW" ? agentWorkflowEdges : edges}
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
              onlyRenderVisibleElements
              panOnDrag
              selectionOnDrag={false}
              zoomOnDoubleClick={false}
              deleteKeyCode={null}
            >
              <Background color="var(--studio-grid)" gap={22} size={1} variant={BackgroundVariant.Dots} />
              <Controls position="bottom-left" showInteractive={false} />
              {!largeGraph ? (
                <MiniMap maskColor="rgba(5, 7, 11, 0.72)" nodeColor="#818cf8" pannable position="bottom-right" zoomable />
              ) : null}
            </ReactFlow>
          </>
        )}
        </div>
        <aside className="studio-agent-canvas-details" aria-label="Agent Canvas node details">
        {agentCanvasMode === "AGENT_WORKFLOW" ? (
          <section className="studio-agent-workflow-control" aria-label="Agent Workflow Preview">
            <header>
              <span>Multi-Agent Workflow</span>
              <b>{agentWorkflowDraft?.status || "READ ONLY"}</b>
            </header>
            {visibleAgentWorkflowGraph ? (
              <>
                <div className="studio-agent-workflow-summary">
                  <span>{visibleAgentWorkflowGraph.agents.length} Agents</span>
                  <span>{visibleAgentWorkflowGraph.tasks.length} Tasks</span>
                  <span>{visibleAgentWorkflowGraph.preview.parallelGroups.length} Parallel groups</span>
                  <span>{visibleAgentWorkflowGraph.checkpoints.length} Human nodes</span>
                </div>
                <div className="studio-agent-workflow-order" aria-label="Agent order">
                  <strong>Agent order</strong>
                  <span>{visibleAgentWorkflowGraph.preview.agentOrder.map((role) => role.replaceAll("_", " ")).join(" → ") || "No Agent Team Plan"}</span>
                </div>
                <small>Animated purple edges are parallel. Amber edges lead to Human Checkpoints. Waiting nodes are highlighted.</small>
              </>
            ) : <p>No Agent Team Plan or Task Runtime is available yet.</p>}
            <section className="studio-agent-run-plan" aria-label="Agent Run Plan Preview">
              <div className="studio-agent-run-plan-heading">
                <div>
                  <strong>Run Plan</strong>
                  <small>Execution order, waiting relationships, checkpoints, and cost before Runtime.</small>
                </div>
                <button
                  disabled={!agentWorkflowGraph || agentRunPlanBusy}
                  onClick={() => void previewAgentRunPlan()}
                  type="button"
                >
                  {agentRunPlanBusy ? "Building Preview…" : "Preview Run Plan"}
                </button>
              </div>
              {agentRunPlan ? (
                <div className="studio-agent-run-summary" aria-label="Run Summary">
                  <header>
                    <span>Run Summary</span>
                    <b className={`is-${agentRunPlan.status.toLowerCase()}`}>{agentRunPlan.status.replaceAll("_", " ")}</b>
                  </header>
                  <div className="studio-agent-run-metrics">
                    <span><b>{agentRunPlan.steps.length}</b> Steps</span>
                    <span><b>{agentRunPlan.queue.waves.length}</b> Queue waves</span>
                    <span><b>{agentRunPlan.queue.waitingStepIds.length}</b> Waiting</span>
                    <span><b>{agentRunPlan.queue.blockedStepIds.length}</b> Blocked</span>
                  </div>
                  <div className="studio-agent-run-cost">
                    <span>Estimated Credits</span>
                    <strong>{agentRunPlan.estimatedCost.estimatedCredits ?? "Unknown"}</strong>
                    <small>Cost Confidence · {agentRunPlan.estimatedCost.confidence}</small>
                  </div>
                  <div className="studio-agent-run-queue" aria-label="Queue Visualization">
                    {agentRunPlan.queue.waves.map((wave) => (
                      <section key={`run-wave-${wave.order}`}>
                        <header>
                          <strong>Queue {wave.order}</strong>
                          <span>{wave.parallel ? "Parallel" : "Sequential"}</span>
                        </header>
                        {wave.stepIds.map((stepId) => {
                          const step = agentRunPlan.steps.find((candidate) => candidate.stepId === stepId);
                          if (!step) return null;
                          return (
                            <article className={`is-${step.status.toLowerCase()}`} key={step.stepId}>
                              <div>
                                <strong>{step.agentId.replace("agent:", "").replaceAll("_", " ")}</strong>
                                <b>{step.status.replaceAll("_", " ")}</b>
                              </div>
                              <span>{step.capabilities.join(" · ") || step.taskId}</span>
                              <small>
                                {step.dependencies.length
                                  ? `Waits for ${step.dependencies.join(", ")}`
                                  : "No dependencies"}
                              </small>
                              {step.blockers.map((blocker) => (
                                <small className="is-blocker" key={`${step.stepId}-${blocker}`}>{blocker.replaceAll("_", " ")}</small>
                              ))}
                            </article>
                          );
                        })}
                      </section>
                    ))}
                    {agentRunPlan.steps.some((step) =>
                      !agentRunPlan.queue.waves.some((wave) => wave.stepIds.includes(step.stepId))
                    ) ? (
                      <section>
                        <header>
                          <strong>Unscheduled</strong>
                          <span>Blocked</span>
                        </header>
                        {agentRunPlan.steps.filter((step) =>
                          !agentRunPlan.queue.waves.some((wave) => wave.stepIds.includes(step.stepId))
                        ).map((step) => (
                          <article className={`is-${step.status.toLowerCase()}`} key={step.stepId}>
                            <div>
                              <strong>{step.agentId.replace("agent:", "").replaceAll("_", " ")}</strong>
                              <b>{step.status.replaceAll("_", " ")}</b>
                            </div>
                            <span>{step.capabilities.join(" · ") || step.taskId}</span>
                            {step.blockers.map((blocker) => (
                              <small className="is-blocker" key={`${step.stepId}-${blocker}`}>{blocker.replaceAll("_", " ")}</small>
                            ))}
                          </article>
                        ))}
                      </section>
                    ) : null}
                  </div>
                  {agentRunPlan.riskFlags.length ? (
                    <div className="studio-agent-run-risks">
                      <strong>Risk Flags</strong>
                      {agentRunPlan.riskFlags.map((risk) => <span key={risk}>{risk.replaceAll("_", " ")}</span>)}
                    </div>
                  ) : null}
                  <small className="studio-agent-run-boundary">
                    Human Review required · Next: Existing Execution Preview · Queue not started · Credits not deducted
                  </small>
                </div>
              ) : (
                <small>Preview only. This action cannot start Queue, Agent, Task, Provider, or Credits.</small>
              )}
              {agentRunPlanMessage ? <small className="studio-agent-canvas-action-message" role="status">{agentRunPlanMessage}</small> : null}
            </section>
            <div className="studio-agent-workflow-draft-editor">
              <strong>Orchestration Draft</strong>
              <label>
                Agent role
                <select onChange={(event) => setAgentRoleDraft(event.target.value as Exclude<StudioAgentWorkflowNodeType, "HUMAN_CHECKPOINT">)} value={agentRoleDraft}>
                  {STUDIO_AGENT_WORKFLOW_NODE_TYPES.filter((type) => type !== "HUMAN_CHECKPOINT").map((type) => (
                    <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </label>
              <button disabled={agentWorkflowBusy} onClick={addAgentRoleToDraft} type="button">Add Agent to Draft</button>
              {draftAgentOptions.length ? (
                <div className="studio-agent-workflow-draft-agents">
                  {draftAgentOptions.map((agent) => (
                    <span key={agent.nodeId}>
                      {agent.label}
                      <button disabled={agentWorkflowBusy} onClick={() => removeDraftAgent(agent.nodeId)} type="button">Remove</button>
                    </span>
                  ))}
                </div>
              ) : null}
              <label>
                Dependency source
                <select onChange={(event) => setAgentDependencySource(event.target.value)} value={agentDependencySource}>
                  <option value="">Select node</option>
                  {agentWorkflowSelectableNodes.map((node) => <option key={`agent-source-${node.nodeId}`} value={node.nodeId}>{node.label}</option>)}
                </select>
              </label>
              <label>
                Dependency target
                <select onChange={(event) => setAgentDependencyTarget(event.target.value)} value={agentDependencyTarget}>
                  <option value="">Select node</option>
                  {agentWorkflowSelectableNodes.map((node) => <option key={`agent-target-${node.nodeId}`} value={node.nodeId}>{node.label}</option>)}
                </select>
              </label>
              <label>
                Dependency mode
                <select onChange={(event) => setAgentDependencyType(event.target.value as "SEQUENTIAL" | "PARALLEL" | "CHECKPOINT")} value={agentDependencyType}>
                  <option value="SEQUENTIAL">Sequential</option>
                  <option value="PARALLEL">Parallel</option>
                  <option value="CHECKPOINT">Checkpoint</option>
                </select>
              </label>
              <button disabled={agentWorkflowBusy} onClick={addAgentDependencyToDraft} type="button">Change Dependency in Draft</button>
              <label>
                Human Checkpoint after
                <select onChange={(event) => setAgentCheckpointNode(event.target.value)} value={agentCheckpointNode}>
                  <option value="">Select node</option>
                  {agentWorkflowSelectableNodes.map((node) => <option key={`checkpoint-${node.nodeId}`} value={node.nodeId}>{node.label}</option>)}
                </select>
              </label>
              <label>
                Checkpoint type
                <select onChange={(event) => setAgentCheckpointType(event.target.value as "PLAN_REVIEW" | "OUTPUT_REVIEW" | "EXECUTION_APPROVAL")} value={agentCheckpointType}>
                  <option value="PLAN_REVIEW">Plan Review</option>
                  <option value="OUTPUT_REVIEW">Output Review</option>
                  <option value="EXECUTION_APPROVAL">Execution Approval</option>
                </select>
              </label>
              <button disabled={agentWorkflowBusy} onClick={addAgentCheckpointToDraft} type="button">Add Human Checkpoint</button>
              <div className="studio-agent-workflow-change-list">
                <strong>Draft changes · {agentWorkflowChanges.length}</strong>
                {agentWorkflowChanges.map((change, index) => (
                  <span key={`${change.type}-${change.changeId || index}`}>
                    {change.type.replaceAll("_", " ")}
                    {change.roleId ? ` · ${change.roleId.replaceAll("_", " ")}` : ""}
                    {change.dependencyType ? ` · ${change.dependencyType}` : ""}
                    {change.checkpointType ? ` · ${change.checkpointType.replaceAll("_", " ")}` : ""}
                  </span>
                ))}
              </div>
              <button disabled={!agentWorkflowChanges.length || agentWorkflowBusy} onClick={() => void previewAgentWorkflowDraft()} type="button">
                {agentWorkflowBusy ? "Building Preview…" : "Preview Multi-Agent Workflow"}
              </button>
              {agentWorkflowDraft ? (
                <section className="studio-agent-workflow-impact" aria-label="Agent Workflow Draft impact">
                  <span>Human Review · {agentWorkflowDraft.status}</span>
                  <dl>
                    <div><dt>Affected nodes</dt><dd>{agentWorkflowDraft.impact.affectedNodeIds.length}</dd></div>
                    <div><dt>Agents added</dt><dd>{agentWorkflowDraft.impact.addedAgents}</dd></div>
                    <div><dt>Dependencies</dt><dd>{agentWorkflowDraft.impact.dependencyChanges}</dd></div>
                    <div><dt>Checkpoints</dt><dd>{agentWorkflowDraft.impact.checkpointsAdded}</dd></div>
                  </dl>
                  <small>Design only · Runtime mutation: no · Execution allowed: no</small>
                  {agentWorkflowDraft.status === "DRAFT" ? (
                    <button disabled={agentWorkflowBusy} onClick={() => void confirmAgentWorkflowDesign()} type="button">Confirm Human Review</button>
                  ) : <strong>Reviewed design only · Execution confirmation still required</strong>}
                </section>
              ) : null}
              {agentWorkflowMessage ? <small className="studio-agent-canvas-action-message" role="status">{agentWorkflowMessage}</small> : null}
            </div>
          </section>
        ) : null}
        <section className="studio-agent-canvas-template-library" aria-label="Workflow Templates">
          <header>
            <span>Workflow Templates</span>
            <b>{templateLibrary?.templates.length || 0} saved</b>
          </header>
          <small>Private to your account. Templates create Apply Drafts and never replace the current Workflow.</small>
          {templateLibrary?.templates.length ? (
            <div className="studio-agent-canvas-template-list">
              {templateLibrary.templates.map((template) => (
                <article className={template.templateId === templateLibrary.recommendedTemplateId ? "is-recommended" : ""} key={template.templateId}>
                  <div>
                    <strong>{template.name}</strong>
                    <span>{template.templateId === templateLibrary.recommendedTemplateId ? "Recommended" : template.status}</span>
                  </div>
                  <p>{template.capabilities.length ? template.capabilities.join(" · ") : "Agent workflow pattern"}</p>
                  <dl>
                    <div><dt>Success</dt><dd>{template.successMetrics.completionRate ?? "Qualified"}{template.successMetrics.completionRate === null ? "" : "%"}</dd></div>
                    <div><dt>Source</dt><dd>{template.source.type.replaceAll("_", " ")}</dd></div>
                    <div><dt>Used</dt><dd>{template.usageCount} time{template.usageCount === 1 ? "" : "s"}</dd></div>
                  </dl>
                  <button disabled={Boolean(templateBusyId)} onClick={() => void previewTemplateApply(template.templateId)} type="button">
                    {templateBusyId === template.templateId ? "Building Preview…" : "Preview Apply"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p>No reusable Templates yet. Confirm a Workflow Draft and complete it successfully to qualify one.</p>
          )}
          {templateApplyPreview ? (
            <section className="studio-agent-canvas-template-impact" aria-label="Template Apply Impact">
              <span>Apply Preview · {templateApplyPreview.status}</span>
              <dl>
                <div><dt>Affected nodes</dt><dd>{templateApplyPreview.impact.affectedNodes.length}</dd></div>
                <div><dt>Execution</dt><dd>{templateApplyPreview.impact.executionImpact.replaceAll("_", " ")}</dd></div>
                <div><dt>Cost</dt><dd>{templateApplyPreview.impact.costImpact.replaceAll("_", " ")}</dd></div>
                <div><dt>Replacement</dt><dd>{templateApplyPreview.impact.automaticWorkflowReplacement ? "Automatic" : "New Draft only"}</dd></div>
              </dl>
              {templateApplyPreview.impact.blockers.length ? <small>{templateApplyPreview.impact.blockers.join(" · ")}</small> : null}
              {templateApplyPreview.status === "DRAFT" ? (
                <button disabled={Boolean(templateBusyId)} onClick={() => void confirmTemplateApply()} type="button">Confirm Create Workflow Draft</button>
              ) : null}
              {templateApplyPreview.status === "CONFIRMED" ? <strong>New Workflow Draft created · separate review still required</strong> : null}
            </section>
          ) : null}
          {workflowDraft?.status === "CONFIRMED" ? (
            <div className="studio-agent-canvas-template-save">
              <label>
                Template name
                <input maxLength={200} onChange={(event) => setTemplateName(event.target.value)} value={templateName} />
              </label>
              <button disabled={!completedExecutionPlanId || Boolean(templateBusyId)} onClick={() => void saveConfirmedWorkflowTemplate()} type="button">
                {templateBusyId === "save" ? "Saving…" : "Save as Template"}
              </button>
              {!completedExecutionPlanId ? <small>A completed Execution is required as success evidence.</small> : null}
            </div>
          ) : null}
          {templateMessage ? <small className="studio-agent-canvas-action-message" role="status">{templateMessage}</small> : null}
        </section>
        <section className="studio-agent-canvas-workflow-editor" aria-label="Canvas Workflow Draft editor">
          <header>
            <span>Workflow Builder</span>
            <b>{workflowDraft?.status || (workflowChanges.length ? "UNSAVED" : "READ ONLY")}</b>
          </header>
          {!workflowEditing ? (
            <button onClick={() => { setWorkflowEditing(true); setWorkflowMessage("Draft editing enabled. Original Workflow remains read-only."); }} type="button">
              Edit Workflow
            </button>
          ) : (
            <div className="studio-agent-canvas-workflow-draft">
              <div className="studio-agent-canvas-draft-badge">
                <span>Draft mode</span>
                <strong>{workflowDraft?.status || "UNSAVED"}</strong>
              </div>
              <small>Add supported Agent roles or propose connection changes. Nothing is applied directly.</small>
              <div className="studio-agent-canvas-agent-buttons">
                <button disabled={workflowBusy} onClick={() => addDraftAgent("STORYBOARD_AGENT")} type="button">+ Storyboard Agent</button>
                <button disabled={workflowBusy} onClick={() => addDraftAgent("QUALITY_AGENT")} type="button">+ Quality Agent</button>
              </div>
              <label>
                Connection source
                <select aria-label="Connection source" onChange={(event) => setConnectionSource(event.target.value)} value={connectionSource}>
                  <option value="">Select node</option>
                  {workflowSelectableNodes.map((node) => <option key={`source-${node.nodeId}`} value={node.nodeId}>{node.label}</option>)}
                </select>
              </label>
              <label>
                Connection target
                <select aria-label="Connection target" onChange={(event) => setConnectionTarget(event.target.value)} value={connectionTarget}>
                  <option value="">Select node</option>
                  {workflowSelectableNodes.map((node) => <option key={`target-${node.nodeId}`} value={node.nodeId}>{node.label}</option>)}
                </select>
              </label>
              <div className="studio-agent-canvas-connection-buttons">
                <button disabled={workflowBusy} onClick={() => addConnectionChange("CONNECT_NODE")} type="button">Connect in Draft</button>
                <button disabled={workflowBusy} onClick={() => addConnectionChange("DISCONNECT_NODE")} type="button">Disconnect in Draft</button>
              </div>
              <div className="studio-agent-canvas-change-list" aria-label="Workflow Draft changes">
                <strong>Changes · {workflowChanges.length}</strong>
                {workflowChanges.map((change, index) => (
                  <span key={`${change.changeId || change.type}-${index}`}>
                    {change.type.replaceAll("_", " ")}
                    {change.role ? ` · ${change.role.replaceAll("_", " ")}` : ""}
                    {change.sourceNodeId && change.targetNodeId ? ` · ${change.sourceNodeId} → ${change.targetNodeId}` : ""}
                  </span>
                ))}
              </div>
              <button disabled={!workflowChanges.length || workflowBusy} onClick={() => void previewWorkflowChanges()} type="button">
                {workflowBusy ? "Building Preview…" : "Preview Changes"}
              </button>
              {workflowDraft ? (
                <section className="studio-agent-canvas-impact" aria-label="Workflow Draft impact">
                  <span>Impact Analysis</span>
                  <dl>
                    <div><dt>Affected nodes</dt><dd>{workflowDraft.impact.affectedNodes.length}</dd></div>
                    <div><dt>Execution</dt><dd>{workflowDraft.impact.executionImpact.replaceAll("_", " ")}</dd></div>
                    <div><dt>Cost</dt><dd>{workflowDraft.impact.costImpact.replaceAll("_", " ")}</dd></div>
                    <div><dt>Node / edge delta</dt><dd>{workflowDraft.impact.nodeDelta} / {workflowDraft.impact.edgeDelta}</dd></div>
                  </dl>
                  {workflowDraft.impact.risks.length ? <small>{workflowDraft.impact.risks.join(" · ")}</small> : null}
                  {workflowDraft.status === "DRAFT" ? (
                    <button disabled={workflowBusy} onClick={() => void confirmWorkflowChanges()} type="button">Confirm Workflow Draft</button>
                  ) : null}
                  {workflowDraft.status === "CONFIRMED" ? <strong>Confirmed Draft only · Execution Preview still required</strong> : null}
                </section>
              ) : null}
              {workflowMessage ? <small className="studio-agent-canvas-action-message" role="status">{workflowMessage}</small> : null}
            </div>
          )}
        </section>
        <section className="studio-agent-canvas-execution-control" aria-label="Canvas Execution Preview controls">
          <header>
            <span>Execution Preview</span>
            <b>{executionPreview?.status || "NOT BUILT"}</b>
          </header>
          <button disabled={executionBusy} onClick={() => void buildExecutionPreview()} type="button">
            {executionBusy ? "Checking Gates…" : "Preview Execution"}
          </button>
          {executionPreview ? (
            <div className="studio-agent-canvas-execution-summary" aria-label="Execution Summary">
              <dl>
                <div><dt>Agent nodes</dt><dd>{executionPreview.nodes.filter((node) => node.nodeType === "AGENT_TEAM").length}</dd></div>
                <div><dt>Task nodes</dt><dd>{executionPreview.nodes.filter((node) => node.nodeType === "TASK").length}</dd></div>
                <div><dt>Execution nodes</dt><dd>{executionPreview.executionPlanCandidate?.nodes.length || 0}</dd></div>
                <div><dt>Capability</dt><dd>{executionPreview.executionPlanCandidate?.nodes.map((node) => node.capability).join(", ") || "Unavailable"}</dd></div>
                <div><dt>Model</dt><dd>{executionPreview.executionPlanCandidate?.models.map((model) => model.modelId).join(", ") || "Unavailable"}</dd></div>
                <div><dt>Estimated Credits</dt><dd>{executionPreview.estimatedCost.credits ?? "Unknown"} · no deduction</dd></div>
              </dl>
              <div className="studio-agent-canvas-gates">
                {(Object.keys(STUDIO_CANVAS_EXECUTION_GATE_LABELS) as Array<keyof typeof STUDIO_CANVAS_EXECUTION_GATE_LABELS>).map((gateName) => (
                  <span className={executionPreview.gates[gateName].passed ? "is-passed" : "is-blocked"} key={gateName}>
                    {executionPreview.gates[gateName].passed ? "✓" : "!"} {STUDIO_CANVAS_EXECUTION_GATE_LABELS[gateName]}
                  </span>
                ))}
              </div>
              {executionPreview.riskFlags.length ? (
                <div className="studio-agent-canvas-risks"><strong>Risks</strong><span>{executionPreview.riskFlags.join(" · ")}</span></div>
              ) : null}
              <small>Preview only. Final confirmation is handled by the Execution Approval Center; Canvas has no Runtime Execute control.</small>
              {executionPreview.status === "READY" ? (
                <button
                  disabled={executionApprovalBusy || !agentRunPlan}
                  onClick={() => void createExecutionApproval()}
                  type="button"
                >
                  {executionApprovalBusy ? "Preparing Approval…" : "Prepare Execution Approval"}
                </button>
              ) : null}
              {executionPreview.status === "READY" && !agentRunPlan ? (
                <small>Build and review an Agent Run Plan before requesting approval.</small>
              ) : null}
              {executionPreview.status === "CONFIRMED" ? <b>Existing Execution Plan confirmed · separate Runtime confirmation required</b> : null}
            </div>
          ) : null}
          {executionApproval ? (
            <section className="studio-agent-canvas-execution-approval" aria-label="Execution Approval Panel">
              <header>
                <span>Execution Approval</span>
                <b>{executionApproval.status}</b>
              </header>
              <dl>
                <div><dt>Agents</dt><dd>{executionApproval.summary.agentCount}</dd></div>
                <div><dt>Tasks</dt><dd>{executionApproval.summary.taskCount}</dd></div>
                <div><dt>Execution nodes</dt><dd>{executionApproval.summary.executionNodeCount}</dd></div>
                <div><dt>Estimated Credits</dt><dd>{executionApproval.summary.estimatedCredits ?? "Unknown"} · no deduction</dd></div>
                <div><dt>Cost Confidence</dt><dd>{executionApproval.summary.costConfidence}</dd></div>
                <div><dt>Policy Result</dt><dd>{executionApproval.policyStatus}</dd></div>
                <div><dt>Cost Gate</dt><dd>{executionApproval.costStatus}</dd></div>
              </dl>
              <div className="studio-agent-canvas-gates">
                <span className={executionApproval.policyStatus === "PASSED" ? "is-passed" : "is-blocked"}>
                  {executionApproval.policyStatus === "PASSED" ? "✓" : "!"} Policy
                </span>
                <span className={executionApproval.costStatus === "PASSED" ? "is-passed" : "is-blocked"}>
                  {executionApproval.costStatus === "PASSED" ? "✓" : "!"} Cost
                </span>
              </div>
              {executionApproval.riskFlags.length ? (
                <div className="studio-agent-canvas-risks">
                  <strong>Risks</strong>
                  <span>{executionApproval.riskFlags.join(" · ")}</span>
                </div>
              ) : <small>No approval risks were reported.</small>}
              <small>
                Human approval delegates to the existing Execution Confirm. It does not start Runtime, call a Provider, or deduct Credits.
              </small>
              {executionApproval.status === "PENDING" ? (
                <button
                  disabled={executionApprovalBusy ||
                    executionApproval.policyStatus !== "PASSED" ||
                    executionApproval.costStatus !== "PASSED"}
                  onClick={() => void confirmExecutionApproval()}
                  type="button"
                >
                  {executionApprovalBusy ? "Confirming…" : "Confirm through Existing Execution Confirm"}
                </button>
              ) : null}
              {executionApproval.status === "APPROVED" ? (
                <strong>Approved · Existing Execution Plan confirmed · separate Runtime control still required</strong>
              ) : null}
            </section>
          ) : null}
          {executionApprovalMessage ? (
            <small className="studio-agent-canvas-action-message" role="status">{executionApprovalMessage}</small>
          ) : null}
        </section>
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
            {selectedResult ? (
              <section className="studio-agent-canvas-selected-result" aria-label="Selected Execution result">
                <span>Bound result</span>
                <dl>
                  <div><dt>Clip</dt><dd>{selectedResult.timeline.clipId}</dd></div>
                  <div><dt>Duration</dt><dd>{selectedResult.timeline.duration ?? "Unknown"}s</dd></div>
                  <div><dt>Asset</dt><dd>{selectedResult.asset.assetId}</dd></div>
                  <div><dt>Status</dt><dd>{selectedResult.execution.status}</dd></div>
                </dl>
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
      <section className="studio-agent-canvas-production-layout" aria-label="Creative Production Layout">
        <header>
          <div>
            <span>Creative Production</span>
            <strong>Canvas, Timeline, Output, and Assets</strong>
          </div>
          <small>Read-only references · no publish or timeline edits</small>
        </header>
        {productionError ? <p className="studio-agent-canvas-production-error" role="status">{productionError}</p> : null}
        {!production?.bindings.length ? (
          <div className="studio-agent-canvas-production-empty">Completed Execution results will appear here after the existing Materializer binds them.</div>
        ) : (
          <div className="studio-agent-canvas-result-list">
            {production.bindings.map((binding) => (
              <article className="studio-agent-canvas-result" key={binding.bindingId}>
                <section aria-label="Timeline Preview">
                  <span>Timeline Preview</span>
                  <strong>{binding.timeline.clipId}</strong>
                  <dl>
                    <div><dt>Duration</dt><dd>{binding.timeline.duration ?? "Unknown"}s</dd></div>
                    <div><dt>Asset</dt><dd>{binding.timeline.assetId}</dd></div>
                    <div><dt>Status</dt><dd>{binding.timeline.status}</dd></div>
                  </dl>
                </section>
                <section aria-label="Output Panel">
                  <span>Output</span>
                  <strong>{binding.output.status}</strong>
                  <dl>
                    <div><dt>Version</dt><dd>{binding.output.version || "Unversioned"}</dd></div>
                    <div><dt>Quality</dt><dd>{binding.output.qualityStatus}</dd></div>
                  </dl>
                  {binding.output.url ? <a href={binding.output.url} rel="noreferrer" target="_blank">Open output</a> : <small>Output URL unavailable</small>}
                </section>
                <section aria-label="Asset Panel">
                  <span>Asset</span>
                  <strong>{binding.asset.displayName || binding.asset.assetId}</strong>
                  <dl>
                    <div><dt>Type</dt><dd>{binding.asset.type || "Unknown"}</dd></div>
                    <div><dt>Version</dt><dd>{binding.asset.version || "Unversioned"}</dd></div>
                    <div><dt>Status</dt><dd>{binding.asset.status}</dd></div>
                  </dl>
                </section>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
