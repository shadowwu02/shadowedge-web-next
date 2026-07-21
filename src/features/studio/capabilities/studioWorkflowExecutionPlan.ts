export type StudioExecutionPlanStatus =
  | "DRAFT"
  | "READY"
  | "CONFIRMED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StudioOrchestrationNodeStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED";

export type StudioOrchestrationNode = {
  executionNodeId: string;
  executionPlanId: string;
  capability: string;
  status: StudioOrchestrationNodeStatus;
  dependencies: string[];
  inputRefs: string[];
  outputRefs: string[];
  blockedBy: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failure: { code: string; retryAllowed: false } | null;
  runtime: {
    adapterKey: string;
    target: string | null;
    state: "EXECUTING" | "COMPLETED" | "FAILED";
    runtimeJobId?: string | null;
    databaseJobId?: string | null;
    providerTrackingId?: string | null;
    providerNativeId?: string | null;
    materialization?: {
      projectId: string;
      sourceNodeId: string;
      outputNodeId: string | null;
    } | null;
    preparedAt?: string;
    updatedAt?: string;
  } | null;
  result: {
    status: "EXECUTING" | "COMPLETED" | "FAILED";
    output: {
      videoUrl: string | null;
      thumbnail: string | null;
      assetId: string | null;
      timelineClipId: string | null;
      outputNodeId: string | null;
    };
    error: { code: string; message: string } | null;
  } | null;
  resultBindings: {
    timeline: { status: "BOUND" | "PENDING" | "UNCHANGED"; ref: string | null };
    output: { status: "BOUND" | "PENDING" | "UNCHANGED"; ref: string | null };
  } | null;
};

export type StudioExecutionQueueItem = {
  nodeId: string;
  priority: number;
  dependenciesResolved: boolean;
  status: StudioOrchestrationNodeStatus;
};

export type StudioExecutionOrchestration = {
  status: "CONFIRMED" | "EXECUTING" | "COMPLETED" | "FAILED";
  nodes: StudioOrchestrationNode[];
  queue: StudioExecutionQueueItem[];
  nodeOrder: string[];
  automaticExecution: false;
  autoRetry: false;
  providerCalled: false;
  creditsDeducted: false;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type StudioExecutionStatus = {
  executionPlanId: string;
  sourcePlanId: string;
  planStatus: StudioExecutionPlanStatus;
  orchestrationStatus: StudioExecutionOrchestration["status"];
  nodes: StudioOrchestrationNode[];
  queue: StudioExecutionQueueItem[];
  automaticExecution: false;
  autoRetry: false;
  providerCalled: false;
  creditsDeducted: false;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type StudioExecutionGate = {
  passed: boolean;
  blocker: string | null;
};

export type StudioExecutionNode = {
  executionNodeId: string;
  sourceNodeId: string;
  capability: string;
  candidateType: string;
  providerId: string | null;
  modelId: string | null;
  verifiedScope: string | null;
  parameters: Record<string, unknown>;
  sourceDependencies: string[];
  dependencies: string[];
  estimatedCredits: number | null;
  status: "READY" | "BLOCKED";
  gates: {
    capability: StudioExecutionGate;
    modelAvailability: StudioExecutionGate;
    readiness: StudioExecutionGate;
    verifiedScope: StudioExecutionGate;
    cost: StudioExecutionGate;
  };
  blockers: string[];
  risks: string[];
  generationPlanCandidate: {
    type: string;
    providerId: string | null;
    modelId: string | null;
    verifiedScope: string | null;
    estimatedCredits: number | null;
    parameters: Record<string, unknown>;
  };
  resultBindings: ["timeline", "output"];
  usageLedger: "ON_REAL_JOB_ONLY";
};

export type StudioWorkflowExecutionPlan = {
  executionPlanId: string;
  sourcePlanId: string;
  nodes: StudioExecutionNode[];
  status: StudioExecutionPlanStatus;
  estimatedCredits: number | null;
  models: Array<{
    providerId: string | null;
    modelId: string;
    verifiedScope: string | null;
  }>;
  blockers: string[];
  risks: string[];
  handoff: {
    contractVersion: 1;
    target: "EXISTING_GENERATION_PLAN";
    mode: "EXPLICIT_USER_ACTION_REQUIRED";
    candidates: StudioExecutionNode["generationPlanCandidate"][];
  };
  orchestration?: StudioExecutionOrchestration;
  executionBoundary: {
    automaticGeneration: false;
    orchestrationQueueCreated?: boolean;
    generationPlanCreated: false;
    queueEntered: false;
    providerCalled: false;
    creditsDeducted: false;
    usageRecordCreated: false;
    nextAction:
      | "CLEAR_EXECUTION_BLOCKERS"
      | "USER_EXECUTION_CONFIRMATION_REQUIRED"
      | "HANDOFF_TO_EXISTING_GENERATION_PLAN_REQUIRES_EXPLICIT_USER_ACTION";
  };
  createdAt: string;
  confirmedAt: string | null;
};

export const STUDIO_EXECUTION_GATE_LABELS = {
  capability: "Capability",
  modelAvailability: "Availability",
  readiness: "Readiness",
  verifiedScope: "Verified scope",
  cost: "Cost gate",
} as const;

export function getStudioExecutionNodeSymbol(status: StudioOrchestrationNodeStatus) {
  if (status === "COMPLETED") return "✓";
  if (status === "RUNNING") return "●";
  if (status === "FAILED") return "×";
  if (status === "BLOCKED") return "!";
  return "○";
}
