export type StudioCreativeAgentRoleId =
  | "CREATIVE_DIRECTOR"
  | "STORYBOARD_AGENT"
  | "VIDEO_AGENT"
  | "QUALITY_AGENT";

export type StudioCreativeAgentTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "DONE"
  | "FAILED"
  | "WAITING_HUMAN";

export type StudioCreativeAgentRole = {
  roleId: StudioCreativeAgentRoleId;
  name: string;
  purpose: string;
  capabilities: string[];
  constraints: string[];
};

export type StudioCreativeAgentTask = {
  taskId: string;
  roleId: StudioCreativeAgentRoleId;
  projectId: string;
  sessionId: string;
  input: {
    planId: string;
    intentType: string;
    approvedContext: Record<string, unknown>;
    dependencyTaskIds: string[];
  };
  output: Record<string, unknown>;
  status: StudioCreativeAgentTaskStatus;
  dependencies: string[];
  humanApprovalRequired: true;
  createdAt: string;
  updatedAt: string;
};

export type StudioCreativeAgentRoleBundle = {
  roles: StudioCreativeAgentRole[];
  executionBoundary: "HUMAN_APPROVAL_REQUIRED";
};

export type StudioCreativeAgentTaskBundle = {
  projectId: string;
  roles: StudioCreativeAgentRole[];
  tasks: StudioCreativeAgentTask[];
  collaborationFlow: Array<StudioCreativeAgentRoleId | "HUMAN_REVIEW">;
  privacy: "CURRENT_USER_CURRENT_PROJECT_APPROVED_CONTEXT_ONLY";
  executionBoundary: "DRAFT_OUTPUTS_WAIT_FOR_HUMAN_NO_AUTONOMOUS_EXECUTION";
};

export function studioAgentTaskSymbol(status: StudioCreativeAgentTaskStatus) {
  if (status === "FAILED") return "×";
  if (status === "WAITING_HUMAN" || status === "DONE") return "✓";
  if (status === "RUNNING") return "●";
  return "○";
}
