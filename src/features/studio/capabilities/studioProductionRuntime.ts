export type StudioProductionRuntimeStatus =
  | "PENDING"
  | "READY"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StudioProductionRuntimeHandoff = Readonly<{
  handoffId: string;
  projectId: string;
  approvalId: string;
  runId: string;
  executionPlanId: string;
  runtimeNodes: readonly Readonly<{
    productionStepId: string;
    sceneId: string;
    shotId: string;
    agent: string;
    executionNodeId: string;
    capability: string;
    dependencies: readonly string[];
  }>[];
  createdAt: string;
  controlBoundary: Readonly<{
    usesExistingRuntime: true;
    executionConfirmRequired: true;
    automaticExecution: false;
    autoRetry: false;
    providerCalled: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioProductionExecutionTracking = Readonly<{
  trackingId: string;
  projectId: string;
  handoffId: string;
  executionPlanId: string;
  steps: readonly Readonly<{
    productionStepId: string;
    sceneId: string;
    shotId: string;
    agent: string;
    executionNodeId: string;
    capability: string;
    wave: number;
    status: StudioProductionRuntimeStatus;
    rawStatus: string;
    startedAt: string | null;
    completedAt: string | null;
    result: Readonly<{
      videoUrl: string | null;
      timelineClipId: string | null;
      assetId: string | null;
      outputNodeId: string | null;
      outputRefs: readonly string[];
    }> | null;
    failure: Readonly<{ code?: string }> | null;
  }>[];
  status: StudioProductionRuntimeStatus;
  progress: number;
  currentWave: number;
  totalWaves: number;
  results: readonly Readonly<{
    productionStepId: string;
    sceneId: string;
    shotId: string;
    executionNodeId: string;
    videoUrl: string | null;
    timelineClipId: string | null;
    assetId: string | null;
    outputNodeId: string | null;
    outputRefs: readonly string[];
  }>[];
  updatedAt: string;
  controlBoundary: Readonly<{
    readOnly: true;
    runtimeControl: false;
    automaticExecution: false;
    autoRetry: false;
    providerCalled: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioProductionRuntimeProjection = Readonly<{
  handoff: StudioProductionRuntimeHandoff;
  tracking: StudioProductionExecutionTracking;
}>;
