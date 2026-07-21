import type { StudioCreativeAgentRole, StudioCreativeAgentRoleId } from "./studioCreativeAgentCollaboration.ts";

export type StudioAgentTeamPlanStatus = "DRAFT" | "WAITING_HUMAN" | "APPROVED";

export type StudioAgentTaskAllocation = {
  taskId: string;
  roleId: StudioCreativeAgentRoleId;
  reason: string;
  dependencies: string[];
  priority: number;
};

export type StudioAgentTeamPlan = {
  teamPlanId: string;
  projectId: string;
  intent: { intentId: string | null; intentType: string };
  capabilities: string[];
  requiredRoles: StudioCreativeAgentRoleId[];
  tasks: StudioAgentTaskAllocation[];
  dependencies: Array<{ fromTaskId: string; toTaskId: string }>;
  contextSignals: {
    brandContext: boolean;
    visualStyle: boolean;
    characterCount: number;
    creativeGoalCount: number;
  };
  status: StudioAgentTeamPlanStatus;
  humanApprovalRequired: true;
  statusHistory: Array<{ status: StudioAgentTeamPlanStatus; at: string }>;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};

export type StudioAgentTeamPlanBundle = {
  teamPlan: StudioAgentTeamPlan | null;
  selectedRoles: StudioCreativeAgentRole[];
  graph: {
    nodes: StudioAgentTaskAllocation[];
    edges: Array<{ fromTaskId: string; toTaskId: string }>;
  };
  privacy: "CURRENT_USER_CURRENT_PROJECT_APPROVED_CONTEXT_ONLY";
  executionBoundary: "TEAM_PLAN_DRAFT_ONLY_NO_TASK_EXECUTION_PROVIDER_CALL_OR_CHARGE";
};
