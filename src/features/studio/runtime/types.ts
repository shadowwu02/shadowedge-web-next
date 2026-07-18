import type { StudioNodeType } from "@/features/studio/types/studioTypes";

export type NodeExecutionStatus =
  | "idle"
  | "draft"
  | "waiting"
  | "ready"
  | "running"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type NodeExecutionInputs = Record<string, Record<string, unknown>>;
export type NodeExecutionOutputs = Record<string, unknown>;

export type NodeExecutionProgress = {
  status: "queued" | "processing";
  outputs?: NodeExecutionOutputs;
  error?: string;
};

export type NodeExecutionContext<
  TInputs extends NodeExecutionInputs = NodeExecutionInputs,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  projectId: string | null;
  nodeId: string;
  inputs: TInputs;
  config: TConfig;
  reportProgress: (progress: NodeExecutionProgress) => void;
};

export type NodeExecutionResult<
  TOutputs extends NodeExecutionOutputs = NodeExecutionOutputs,
> = {
  status: "completed" | "failed";
  outputs: TOutputs;
  error?: string;
};

export type StudioExecutorKey =
  | "asset"
  | "prompt"
  | "remake_analysis"
  | "remake_pipeline"
  | "remake_shot"
  | "image_generate"
  | "video_generate"
  | "video_edit"
  | "output";

export type StudioNodeExecutor = {
  execute: (
    context: NodeExecutionContext,
  ) => Promise<NodeExecutionResult>;
};

export type StudioNodeRuntimeState = {
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  outputs: NodeExecutionOutputs;
  error?: string;
};

export type StudioRuntimeState = Record<string, StudioNodeRuntimeState>;

export type StudioRunStatus = "running" | "completed" | "failed";

export type StudioRunNodeRecord = {
  nodeId: string;
  type: StudioNodeType;
  status: NodeExecutionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode?: string;
  message?: string;
};

export type StudioRunRecord = {
  id: string;
  projectId: string;
  createdAt: string;
  status: StudioRunStatus;
  mode: "graph" | "retry" | "generation_plan";
  type?: "generation_plan";
  tasks?: number;
  estimatedCredits?: number;
  nodes: StudioRunNodeRecord[];
};

export type StudioRunLockState = "idle" | "running" | "locked";

export type StudioExecutorTypeMap = Record<StudioNodeType, StudioExecutorKey>;
