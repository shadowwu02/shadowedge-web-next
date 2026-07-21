import { apiRequest } from "@/lib/api";
import type { StudioCapabilityExecutionPlan } from "@/features/studio/capabilities/studioCapabilityExecutionPlan";
import type { StudioCapabilityIntentInput } from "@/lib/studio-capability-intent-api";

export async function createStudioCapabilityExecutionPlan(input: StudioCapabilityIntentInput) {
  const envelope = await apiRequest<StudioCapabilityExecutionPlan>(
    "/api/capabilities/plans",
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!envelope.data?.planId) throw new Error("Capability planning returned no plan.");
  return envelope.data;
}

export async function confirmStudioCapabilityExecutionPlan(planId: string) {
  const envelope = await apiRequest<StudioCapabilityExecutionPlan>(
    `/api/capabilities/plans/${encodeURIComponent(planId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirmation: "USER_CONFIRMED" }) },
  );
  if (envelope.data?.status !== "CONFIRMED") throw new Error("Capability plan was not confirmed.");
  return envelope.data;
}
