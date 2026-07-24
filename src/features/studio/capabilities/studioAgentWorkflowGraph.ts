export const STUDIO_AGENT_WORKFLOW_NODE_TYPES = [
  "CREATIVE_DIRECTOR",
  "STORYBOARD_AGENT",
  "VIDEO_AGENT",
  "QUALITY_AGENT",
  "CHARACTER_AGENT",
  "HUMAN_CHECKPOINT",
] as const;
export type StudioAgentWorkflowNodeType = typeof STUDIO_AGENT_WORKFLOW_NODE_TYPES[number];

export const STUDIO_AGENT_WORKFLOW_DEPENDENCY_TYPES = ["SEQUENTIAL", "PARALLEL", "CHECKPOINT"] as const;
export type StudioAgentWorkflowDependencyType = typeof STUDIO_AGENT_WORKFLOW_DEPENDENCY_TYPES[number];

export type StudioAgentWorkflowAgent = Readonly<{
  agentId: string;
  nodeType: Exclude<StudioAgentWorkflowNodeType, "HUMAN_CHECKPOINT">;
  roleId: string;
  label: string;
  status: string;
  taskIds: readonly string[];
  source: "AGENT_TEAM_PLAN" | "AGENT_WORKFLOW_DRAFT";
}>;

export type StudioAgentWorkflowTask = Readonly<{
  taskId: string;
  sourceTaskId: string | null;
  agentId: string;
  roleId: string;
  status: string;
  dependencies: readonly string[];
  capabilities: readonly string[];
  approvalState: string;
  priority: number;
  waiting: boolean;
  createdAt: string;
}>;

export type StudioAgentWorkflowCheckpoint = Readonly<{
  checkpointId: string;
  nodeType: "HUMAN_CHECKPOINT";
  taskId: string;
  type: "PLAN_REVIEW" | "OUTPUT_REVIEW" | "EXECUTION_APPROVAL";
  decision: string;
  status: string;
  reason: string | null;
  createdAt: string;
}>;

export type StudioAgentWorkflowDependency = Readonly<{
  dependencyId: string;
  sourceId: string;
  targetId: string;
  type: StudioAgentWorkflowDependencyType;
  groupId: string | null;
}>;

export type StudioAgentWorkflowGraph = Readonly<{
  graphId: string;
  projectId: string;
  agents: readonly StudioAgentWorkflowAgent[];
  tasks: readonly StudioAgentWorkflowTask[];
  dependencies: readonly StudioAgentWorkflowDependency[];
  checkpoints: readonly StudioAgentWorkflowCheckpoint[];
  createdAt: string;
  source: Readonly<{
    teamPlanId: string | null;
    runtimeId: string | null;
  }>;
  preview: Readonly<{
    agentOrder: readonly string[];
    parallelGroups: readonly string[];
    waitingNodeIds: readonly string[];
    humanNodeIds: readonly string[];
  }>;
  mode: "READ_ONLY_ORCHESTRATION_PROJECTION" | "DRAFT_PREVIEW";
  executionBoundary: "NO_AGENT_START_NO_TASK_EXECUTION_NO_PROVIDER_CALL" | "HUMAN_REVIEW_REQUIRED_NO_RUNTIME_MUTATION";
}>;

export const STUDIO_AGENT_WORKFLOW_DRAFT_CHANGE_TYPES = [
  "ADD_AGENT",
  "REMOVE_AGENT",
  "CHANGE_DEPENDENCY",
  "ADD_CHECKPOINT",
] as const;
export type StudioAgentWorkflowDraftChangeType = typeof STUDIO_AGENT_WORKFLOW_DRAFT_CHANGE_TYPES[number];

export type StudioAgentWorkflowDraftChange = Readonly<{
  changeId?: string;
  type: StudioAgentWorkflowDraftChangeType;
  roleId?: Exclude<StudioAgentWorkflowNodeType, "HUMAN_CHECKPOINT">;
  agentId?: string;
  sourceId?: string;
  targetId?: string;
  dependencyType?: StudioAgentWorkflowDependencyType;
  afterNodeId?: string;
  checkpointType?: "PLAN_REVIEW" | "OUTPUT_REVIEW" | "EXECUTION_APPROVAL";
  checkpointId?: string;
}>;

export type StudioAgentWorkflowDraft = Readonly<{
  draftId: string;
  graphId: string;
  projectId: string;
  baseGraphVersion: string;
  changes: readonly StudioAgentWorkflowDraftChange[];
  previewGraph: StudioAgentWorkflowGraph;
  impact: Readonly<{
    affectedNodeIds: readonly string[];
    addedAgents: number;
    dependencyChanges: number;
    checkpointsAdded: number;
    runtimeMutation: false;
    executionAllowed: false;
    providerCalled: false;
    risks: readonly string[];
  }>;
  status: "DRAFT" | "CONFIRMED";
  createdAt: string;
  confirmedAt?: string;
  humanReview?: Readonly<{
    decision: "CONFIRMED";
    executionAllowed: false;
    nextStep: "SEPARATE_EXECUTION_PREVIEW_AND_CONFIRM";
  }>;
  boundary: "MULTI_AGENT_DESIGN_PREVIEW_ONLY" | "HUMAN_REVIEW_CONFIRMED_DESIGN_ONLY_NO_TASK_OR_RUNTIME_MUTATION";
}>;
