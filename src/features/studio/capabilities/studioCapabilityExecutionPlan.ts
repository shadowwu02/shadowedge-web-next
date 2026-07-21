export type StudioCreativeWorkflowNodeStatus = "READY" | "BLOCKED";

export type StudioCreativeWorkflowNode = {
  nodeId: string;
  capability: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  status: StudioCreativeWorkflowNodeStatus;
  recommendation: {
    providerId: string | null;
    modelId: string | null;
    verifiedScope: string | null;
    estimatedCredits: number | null;
    confidence: string;
  } | null;
  blockers: string[];
};

export type StudioCapabilityExecutionPlan = {
  planId: string;
  intentId: string;
  intentType: string;
  capabilities: string[];
  nodes: StudioCreativeWorkflowNode[];
  constraints: Record<string, unknown>;
  estimatedCost: {
    estimatedCredits: number | null;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    currency: "shadowedge_credits";
    deduction: "NONE";
  };
  blockers: string[];
  confirmationAllowed: boolean;
  status: "PLAN_ONLY" | "CONFIRMED";
  executionBoundary: {
    automaticExecution: false;
    generationPlanCreated: false;
    queueEntered: false;
    providerCalled: false;
    nextAction: "USER_CONFIRMATION_REQUIRED" | "CREATE_EXISTING_GENERATION_PLAN_MANUALLY";
  };
  createdAt: string;
  confirmedAt: string | null;
};

export function formatStudioCapabilityLabel(capability: string) {
  return capability.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
