export type StudioExecutionPlanStatus =
  | "DRAFT"
  | "READY"
  | "CONFIRMED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

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
  executionBoundary: {
    automaticGeneration: false;
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
