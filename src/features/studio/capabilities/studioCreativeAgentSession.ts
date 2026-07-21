import type { StudioCapabilityExecutionPlan } from "@/features/studio/capabilities/studioCapabilityExecutionPlan";
import type { StudioWorkflowExecutionPlan } from "@/features/studio/capabilities/studioWorkflowExecutionPlan";

export type StudioCreativeAgentSessionStatus =
  | "DRAFT"
  | "PLANNING"
  | "WAITING_CONFIRM"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StudioCreativeAgentSession = {
  sessionId: string;
  userId: string;
  intent: {
    intentId: string;
    intentType: string;
  } | null;
  creativePlanId: string | null;
  executionPlanId: string | null;
  status: StudioCreativeAgentSessionStatus;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
};

export type StudioCreativeAgentSessionBundle = {
  session: StudioCreativeAgentSession;
  creativePlan: StudioCapabilityExecutionPlan | null;
  executionPlan: StudioWorkflowExecutionPlan | null;
};

export type StudioCreativeAgentFeedbackType =
  | "PLAN_GOOD"
  | "PLAN_TOO_COMPLEX"
  | "WRONG_MODEL"
  | "WRONG_STYLE"
  | "NEEDS_EDIT"
  | "FAILED_EXPECTATION";

export type StudioCreativeAgentFeedback = {
  sessionId: string;
  planId: string;
  feedbackType: StudioCreativeAgentFeedbackType;
  rating: number;
  comment: string;
  createdAt: string;
};

export const STUDIO_CREATIVE_AGENT_FEEDBACK_OPTIONS: ReadonlyArray<{
  value: StudioCreativeAgentFeedbackType;
  label: string;
}> = [
  { value: "PLAN_GOOD", label: "The plan was helpful" },
  { value: "PLAN_TOO_COMPLEX", label: "The plan was too complex" },
  { value: "WRONG_MODEL", label: "The model choice was wrong" },
  { value: "WRONG_STYLE", label: "The style did not match" },
  { value: "NEEDS_EDIT", label: "The result needs editing" },
  { value: "FAILED_EXPECTATION", label: "The result missed expectations" },
];

export const STUDIO_CREATIVE_AGENT_PROGRESS = [
  { key: "planning", label: "Planning" },
  { key: "preparing", label: "Preparing" },
  { key: "generating", label: "Generating" },
  { key: "finalizing", label: "Finalizing" },
] as const;

export function studioCreativeAgentProgressState(
  status: StudioCreativeAgentSessionStatus,
  step: (typeof STUDIO_CREATIVE_AGENT_PROGRESS)[number]["key"],
) {
  const completed: Record<StudioCreativeAgentSessionStatus, number> = {
    DRAFT: 0,
    PLANNING: 0,
    WAITING_CONFIRM: 1,
    EXECUTING: 2,
    COMPLETED: 4,
    FAILED: 0,
  };
  const index = STUDIO_CREATIVE_AGENT_PROGRESS.findIndex((item) => item.key === step);
  if (status === "FAILED") return step === "planning" ? "failed" : "pending";
  if (index < completed[status]) return "completed";
  if ((status === "PLANNING" && step === "planning") || (status === "EXECUTING" && step === "generating")) return "active";
  return "pending";
}
