export type StudioProductionDependencyType =
  | "SCENE_SEQUENCE"
  | "SHOT_SEQUENCE"
  | "SHARED_REFERENCE"
  | "QUALITY_CHECKPOINT";

export type StudioProductionStep = Readonly<{
  stepId: string;
  sceneId: string;
  shotId: string;
  agent: "VIDEO_AGENT";
  dependencies: readonly string[];
  status: "READY" | "BLOCKED";
  order: number;
  generationDraftId: string | null;
  model: Readonly<{
    providerId: string;
    modelId: string;
    displayName: string;
    verifiedScope: string;
  }> | null;
  estimatedCost: Readonly<{
    shadowCredits: number | null;
    status: "VERIFIED" | "PARTIAL" | "QUOTE_ONLY" | "UNKNOWN";
    kind: "CONFIRMED" | "ESTIMATED" | "UNKNOWN";
  }>;
}>;

export type StudioProductionRunPlan = Readonly<{
  runId: string;
  projectId: string;
  actionType: "PRODUCTION_RUN_PLAN_DRAFT";
  scenes: readonly Readonly<{
    sceneId: string;
    storyboardId: string;
    name: string;
    order: number;
    batchPlanId: string;
    shotCount: number;
    status: "PREVIEWED" | "CONFIRMED" | "BLOCKED";
  }>[];
  shots: readonly StudioProductionStep[];
  agentPlan: Readonly<{
    runPlanId: string;
    graphId: string;
    status: "READY" | "HUMAN_REVIEW_REQUIRED" | "BLOCKED";
    steps: readonly Readonly<{
      stepId: string;
      agentId: string;
      taskId: string;
      status: string;
    }>[];
    checkpoints: readonly Readonly<{
      checkpointId: string;
      type: string;
      status: string;
    }>[];
    riskFlags: readonly string[];
  }>;
  estimatedCost: Readonly<{
    totalCreditsEstimate: number;
    costConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    unknownCost: number;
    status: "COMPLETE" | "PARTIAL";
  }>;
  riskFlags: readonly string[];
  checkpoints: readonly Readonly<{
    checkpointId: string;
    sceneId: string;
    type: "QUALITY_CHECKPOINT";
    status: "HUMAN_REVIEW_REQUIRED";
    dependencies: readonly string[];
    order: number;
  }>[];
  dependencies: readonly Readonly<{
    type: StudioProductionDependencyType;
    fromStepId: string;
    toStepId: string;
    referenceIds: readonly string[];
  }>[];
  summary: Readonly<{
    sceneCount: number;
    shotCount: number;
    agentCount: number;
    checkpointCount: number;
  }>;
  status: "PREVIEWED" | "CONFIRMED" | "BLOCKED";
  requiresConfirmation: true;
  requiresExecutionApproval: true;
  handoff?: Readonly<{
    type: "EXISTING_EXECUTION_APPROVAL_INPUT_DRAFT";
    status: "DRAFT";
    sourceProductionRunId: string;
    batchPlanIds: readonly string[];
    requiresExecutionApproval: true;
    queueStarted: false;
    jobsCreated: 0;
    providerCalled: false;
    creditsDeducted: false;
  }>;
  createdAt: string;
  updatedAt?: string;
}>;
