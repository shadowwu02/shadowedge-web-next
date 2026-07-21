import { apiRequest } from "@/lib/api";
import type {
  StudioExecutionStatus,
  StudioWorkflowExecutionPlan,
} from "@/features/studio/capabilities/studioWorkflowExecutionPlan";

export async function createStudioWorkflowExecutionPreview(sourcePlanId: string) {
  const envelope = await apiRequest<StudioWorkflowExecutionPlan>(
    `/api/capabilities/plans/${encodeURIComponent(sourcePlanId)}/execution-preview`,
    { method: "POST", body: JSON.stringify({ preview: true }) },
  );
  if (!envelope.data?.executionPlanId) throw new Error("Execution Preview returned no plan.");
  return envelope.data;
}

export async function confirmStudioWorkflowExecutionPlan(executionPlanId: string) {
  const envelope = await apiRequest<StudioWorkflowExecutionPlan>(
    `/api/execution-plans/${encodeURIComponent(executionPlanId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirmation: "USER_CONFIRMED" }) },
  );
  if (envelope.data?.status !== "CONFIRMED") throw new Error("Execution Plan was not confirmed.");
  return envelope.data;
}

export async function getStudioWorkflowExecutionStatus(executionPlanId: string) {
  const envelope = await apiRequest<StudioExecutionStatus>(
    `/api/execution-plans/${encodeURIComponent(executionPlanId)}/status`,
  );
  if (!envelope.data?.executionPlanId) throw new Error("Execution status returned no plan.");
  return envelope.data;
}
