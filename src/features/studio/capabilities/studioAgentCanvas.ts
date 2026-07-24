import type { StudioWorkflowExecutionPlan } from "@/features/studio/capabilities/studioWorkflowExecutionPlan";

export const STUDIO_AGENT_CANVAS_NODE_TYPES = ["GOAL", "STRATEGY", "AGENT_TEAM", "TASK", "EXECUTION", "ASSET"] as const;

export type StudioAgentCanvasNodeType = typeof STUDIO_AGENT_CANVAS_NODE_TYPES[number];

export type StudioAgentCanvasInsightMarker = Readonly<{
  insightId: string;
  type: string;
  severity: string;
  label: string;
  href: string;
}>;

export type StudioAgentCanvasNode = Readonly<{
  nodeId: string;
  projectId: string;
  nodeType: StudioAgentCanvasNodeType;
  referenceId: string;
  status: string;
  metadata: Readonly<Record<string, unknown>> & {
    title?: string;
    source?: string;
    confidence?: string;
    evidence?: readonly unknown[];
    insightMarkers?: readonly StudioAgentCanvasInsightMarker[];
  };
  createdAt: string;
}>;

export type StudioAgentCanvasEdge = Readonly<{
  edgeId: string;
  source: string;
  target: string;
  relationType: string;
}>;

export type StudioAgentCanvasGraph = Readonly<{
  projectId: string;
  nodes: readonly StudioAgentCanvasNode[];
  edges: readonly StudioAgentCanvasEdge[];
  generatedAt: string;
  mode: "READ_ONLY";
  storage: "DERIVED_FROM_EXISTING_PROJECT_DATA";
  interactionBoundary: "VIEW_DETAILS_AND_NAVIGATE_ONLY";
  safety: "NO_CANVAS_WRITE_NO_EXECUTION_NO_PROVIDER_NO_BILLING_NO_CREDITS";
}>;

export type StudioCanvasResultBinding = Readonly<{
  bindingId: string;
  canvasNodeId: string;
  executionId: string;
  resultId: string;
  timelineRef: string;
  outputRef: string;
  assetRef: string;
  createdAt: string;
  execution: Readonly<{
    executionId: string;
    status: string;
  }>;
  timeline: Readonly<{
    clipId: string;
    duration: number | null;
    status: string;
    assetId: string;
    start: number | null;
  }>;
  output: Readonly<{
    nodeId: string;
    url: string | null;
    assetId: string;
    version: string | null;
    qualityStatus: string;
    status: string;
  }>;
  asset: Readonly<{
    assetId: string;
    status: string;
    type: string | null;
    url: string | null;
    displayName: string | null;
    version: string | null;
  }>;
}>;

export type StudioCanvasProductionResults = Readonly<{
  projectId: string;
  bindings: readonly StudioCanvasResultBinding[];
  generatedAt: string;
  layout: "CREATIVE_PRODUCTION";
  mode: "READ_ONLY";
  storage: "REFERENCE_BINDINGS_ONLY";
  sourceOfTruth: "TIMELINE_OUTPUT_ASSET";
  safety: "NO_CANVAS_GENERATION_NO_TIMELINE_MUTATION_NO_RUNTIME_BYPASS_NO_AUTO_PUBLISH";
}>;

export const STUDIO_CANVAS_WORKFLOW_DRAFT_STATUSES = ["DRAFT", "REVIEW", "CONFIRMED", "REJECTED", "EXPIRED"] as const;
export type StudioCanvasWorkflowDraftStatus = typeof STUDIO_CANVAS_WORKFLOW_DRAFT_STATUSES[number];

export const STUDIO_CANVAS_WORKFLOW_CHANGE_TYPES = ["ADD_NODE", "REMOVE_NODE", "CONNECT_NODE", "DISCONNECT_NODE", "UPDATE_NODE_CONFIG"] as const;
export type StudioCanvasWorkflowChangeType = typeof STUDIO_CANVAS_WORKFLOW_CHANGE_TYPES[number];

export type StudioCanvasWorkflowChange = Readonly<{
  changeId?: string;
  type: StudioCanvasWorkflowChangeType;
  role?: "QUALITY_AGENT" | "STORYBOARD_AGENT";
  node?: Readonly<{
    nodeId?: string;
    role?: string;
    referenceId?: string;
    config?: Readonly<Record<string, unknown>>;
  }>;
  nodeId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  config?: Readonly<Record<string, unknown>>;
}>;

export type StudioCanvasWorkflowDraft = Readonly<{
  draftId: string;
  projectId: string;
  baseCanvasVersion: string;
  nodes: ReadonlyArray<Readonly<{
    nodeId: string;
    nodeType: string;
    referenceId: string;
    status: string;
    metadata: Readonly<Record<string, unknown>>;
    createdAt?: string;
  }>>;
  edges: ReadonlyArray<Readonly<{
    edgeId: string;
    source: string;
    target: string;
    relationType: string;
  }>>;
  changes: readonly StudioCanvasWorkflowChange[];
  status: StudioCanvasWorkflowDraftStatus;
  impact: Readonly<{
    affectedNodes: readonly string[];
    nodeDelta: number;
    edgeDelta: number;
    executionImpact: "DRAFT_ONLY" | "REQUIRES_NEW_EXECUTION_PREVIEW";
    costImpact: "NO_IMMEDIATE_COST" | "REQUIRES_COST_REESTIMATE";
    creditsDeducted: false;
    risks: readonly string[];
  }>;
  createdAt: string;
  confirmedAt?: string;
  proposal?: Readonly<{
    proposalId: string;
    draftType: "WORKFLOW_DRAFT";
    status: "DRAFT";
    source: "AGENT_CANVAS";
    sourceDraftId: string;
    requiresExecutionPreview: true;
    executionAllowed: false;
  }>;
  boundary: "WORKFLOW_PROPOSAL_ONLY" | "CONFIRMED_PROPOSAL_NO_CANVAS_OR_EXECUTION_MUTATION";
}>;

export const STUDIO_CANVAS_DRAFT_ACTION_TYPES = ["GOAL_REVIEW", "STRATEGY_REVIEW", "AGENT_EXPANSION", "WORKFLOW_IMPROVEMENT", "QUALITY_IMPROVEMENT", "COST_OPTIMIZATION"] as const;
export type StudioCanvasDraftActionType = typeof STUDIO_CANVAS_DRAFT_ACTION_TYPES[number];

export type StudioCanvasDraftAction = Readonly<{
  actionId: string;
  nodeId: string;
  actionType: StudioCanvasDraftActionType;
  reason: string;
  impact: string;
  status: "PREVIEWED" | "CONFIRMED";
  createdAt: string;
  delegatedActionId: string;
  binding: Readonly<{
    nodeId: string;
    referenceId: string;
    insightId: string | null;
    explanationReference: Readonly<Record<string, unknown>>;
  }>;
  preview: Readonly<{
    draftType: string;
    requiresConfirmation: true;
    existingFlowTarget: "PROJECT_COPILOT_ACTION_CENTER";
    safety: string;
  }>;
  draft?: Readonly<{
    draftId: string;
    draftType: string;
    status: "DRAFT";
  }>;
}>;

export type StudioCanvasDraftActionPreviewResult = Readonly<{
  action: StudioCanvasDraftAction;
  preview: StudioCanvasDraftAction["preview"];
  boundary: "PREVIEW_ONLY_NO_PROJECT_MUTATION";
}>;

export type StudioCanvasDraftActionConfirmResult = Readonly<{
  action: StudioCanvasDraftAction;
  draft: NonNullable<StudioCanvasDraftAction["draft"]>;
  boundary: "DRAFT_CREATED_EXISTING_ACTION_CENTER";
}>;

export const STUDIO_CANVAS_EXECUTION_PREVIEW_STATUSES = ["DRAFT", "READY", "BLOCKED", "CONFIRMED", "EXPIRED"] as const;
export type StudioCanvasExecutionPreviewStatus = typeof STUDIO_CANVAS_EXECUTION_PREVIEW_STATUSES[number];

export const STUDIO_CANVAS_EXECUTION_GATE_LABELS = {
  capability: "Capability",
  availability: "Availability",
  readiness: "Readiness",
  verifiedScope: "Verified scope",
  cost: "Cost",
  agentPolicy: "Agent policy",
} as const;

export type StudioCanvasExecutionPreview = Readonly<{
  previewId: string;
  canvasProjectId: string;
  canvasDraftBinding: Readonly<{
    actionId: string;
    nodeId: string;
    draftId: string | null;
    explanationReference: Readonly<Record<string, unknown>> | null;
  }>;
  nodes: ReadonlyArray<Readonly<{
    nodeId: string;
    nodeType: "AGENT_TEAM" | "TASK" | "EXECUTION";
    referenceId: string;
    status: string;
    title: string;
    capability: string | null;
    dependencies: readonly string[];
  }>>;
  executionPlanCandidate: StudioWorkflowExecutionPlan | null;
  estimatedCost: Readonly<{
    credits: number | null;
    currency: "shadowedge_credits";
    confidence: "LOW" | "MEDIUM";
    deduction: "NONE";
  }>;
  gates: Readonly<Record<keyof typeof STUDIO_CANVAS_EXECUTION_GATE_LABELS, Readonly<{
    passed: boolean;
    blockers: readonly string[];
  }>>>;
  policyDecisions: readonly Readonly<Record<string, unknown>>[];
  riskFlags: readonly string[];
  status: StudioCanvasExecutionPreviewStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string;
  executionBoundary: Readonly<{
    canvasCanExecute: false;
    automaticGeneration: false;
    queueEntered: false;
    providerCalled: false;
    creditsDeducted: false;
    nextAction:
      | "HUMAN_CONFIRM_EXECUTION_PREVIEW"
      | "CLEAR_GATE_BLOCKERS"
      | "USE_EXISTING_RUNTIME_WITH_SEPARATE_EXECUTION_CONFIRM";
  }>;
}>;

export const STUDIO_CANVAS_EXECUTION_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;
export type StudioCanvasExecutionApprovalStatus =
  typeof STUDIO_CANVAS_EXECUTION_APPROVAL_STATUSES[number];

export type StudioCanvasExecutionApproval = Readonly<{
  approvalId: string;
  runPlanId: string;
  executionPreviewId: string;
  summary: Readonly<{
    agentCount: number;
    taskCount: number;
    executionNodeCount: number;
    estimatedCredits: number | null;
    costConfidence: "HIGH" | "MEDIUM" | "LOW";
    policyResult: "PASSED" | "BLOCKED" | "UNKNOWN";
    costResult: "PASSED" | "BLOCKED" | "UNKNOWN";
  }>;
  policyStatus: "PASSED" | "BLOCKED" | "UNKNOWN";
  costStatus: "PASSED" | "BLOCKED" | "UNKNOWN";
  riskFlags: readonly string[];
  status: StudioCanvasExecutionApprovalStatus;
  createdAt: string;
  expiresAt: string | null;
  approvedAt?: string;
  executionConfirmation?: Readonly<{
    previewId: string;
    executionPlanId: string | null;
    status: "CONFIRMED";
    confirmedAt: string;
  }>;
  approvalBoundary: Readonly<{
    humanConfirmRequired: true;
    delegatesToExistingExecutionConfirm: true;
    canvasOwnsRuntime: false;
    automaticExecution: false;
    providerCalled: false;
    creditsDeducted: false;
  }>;
}>;

export function studioCanvasDraftActionType(nodeType: StudioAgentCanvasNodeType): StudioCanvasDraftActionType {
  return ({
    GOAL: "GOAL_REVIEW",
    STRATEGY: "STRATEGY_REVIEW",
    AGENT_TEAM: "AGENT_EXPANSION",
    TASK: "WORKFLOW_IMPROVEMENT",
    EXECUTION: "QUALITY_IMPROVEMENT",
    ASSET: "WORKFLOW_IMPROVEMENT"
  } as const)[nodeType];
}

export function studioCanvasDraftActionLabel(type: StudioCanvasDraftActionType) {
  return ({
    GOAL_REVIEW: "Goal Review",
    STRATEGY_REVIEW: "Strategy Review",
    AGENT_EXPANSION: "Agent Expansion",
    WORKFLOW_IMPROVEMENT: "Workflow Improvement",
    QUALITY_IMPROVEMENT: "Quality Improvement",
    COST_OPTIMIZATION: "Cost Optimization"
  } as const)[type];
}

export function studioAgentCanvasNodeLabel(type: StudioAgentCanvasNodeType) {
  return ({
    GOAL: "Goal",
    STRATEGY: "Strategy",
    AGENT_TEAM: "Agent Team",
    TASK: "Task",
    EXECUTION: "Execution",
    ASSET: "Asset"
  } as const)[type];
}
