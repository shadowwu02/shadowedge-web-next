import type { StudioAgentTaskRuntime } from "./studioAgentTaskRuntime.ts";
import type { StudioWorkflowExecutionPlan } from "./studioWorkflowExecutionPlan.ts";

export type StudioAgentTaskExecutionBindingStatus =
  | "BLOCKED"
  | "PREVIEW_READY"
  | "CONFIRMED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StudioAgentTaskExecutionBinding = {
  taskId: string;
  runtimeTaskId: string;
  projectId: string;
  capability: string;
  executionNodeId: string;
  executionPlanId: string;
  status: StudioAgentTaskExecutionBindingStatus;
  runtimeStatus: string | null;
  result: {
    status: string;
    output?: {
      videoUrl?: string | null;
      assetId?: string | null;
      timelineClipId?: string | null;
      outputNodeId?: string | null;
    };
    error?: { code: string; message: string } | null;
  } | null;
  outputRefs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type StudioAgentTaskExecutionBundle = {
  binding: StudioAgentTaskExecutionBinding;
  task: StudioAgentTaskRuntime;
  execution: {
    executionPlanId: string;
    executionNodeId: string;
    planStatus: string | null;
    runtimeStatus: string | null;
    gates: Record<string, { passed: boolean; blocker: string | null }> | null;
    result: StudioAgentTaskExecutionBinding["result"];
    outputRefs: string[];
  };
  executionPlan: StudioWorkflowExecutionPlan;
  automaticExecution: false;
  automaticProviderCall: false;
  automaticCreditsDeduction: false;
  providerCalled: boolean;
  creditsDeducted: boolean;
  autoRetry: false;
  nextAction:
    | "HUMAN_CONFIRM_EXECUTION_PLAN"
    | "EXPLICIT_EXECUTE_NODE_CONFIRM_REQUIRED"
    | "OBSERVE_EXECUTION_STATUS";
};
