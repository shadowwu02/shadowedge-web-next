import type { StudioNodeType } from "@/features/studio/types/studioTypes";

export type NodeExecutionStatus =
  | "idle"
  | "ready"
  | "running"
  | "completed"
  | "failed";

export type NodeExecutionInputs = Record<string, Record<string, unknown>>;
export type NodeExecutionOutputs = Record<string, unknown>;

export type NodeExecutionContext<
  TInputs extends NodeExecutionInputs = NodeExecutionInputs,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  projectId: string | null;
  nodeId: string;
  inputs: TInputs;
  config: TConfig;
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
  | "image_generate"
  | "video_generate"
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

export type StudioExecutorTypeMap = Record<StudioNodeType, StudioExecutorKey>;
