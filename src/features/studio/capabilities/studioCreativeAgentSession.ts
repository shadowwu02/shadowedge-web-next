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
