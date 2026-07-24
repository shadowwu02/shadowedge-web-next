export type StudioProductionApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

export type StudioProductionApprovalGate = Readonly<{
  passed: boolean;
  blockers: readonly string[];
}>;

export type StudioProductionExecutionApproval = Readonly<{
  approvalId: string;
  projectId: string;
  runId: string;
  executionSummary: Readonly<{
    sceneCount: number;
    shotCount: number;
    agentCount: number;
    taskCount: number;
    checkpointCount: number;
    estimatedCredits: number;
    costConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  }>;
  agents: readonly string[];
  steps: readonly Readonly<{
    stepId: string;
    sceneId: string;
    shotId: string;
    agent: string;
    model: Readonly<{
      providerId: string;
      modelId: string;
      displayName: string;
      verifiedScope: string;
    }> | null;
    dependencies: readonly string[];
    status: string;
    gates: Readonly<{
      capability: StudioProductionApprovalGate;
      availability: StudioProductionApprovalGate;
      readiness: StudioProductionApprovalGate;
      verifiedScope: StudioProductionApprovalGate;
      cost: StudioProductionApprovalGate;
    }>;
  }>[];
  cost: Readonly<{
    estimatedCredits: number;
    confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    unknownCost: number;
    status: string;
    gatePassed: boolean;
    deduction: "NONE";
  }>;
  policy: Readonly<{
    status: "REQUIRES_APPROVAL" | "BLOCKED";
    decision: string;
    requirements: readonly string[];
    unmetRequirements: readonly string[];
    approvalSatisfied: boolean;
    version: string;
    blockers: readonly string[];
  }>;
  gates: Readonly<{
    capability: StudioProductionApprovalGate;
    availability: StudioProductionApprovalGate;
    readiness: StudioProductionApprovalGate;
    verifiedScope: StudioProductionApprovalGate;
    cost: StudioProductionApprovalGate;
    agentPolicy: StudioProductionApprovalGate;
  }>;
  riskFlags: readonly string[];
  status: StudioProductionApprovalStatus;
  createdAt: string;
  expiresAt: string;
  approvedAt?: string;
  runtimeHandoff?: Readonly<{
    type: "EXISTING_EXECUTION_RUNTIME_APPROVAL_PACKAGE";
    status: "APPROVED";
    approvalId: string;
    sourceProductionRunId: string;
    stepIds: readonly string[];
    requiresSeparateRuntimeStart: true;
    runtimeStarted: false;
    queueStarted: false;
    jobsCreated: 0;
    providerCalled: false;
    creditsDeducted: false;
  }>;
  approvalBoundary: Readonly<{
    humanConfirmRequired: true;
    delegatesToExistingRuntime: true;
    runtimeStarted: false;
    queueStarted: false;
    jobsCreated: 0;
    providerCalled: false;
    creditsDeducted: false;
  }>;
}>;
