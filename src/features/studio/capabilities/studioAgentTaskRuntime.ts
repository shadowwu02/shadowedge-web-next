import type { StudioCreativeAgentRoleId } from "./studioCreativeAgentCollaboration.ts";

export type StudioAgentTaskRuntimeStatus =
  | "PENDING"
  | "READY"
  | "WAITING_HUMAN"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StudioHumanCheckpointType = "PLAN_REVIEW" | "OUTPUT_REVIEW" | "EXECUTION_APPROVAL";
export type StudioHumanCheckpointDecision = "APPROVE" | "REJECT" | "DEFER";

export type StudioHumanCheckpoint = {
  checkpointId: string;
  taskId: string;
  runtimeTaskId: string;
  type: StudioHumanCheckpointType;
  decision: StudioHumanCheckpointDecision;
  reason: string | null;
  createdAt: string;
};

export type StudioAgentTaskRuntime = {
  runtimeTaskId: string;
  taskId: string;
  roleId: StudioCreativeAgentRoleId;
  status: StudioAgentTaskRuntimeStatus;
  dependencies: string[];
  inputRefs: string[];
  outputRefs: string[];
  approvalState: "PENDING" | "APPROVED" | "REJECTED" | "DEFERRED";
  executionRef: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failure: { code: string; retryAllowed: false } | null;
};

export type StudioAgentTaskRuntimeSnapshot = {
  runtimeId: string;
  teamPlanId: string;
  projectId: string;
  status: StudioAgentTaskRuntimeStatus;
  tasks: StudioAgentTaskRuntime[];
  checkpoints: StudioHumanCheckpoint[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  automaticExecution: false;
  providerCalled: false;
  creditsDeducted: false;
};

export type StudioAgentTaskRuntimeBundle = {
  runtime: StudioAgentTaskRuntimeSnapshot | null;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  governanceBoundary: "CHECKPOINTS_TRACK_APPROVAL_ONLY_EXECUTION_REQUIRES_SEPARATE_CONFIRMED_RUNTIME";
  automaticExecution: false;
  providerCalled: false;
  creditsDeducted: false;
};

export function studioCheckpointTypeForRole(roleId: StudioCreativeAgentRoleId): StudioHumanCheckpointType {
  if (roleId === "VIDEO_AGENT") return "EXECUTION_APPROVAL";
  if (roleId === "QUALITY_AGENT") return "OUTPUT_REVIEW";
  return "PLAN_REVIEW";
}
