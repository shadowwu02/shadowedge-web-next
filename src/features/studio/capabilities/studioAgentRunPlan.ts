export const STUDIO_AGENT_RUN_STEP_STATUSES = [
  "READY",
  "WAITING",
  "BLOCKED",
  "HUMAN_REVIEW_REQUIRED",
] as const;
export type StudioAgentRunStepStatus = typeof STUDIO_AGENT_RUN_STEP_STATUSES[number];

export type StudioAgentRunStep = Readonly<{
  stepId: string;
  agentId: string;
  taskId: string;
  order: number;
  status: StudioAgentRunStepStatus;
  dependencies: readonly string[];
  blockers: readonly string[];
  checkpointIds: readonly string[];
  capabilities: readonly string[];
  alreadyCompleted: boolean;
}>;

export type StudioAgentRunPlan = Readonly<{
  runPlanId: string;
  projectId: string;
  graphId: string;
  steps: readonly StudioAgentRunStep[];
  dependencies: readonly Readonly<{
    dependencyId: string;
    sourceId: string;
    targetId: string;
    type: "SEQUENTIAL" | "PARALLEL" | "CHECKPOINT";
    groupId: string | null;
  }>[];
  checkpoints: readonly Readonly<{
    checkpointId: string;
    taskId: string;
    type: string;
    status: string;
  }>[];
  estimatedCost: Readonly<{
    estimatedCredits: number | null;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    status: "NO_PROVIDER_COST_EXPECTED" | "ESTIMATED" | "UNKNOWN";
    knownSteps: number;
    totalCostSteps: number;
    deduction: "NONE";
  }>;
  riskFlags: readonly string[];
  status: "READY" | "BLOCKED" | "HUMAN_REVIEW_REQUIRED";
  queue: Readonly<{
    mode: "PREVIEW_ONLY";
    waves: readonly Readonly<{
      order: number;
      stepIds: readonly string[];
      parallel: boolean;
    }>[];
    readyStepIds: readonly string[];
    waitingStepIds: readonly string[];
    blockedStepIds: readonly string[];
    humanReviewStepIds: readonly string[];
    started: false;
  }>;
  humanReview: Readonly<{
    required: true;
    state: "WAITING_HUMAN";
    nextStep: "REVIEW_THEN_BUILD_EXISTING_EXECUTION_PREVIEW";
  }>;
  createdAt: string;
  executionBoundary: Readonly<{
    queueStarted: false;
    agentStarted: false;
    taskExecuted: false;
    providerCalled: false;
    creditsDeducted: false;
  }>;
}>;
