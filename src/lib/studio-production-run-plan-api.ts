import type { StudioProductionRunPlan } from "@/features/studio/capabilities/studioProductionRunPlan";
import { apiRequest } from "@/lib/api";

type StudioProductionRunPlanResponse = Readonly<{
  plan: StudioProductionRunPlan;
  actionType?: "PRODUCTION_RUN_PLAN_DRAFT";
  boundary: "PREVIEW_ONLY" | "PRODUCTION_DRAFT_CONFIRMED_NO_EXECUTION";
}>;

export async function createStudioProductionRunPlan(projectId: string) {
  const response = await apiRequest<StudioProductionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run-plan`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!response.data?.plan?.runId) throw new Error("Production Run Plan was not returned.");
  return response.data;
}

export async function getStudioProductionRunPlan(projectId: string, signal?: AbortSignal) {
  const response = await apiRequest<StudioProductionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run-plan`,
    { signal },
  );
  if (!response.data?.plan?.runId) throw new Error("Production Run Plan was not returned.");
  return response.data;
}

export async function confirmStudioProductionRunPlan(projectId: string, runId: string) {
  const response = await apiRequest<StudioProductionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run-plan`,
    { method: "POST", body: JSON.stringify({ runId, confirm: true }) },
  );
  if (!response.data?.plan?.runId || response.data.plan.status !== "CONFIRMED") {
    throw new Error("Confirmed Production Run Plan was not returned.");
  }
  return response.data;
}
